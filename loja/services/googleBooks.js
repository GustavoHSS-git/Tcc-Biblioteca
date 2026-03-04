const axios = require('axios');

// Dados mockados para usar como fallback quando a API falhar
const livrosMockados = [
    { id: '1', title: 'O Hobbit', author: 'J.R.R. Tolkien', price: 39.90, image: 'https://covers.openlibrary.org/b/id/7887520-M.jpg', description: 'Uma aventura fantástica clássica.' },
    { id: '2', title: '1984', author: 'George Orwell', price: 34.90, image: 'https://covers.openlibrary.org/b/id/7921457-M.jpg', description: 'Um romance distópico perturbador.' },
    { id: '3', title: 'O Senhor dos Anéis', author: 'J.R.R. Tolkien', price: 89.90, image: 'https://covers.openlibrary.org/b/id/7887520-M.jpg', description: 'A épica fantástica mais famosa.' },
    { id: '4', title: 'Ficção Científica', author: 'Isaac Asimov', price: 44.90, image: 'https://covers.openlibrary.org/b/id/7888029-M.jpg', description: 'Histórias de ficção científica clássicas.' },
    { id: '5', title: 'O Código Da Vinci', author: 'Dan Brown', price: 39.90, image: 'https://covers.openlibrary.org/b/id/7880305-M.jpg', description: 'Um thriller de mistério envolvente.' },
    { id: '6', title: 'A Revolução dos Bichos', author: 'George Orwell', price: 29.90, image: 'https://covers.openlibrary.org/b/id/7921457-M.jpg', description: 'Uma alegoria política poderosa.' },
    { id: '7', title: 'O Grande Gatsby', author: 'F. Scott Fitzgerald', price: 34.90, image: 'https://covers.openlibrary.org/b/id/7920705-M.jpg', description: 'Um clássico da literatura americana.' },
    { id: '8', title: 'Fundação', author: 'Isaac Asimov', price: 49.90, image: 'https://covers.openlibrary.org/b/id/7887520-M.jpg', description: 'Sci-fi épica com conceitos de psicohistória.' },
    { id: '9', title: 'Dune', author: 'Frank Herbert', price: 59.90, image: 'https://covers.openlibrary.org/b/id/7887520-M.jpg', description: 'Uma épica de ficção científica espacial.' },
    { id: '10', title: 'O Mundo de Sofia', author: 'Jostein Gaarder', price: 44.90, image: 'https://covers.openlibrary.org/b/id/7880305-M.jpg', description: 'Uma viagem filosófica através da história.' },
    { id: '11', title: 'Cem Anos de Solidão', author: 'Gabriel García Márquez', price: 39.90, image: 'https://covers.openlibrary.org/b/id/7920705-M.jpg', description: 'Realismo mágico na América Latina.' },
    { id: '12', title: 'O Alienista', author: 'Machado de Assis', price: 24.90, image: 'https://covers.openlibrary.org/b/id/7880305-M.jpg', description: 'Um clássico da literatura brasileira.' }
];

async function buscarLivros(query) {
    try {
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=12`;
        console.log('[GoogleBooks] Buscando livros:', url);
        
        const response = await axios.get(url, { timeout: 5000 });
        
        if (!response.data) {
            console.warn('[GoogleBooks] Resposta vazia da API, usando dados mockados');
            return livrosMockados;
        }

        // Convertemos o formato do Google para o formato que seu catalogo.js já usa
        const livros = (response.data.items || []).map(item => {
            try {
                return {
                    id: item.id,
                    title: item.volumeInfo?.title || 'Título desconhecido',
                    author: item.volumeInfo?.authors?.join(', ') || 'Autor Desconhecido',
                    price: item.saleInfo?.listPrice?.amount || 39.90,
                    image: item.volumeInfo?.imageLinks?.thumbnail || '/fotos/default.jpg',
                    description: item.volumeInfo?.description || 'Sem descrição disponível.'
                };
            } catch (err) {
                console.warn('[GoogleBooks] Erro ao mapear livro:', err.message);
                return null;
            }
        }).filter(l => l !== null);
        
        console.log(`[GoogleBooks] Encontrados ${livros.length} livros`);
        // prefixar ids para evitar colisões com mangás
        const livrosComPrefixo = livros.map(l => ({ ...l, id: `g-${l.id}` }));
        const mocksComPrefixo = livrosMockados.map(l => ({ ...l, id: `g-${l.id}` }));
        return livrosComPrefixo.length > 0 ? livrosComPrefixo : mocksComPrefixo;
    } catch (error) {
        console.error("[GoogleBooks] Erro ao buscar livros:", error.message);
        console.log('[GoogleBooks] Usando dados mockados como fallback');
        // prefixar mocks antes de devolver
        return livrosMockados.map(l => ({ ...l, id: `g-${l.id}` }));
    }
}

module.exports = { buscarLivros };