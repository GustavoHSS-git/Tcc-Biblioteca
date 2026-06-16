const express = require('express');
const router = express.Router();
// Importar os serviços das APIs externas
const supabase = require('../supabase');

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================
//  CRUD PARA LIVROS (Supabase)
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
//  LISTA DE DESEJOS Supabase - Direto no Perfil
// ============================================

// GET /api/desejos/:perfil_id - Listar desejos salvos no perfil
router.get('/desejos/:perfil_id', async (req, res) => {
    try {
        const { perfil_id } = req.params;
        console.log(`[GET /desejos] Buscando desejos para perfil_id: ${perfil_id}`);

        // Buscamos direto da tabela de desejos (agora com metadados)
        const { data, error } = await supabase
            .from('lista_de_desejos')
            .select('*')
            .eq('perfil_id', perfil_id);

        if (error) throw error;


        const formattedData = data.map(item => {
            // Se o join não trouxe nada (ou nem foi feito), montamo o objeto "livros" fictício
            if (!item.livros || item.livros.length === 0) {
                item.livros = {
                    id: item.livro_id,
                    titulo: item.titulo || 'Livro sem título',
                    autor: item.autor || 'Autor desconhecido',
                    capa_url: item.capa_url || null,
                    preco: item.preco || 39.90
                };
            }
            return item;
        });

        res.json({ success: true, data: formattedData });
    } catch (error) {
        console.error('[GET /desejos] Erro:', error.message);
        res.status(500).json({ success: false, message: "Erro ao buscar lista de desejos", error: error.message });
    }
});

// POST /api/desejos - Salvar livro no perfil 
router.post('/desejos', async (req, res) => {
    const { perfil_id, livro_id, book_data } = req.body;
    try {
        console.log(`[POST /desejos] Salvando no perfil - perfil_id: ${perfil_id}, livro_id: ${livro_id}`);

        if (!perfil_id || !livro_id) {
            return res.status(400).json({ success: false, message: "perfil_id e livro_id são obrigatórios" });
        }

        // SALVA DIRETO: Insere direto na lista de desejos usando os dados enviados pelo front
        // Simplifiquei o payload para remover campos que podem estar causando erro de coluna inexistente
        const payload = {
            perfil_id: perfil_id,
            livro_id: String(livro_id),
            titulo: book_data?.titulo || book_data?.title || 'Livro sem título',
            autor: book_data?.autor || book_data?.author || 'Autor desconhecido',
            capa_url: book_data?.capa_url || book_data?.image || book_data?.image_url || null
        };

        const { data, error } = await supabase
            .from('lista_de_desejos')
            .insert([payload])
            .select();

        if (error) {
            console.error('[POST /desejos] Erro do Supabase:', error.message);
            // Se for duplicata já está na lista retornama sucesso apenas
            if (/duplicate|unique/i.test(error.message)) {
                return res.json({ success: true, message: "Livro já está nos desejos", data: [] });
            }
            throw error;
        }

        console.log('[POST /desejos] Salvo com sucesso no perfil');
        res.json({ success: true, message: "Salvo no perfil!", data });
    } catch (error) {
        console.error('[POST /desejos] Erro inesperado:', error.message);
        res.status(500).json({ success: false, message: "Erro ao salvar no perfil", details: error.message });
    }
});

// DELETE /api/desejos/:id - Remover do perfil
router.delete('/desejos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('lista_de_desejos').delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: "Item removido do perfil" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao deletar desejo", error: error.message });
    }
});

// ============================================
//  OUTROS ENDPOINTS (Legado)
// ============================================
router.get('/livros', async (req, res) => {
    try {
        const { data, error } = await supabase.from('livros').select('*');
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao buscar livros" });
    }
});

router.get('/livros/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const query = uuidPattern.test(id)
            ? supabase.from('livros').select('*').eq('id', id).maybeSingle()
            : supabase.from('livros').select('*').eq('id_externo', id).maybeSingle();
        const { data, error } = await query;
        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: 'Livro não encontrado' });
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao buscar livro', details: error.message });
    }
});

// ============================================
// 💰 VENDAS (Checkout & Ranking)
// ============================================

// POST /api/vendas - Registrar venda de itens
router.post('/vendas', async (req, res) => {
    const { perfil_id, items } = req.body;

    if (!items || !items.length) {
        return res.status(400).json({ success: false, message: "Dados de venda incompletos" });
    }

    try {
        let vendasData = [];
        let bibliotecaData = [];

        // Para cada item, garantir que temos um UUID válido da tabela livros
        for (const item of items) {
            let livroUuid = item.id || item.livro_id;

            // Verifica se é UUID válido, se não for, precisamos buscar/inserir no banco 'livros'
            if (!uuidPattern.test(livroUuid)) {
                // Tenta achar em livros pelo id_externo ou titulo+autor
                const { data: existingBook } = await supabase
                    .from('livros')
                    .select('id')
                    .or(`id_externo.eq.${livroUuid},and(titulo.eq."${item.title}",autor.eq."${item.author}")`)
                    .maybeSingle();

                if (existingBook && existingBook.id) {
                    livroUuid = existingBook.id;
                } else {
                    // Insere o livro externo no banco para ter um UUID
                    const { data: newBook, error: insertErr } = await supabase
                        .from('livros')
                        .insert([{
                            id_externo: livroUuid,
                            titulo: item.title,
                            autor: item.author,
                            preco: item.price,
                            capa_url: item.image,
                            categoria: item.tipo || 'livro'
                        }])
                        .select('id')
                        .single();

                    if (newBook && newBook.id) {
                        livroUuid = newBook.id;
                    } else {
                        throw new Error("Não foi possível resolver o UUID do livro exerno: " + item.title);
                    }
                }
            }

            vendasData.push({
                perfil_id: perfil_id || null,
                livro_id: livroUuid,
                quantidade: item.quantity || 1,
                preco_unitario: item.price,
                total: item.price * (item.quantity || 1)
            });

            if (perfil_id) {
                bibliotecaData.push({
                    perfil_id: perfil_id,
                    livro_id: livroUuid,
                    preco: item.price
                });
            }
        }

        // Insere as vendas
        const { error: vendasError } = await supabase
            .from('vendas')
            .insert(vendasData);

        if (vendasError) throw vendasError;

        // Insere na biblioteca pessoal
        if (bibliotecaData.length > 0) {
            await supabase.from('biblioteca_pessoal').insert(bibliotecaData);
        }

        res.json({ success: true, message: "Venda registrada com sucesso!" });
    } catch (error) {
        console.error('Erro ao registrar venda:', error.message || error);
        res.status(500).json({ success: false, message: "Erro ao processar checkout" });
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
//  AVALIAÇÕES (Supabase)
// ============================================
// GET /api/avaliacoes/user/:id - Listar todas as avaliações de um usuário específico
router.get('/avaliacoes/user/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('avaliacoes')
            .select('*, livros(*)')
            .eq('perfil_id', req.params.id);

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao buscar avaliações do usuário", details: error.message });
    }
});

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

router.delete('/avaliacoes/:id', async (req, res) => {
    try {
        const reviewId = req.params.id;
        const { data: existing, error: existingError } = await supabase.from('avaliacoes').select('id').eq('id', reviewId).maybeSingle();
        if (existingError) throw existingError;
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Avaliação não encontrada' });
        }

        // Tenta soft delete se a coluna ativo existir. Caso contrário, remove o registro.
        const { data, error } = await supabase.from('avaliacoes').update({ ativo: false }).eq('id', reviewId);
        if (error) {
            const deleteResult = await supabase.from('avaliacoes').delete().eq('id', reviewId);
            if (deleteResult.error) throw deleteResult.error;
            return res.json({ success: true, message: 'Comentário inativado com sucesso.' });
        }

        if (!data || (Array.isArray(data) && data.length === 0)) {
            return res.status(500).json({ success: false, message: 'Não foi possível inativar a avaliação.' });
        }

        res.json({ success: true, message: 'Comentário inativado com sucesso.', data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao inativar avaliação', details: error.message || null });
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
//  LISTA DE DESEJOS (Supabase)
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
//  BIBLIOTECA PESSOAL (Supabase)
// ============================================
router.get('/biblioteca-pessoal/:perfil_id', async (req, res) => {
    try {
        const { data, error } = await supabase.from('biblioteca_pessoal').select('*, livros!biblioteca_pessoal_livro_id_fkey(*)').eq('perfil_id', req.params.perfil_id);
        if (error) throw error;

        const formattedData = data.map(item => {
            // fallback para exibir mesmos dados caso livros no supabase falhe (join null)
            if (!item.livros || item.livros.length === 0) {
                item.livros = {
                    id: item.livro_id || item.livro_id_externo,
                    titulo: item.titulo || 'Livro sem título',
                    autor: item.autor || 'Autor desconhecido',
                    capa_url: item.capa_url || null,
                    preco: item.preco || 0
                };
            } else if (Array.isArray(item.livros)) {
                // Tratar se retornar array por algum motivo do foreign key
                item.livros = item.livros[0] || {};
            }
            return item;
        });

        res.json({ success: true, data: formattedData });
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

module.exports = router;