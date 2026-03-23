const axios = require('axios');
const { resolveImageUrl, GENERIC_MANGA_COVER } = require('./imageResolver');

async function buscarMangas(query) {
    try {
        // A API Jikan v4 usa o endpoint /manga para pesquisas
        const url = `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(query)}&limit=12`;
        console.log('[Jikan] Buscando mangás:', url);
        
        const response = await axios.get(url, { timeout: 5000 });
        
        if (!response.data || !response.data.data) {
            console.warn('[Jikan] Resposta vazia da API');
            return [];
        }

        // Mapeamos o retorno da API para o formato que o seu catálogo espera
        const mangas = await Promise.all((response.data.data || []).map(async (manga) => {
            try {
                const imageUrl = manga.images?.jpg?.image_url || '';
                const imagemResolvida = await resolveImageUrl(
                    imageUrl,
                    manga.title,
                    manga.authors?.map(a => a.name).join(', ') || '',
                    'manga'
                );

                return {
                    id: manga.mal_id?.toString() || 'unknown',
                    title: manga.title || 'Título desconhecido',
                    author: manga.authors?.map(a => a.name).join(', ') || 'Autor Desconhecido',
                    price: 49.90,
                    image: imagemResolvida,
                    description: manga.synopsis || 'Sem sinopse disponível.',
                    category: 'manga'
                };
            } catch (err) {
                console.warn('[Jikan] Erro ao mapear manga:', err.message);
                return null;
            }
        }));
        
        const mangasFiltrados = mangas.filter(m => m !== null);
        console.log(`[Jikan] Encontrados ${mangasFiltrados.length} mangás com imagens`);
        
        // Prefixar IDs em resultados
        return mangasFiltrados.map(m => ({ ...m, id: `m-${m.id}` }));
    } catch (error) {
        console.error("[Jikan] Erro ao buscar mangás:", error.message);
        return [];
    }
}

module.exports = { buscarMangas };