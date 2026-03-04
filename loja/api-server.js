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

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos da pasta `loja` (útil se quiser abrir a UI pelo navegador)
app.use(express.static(path.join(__dirname)));

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

// GET /api/status - Health check
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        message: "API está funcionando!",
        timestamp: new Date().toISOString()
    });
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

const express = require('express');
const router = express.Router();
const { buscarLivros } = require('./services/googleBooks.js');
const { buscarMangas } = require('./services/jikan.js');

router.get('/catalogo', async (req, res) => {
    
    const { q, tipo } = req.query;

    if (!q) {
        return res.status(400).json({ success: false, message: "Digite algo para buscar." });
    }

    try {
        let resultados;

        if (tipo === 'manga') {
            
            resultados = await buscarMangas(q);
        } else {
           
            resultados = await buscarLivros(q);
        }

        res.json({
            success: true,
            data: resultados
        });

    } catch (error) {
        console.error("Erro na rota de catálogo:", error);
        res.status(500).json({ success: false, message: "Erro ao buscar dados externos." });
    }
});

module.exports = router;

console.error("Erro ao consultar API externa:", error.message);

const express = require('express');
const cors = require('cors');
const apiRoutes = require('./api');
const apiRouter = require('./api.js')

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use('/api/v2', apiRouter);

// Usar rotas da API
app.use('/api', apiRoutes);

app.listen(PORT, () => {
    console.log(`🛒 Loja rodando em http://localhost:${PORT}`);
});
