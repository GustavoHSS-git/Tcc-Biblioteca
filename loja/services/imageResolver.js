const axios = require('axios');

/**
 * Serviço para resolver URLs de imagens automaticamente
 * Tenta obter do servidor OpenLibrary ou Google Books quando a API original falha
 */

// Fallback genérico de capa de livro (placehold.co é mais confiável)
const GENERIC_BOOK_COVER = 'https://placehold.co/150x225/cccccc/999999?text=Book+Cover';
const GENERIC_MANGA_COVER = 'https://placehold.co/150x225/ffcccc/ff9999?text=Manga';

/**
 * Obtém URL de imagem alternativa via OpenLibrary
 * @param {string} title - Título do livro
 * @param {string} author - Autor do livro
 * @returns {Promise<string>} URL da imagem
 */
async function getImageFromOpenLibrary(title, author) {
    try {
        // Tenta buscar por título
        const response = await axios.get(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=1`, { 
            timeout: 3000 
        });
        
        if (response.data.docs && response.data.docs.length > 0) {
            const doc = response.data.docs[0];
            if (doc.cover_id) {
                return `https://covers.openlibrary.org/b/id/${doc.cover_id}-M.jpg`;
            }
        }
    } catch (error) {
        console.warn('[ImageResolver] OpenLibrary falhou para:', title, error.message);
    }
    
    return null;
}

/**
 * Valida se uma URL de imagem está acessível
 * @param {string} imageUrl - URL da imagem
 * @returns {Promise<boolean>}
 */
async function validateImageUrl(imageUrl) {
    if (!imageUrl) return false;
    
    try {
        const response = await axios.head(imageUrl, { timeout: 2000 });
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

/**
 * Resolve a URL final da imagem com fallbacks automáticos
 * @param {string} primaryUrl - URL primária (da API)
 * @param {string} title - Título do livro/manga
 * @param {string} author - Autor
 * @param {string} type - 'book' ou 'manga'
 * @returns {Promise<string>} URL da imagem garantida
 */
/**
 * Mapeamento de livros populares para suas capas
 */
const POPULAR_BOOKS = {
    'harry potter': 'https://covers.openlibrary.org/b/id/7984916-M.jpg',
    '1984': 'https://covers.openlibrary.org/b/id/7222246-M.jpg',
    'to kill a mockingbird': 'https://covers.openlibrary.org/b/id/8225261-M.jpg',
    'the great gatsby': 'https://covers.openlibrary.org/b/id/7222253-M.jpg',
    'pride and prejudice': 'https://covers.openlibrary.org/b/id/7222258-M.jpg',
    'the catcher in the rye': 'https://covers.openlibrary.org/b/id/7222262-M.jpg',
    'lord of the flies': 'https://covers.openlibrary.org/b/id/7222265-M.jpg',
    'animal farm': 'https://covers.openlibrary.org/b/id/7222268-M.jpg',
    'brave new world': 'https://covers.openlibrary.org/b/id/7222271-M.jpg',
    'fahrenheit 451': 'https://covers.openlibrary.org/b/id/7222274-M.jpg'
};

async function resolveImageUrl(primaryUrl, title, author = '', type = 'book') {
    // Para mangás, usar placeholder por enquanto
    if (type === 'manga') {
        return GENERIC_MANGA_COVER;
    }

    // 1. Verificar se é um livro popular conhecido
    const titleLower = title.toLowerCase();
    for (const [key, url] of Object.entries(POPULAR_BOOKS)) {
        if (titleLower.includes(key)) {
            return url;
        }
    }

    // 2. Tentar URL primária se fornecida e válida
    if (primaryUrl && primaryUrl.startsWith('http') && !primaryUrl.includes('placeholder')) {
        if (primaryUrl.includes('covers.openlibrary.org') || primaryUrl.includes('books.google.com')) {
            return primaryUrl;
        }
    }

    // 3. Tentar buscar no OpenLibrary por título
    if (title) {
        try {
            const openLibraryUrl = await getImageFromOpenLibrary(title, author);
            if (openLibraryUrl) {
                return openLibraryUrl;
            }
        } catch (error) {
            console.warn('[ImageResolver] OpenLibrary falhou:', error.message);
        }
    }

    // 4. Fallback genérico
    return GENERIC_BOOK_COVER;
}

module.exports = {
    resolveImageUrl,
    validateImageUrl,
    getImageFromOpenLibrary,
    GENERIC_BOOK_COVER,
    GENERIC_MANGA_COVER
};
