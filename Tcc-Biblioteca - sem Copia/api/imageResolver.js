
async function resolveImageUrl(url, title, author, type = 'book') {
    const GENERIC_BOOK_COVER = 'https://placehold.co/300x450/222222/FFFFFF/png?text=Livro+Sem+Capa&font=oswald';
    const GENERIC_MANGA_COVER = 'https://placehold.co/300x450/111111/EEEEEE/png?text=Manga+Sem+Capa&font=oswald';

    if (!url || typeof url !== 'string' || url.trim() === '') {
        return type === 'manga' ? GENERIC_MANGA_COVER : GENERIC_BOOK_COVER;
    }

    // Converter HTTP para HTTPS se necessário
    let resolvedUrl = url.replace(/^http:\/\//i, 'https://');

    // Se for do Google Books, podemos tentar pegar uma versão maior
    if (resolvedUrl.includes('books.google.com')) {
        resolvedUrl = resolvedUrl.replace('zoom=1', 'zoom=3').replace('&edge=curl', '');
    }

    // Se for do Jikan/MyAnimeList
    if (resolvedUrl.includes('myanimelist.net') && resolvedUrl.includes('/images/')) {
        // Já deve estar em alta resolução se for large_image_url
    }

    return resolvedUrl;
}

const GENERIC_BOOK_COVER = 'https://placehold.co/300x450/222222/FFFFFF/png?text=Livro+Sem+Capa&font=oswald';
const GENERIC_MANGA_COVER = 'https://placehold.co/300x450/111111/EEEEEE/png?text=Manga+Sem+Capa&font=oswald';

module.exports = {
    resolveImageUrl,
    GENERIC_BOOK_COVER,
    GENERIC_MANGA_COVER
};
