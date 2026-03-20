const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { buscarLivros } = require('./googleBooks');

class BookAutoloader {
  async fetchAndPopulateCatalog(apiEndpoint, batchSize = 50) {
    try {
      const books = await this.fetchBooksFromAPI(apiEndpoint);
      const processedBooks = await this.processBooks(books);
      await this.saveToCatalog(processedBooks);
      console.log(`✓ ${processedBooks.length} livros carregados`);
    } catch (error) {
      console.error('Erro ao carregar livros:', error);
    }
  }

  async fetchBooksFromAPI(query) {
    try {
      console.log(`Buscando livros para: ${query}`);
      const books = await buscarLivros(query);
      return books;
    } catch (error) {
      console.error('Erro ao buscar livros da API:', error);
      return [];
    }
  }

  async downloadImage(url, filename) {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const imagePath = path.join(__dirname, '..', '..', 'fotos', filename);
      fs.writeFileSync(imagePath, response.data);
      return `/fotos/${filename}`;
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
      return '/fotos/ca.jfif'; // fallback
    }
  }

  async processBooks(books) {
    const processed = [];
    for (const book of books) {
      let cover = book.image;
      if (cover && cover.startsWith('http')) {
        // Baixar imagem automaticamente
        const ext = path.extname(cover) || '.jpg';
        const filename = `book_${book.id}${ext}`;
        cover = await this.downloadImage(cover, filename);
      }
      processed.push({
        title: book.title || 'Sem título',
        author: book.author || 'Autor desconhecido',
        description: book.description || '',
        cover: cover || '/fotos/ca.jfif',
        isbn: book.id || null,
        publishedDate: book.publishedDate || null,
        pageCount: book.pageCount || 0,
        price: book.price || 29.90,
        category: book.category || 'livro'
      });
    }
    return processed;
  }

  async saveToCatalog(books) {
    try {
      const catalogPath = path.join(__dirname, '..', 'catalog.json');
      const existingBooks = fs.existsSync(catalogPath) ? JSON.parse(fs.readFileSync(catalogPath, 'utf8')) : [];
      const allBooks = [...existingBooks, ...books];
      fs.writeFileSync(catalogPath, JSON.stringify(allBooks, null, 2));
      console.log(`Catálogo salvo com ${allBooks.length} livros`);
    } catch (error) {
      console.error('Erro ao salvar catálogo:', error);
    }
  }
}

module.exports = BookAutoloader;