const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

// cliente do Supabase (conexão global)
const supabase = require('./supabase');

async function testarConexao() {
    const { data, error } = await supabase.from('perfil').select('*').limit(1);

    if (error) {
        console.error('❌ Erro ao conectar ao Supabase:', error.message);
    } else {
        console.log('✅ Conexão com o Supabase estabelecida com sucesso!');
    }
}

testarConexao();


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Servir arquivos estáticos das subpastas
app.use(express.static('public'));
app.use('/Login', express.static(path.join(__dirname, 'front', 'Login')));
app.use('/inicial', express.static(path.join(__dirname, 'front', 'inicial')));
app.use('/biblioteca', express.static(path.join(__dirname, 'front', 'biblioteca')));
app.use('/dadoslivros', express.static(path.join(__dirname, 'front', 'dadoslivros')));
app.use('/leitura', express.static(path.join(__dirname, 'front', 'leitura')));
app.use('/loja', express.static(path.join(__dirname, 'front', 'loja')));
app.use('/admin', express.static(path.join(__dirname, 'front', 'admin')));
app.use('/fotos', express.static(path.join(__dirname, 'front', 'fotos')));
app.use('/perfil', express.static(path.join(__dirname, 'front', 'perfil')));


// GET /api/animes?q=nome
app.get('/api/animes', async (req, res) => {
    const { q } = req.query;

    if (!q) {
        return res.status(400).json({ success: false, message: "Parâmetro 'q' é obrigatório" });
    }

    try {
        const response = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=5`);
        res.json({
            success: true,
            data: response.data.data
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao consultar Jikan API" });
    }
});

// ============================================
//  DADOS DOS LIVROS (API)
// ============================================

// Não armazenamos mais livros em memória – agora usamos Supabase para persistência.
// (o array `books` só existia em versões anteriores como fallback local.)

const apiRoutes = require('./api/api');
const { syncBuiltinESMExports } = require('module');
app.use('/api', apiRoutes); // Isso fará com que as rotas de api.js funcionem
// Rota para buscar Livros no Google Books (Smarter Search)
app.get('/api/externo/livros', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ success: true, data: [] });
    
    const cacheKey = 'google_v16_' + q.toLowerCase().trim();

    try {
        const { data: cacheData } = await supabase.from('api_cache').select('json_data').eq('search_query', cacheKey).maybeSingle();
        if (cacheData?.json_data) return res.json({ success: true, data: cacheData.json_data });

        const apiKey = 'key=AIzaSyDBLlxQGqrbAD541dmNGPOyExA5qW-3goM';
        
        // Tenta primeiro uma busca por título para maior precisão
        let response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(q)}&maxResults=20&printType=books&orderBy=relevance&${apiKey}`);
        
        // Se retornar pouco, tenta uma busca geral como fallback
        if (!response.data.items || response.data.items.length < 5) {
            response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=40&printType=books&orderBy=relevance&${apiKey}`);
        }
        
        if (!response.data.items) return res.json({ success: true, data: [] });

        const placeholder = 'https://placehold.co/300x450/222222/FFFFFF/png?text=Sem+Capa';
        const searchTerms = q.toLowerCase().split(' ');
        
        let books = response.data.items.map(item => {
            let img = item.volumeInfo.imageLinks?.thumbnail || item.volumeInfo.imageLinks?.smallThumbnail || placeholder;
            
            if (img && img !== placeholder) {
                // Força zoom=4 para altíssima resolução nas capas (Google Books padrão é zoom=1)
                img = img.replace(/zoom=[0-9]/, 'zoom=4').replace('&edge=curl', '').replace(/^http:\/\//i, 'https://');
            }

            return {
                id: item.id,
                title: item.volumeInfo.title,
                author: item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'Autor Desconhecido',
                description: item.volumeInfo.description || 'Sem sinopse.',
                image: img,
                price: item.saleInfo?.listPrice?.amount || 39.90,
                categories: item.volumeInfo.categories || [],
                tipo: 'livro'
            };
        });

        // FILTRO DE RELEVÂNCIA: Garante que o termo de busca está no título ou autor
        // e remove guias de estudo/dicionários/resumos que poluem a busca de leitores
        const unwantedKeywords = [
            'summary', 'resumo', 'analysis', 'guia', 'guide', 'workbook', 'notebook', 'study',
            'dictionary', 'dicionário', 'dicionario', 'thesaurus', 'vocabulary', 'glossary', 'glossário'
        ];
        
        books = books.filter(b => {
            const titleLower = b.title.toLowerCase();
            const authorLower = b.author.toLowerCase();
            const categories = (b.categories || []).map(c => c.toLowerCase());
            
            // 1. Deve ter pelo menos um dos termos da busca no título ou autor
            const matchesQuery = searchTerms.some(term => titleLower.includes(term) || authorLower.includes(term));
            
            // 2. Não deve ser um item de "metadados" indesejado ou de categorias de referência
            const isUnwanted = unwantedKeywords.some(word => 
                (titleLower.includes(word) && !q.toLowerCase().includes(word))
            );

            const isReference = categories.some(cat => 
                cat.includes('reference') || cat.includes('dictionaries') || cat.includes('linguistics')
            );

            return matchesQuery && !isUnwanted && !isReference && b.image !== placeholder;
        });

        await supabase.from('api_cache').upsert({ search_query: cacheKey, json_data: books }, { onConflict: 'search_query' });
        res.json({ success: true, data: books });
    } catch (error) {
        console.error("Erro Google Books API:", error.message);
        res.json({ success: true, data: [], error: true });
    }
});

// Rota para buscar Mangás no Jikan (MyAnimeList)
app.get('/api/externo/mangas', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ success: true, data: [] });

    const cacheKey = 'manga_v10_' + q.toLowerCase().trim();

    try {
        const { data: cacheData } = await supabase.from('api_cache').select('json_data').eq('search_query', cacheKey).maybeSingle();
        if (cacheData?.json_data) return res.json({ success: true, data: cacheData.json_data });

        
        const response = await axios.get(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(q)}&limit=20&type=manga&sfw=true`);
        
        if (!response.data.data) return res.json({ success: true, data: [] });

        const placeholder = 'https://placehold.co/300x450/222222/FFFFFF/png?text=Sem+Capa';
        const searchTerms = q.toLowerCase().split(' ');

        const mangas = response.data.data
            .map(m => {
                let img = m.images?.jpg?.large_image_url || m.images?.jpg?.image_url;
                
                if (img && (img.includes('manga_placeholder') || img.includes('nophoto'))) {
                    img = placeholder;
                }

                return {
                    id: m.mal_id,
                    title: m.title,
                    author: m.authors ? m.authors.map(a => a.name).join(', ') : 'Autor Desconhecido',
                    price: 45.00,
                    image: img || placeholder,
                    description: m.synopsis || 'Sinopse não disponível.',
                    tipo: 'manga'
                };
            })
            .filter(m => {
                // Filtro de relevância para evitar resultados completamente aleatórios
                const titleLower = m.title.toLowerCase();
                // Deve conter pelo menos o primeiro termo da busca no título (mais rigoroso)
                return titleLower.includes(searchTerms[0]) && m.image !== placeholder;
            });

        await supabase.from('api_cache').upsert({ search_query: cacheKey, json_data: mangas }, { onConflict: 'search_query' });
        res.json({ success: true, data: mangas });
    } catch (error) {
        console.error("Erro Jikan API:", error.message);
        res.json({ success: true, data: [], error: true });
    }
});

// GET /api/externo/livro/:id - Busca UM ÚNICO livro no Google Books pelo Volume ID
app.get('/api/externo/livro/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const apiKey = 'key=AIzaSyDBLlxQGqrbAD541dmNGPOyExA5qW-3goM';
        const response = await axios.get(`https://www.googleapis.com/books/v1/volumes/${id}?${apiKey}`);
        const item = response.data;
        
        // CORREÇÃO: Forçar Alta Resolução máxima (do zoom=1 até o zoom=5)
        let img = item.volumeInfo.imageLinks?.extraLarge || item.volumeInfo.imageLinks?.large || item.volumeInfo.imageLinks?.medium || item.volumeInfo.imageLinks?.thumbnail || 'https://placehold.co/300x450/222222/FFFFFF/png?text=Sem+Capa';
        if (typeof img === 'string') {
            // Remove limitações de zoom e bordas do Google para imagem nítida
            img = img.replace(/zoom=[0-9]/, 'zoom=3').replace('&edge=curl', '').replace(/^http:\/\//i, 'https://');
        }

        const book = {
            id: item.id,
            title: item.volumeInfo.title,
            author: item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'Autor Desconhecido',
            price: item.saleInfo?.listPrice?.amount || 39.90,
            image: img,
            description: item.volumeInfo.description || 'Sem sinopse.',
            publisher: item.volumeInfo.publisher,
            publishedDate: item.volumeInfo.publishedDate,
            pageCount: item.volumeInfo.pageCount,
            category: item.volumeInfo.categories ? item.volumeInfo.categories[0] : 'Literatura',
            tipo: 'livro'
        };

        // AUTO-SAVE: Salvar no Banco se não existir
        try {
            await supabase.from('livros').upsert({
                titulo: book.title,
                autor: book.author,
                preco: book.price,
                capa_url: book.image,
                descricao: book.description.substring(0, 5000), // Limite de texto
                categoria: 'livro'
            }, { onConflict: 'titulo, autor' });
        } catch (e) { console.log("Erro ao persistir livro externo."); }
        
        res.json({ success: true, data: book });
    } catch (error) {
        res.status(404).json({ success: false, message: "Livro externo não encontrado" });
    }
});

// GET /api/externo/manga/:id - Busca UM ÚNICO mangá no Jikan pelo MAL ID
app.get('/api/externo/manga/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const response = await axios.get(`https://api.jikan.moe/v4/manga/${id}`);
        const manga = response.data.data;
        
        const data = {
            id: manga.mal_id,
            title: manga.title,
            author: manga.authors ? manga.authors.map(a => a.name).join(', ') : 'Autor Desconhecido',
            price: 45.00,
            image: manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url,
            description: manga.synopsis || 'Sinopse não disponível.',
            category: 'Mangá',
            tipo: 'manga'
        };

        // AUTO-SAVE: Salvar no Banco se não existir
        try {
            await supabase.from('livros').upsert({
                titulo: data.title,
                autor: data.author,
                preco: data.price,
                capa_url: data.image,
                descricao: data.description.substring(0, 5000),
                categoria: 'manga'
            }, { onConflict: 'titulo, autor' });
        } catch (e) { console.log("Erro ao persistir mangá externo."); }
        
        res.json({ success: true, data });
    } catch (error) {
        res.status(404).json({ success: false, message: "Mangá externo não encontrado" });
    }
});

// ============================================
// 🏆 MAIS VENDIDOS E DESTAQUES GLOBAIS
// ============================================

// GET /api/externo/mais-vendidos - Retorna os "mais vendidos" reais do Google e Jikan
app.get('/api/externo/mais-vendidos', async (req, res) => {
    try {
        const apiKey = '&key=AIzaSyDBLlxQGqrbAD541dmNGPOyExA5qW-3goM';
        
        // ============================================
        // ✍️ LISTA VIP: COLOQUE AQUI OS LIVROS QUE VOCÊ QUER ESCOLHER !
        // (Basta adicionar o nome entre aspas e separado por virgula)
        // ============================================
        const LIVROS_ESCOLHIDOS = [
            "Harry Potter", 
            "Duna", 
            "Percy Jackson", 
            "Senhor dos Anéis", 
            "The Witcher", 
            "Game of Thrones", 
            "Crepúsculo", 
            "Jogos Vorazes", 
            "As Crônicas de Nárnia", 
            "O Hobbit",
            "Maze Runner"
        ];

        // 1. Mangás Famosos (Top 20 do Jikan)
        const jikanReq = axios.get(`https://api.jikan.moe/v4/top/manga?type=manga&filter=bypopularity&limit=20&sfw=true`);
        
        // 2. Busca OS LIVROS ESCOLHIDOS ACIMA (Google Books)
        const queryESCOLHIDOS = LIVROS_ESCOLHIDOS.map(t => `intitle:${t}`).join(' OR ');
        const googleSagasReq = axios.get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(queryESCOLHIDOS)}&orderBy=relevance&printType=books&langRestrict=pt&maxResults=40${apiKey}`);
        
        const [jikanRes, gSagasRes] = await Promise.allSettled([jikanReq, googleSagasReq]);
        
        let combinados = [];
        
        if (jikanRes.status === 'fulfilled' && jikanRes.value.data.data) {
            const mangasTop = jikanRes.value.data.data.map(manga => ({
                id: manga.mal_id,
                title: manga.title,
                author: manga.authors ? manga.authors.map(a => a.name).join(', ') : 'Autor Desconhecido',
                price: 49.90, 
                image: manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url,
                description: manga.synopsis ? manga.synopsis : 'Sinopse não disponível.',
                tipo: 'manga'
            }));
            combinados.push(...mangasTop);
        }
        
        const formatGoogleBooks = (apiResponse) => {
            if (!apiResponse.data.items) return [];
            return apiResponse.data.items.map(item => {
                let img = item.volumeInfo.imageLinks?.extraLarge || item.volumeInfo.imageLinks?.thumbnail || 'https://placehold.co/300x450/222222/FFFFFF/png?text=Sem+Capa';
                return {
                    id: item.id,
                    title: item.volumeInfo.title,
                    author: item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'Autor Desconhecido',
                    price: item.saleInfo?.listPrice?.amount || 42.90,
                    image: img.replace(/^http:\/\//i, 'https://').replace(/zoom=[0-9]/, 'zoom=4'),
                    description: item.volumeInfo.description ? item.volumeInfo.description : 'Sem sinopse.',
                    tipo: 'livro'
                };
            });
        };
        
        if (gSagasRes.status === 'fulfilled') combinados.push(...formatGoogleBooks(gSagasRes.value));
        
        // Filtro Final: Remove "Sherlock" e capas vazias
        combinados = combinados.filter(c => {
            const lowTitle = c.title.toLowerCase();
            return c.image && !c.image.includes('Sem+Capa') && !lowTitle.includes('sherlock');
        });

        combinados.sort(() => Math.random() - 0.5);
        
        res.json({ success: true, data: combinados });
    } catch (error) {
        console.error("Erro ao buscar famosos:", error);
        res.status(500).json({ success: false, data: [] });
    }
});

// ============================================
// 🔧 ENDPOINTS DA API
// ============================================

// GET /api/livros - Retorna todos os livros
app.get('/api/livros', async (req, res) => {
    try {
        const { data, error, count } = await supabase
            .from('livros')
            .select('*', { count: 'exact' });
        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        res.json({ success: true, data, count });
    } catch (err) {
        console.error('Erro ao listar livros:', err);
        res.status(500).json({ success: false, message: 'Erro ao listar livros', error: err.message });
    }
});

// GET /api/livros/mais-vendidos - Retorna os "mais vendidos" da loja 
app.get('/api/livros/mais-vendidos', async (req, res) => {
    try {
        // Tenta buscar da View que soma automaticamente as vendas reais
        const { data, error } = await supabase
            .from('view_mais_vendidos')
            .select('*')
            .order('total_vendas', { ascending: false })
            .limit(10);
            
        if (error) {
            console.warn("View 'view_mais_vendidos' não encontrada (execute o SQL). Fallback: sorteando livros comuns do banco...", error.message);
            // Fallback: se a view de mais vendidos não existir no Supabase, pegamos alguns do catálogo oficial 
            const fallback = await supabase.from('livros').select('*').limit(30);
            if (!fallback.error && fallback.data) {
                const embaralhados = fallback.data.sort(() => Math.random() - 0.5).slice(0, 8);
                return res.json({ success: true, data: embaralhados, info: "fallback" });
            }
            throw fallback.error || error;
        }
        
        let resultado = data;
        
        // Se a loja não teve vendas suficientes, mistura com os disponíveis
        if (resultado.length < 8) {
            const faltam = 8 - resultado.length;
            const extras = await supabase.from('livros').select('*').limit(faltam + 5);
            if (extras.data) {
                const jaExibidos = new Set(resultado.map(r => r.id));
                const misturadosExtras = extras.data.filter(e => !jaExibidos.has(e.id)).slice(0, faltam);
                resultado = [...resultado, ...misturadosExtras];
            }
        }
        
        res.json({ success: true, data: resultado });
    } catch (err) {
        console.error('Erro ao buscar destaques reais:', err);
        res.status(500).json({ success: false, message: 'Erro ao buscar destaques. Verifique se criou a tabela vendas.', error: err.message });
    }
});

// GET /api/livros/:id - Retorna um livro específico (Supabase)
app.get('/api/livros/:id', async (req, res) => {
    const { id } = req.params;
    
    // Validar se o ID segue o formato UUID antes de buscar no banco (evita erro 500 em IDs numéricos)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
        return res.status(404).json({ success: false, message: "ID não é local" });
    }

    try {
        const { data: book, error } = await supabase
            .from('livros')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        if (!book) {
            return res.status(404).json({ success: false, message: "Livro não encontrado" });
        }
        res.json({ success: true, data: book });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erro ao buscar livro', error: err.message });
    }
});

// GET /api/livros/:id/pages - Retorna as páginas (imagens) de um livro
app.get('/api/livros/:id/pages', async (req, res) => {
    const { id } = req.params;
    try {
        const { data: book, error } = await supabase
            .from('livros')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        if (!book) {
            return res.status(404).json({ success: false, message: 'Livro não encontrado' });
        }

        // Se o livro contém um array `pages` (para leitura completa), usa esse
        if (Array.isArray(book.pages) && book.pages.length) {
            return res.json({ success: true, data: book.pages, bookId: book.id, bookTitle: book.title });
        }

        // Se o livro já contém um array `images` (preview), retorna diretamente
        if (Array.isArray(book.images) && book.images.length) {
            return res.json({ success: true, data: book.images });
        }

        // Caso contrário, tenta ler um índice em /fotos/paginas/book-<id>/index.json
        const fs = require('fs');
        const pagesDir = path.join(__dirname, 'fotos', 'paginas', `book-${id}`);
        const indexFile = path.join(pagesDir, 'index.json');

        // se existir index.json, usa-o (permite apontar para imagens existentes sem copiar)
        if (fs.existsSync(indexFile)) {
            try {
                const content = fs.readFileSync(indexFile, 'utf8');
                const images = JSON.parse(content);
                return res.json({ success: true, data: images });
            } catch (err) {
                console.warn('Erro lendo index.json para', book.id, err);
                const fallback = [];
                if (book.image) fallback.push(book.image);
                return res.json({ success: true, data: fallback });
            }
        }

        // se não houver index.json, tenta listar arquivos na pasta book-<id>
        fs.readdir(pagesDir, (err, files) => {
            if (err) {
                // pasta não existe ou erro de leitura: usar imagem de capa (se existir)
                const fallback = [];
                if (book.image) fallback.push(book.image);
                return res.json({ success: true, data: fallback });
            }

            const images = files
                .filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f))
                .sort()
                .map(f => path.posix.join('/fotos/paginas', `book-${id}`, f));

            return res.json({ success: true, data: images });
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erro ao buscar livro para páginas', error: err.message });
    }
});

// GET /api/livros/autor/:author - Retorna livros por autor (Supabase)
app.get('/api/livros/autor/:author', async (req, res) => {
    const { author } = req.params;
    try {
        const { data, error } = await supabase
            .from('livros')
            .select('*')
            .ilike('autor', author);
        if (error) throw error;
        res.json({ success: true, data, count: data.length });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erro ao buscar por autor', error: err.message });
    }
});

// GET /api/mangas - Retorna todos os mangás (Supabase)
app.get('/api/mangas', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('livros')
            .select('*')
            .eq('categoria', 'manga');
        if (error) throw error;
        res.json({ success: true, data, count: data.length });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erro ao buscar mangás', error: err.message });
    }
});

// GET /api/categorias/:category - Retorna livros por categoria (Supabase)
app.get('/api/categorias/:category', async (req, res) => {
    const { category } = req.params;
    try {
        const { data, error } = await supabase
            .from('livros')
            .select('*')
            .eq('categoria', category.toLowerCase());
        if (error) throw error;
        res.json({ success: true, data, count: data.length });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erro ao buscar por categoria', error: err.message });
    }
});

// GET /api/buscar - Busca por título ou autor (Supabase)
app.get('/api/buscar', async (req, res) => {
    const { q } = req.query;

    if (!q) {
        return res.status(400).json({ success: false, message: "Parâmetro 'q' é obrigatório" });
    }

    const searchTerm = q.toLowerCase();
    try {
        const { data, error } = await supabase
            .from('livros')
            .select('*')
            .or(`titulo.ilike.%${searchTerm}%,autor.ilike.%${searchTerm}%`);
        if (error) throw error;
        res.json({ success: true, data, count: data.length, query: q });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erro na busca', error: err.message });
    }
});

// GET /api/status - Health check
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        message: "API está funcionando!",
        timestamp: new Date().toISOString()
    });
});

// EXEMPLO: consulta simples ao Supabase (ajuste conforme seu esquema)
app.get('/api/supabase-test', async (req, res) => {
    try {
        const { data, error } = await supabase.from('livros').select('*').limit(5);
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erro Supabase', error: err.message });
    }
});

// ============================================
// 📝 ENDPOINTS CRUD (POST, PUT, DELETE)
// ============================================

// POST /api/livros - Criar novo livro
app.post('/api/livros', async (req, res) => {
    const { title, author, price, image, description, category, titulo, autor, preco, capa_url, categoria, descricao } = req.body;
    
    const payload = {
        titulo: titulo || title,
        autor: autor || author,
        preco: preco || price,
        capa_url: capa_url || image,
        categoria: categoria || category,
        descricao: descricao || description
    };

    try {
        const { data, error } = await supabase.from('livros').insert(payload).single();
        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});



// PUT /api/livros/:id - Atualizar livro (Supabase)
app.put('/api/livros/:id', async (req, res) => {
    const bookId = req.params.id;
    const { title, author, price, image, description, category, titulo, autor, preco, capa_url, categoria, descricao } = req.body;
    
    const payload = {
        titulo: titulo || title,
        autor: autor || author,
        preco: preco || price,
        capa_url: capa_url || image,
        categoria: categoria || category,
        descricao: descricao || description
    };

    try {
        const { data, error } = await supabase
            .from('livros')
            .update(payload)
            .eq('id', bookId)
            .single();
        if (error) throw error;
        res.json({ success: true, message: 'Livro atualizado com sucesso', data });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});



// DELETE /api/livros/:id - Deletar livro (Supabase)
app.delete('/api/livros/:id', async (req, res) => {
    const bookId = req.params.id;
    try {
        const { data, error } = await supabase
            .from('livros')
            .delete()
            .eq('id', bookId)
            .single();
        if (error) throw error;
        res.json({ success: true, message: 'Livro deletado com sucesso', data });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// ============================================
// 🤖 ENDPOINTS DE SINCRONIZAÇÃO AUTOMÁTICA
// =====================================
// POST /api/sync - Sincroniza livros e mangás das APIs externas
app.post('/api/sync', async (req, res) => {
  try {
    const BookAutoloader = require('./services/bookAutoloader');
    const autoloader = new BookAutoloader();
    const result = await autoloader.syncAll();

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/sync/status - Retorna status da última sincronização
app.get('/api/sync/status', async (req, res) => {
  try {
    const { data: books } = await supabase
      .from('livros')
      .select('id')
      .eq('categoria', 'livro');

    const { data: mangas } = await supabase
      .from('livros')
      .select('id')
      .eq('categoria', 'manga');

    res.json({
      success: true,
      stats: {
        totalLivros: books?.length || 0,
        totalMangas: mangas?.length || 0,
        totalItens: (books?.length || 0) + (mangas?.length || 0)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// ⏰ SINCRONIZAÇÃO AUTOMÁTICA (A CADA 24H)
// ============================================

// Sincroniza automaticamente a cada 24 horas
setInterval(async () => {
  console.log('[AUTO-SYNC] Iniciando sincronização programada...');
  const BookAutoloader = require('./services/bookAutoloader');
  const autoloader = new BookAutoloader();
  await autoloader.syncAll();
}, 24 * 60 * 60 * 1000); // 24 horas

// ============================================
// 🌐 ROTAS DO SITE
// ============================================

// Rota principal - Serve o Login como página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'front', 'Login', 'Login.html'));
});

// Rota para pages antigas (compatibilidade)
app.get('/inicial', (req, res) => {
    res.sendFile(path.join(__dirname, 'front', 'inicial', 'i.html'));
});

app.get('/biblioteca', (req, res) => {
    res.sendFile(path.join(__dirname, 'front', 'biblioteca', 'bibliotecaindex.html'));
});

app.get('/loja', (req, res) => {
    res.sendFile(path.join(__dirname, 'front', 'loja', 'catalogo.html'));
});

app.get('/leitura', (req, res) => {
    res.sendFile(path.join(__dirname, 'front', 'leitura', 'Leitura.html'));
});

app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'front', 'admin', 'admin-login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'front', 'admin', 'admin.html'));
});

app.get('/perfil', (req, res) => {
    res.sendFile(path.join(__dirname, 'front', 'perfil', 'perfil.html'));
});


// Iniciar servidor
// ============================================
// 🔐 AUTHENTICATION ENDPOINTS (LOGIN / REGISTER)
// ============================================

// POST /api/login - Autenticar usuário via Supabase Auth
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        console.log(`[AUTH] Tentativa de login para: ${email}`);
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error('[AUTH] Erro no login (Supabase):', error.message);
            throw error;
        }

        console.log('[AUTH] Login bem-sucedido para:', data.user.email);
        
        // --- RECUPERAÇÃO AUTOMÁTICA DE PERFIL ---
        // Verifica se o perfil existe no banco. Se não, tenta criar na hora.
        const { data: profileCheck } = await supabase.from('perfil').select('id').eq('id', data.user.id).maybeSingle();
        if (!profileCheck) {
            console.warn('[AUTH] Perfil não encontrado no Login. Tentando criar agora...');
            await supabase.from('perfil').insert([{ 
                id: data.user.id, 
                nome: data.user.user_metadata.full_name || data.user.email.split('@')[0], 
                email: data.user.email 
            }]);
        }

        // Sucesso no login
        res.json({ 
            success: true, 
            message: 'Login realizado com sucesso',
            user: data.user,
            session: data.session
        });
    } catch (err) {
        console.error('[AUTH] Exceção no endpoint /api/login:', err.message);
        res.status(401).json({ 
            success: false, 
            message: 'Erro ao autenticar: ' + err.message 
        });
    }
});

// POST /api/register - Criar novo usuário via Supabase Auth + Inserir no Perfil
app.post('/api/register', async (req, res) => {
    const { email, password, nome } = req.body;
    
    try {
        console.log(`[AUTH] Tentativa de cadastro para: ${email}`);
        // 1. Cria o usuário no Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: nome,
                }
            }
        });

        if (error) {
            console.error('[AUTH] Erro no signUp (Supabase):', error.message);
            throw error;
        }

        console.log('[AUTH] Usuário criado no Auth. ID:', data.user?.id);

        // 2. Se o usuário foi criado com sucesso, insere na tabela 'perfil'
        if (data.user) {
            console.log('[DB] Tentando criar perfil na tabela "perfil"...');
            const { error: profileError } = await supabase
                .from('perfil')
                .insert([
                    { 
                        id: data.user.id, // O ID do perfil deve ser o mesmo do Auth
                        nome: nome,
                        email: email
                    }
                ]);

            if (profileError) {
                console.error("[DB] Erro ao criar perfil na tabela 'perfil':", profileError.message);
                // Não travamos o processo aqui, mas podemos informar o erro no log
            } else {
                console.log('[DB] Perfil criado com sucesso!');
            }
        }

        res.json({ 
            success: true, 
            message: 'Cadastro realizado com sucesso! Verifique seu email se necessário.',
            user: data.user
        });
    } catch (err) {
        console.error('[AUTH] Exceção no endpoint /api/register:', err.message);
        res.status(400).json({ 
            success: false, 
            message: 'Erro ao cadastrar: ' + err.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`🥳 Servidor rodando em http://localhost:${PORT}`);
    console.log(`🤠 Biblioteca Digital - Página inicial: Login`);
});
