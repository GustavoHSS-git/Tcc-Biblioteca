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
app.use('/Login', express.static(path.join(__dirname, 'front', 'Login')));
app.use('/inicial', express.static(path.join(__dirname, 'front', 'inicial')));
app.use('/biblioteca', express.static(path.join(__dirname, 'front', 'biblioteca')));
app.use('/dadoslivros', express.static(path.join(__dirname, 'front', 'dadoslivros')));
app.use('/leitura', express.static(path.join(__dirname, 'front', 'leitura')));
app.use('/loja', express.static(path.join(__dirname, 'front', 'loja')));
app.use('/admin', express.static(path.join(__dirname, 'front', 'admin')));
app.use('/fotos', express.static(path.join(__dirname, 'front', 'fotos')));


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
// 📖 DADOS DOS LIVROS (API)
// ============================================

// Não armazenamos mais livros em memória – agora usamos Supabase para persistência.
// (o array `books` só existia em versões anteriores como fallback local.)

const apiRoutes = require('./api/api');
const { syncBuiltinESMExports } = require('module');
app.use('/api', apiRoutes); // Isso fará com que as rotas de api.js funcionem sob /api/...

// Rota para buscar Livros no Google Books
app.get('/api/externo/livros', async (req, res) => {
    const { q } = req.query;
    const cacheKey = 'livro_' + q.toLowerCase();

    try {
        // Tenta buscar da memória principal do Supabase
        const { data: cacheData } = await supabase.from('api_cache').select('json_data').eq('search_query', cacheKey).maybeSingle();
        if (cacheData && cacheData.json_data) {
            return res.json({ success: true, data: cacheData.json_data, log: "Do Banco do Supabase!" });
        }
    } catch (e) { console.warn("Erro ao ler cache do Supabase"); }

    try {
        // Usando a chave da API fornecida para ignorar completamente o limite do Google
        const apiKey = '&key=AIzaSyDBLlxQGqrbAD541dmNGPOyExA5qW-3goM';
        // Força a buscar apenas livros verdadeiros (ignorando revistas) com &printType=books
        // E garante que a descrição/idioma seja em português com &langRestrict=pt
        const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&printType=books&langRestrict=pt${apiKey}`);

        // Mapear para o formato que o seu frontend já entende
        const livros = response.data.items ? response.data.items.map(item => {
            // Imagem super bonita como placeholder se não tiver capa
            const fallbackCapa = 'https://placehold.co/300x450/222222/FFFFFF/png?text=Sem+Capa&font=oswald';
            let highResImage = item.volumeInfo.imageLinks?.extraLarge || item.volumeInfo.imageLinks?.large || item.volumeInfo.imageLinks?.medium || item.volumeInfo.imageLinks?.thumbnail || fallbackCapa;
            if (typeof highResImage === 'string' && highResImage !== fallbackCapa) {
                highResImage = highResImage.replace('zoom=1', 'zoom=3').replace('&edge=curl', '');
                // Converter HTTP para HTTPS se necessário
                highResImage = highResImage.replace(/^http:\/\//i, 'https://');
            }

            return {
                id: item.id,
                title: item.volumeInfo.title,
                author: item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'Autor Desconhecido',
                price: item.saleInfo?.listPrice?.amount || 39.90, // Google nem sempre retorna preço
                image: highResImage,
                description: item.volumeInfo.description ? item.volumeInfo.description : 'Nenhuma sinopse fornecida pela editora.',
                tipo: 'livro'
            };
        }) : [];

        // Salva silenciosamente no Banco caso tenha sucesso
        if (livros.length > 0) {
            await supabase.from('api_cache').upsert({ search_query: cacheKey, json_data: livros }, { onConflict: 'search_query' });
        }

        res.json({ success: true, data: livros });
    } catch (error) {
        console.warn("⚠️ API do Google falhou, retornando vazio ao invés de itens fantasmas!");
        res.json({ success: true, data: [], isFallback: true });
    }
});

// Rota para buscar Mangás no Jikan (MyAnimeList)
app.get('/api/externo/mangas', async (req, res) => {
    const { q } = req.query;
    const cacheKey = 'manga_' + q.toLowerCase();

    try {
        // Tenta buscar do Supabase primeiro
        const { data: cacheData } = await supabase.from('api_cache').select('json_data').eq('search_query', cacheKey).maybeSingle();
        if (cacheData && cacheData.json_data) {
            return res.json({ success: true, data: cacheData.json_data, log: "Do Banco do Supabase!" });
        }
    } catch (e) { console.warn("Erro ao ler cache do Supabase"); }

    try {
        // order_by=popularity garante que a obra original venha primeiro (e não spin-offs irrelevantes)
        // limit=1 garante que TRAGA APENAS O MANGÁ QUE FOI PEDIDO, barrando spin-offs que ninguém pediu!
        const response = await axios.get(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(q)}&limit=1&sfw=true&type=manga&order_by=popularity&sort=asc`);
        const mangas = response.data.data.map(manga => {
            const fallbackCapa = 'https://placehold.co/300x450/222222/FFFFFF/png?text=Sem+Capa&font=oswald';
            return {
                id: manga.mal_id,
                title: manga.title,
                author: manga.authors ? manga.authors.map(a => a.name).join(', ') : 'Autor Desconhecido',
                price: 45.00, // API Jikan não fornece preços de venda
                image: manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url || fallbackCapa,
                description: manga.synopsis ? manga.synopsis : 'Sinopse não disponível.',
                tipo: 'manga'
            }
        });

        if (mangas.length > 0) {
            await supabase.from('api_cache').upsert({ search_query: cacheKey, json_data: mangas }, { onConflict: 'search_query' });
        }

        res.json({ success: true, data: mangas });
    } catch (error) {
        console.warn("⚠️ API Jikan falhou, retornando vazio ao invés de itens fantasmas para a busca:", q);
        res.json({ success: true, data: [], isFallback: true });
    }
});

// ============================================
// 🏆 MAIS VENDIDOS E DESTAQUES GLOBAIS
// ============================================

// GET /api/externo/mais-vendidos - Retorna os "mais vendidos" reais do Google e Jikan
app.get('/api/externo/mais-vendidos', async (req, res) => {
    try {
        const apiKey = '&key=AIzaSyDBLlxQGqrbAD541dmNGPOyExA5qW-3goM';
        
        // 1. Busca os Mangás Mais Populares de TODOS os tempos usando a rota V4 Top
        const jikanReq = axios.get(`https://api.jikan.moe/v4/top/manga?type=manga&filter=bypopularity&limit=5`);
        
        // 2. Busca livros populares (bestsellers) usando termos amplos e ordenando pelo Google
        // Usamos inauthor de autores renomados de fantasia para o top-tier ter qualidade
        const googleReq1 = axios.get(`https://www.googleapis.com/books/v1/volumes?q=subject:"fiction"&orderBy=relevance&printType=books&langRestrict=pt&maxResults=5${apiKey}`);
        const googleReq2 = axios.get(`https://www.googleapis.com/books/v1/volumes?q=subject:"fantasy"&orderBy=relevance&printType=books&langRestrict=pt&maxResults=5${apiKey}`);
        
        const [jikanRes, gRes1, gRes2] = await Promise.allSettled([jikanReq, googleReq1, googleReq2]);
        
        let combinados = [];
        
        // Processar mangás top (são garantidos como obras principais)
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
        
        // Função auxiliar para mapear livros
        const formatGoogleBooks = (apiResponse) => {
            if (!apiResponse.data.items) return [];
            return apiResponse.data.items.map(item => {
                let img = item.volumeInfo.imageLinks?.extraLarge || item.volumeInfo.imageLinks?.thumbnail || 'https://placehold.co/300x450/222222/FFFFFF/png?text=Sem+Capa';
                return {
                    id: item.id,
                    title: item.volumeInfo.title,
                    author: item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'Autor Desconhecido',
                    price: item.saleInfo?.listPrice?.amount || Math.floor(Math.random() * 40) + 20,
                    image: img.replace(/^http:\/\//i, 'https://').replace('zoom=1', 'zoom=3'),
                    description: item.volumeInfo.description ? item.volumeInfo.description : 'Sem sinopse.',
                    tipo: 'livro'
                };
            });
        };
        
        if (gRes1.status === 'fulfilled') combinados.push(...formatGoogleBooks(gRes1.value));
        if (gRes2.status === 'fulfilled') combinados.push(...formatGoogleBooks(gRes2.value));
        
        // Filtra para remover livros muito genéricos indesejados e mistura 
        combinados = combinados.filter(c => c.image && !c.image.includes('Sem+Capa'));
        combinados.sort(() => Math.random() - 0.5);
        
        res.json({ success: true, data: combinados });
    } catch (error) {
        console.error("Erro ao buscar top sellers globais:", error);
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
    // Extrai campos do corpo ou você pode enviar todo objeto via spread
    const payload = { ...req.body };
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
    const payload = { ...req.body };
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


// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📚 Biblioteca Digital - Página inicial: Login`);
});
