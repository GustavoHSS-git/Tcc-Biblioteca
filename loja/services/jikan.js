const axios = require('axios');

// Dados mockados para usar como fallback quando a API falhar
const mangasMockados = [
    { id: '1', title: 'One Piece', author: 'Eiichiro Oda', price: 49.90, image: 'https://covers.openlibrary.org/b/id/7888520-M.jpg', description: 'A maior aventura de um pirata.', category: 'manga' },
    { id: '2', title: 'Naruto', author: 'Masashi Kishimoto', price: 49.90, image: 'https://covers.openlibrary.org/b/id/7889145-M.jpg', description: 'A jornada de um jovem ninja.', category: 'manga' },
    { id: '3', title: 'Death Note', author: 'Tsugumi Ohba', price: 44.90, image: 'https://covers.openlibrary.org/b/id/7888525-M.jpg', description: 'Um thriller psicológico único.', category: 'manga' },
    { id: '4', title: 'Bleach', author: 'Tite Kubo', price: 49.90, image: 'https://covers.openlibrary.org/b/id/7888530-M.jpg', description: 'Batalhas épicas no mundo espiritual.', category: 'manga' },
    { id: '5', title: 'Attack on Titan', author: 'Hajime Isayama', price: 54.90, image: 'https://covers.openlibrary.org/b/id/7888535-M.jpg', description: 'Humanidade contra gigantes.', category: 'manga' },
    { id: '6', title: 'Dragon Ball', author: 'Akira Toriyama', price: 49.90, image: 'https://covers.openlibrary.org/b/id/7888540-M.jpg', description: 'Aventuras e torneios de artes marciais.', category: 'manga' },
    { id: '7', title: 'My Hero Academia', author: 'Kohei Horikoshi', price: 49.90, image: 'https://covers.openlibrary.org/b/id/7888545-M.jpg', description: 'Um adolescente sem poderes em um mundo de super-heróis.', category: 'manga' },
    { id: '8', title: 'Demon Slayer', author: 'Koyoharu Gotouge', price: 44.90, image: 'https://covers.openlibrary.org/b/id/7888550-M.jpg', description: 'Caçadores de demônios em ação.', category: 'manga' },
    { id: '9', title: 'Steins;Gate', author: 'Chiyomaru Shikura', price: 54.90, image: 'https://covers.openlibrary.org/b/id/7888555-M.jpg', description: 'Viagens no tempo e paradoxos.', category: 'manga' },
    { id: '10', title: 'Fullmetal Alchemist', author: 'Hiromu Arakawa', price: 49.90, image: 'https://covers.openlibrary.org/b/id/7888560-M.jpg', description: 'Alquimia e redenção.', category: 'manga' },
    { id: '11', title: 'Jujutsu Kaisen', author: 'Gege Akutami', price: 49.90, image: 'https://covers.openlibrary.org/b/id/7888565-M.jpg', description: 'Feiticeiros contra espíritos malévolos.', category: 'manga' },
    { id: '12', title: 'Mob Psycho 100', author: 'ONE', price: 44.90, image: 'https://covers.openlibrary.org/b/id/7888570-M.jpg', description: 'Um adolescente com poderes psíquicos.', category: 'manga' }
];

async function buscarMangas(query) {
    try {
        // A API Jikan v4 usa o endpoint /manga para pesquisas
        const url = `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(query)}&limit=12`;
        console.log('[Jikan] Buscando mangás:', url);
        
        const response = await axios.get(url, { timeout: 5000 });
        
        if (!response.data) {
            console.warn('[Jikan] Resposta vazia da API, usando dados mockados');
            return mangasMockados;
        }

        // Mapeamos o retorno da API para o formato que o seu catálogo espera
        const mangas = (response.data.data || []).map(manga => {
            try {
                return {
                    id: manga.mal_id?.toString() || 'unknown',
                    title: manga.title || 'Título desconhecido',
                    author: manga.authors?.map(a => a.name).join(', ') || 'Autor Desconhecido',
                    price: 49.90,
                    image: manga.images?.jpg?.image_url || '/fotos/default.jpg',
                    description: manga.synopsis || 'Sem sinopse disponível.',
                    category: 'manga'
                };
            } catch (err) {
                console.warn('[Jikan] Erro ao mapear manga:', err.message);
                return null;
            }
        }).filter(m => m !== null);
        
        console.log(`[Jikan] Encontrados ${mangas.length} mangás`);
        // prefixar ids em resultados e mocks
        const mangasComPrefixo = mangas.map(m => ({ ...m, id: `m-${m.id}` }));
        const mocksComPrefixo = mangasMockados.map(m => ({ ...m, id: `m-${m.id}` }));
        return mangasComPrefixo.length > 0 ? mangasComPrefixo : mocksComPrefixo;
    } catch (error) {
        console.error("[Jikan] Erro ao buscar mangás:", error.message);
        console.log('[Jikan] Usando dados mockados como fallback');
        return mangasMockados.map(m => ({ ...m, id: `m-${m.id}` }));
    }
}

module.exports = { buscarMangas };