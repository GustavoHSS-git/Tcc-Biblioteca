(function () {
    const steamCards = document.querySelector('.js-steamCards');
    const searchInput = document.getElementById('librarySearchInput');
    let allItems = [];
    const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 horas
    const CACHE_PREFIX = 'biblioteca_cache_';

    function getCachedData(key) {
        try {
            const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
            if (!raw) return null;
            const cached = JSON.parse(raw);
            if (Date.now() - cached.timestamp > CACHE_TTL) {
                localStorage.removeItem(`${CACHE_PREFIX}${key}`);
                return null;
            }
            return cached.data;
        } catch (error) {
            console.warn('Cache de biblioteca indisponível:', error);
            return null;
        }
    }

    function setCachedData(key, data) {
        try {
            localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({ timestamp: Date.now(), data }));
        } catch (error) {
            console.warn('Não foi possível salvar cache de biblioteca:', error);
        }
    }

    function renderLoading() {
        if (!steamCards) return;
        steamCards.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #999;">
                <p>Carregando livros...</p>
            </div>
        `;
    }

    async function loadPersonalLibrary(userId) {
        if (!userId) return [];

        try {
            const response = await fetch(`/api/biblioteca-pessoal/${userId}`);
            const result = await response.json();

            if (result.success && Array.isArray(result.data)) {
                return result.data.map(item => {
                    const livro = item.livros && !Array.isArray(item.livros)
                        ? item.livros
                        : Array.isArray(item.livros) && item.livros.length > 0
                            ? item.livros[0]
                            : item;

                    return {
                        id: livro.id || item.livro_id,
                        title: livro.titulo || livro.title || item.titulo || 'Sem título',
                        author: livro.autor || livro.author || item.autor || 'Autor desconhecido',
                        description: livro.descricao || livro.description || item.descricao || '',
                        image: livro.capa_url || livro.image || item.capa_url || '',
                        price: livro.preco || livro.price || item.preco || 39.90,
                        tipo: (livro.categoria || livro.tipo || item.categoria || item.tipo || 'livro').toString().toLowerCase()
                    };
                });
            }
            return [];
        } catch (error) {
            console.error('Erro ao carregar biblioteca pessoal:', error);
            return [];
        }
    }

    async function loadLocalBooks() {
        try {
            const response = await fetch('/api/livros');
            const result = await response.json();
            if (result.success && Array.isArray(result.data) && result.data.length > 0) {
                return result.data.map(item => ({
                    id: item.id,
                    title: item.titulo || item.title || 'Sem título',
                    author: item.autor || item.author || 'Autor desconhecido',
                    description: item.descricao || item.description || '',
                    image: item.capa_url || item.image || '',
                    price: item.preco || item.price || 39.90,
                    tipo: (item.categoria || item.category || 'livro').toString().toLowerCase()
                }));
            }
            return [];
        } catch (error) {
            console.error('Erro ao carregar livros locais:', error);
            return [];
        }
    }

    // Função para buscar livros do Google Books
    async function loadBooksFromGoogle() {
        const cacheKey = 'livros_percy_jackson';
        const cached = getCachedData(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const response = await fetch('/api/externo/livros?q=intitle:"Percy Jackson"');
            const result = await response.json();
            const data = result.success ? result.data : [];
            setCachedData(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Erro ao buscar livros do Google:', error);
            return cached || [];
        }
    }

    // Função para buscar mangás do Jikan
    async function loadMangasFromJikan() {
        const cacheKey = 'mangas_one_piece';
        const cached = getCachedData(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const response = await fetch('/api/externo/mangas?q=One Piece');
            const result = await response.json();
            const data = result.success ? result.data : [];
            setCachedData(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Erro ao buscar mangás do Jikan:', error);
            return cached || [];
        }
    }

    // Carrega dados das APIs e renderiza os cards
    async function initializeLibrary() {
        try {
            renderLoading();

            const userId = sessionStorage.getItem('userId');
            if (!userId) {
                steamCards.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #999;">
                        <p>Faça login para ver sua biblioteca pessoal.</p>
                        <a href="/Login/Login.html" style="color:#007bff; text-decoration:underline;">Entrar</a>
                    </div>
                `;
                return;
            }

            const personalBooks = await loadPersonalLibrary(userId);
            if (personalBooks.length > 0) {
                allItems = personalBooks;
                renderLibrary(allItems);
                console.log(`Biblioteca pessoal carregada com ${personalBooks.length} itens.`);
                return;
            }

            steamCards.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #ffffff;">
                    <p>Sua biblioteca pessoal ainda está vazia.</p>
                    <p>Compre um livro na loja para vê-lo aqui.</p>
                    <a href="/loja/catalogo.html" style="color:#ffffff; text-decoration:underline; hover:text-decoration:underline;">Ir para a loja</a>
                </div>
            `;
        } catch (error) {
            console.error('Erro ao inicializar biblioteca:', error);
            const errorMsg = document.createElement('div');
            errorMsg.style.cssText = 'padding: 20px; text-align: center; color: #999;';
            errorMsg.textContent = 'Erro ao carregar a biblioteca. Tente novamente mais tarde.';
            steamCards.appendChild(errorMsg);
        }
    }

    function filterLibrary() {
        const query = searchInput?.value.trim().toLowerCase() || '';
        const filtered = allItems.filter(item => {
            const title = (item.title || item.titulo || '').toString().toLowerCase();
            const author = (item.author || item.autor || '').toString().toLowerCase();
            return title.includes(query) || author.includes(query);
        });
        renderLibrary(filtered);
    }

    function renderLibrary(items) {
        steamCards.innerHTML = '';

        if (!items || items.length === 0) {
            steamCards.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #999;">
                    <p>Nenhum livro encontrado.</p>
                </div>
            `;
            return;
        }

        items.forEach((item) => {
            const placeholderCover = 'https://placehold.co/300x450/222222/FFFFFF/png?text=Sem+Capa';
            const imgUrl = item.image ? encodeURI(item.image) : placeholderCover;
            const fallbackCover = item.image || placeholderCover;

            const wrapper = document.createElement('div');
            wrapper.className = 'd-steam-card-wrapper';

            const card = document.createElement('div');
            card.className = 'd-steam-card';
            card.style.backgroundImage = `url('${imgUrl}')`;

            const overlay = document.createElement('div');
            overlay.className = 'd-steam-card-overlay';

            const meta = document.createElement('div');
            meta.className = 'd-steam-card-meta';
            meta.innerHTML = `
                <h3>${item.title || item.titulo || 'Sem título'}</h3>
                <p>${item.author || item.autor || 'Autor desconhecido'}</p>
            `;

            card.appendChild(overlay);
            card.appendChild(meta);

            card.addEventListener('click', async () => {
                let pagesForReader = null;
                let bookId = item.id;
                let bookTitle = item.title || item.titulo || 'Livro';

                try {
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

                if (!Array.isArray(pagesForReader) || !pagesForReader.length) {
                    pagesForReader = [fallbackCover];
                }

                try {
                    localStorage.setItem('readerPages', JSON.stringify(pagesForReader));
                    localStorage.setItem('readerBookId', `book-${bookId}`);
                    localStorage.setItem('readerTitle', bookTitle);
                } catch (err) {
                    console.warn('Erro armazenando dados do leitor', err);
                }

                window.location.href = '../leitura/Leitura.html?page=1';
            });

            wrapper.appendChild(card);
            steamCards.appendChild(wrapper);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterLibrary);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeLibrary);
    } else {
        initializeLibrary();
    }
})();

