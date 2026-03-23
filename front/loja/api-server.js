// ============================================
// 📚 API REST - LIVRARIA
// ============================================
// Servidor Express para servir dados de livros e mangás
// Instalar dependências: npm install express cors
// Rodar: node api-server.js
// Acesso: http://localhost:3000

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Importar serviços de APIs externas
const { buscarLivros } = require('./services/googleBooks');
const { buscarMangas } = require('./services/jikan');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Carregar catálogo de livros
const catalogPath = path.join(__dirname, 'catalog.json');
let books = fs.existsSync(catalogPath) ? JSON.parse(fs.readFileSync(catalogPath, 'utf8')) : [];

// Servir arquivos estáticos da pasta `loja` (útil se quiser abrir a UI pelo navegador)
app.use(express.static(path.join(__dirname)));

// Servir arquivos estáticos da pasta `fotos` na raiz
app.use('/fotos', express.static(path.join(__dirname, '..', 'fotos')));

// ============================================
// 📖 DADOS DOS LIVROS
// ============================================

// ============================================
// 🔧 ENDPOINTS DA API
// ============================================

// GET /api/livros - Retorna todos os livros
app.get('/api/livros', (req, res) => {
    res.json({
        success: true,
        data: books,
        count: books.length
    });
});

// Rota raiz: página simples com links úteis para testar a API
app.get('/', (req, res) => {
    res.send(`
        <!doctype html>
        <html lang="pt-BR">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <title>API Livraria</title>
            <style>body{font-family:Arial,Helvetica,sans-serif;padding:24px;background:#f6f8fb;color:#222}a{color:#007385}</style>
        </head>
        <body>
            <h1>API Livraria</h1>
            <p>Endpoints disponíveis:</p>
            <ul>
                <li><a href="/api/status">/api/status</a></li>
                <li><a href="/api/livros">/api/livros</a></li>
                <li><a href="/api/mangas">/api/mangas</a></li>
            </ul>
            <p>Se quiser abrir a interface estática, coloque seus arquivos HTML/CSS/JS nesta pasta e acesse <a href="/">/</a>.</p>
        </body>
        </html>
    `);
});

// GET /api/livros/:id - Retorna um livro específico
app.get('/api/livros/:id', (req, res) => {
    const { id } = req.params;
    const book = books.find(b => b.id === parseInt(id));

    if (!book) {
        return res.status(404).json({
            success: false,
            message: "Livro não encontrado"
        });
    }

    res.json({
        success: true,
        data: book
    });
});

// GET /api/livros/autor/:author - Retorna livros por autor
app.get('/api/livros/autor/:author', (req, res) => {
    const { author } = req.params;
    const filtered = books.filter(b => b.author.toLowerCase() === author.toLowerCase());

    res.json({
        success: true,
        data: filtered,
        count: filtered.length
    });
});

// GET /api/mangas - Retorna todos os mangás
app.get('/api/mangas', (req, res) => {
    const mangas = books.filter(b => b.category === 'manga');
    res.json({
        success: true,
        data: mangas,
        count: mangas.length
    });
});

// GET /api/categorias - Retorna livros por categoria
app.get('/api/categorias/:category', (req, res) => {
    const { category } = req.params;
    const filtered = books.filter(b => b.category === category.toLowerCase());

    res.json({
        success: true,
        data: filtered,
        count: filtered.length
    });
});

// GET /api/buscar - Busca por título ou autor
app.get('/api/buscar', (req, res) => {
    const { q } = req.query;

    if (!q) {
        return res.status(400).json({
            success: false,
            message: "Parâmetro 'q' é obrigatório"
        });
    }

    const searchTerm = q.toLowerCase();
    const results = books.filter(b =>
        b.title.toLowerCase().includes(searchTerm) ||
        b.author.toLowerCase().includes(searchTerm)
    );

    res.json({
        success: true,
        data: results,
        count: results.length,
        query: q
    });
});

// ============================================
// 🌐 ENDPOINTS DE APIs EXTERNAS (Google Books e Jikan)
// ============================================

// GET /api/livros-externos - Busca livros no Google Books API
app.get('/api/livros-externos', async (req, res) => {
    try {
        const { q = 'bestsellers' } = req.query;
        console.log('[API] Buscando livros externos:', q);
        
        const livros = await buscarLivros(q);
        
        res.json({
            success: true,
            data: livros,
            count: livros.length,
            source: 'Google Books',
            query: q
        });
    } catch (error) {
        console.error('[API] Erro ao buscar livros externos:', error.message);
        res.status(500).json({
            success: false,
            message: "Erro ao buscar livros da API externa",
            error: error.message
        });
    }
});

// GET /api/mangas-externos - Busca mangás na Jikan API
app.get('/api/mangas-externos', async (req, res) => {
    try {
        const { q = 'action' } = req.query;
        console.log('[API] Buscando mangás externos:', q);
        
        const mangas = await buscarMangas(q);
        
        res.json({
            success: true,
            data: mangas,
            count: mangas.length,
            source: 'Jikan API',
            query: q
        });
    } catch (error) {
        console.error('[API] Erro ao buscar mangás externos:', error.message);
        res.status(500).json({
            success: false,
            message: "Erro ao buscar mangás da API externa",
            error: error.message
        });
    }
});

// GET /api/buscar-tudo - Busca combinada (livros + mangás)
app.get('/api/buscar-tudo', async (req, res) => {
    try {
        const { q = 'bestsellers' } = req.query;
        console.log('[API] Busca combinada:', q);
        
        // Buscar livros e mangás em paralelo
        const [livros, mangas] = await Promise.all([
            buscarLivros(q),
            buscarMangas(q)
        ]);
        
        // Combinar resultados
        const combinados = [...livros, ...mangas];
        
        res.json({
            success: true,
            data: combinados,
            count: combinados.length,
            sources: ['Google Books', 'Jikan API'],
            livrosCount: livros.length,
            mangasCount: mangas.length,
            query: q
        });
    } catch (error) {
        console.error('[API] Erro na busca combinada:', error.message);
        res.status(500).json({
            success: false,
            message: "Erro ao realizar busca combinada",
            error: error.message
        });
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

// POST /api/reload - Recarrega o catálogo de livros
app.post('/api/reload', async (req, res) => {
    try {
        const BookAutoloader = require('./services/bookAutoloader.js');
        const loader = new BookAutoloader();
        const { query = 'bestsellers' } = req.body;
        await loader.fetchAndPopulateCatalog(query);
        
        // Recarregar books da memória
        books = fs.existsSync(catalogPath) ? JSON.parse(fs.readFileSync(catalogPath, 'utf8')) : [];
        
        res.json({
            success: true,
            message: "Catálogo recarregado com sucesso",
            count: books.length
        });
    } catch (error) {
        console.error('Erro ao recarregar catálogo:', error);
        res.status(500).json({
            success: false,
            message: "Erro ao recarregar catálogo"
        });
    }
});

// ============================================
// 🚀 INICIAR SERVIDOR
// ============================================
app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════════╗
    ║  📚 API LIVRARIA RODANDO              ║
    ║  Servidor: http://localhost:${PORT}        ║
    ║  Endpoints:                            ║
    ║  - GET  /api/livros                   ║
    ║  - GET  /api/livros/:id               ║
    ║  - GET  /api/mangas                   ║
    ║  - GET  /api/livros/autor/:author     ║
    ║  - GET  /api/categorias/:category     ║
    ║  - GET  /api/buscar?q=termo           ║
    ║  - GET  /api/status                   ║
    ╚════════════════════════════════════════╝
    `);
});
