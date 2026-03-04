const express = require('express');
const router = express.Router();
// Importar os serviços das APIs externas
const { buscarLivros } = require('./loja/services/googleBooks.js'); 
const { buscarMangas } = require('./loja/services/jikan.js');

// ============================================
// 📚 ENDPOINTS DE BUSCA (Google Books e Jikan)
// ============================================

// GET /api/catalogo - Busca de livros ou mangás
router.get('/catalogo', async (req, res) => {
    const { q, tipo } = req.query;
    if (!q) return res.status(400).json({ success: false, message: "Busca vazia" });

    try {
        let resultados = (tipo === 'manga') ? await buscarMangas(q) : await buscarLivros(q);
        res.json({ success: true, data: resultados });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro na API externa" });
    }
});

// GET /api/livros-externos - Busca de livros no Google Books
router.get('/livros-externos', async (req, res) => {
    const { q } = req.query;
    const searchTerm = q || 'best sellers';

    try {
        console.log(`[API] Buscando livros: ${searchTerm}`);
        const livros = await buscarLivros(searchTerm);
        console.log(`[API] Livros encontrados: ${livros.length}`);
        res.json({ success: true, data: livros, count: livros.length });
    } catch (error) {
        console.error('[API] Erro ao buscar livros:', error);
        res.status(500).json({ 
            success: false, 
            message: "Erro ao buscar livros", 
            error: error.message,
            details: error.stack
        });
    }
});

// GET /api/mangas-externos - Busca de mangás no Jikan
router.get('/mangas-externos', async (req, res) => {
    const { q } = req.query;
    const searchTerm = q || 'best sellers';

    try {
        console.log(`[API] Buscando mangás: ${searchTerm}`);
        const mangas = await buscarMangas(searchTerm);
        console.log(`[API] Mangás encontrados: ${mangas.length}`);
        res.json({ success: true, data: mangas, count: mangas.length });
    } catch (error) {
        console.error('[API] Erro ao buscar mangás:', error);
        res.status(500).json({ 
            success: false, 
            message: "Erro ao buscar mangás", 
            error: error.message,
            details: error.stack
        });
    }
});

// GET /api/livros-populares - Retorna livros populares do Google Books
router.get('/livros-populares', async (req, res) => {
    try {
        const termos = ['Fiction', 'Science', 'Adventure', 'Mystery', 'Fantasy'];
        const termo = termos[Math.floor(Math.random() * termos.length)];
        const livros = await buscarLivros(termo);
        res.json({ success: true, data: livros.slice(0, 12), count: livros.length });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao buscar livros populares" });
    }
});

// GET /api/mangas-populares - Retorna mangás populares do Jikan
router.get('/mangas-populares', async (req, res) => {
    try {
        const termos = ['Action', 'Adventure', 'Fantasy', 'Shounen', 'Seinen'];
        const termo = termos[Math.floor(Math.random() * termos.length)];
        const mangas = await buscarMangas(termo);
        res.json({ success: true, data: mangas.slice(0, 12), count: mangas.length });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao buscar mangás populares" });
    }
});

// GET /api/buscar-tudo - Busca combinada (livros e mangás)
router.get('/buscar-tudo', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, message: "Busca vazia" });

    try {
        const livros = await buscarLivros(q);
        const mangas = await buscarMangas(q);
        const combinado = [
            ...livros.map(l => ({ ...l, tipo: 'livro' })),
            ...mangas.map(m => ({ ...m, tipo: 'manga' }))
        ];
        res.json({ success: true, data: combinado, count: combinado.length });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro na busca" });
    }
});

module.exports = router;