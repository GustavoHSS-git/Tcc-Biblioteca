const express = require('express');
const router = express.Router();
// Importar os serviços das APIs externas
const supabase = require('../supabase');

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
    const { title, author, price, image, description, category, titulo, autor, preco, capa_url, descricao, categoria } = req.body;
    
    // Suporte para ambos os formatos (CamelCase do front vs snake_case do banco)
    const payload = {
        titulo: titulo || title,
        autor: autor || author,
        preco: preco || price,
        capa_url: capa_url || image,
        descricao: descricao || description,
        categoria: categoria || category
    };
    
    try {
        const { data, error } = await supabase.from('livros').insert([payload]).select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao criar livro", details: error.message });
    }
});

// PUT /api/livros/:id - Atualizar um livro
router.put('/livros/:id', async (req, res) => {
    const { id } = req.params;
    const { title, author, price, image, description, category, titulo, autor, preco, capa_url, descricao, categoria } = req.body;
    
    const payload = {
        titulo: titulo || title,
        autor: autor || author,
        preco: preco || price,
        capa_url: capa_url || image,
        descricao: descricao || description,
        categoria: categoria || category
    };
    
    try {
        const { data, error } = await supabase.from('livros').update(payload).eq('id', id).select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao atualizar livro", details: error.message });
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
        // Retorna vazio silenciosamente se a tabela não existir
        res.json({ success: true, data: [] });
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

// ============================================
// 👤 PERFIL (Supabase)
// ============================================
router.get('/perfil/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('perfil')
            .select('*')
            .eq('id', req.params.id)
            .maybeSingle(); // Usar maybeSingle para não disparar erro se não encontrar
        
        if (error) throw error;

        if (!data) {
            return res.status(404).json({ success: false, message: "Perfil ainda não configurado para este usuário." });
        }

        res.json({ success: true, data });
    } catch (error) {
        console.error('Erro ao buscar perfil:', error.message);
        res.status(500).json({ success: false, message: "Erro ao buscar perfil no servidor", details: error.message });
    }
});

router.put('/perfil/:id', async (req, res) => {
    const { nome, bio, foto_perfil } = req.body;
    try {
        const { data, error } = await supabase.from('perfil').update({ nome, bio, foto_perfil }).eq('id', req.params.id).select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao atualizar perfil" });
    }
});

// ============================================
// ⭐ AVALIAÇÕES (Supabase)
// ============================================
router.get('/avaliacoes/:livro_id', async (req, res) => {
    try {
        const { data, error } = await supabase.from('avaliacoes').select('*, perfil(nome, foto_perfil)').eq('livro_id', req.params.livro_id);
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao buscar avaliações" });
    }
});

router.post('/avaliacoes', async (req, res) => {
    const { livro_id, perfil_id, nota, comentario } = req.body;
    try {
        const { data, error } = await supabase.from('avaliacoes').insert([{ livro_id, perfil_id, nota, comentario }]).select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao criar avaliação" });
    }
});

// GET /api/avaliacoes/user/:id - Listar todas as avaliações de um usuário específico
router.get('/avaliacoes/user/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('avaliacoes')
            .select('*, livros(*)')
            .eq('perfil_id', req.params.id);
        
        if (error) throw error;
        
        // Formatar para incluir informações do livro no padrão esperado pelo front
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao buscar avaliações do usuário", details: error.message });
    }
});

// ============================================
// ❤️ LISTA DE DESEJOS (Supabase)
// ============================================
router.get('/desejos/:perfil_id', async (req, res) => {
    try {
        const { data, error } = await supabase.from('lista_de_desejos').select('*, livros(*)').eq('perfil_id', req.params.perfil_id);
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao buscar lista de desejos" });
    }
});

router.post('/desejos', async (req, res) => {
    const { perfil_id, livro_id } = req.body;
    try {
        const { data, error } = await supabase.from('lista_de_desejos').insert([{ perfil_id, livro_id }]).select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao adicionar desejo" });
    }
});

router.delete('/desejos/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('lista_de_desejos').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true, message: "Item removido da lista de desejos" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao deletar desejo" });
    }
});

// ============================================
// 📚 BIBLIOTECA PESSOAL (Supabase)
// ============================================
router.get('/biblioteca-pessoal/:perfil_id', async (req, res) => {
    try {
        const { data, error } = await supabase.from('biblioteca_pessoal').select('*, livros(*)').eq('perfil_id', req.params.perfil_id);
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao buscar conteúdo da biblioteca pessoal" });
    }
});

router.post('/biblioteca-pessoal', async (req, res) => {
    const { perfil_id, livro_id, preco } = req.body;
    try {
        const { data, error } = await supabase.from('biblioteca_pessoal').insert([{ perfil_id, livro_id, preco }]).select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao comprar/adicionar à biblioteca" });
    }
});

// ============================================
// 💰 VENDAS / CARRINHO (Supabase)
// ============================================
router.post('/vendas', async (req, res) => {
    const { items, perfil_id } = req.body;
    
    if (!items || !items.length) {
        return res.status(400).json({ success: false, message: "Carrinho vazio ou inválido" });
    }
    
    try {
        const insertData = items.map(item => ({
            livro_id: item.id || item.livro_id,
            perfil_id: perfil_id || null, // Perfil de quem comprou (pode ser null se for compra anônima por enquanto)
            quantidade: item.quantity || 1,
            preco_unitario: item.price,
            total: item.price * (item.quantity || 1)
        }));
        
        const { data, error } = await supabase.from('vendas').insert(insertData).select();
        
        if (error) {
            console.error('Erro no Supabase ao inserir venda:', error);
            throw error;
        }
        
        res.json({ success: true, message: "Venda registrada com sucesso", data });
    } catch (error) {
        console.error('Erro ao registrar venda:', error.message);
        res.status(500).json({ success: false, message: "Erro ao registrar venda no banco" });
    }
});

module.exports = router;