const axios = require('axios');
const { resolveImageUrl, GENERIC_BOOK_COVER } = require('./imageResolver');

// Delay entre requisições (ms)
const DELAY_MS = 1000;

/**
 * Busca livros no OpenLibrary (API pública sem rate limits)
 */
async function buscarLivrosOpenLibrary(query) {
    try {
        console.log('[OpenLibrary] Buscando livros com query:', query);
        const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=12`;
        
        const response = await axios.get(url, { timeout: 5000 });
        
        if (!response.data || !response.data.docs) {
            console.warn('[OpenLibrary] Resposta vazia');
            return [];
        }

        const livros = await Promise.all((response.data.docs || []).map(async (doc) => {
            try {
                // OpenLibrary retorna cover_id, reconstruímos a URL
                const imageUrl = doc.cover_id 
                    ? `https://covers.openlibrary.org/b/id/${doc.cover_id}-M.jpg`
                    : null; // Usar null em vez de string vazia
                
                const imagemResolvida = await resolveImageUrl(
                    imageUrl,
                    doc.title,
                    doc.author_name?.[0] || '',
                    'book'
                );

                return {
                    id: doc.key || `ol-${Math.random()}`,
                    title: doc.title || 'Título desconhecido',
                    author: doc.author_name?.join(', ') || 'Autor Desconhecido',
                    price: 39.90, // OpenLibrary não fornece preço
                    image: imagemResolvida,
                    description: `Publicado em ${doc.first_publish_year || 'ano desconhecido'}`
                };
            } catch (err) {
                console.warn('[OpenLibrary] Erro ao mapear livro:', err.message);
                return null;
            }
        }));
        
        const livrosFiltrados = livros.filter(l => l !== null);
        console.log(`[OpenLibrary] ✅ Processados ${livrosFiltrados.length} livros`);
        return livrosFiltrados.map(l => ({ ...l, id: `o-${l.id}` }));
        
    } catch (error) {
        console.error('[OpenLibrary] Erro:', error.message);
        return [];
    }
}

/**
 * Aguarda um tempo especificado
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Processa array de livros da API
 */
async function processarLivros(items) {
    const livros = await Promise.all((items || []).map(async (item) => {
        try {
            const imageUrl = item.volumeInfo?.imageLinks?.thumbnail || '';
            const imagemResolvida = await resolveImageUrl(
                imageUrl,
                item.volumeInfo?.title,
                item.volumeInfo?.authors?.[0] || '',
                'book'
            );

            return {
                id: item.id,
                title: item.volumeInfo?.title || 'Título desconhecido',
                author: item.volumeInfo?.authors?.join(', ') || 'Autor Desconhecido',
                price: item.saleInfo?.listPrice?.amount || 39.90,
                image: imagemResolvida,
                description: item.volumeInfo?.description || 'Sem descrição disponível.'
            };
        } catch (err) {
            console.warn('[GoogleBooks] Erro ao mapear livro:', err.message);
            return null;
        }
    }));
    
    const livrosFiltrados = livros.filter(l => l !== null);
    console.log(`[GoogleBooks] Processados ${livrosFiltrados.length} livros com imagens`);
    
    // Prefixar IDs para evitar colisões com mangás
    return livrosFiltrados.map(l => ({ ...l, id: `g-${l.id}` }));
}

/**
 * Busca livros do Google Books com fallback automático para OpenLibrary
 */
async function buscarLivros(query) {
    try {
        // Tenta Google Books primeiro
        console.log('[GoogleBooks] Tentando buscar com termo:', query);
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=12`;
        
        const response = await axios.get(url, { timeout: 5000 });
        
        if (response.data && response.data.items && response.data.items.length > 0) {
            console.log('[GoogleBooks] ✅ Sucesso! Processando livros...');
            return await processarLivros(response.data.items);
        }
    } catch (error) {
        console.warn('[GoogleBooks] Falhou:', error.message);
    }
    
    // Fallback: OpenLibrary (nunca falha por rate limit)
    console.log('[Fallback] Usando OpenLibrary em vez de Google Books...');
    await delay(DELAY_MS);
    return await buscarLivrosOpenLibrary(query);
}

module.exports = { buscarLivros };