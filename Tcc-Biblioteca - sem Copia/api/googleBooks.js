const axios = require('axios');
const { resolveImageUrl, GENERIC_BOOK_COVER } = require('./imageResolver');

// Função para traduzir texto para português
async function translateToPortuguese(text) {
    if (!text || text.length < 5) return text; // Texto muito curto, pula
    
    // Sempre tenta traduzir, pois a API é gratuita e langpair=en|pt
    try {
        const response = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|pt`, { timeout: 5000 });
        if (response.data.responseData && response.data.responseData.translatedText) {
            return response.data.responseData.translatedText;
        }
    } catch (error) {
        console.warn('[GoogleBooks] Erro na tradução:', error.message);
    }
    return text; // Fallback para original
}

// Delay entre requisições (ms)
const DELAY_MS = 1000;

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
                description: await translateToPortuguese(item.volumeInfo?.description || 'Sem descrição disponível.')
            };
        } catch (err) {
            console.warn('[GoogleBooks] Erro ao mapear livro:', err.message);
            return null;
        }
    }));
    
    const livrosFiltrados = livros.filter(l => l !== null);
    console.log(`[GoogleBooks] Processados ${livrosFiltrados.length} livros com imagens`);
    
    // Filtrar títulos duplicados (baseado em título + autor)
    const uniqueLivros = [];
    const seenKeys = new Set();
    for (const livro of livrosFiltrados) {
        const key = `${livro.title.toLowerCase()}|${livro.author.toLowerCase()}`;
        if (!seenKeys.has(key)) {
            seenKeys.add(key);
            uniqueLivros.push(livro);
        }
    }
    console.log(`[GoogleBooks] Após filtrar duplicatas: ${uniqueLivros.length} livros únicos`);
    
    // Prefixar IDs para evitar colisões com mangás
    return uniqueLivros.map(l => ({ ...l, id: `g-${l.id}` }));
}

/**
 * Busca livros do Google Books
 */
async function buscarLivros(query) {
    try {
        console.log('[GoogleBooks] Buscando livros com termo:', query);
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=40&langRestrict=pt`;
        
        const response = await axios.get(url, { timeout: 5000 });
        
        if (response.data && response.data.items && response.data.items.length > 0) {
            console.log('[GoogleBooks] ✅ Sucesso! Processando livros...');
            return await processarLivros(response.data.items);
        } else {
            console.log('[GoogleBooks] Nenhum livro encontrado');
            return [];
        }
    } catch (error) {
        console.error('[GoogleBooks] Erro:', error.message);
        return [];
    }
}

module.exports = { buscarLivros };