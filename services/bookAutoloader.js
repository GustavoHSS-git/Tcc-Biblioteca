const axios = require('axios');
const supabase = require('../supabase');
const { buscarLivros } = require('../api/googleBooks');
const { buscarMangas } = require('../api/jikan');

class BookAutoloader {
  constructor() {
    this.googleBooks = [];
    this.mangas = [];
    this.syncLog = [];
  }

  /**
   * Log de sincronização para debug
   */
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logEntry);
    this.syncLog.push(logEntry);
  }

  /**
   * 📚 Busca e processa livros do Google Books
   */
  async loadGoogleBooks(searchTerms = ['bestsellers', 'ficção', 'romance', 'mistério', 'tecnologia']) {
    try {
      this.log('Iniciando busca de livros no Google Books...');

      for (const term of searchTerms) {
        this.log(`Buscando: "${term}"`);
        const books = await buscarLivros(term);
        this.googleBooks = [...this.googleBooks, ...books];

        // Evitar rate limit
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      this.log(`Total de livros encontrados: ${this.googleBooks.length}`, 'success');
      return this.googleBooks;
    } catch (error) {
      this.log(`Erro ao buscar livros: ${error.message}`, 'error');
      return [];
    }
  }

  /**
   * 🎌 Busca e processa mangás da Jikan API
   */
  async loadJikanMangas(searchTerms = ['action', 'adventure', 'drama', 'fantasy', 'slice of life']) {
    try {
      this.log('Iniciando busca de mangás na Jikan...');

      for (const term of searchTerms) {
        this.log(`Buscando: "${term}"`);
        const mangas = await buscarMangas(term);
        this.mangas = [...this.mangas, ...mangas];

        // Evitar rate limit
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      this.log(`Total de mangás encontrados: ${this.mangas.length}`, 'success');
      return this.mangas;
    } catch (error) {
      this.log(`Erro ao buscar mangás: ${error.message}`, 'error');
      return [];
    }
  }

  /**
   * ✅ Normaliza dados para o padrão do banco de dados
   */
  normalizeBook(book, category = 'livro') {
    return {
      titulo: book.title || 'Sem título',
      autor: book.author || 'Autor desconhecido',
      descricao: book.description || '',
      capa_url: book.image || null,
      categoria: category,
      preco: parseFloat(book.price) || 29.90, // Suporta decimais (ex: 29.90)
      id_externo: book.id || null,
      data_adicao: new Date().toISOString(),
      ativo: true
    };
  }

  /**
   * 💾 Salva livros únicos no Supabase (evita duplicatas)
   */
  async saveToSupabase(booksToSave, category = 'livro') {
    try {
      this.log(`Salvando ${booksToSave.length} livros no Supabase...`);

      let saved = 0;
      let duplicates = 0;

      for (const book of booksToSave) {
        const normalized = this.normalizeBook(book, category);

        // Verifica se livro já existe (por título + autor)
        const { data: existing } = await supabase
          .from('livros')
          .select('id')
          .eq('titulo', normalized.titulo)
          .eq('autor', normalized.autor)
          .limit(1);

        if (existing && existing.length > 0) {
          duplicates++;
          continue;
        }

        // Insere novo livro
        const { data, error } = await supabase
          .from('livros')
          .insert([normalized]);

        if (error) {
          this.log(`Erro ao salvar "${normalized.titulo}": ${error.message}`, 'warn');
        } else {
          saved++;
        }

        // Pequeno delay para não sobrecarregar banco de dados
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.log(`Salvos: ${saved} | Duplicados: ${duplicates}`, 'success');
      return { saved, duplicates };
    } catch (error) {
      this.log(`Erro fatal ao salvar: ${error.message}`, 'error');
      return { saved: 0, duplicates: 0 };
    }
  }

  /**
   * 🔄 Executa sincronização completa
   */
  async syncAll() {
    this.log('========== INICIANDO SINCRONIZAÇÃO COMPLETA ==========');

    const startTime = Date.now();

    try {
      // 1. Carregar dados das APIs
      await this.loadGoogleBooks();
      await this.loadJikanMangas();

      // 2. Salvar livros
      const googleResult = await this.saveToSupabase(this.googleBooks, 'livro');

      // 3. Salvar mangás
      const jikanResult = await this.saveToSupabase(this.mangas, 'manga');

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      this.log('========== SINCRONIZAÇÃO CONCLUÍDA ==========', 'success');
      this.log(`Tempo total: ${duration}s`);

      return {
        success: true,
        books: googleResult,
        mangas: jikanResult,
        duration: `${duration}s`,
        logs: this.syncLog
      };
    } catch (error) {
      this.log(`Erro crítico: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message,
        logs: this.syncLog
      };
    }
  }

  /**
   * 📊 Retorna estatísticas da sincronização
   */
  getStats() {
    return {
      googleBooks: this.googleBooks.length,
      mangas: this.mangas.length,
      total: this.googleBooks.length + this.mangas.length,
      logs: this.syncLog
    };
  }

  /**
   * 🗑️ Limpa logs
   */
  clearLogs() {
    this.syncLog = [];
  }
}

module.exports = BookAutoloader;