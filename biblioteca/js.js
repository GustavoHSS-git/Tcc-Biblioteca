(function () {
    const steamCards = document.querySelector('.js-steamCards');

    // Função para buscar livros do Google Books
    async function loadBooksFromGoogle() {
        try {
            const response = await fetch('/api/livros-populares');
            const result = await response.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('Erro ao buscar livros do Google:', error);
            return [];
        }
    }

    // Função para buscar mangás do Jikan
    async function loadMangasFromJikan() {
        try {
            const response = await fetch('/api/mangas-populares');
            const result = await response.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('Erro ao buscar mangás do Jikan:', error);
            return [];
        }
    }

    // Carrega dados das APIs e renderiza os cards
    async function initializeLibrary() {
        try {
            // Busca livros e mangás das APIs externas
            const livros = await loadBooksFromGoogle();
            const mangas = await loadMangasFromJikan();
            
            // Combina livros e mangás
            const allItems = [
                ...livros.map(l => ({ ...l, tipo: 'livro' })),
                ...mangas.map(m => ({ ...m, tipo: 'manga' }))
            ];

            // Renderiza os cards
            allItems.forEach((item, idx) => {
                const imgUrl = encodeURI(item.image);

                const wrapper = document.createElement('div');
                wrapper.className = 'd-steam-card-wrapper';

                const card = document.createElement('div');
                card.className = 'd-steam-card';
                card.style.backgroundImage = `url('${imgUrl}')`;

                card.addEventListener('click', async () => {
                    let pagesForReader = null;
                    let bookId = item.id;
                    let bookTitle = item.title;

                    try {
                        // Tenta buscar páginas da API se existirem
                        const pagesRes = await fetch(`/api/livros/${item.id}/pages`);
                        if (pagesRes.ok) {
                            const pj = await pagesRes.json();
                            if (Array.isArray(pj.data) && pj.data.length) {
                                pagesForReader = pj.data;
                            }
                        }
                    } catch (err) {
                        console.warn('Páginas não disponíveis para este item', err);
                    }

                    // Fallback: usar a imagem da capa se não houver páginas
                    if (!pagesForReader) {
                        pagesForReader = [item.image];
                    }

                    // Armazena dados no localStorage para o leitor
                    try {
                        localStorage.setItem('readerPages', JSON.stringify(pagesForReader));
                        localStorage.setItem('readerBookId', `book-${bookId}`);
                        localStorage.setItem('readerTitle', bookTitle);
                    } catch (err) {
                        console.warn('Erro armazenando dados do leitor', err);
                    }

                    window.location.href = "../leitura/Leitura.html?page=1";
                });

                wrapper.appendChild(card);
                steamCards.appendChild(wrapper);
            });

            console.log(`Biblioteca carregada com ${allItems.length} itens (${livros.length} livros, ${mangas.length} mangás)`);
        } catch (error) {
            console.error('Erro ao inicializar biblioteca:', error);
            
            // Fallback: mostra mensagem de erro ao usuário
            const errorMsg = document.createElement('div');
            errorMsg.style.cssText = 'padding: 20px; text-align: center; color: #999;';
            errorMsg.textContent = 'Erro ao carregar a biblioteca. Tente novamente mais tarde.';
            steamCards.appendChild(errorMsg);
        }
    }

    // Inicializa a biblioteca quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeLibrary);
    } else {
        initializeLibrary();
    }
})();

