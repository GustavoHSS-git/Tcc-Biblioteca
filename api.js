const express = require('express');
const router = express.Router();
// Importar os serviços das APIs externas
const { buscarLivros } = require('./loja/services/googleBooks.js'); 
const { buscarMangas } = require('./loja/services/jikan.js');
const supabase = require('./supabase');

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

// ============================================
// 📚 CRUD PARA LIVROS (Supabase)
// ============================================

// GET /api/livros - Listar todos os livros
router.get('/livros', async (req, res) => {
    try {
        const { data, error } = await supabase.from('livros').select('*');
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao buscar livros" });
    }
});

// POST /api/livros - Criar um novo livro
router.post('/livros', async (req, res) => {
    const { title, author, price, image, description } = req.body;
    try {
        const { data, error } = await supabase.from('livros').insert([{ title, author, price, image, description }]).select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao criar livro" });
    }
});

// PUT /api/livros/:id - Atualizar um livro
router.put('/livros/:id', async (req, res) => {
    const { id } = req.params;
    const { title, author, price, image, description } = req.body;
    try {
        const { data, error } = await supabase.from('livros').update({ title, author, price, image, description }).eq('id', id).select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao atualizar livro" });
    }
});

// DELETE /api/livros/:id - Deletar um livro
router.delete('/livros/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('livros').delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: "Livro deletado" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao deletar livro" });
    }
});

// ============================================
// 🎉 CRUD PARA PROMOÇÕES (Supabase)
// ============================================

// GET /api/promocoes - Listar todas as promoções
router.get('/promocoes', async (req, res) => {
    try {
        const { data, error } = await supabase.from('promocoes').select('*');
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao buscar promoções" });
    }
});

// POST /api/promocoes - Criar uma nova promoção
router.post('/promocoes', async (req, res) => {
    const { bookId, book_id, discount_type, discountType, discount_value, discountValue, start_date, end_date } = req.body;
    const bookIdFinal = bookId || book_id;
    const discountTypeFinal = discount_type || discountType;
    const discountValueFinal = discount_value || discountValue;
    
    try {
        const { data, error } = await supabase.from('promocoes').insert([{
            book_id: bookIdFinal,
            discount_type: discountTypeFinal,
            discount_value: discountValueFinal,
            start_date,
            end_date
        }]).select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao criar promoção" });
    }
});

// PUT /api/promocoes/:id - Atualizar uma promoção
router.put('/promocoes/:id', async (req, res) => {
    const { id } = req.params;
    const { bookId, book_id, discount_type, discountType, discount_value, discountValue, start_date, end_date, category } = req.body;
    const bookIdFinal = bookId || book_id;
    const discountTypeFinal = discount_type || discountType;
    const discountValueFinal = discount_value || discountValue;
    
    try {
        const { data, error } = await supabase.from('promocoes').update({
            book_id: bookIdFinal,
            discount_type: discountTypeFinal,
            discount_value: discountValueFinal,
            start_date,
            end_date,
            category
        }).eq('id', id).select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao atualizar promoção" });
    }
});

// DELETE /api/promocoes/:id - Deletar uma promoção
router.delete('/promocoes/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('promocoes').delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: "Promoção deletada" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao deletar promoção" });
    }
});

module.exports = router;