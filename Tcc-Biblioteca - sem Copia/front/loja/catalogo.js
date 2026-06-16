// ============================================
// DADOS DOS LIVROS E MANGÁS (Carregados via APIs Externas)
// ============================================
// Arrays que serão preenchidos pelas APIs do Google Books e Jikan
// URLs das APIs externas: Google Books e Jikan
const API_URL = "http://localhost:3000/api";
let books = [];
let allBooks = []; // Para armazenar livros + mangás combinados
let filteredBooks = [];

// ============================================
// 📊 CONTADOR DE LIVROS E MANGÁS
// ============================================
const COUNTERS = {
    books: 0,
    mangas: 0,
    total: 0,
    equalSplit: 0
};

function updateBookMangaCounters() {
    COUNTERS.books = books.filter(b => (b.tipo || 'livro').toString().toLowerCase() === 'livro').length;
    COUNTERS.mangas = books.filter(b => (b.tipo || 'manga').toString().toLowerCase() === 'manga').length;
    COUNTERS.total = books.length;
    COUNTERS.equalSplit = Math.min(COUNTERS.books, COUNTERS.mangas);
}

function getTotalBooks() {
    return COUNTERS.books;
}

function getTotalMangas() {
    return COUNTERS.mangas;
}

function getTotalItems() {
    return COUNTERS.total;
}

// PAGINAÇÃO
let currentPage = 1;
const itemsPerPage = 10; // 10 livros/mangás por página para 20 páginas com 200 itens

function limitItemsToMaxPages(items, pageCount = 20) {
    const maxItems = pageCount * itemsPerPage;
    return items.length > maxItems ? items.slice(0, maxItems) : items;
}

function normalizeItemKey(item) {
    const normalizeText = text => (text || '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9]/gi, '')
        .toLowerCase();
    return `${normalizeText(item.title)}|${normalizeText(item.author)}`;
}

function dedupeItems(items) {
    const seen = new Set();
    return items.filter(item => {
        const key = normalizeItemKey(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function isBook(item) {
    return (item.tipo || item.category || item.type || 'livro').toString().toLowerCase() === 'livro';
}

function isManga(item) {
    return (item.tipo || item.category || item.type || 'manga').toString().toLowerCase() === 'manga';
}

async function fetchExtraItems(fetcher, needed, existingItems = []) {
    const existingKeys = new Set(existingItems.map(normalizeItemKey));
    const result = [];
    const searchTerms = fetcher === loadMangasFromJikan
        ? ['shounen', 'fantasia', 'ação', 'aventura', 'drama', 'slice of life', 'isekai']
        : ['ficção', 'fantasia', 'romance', 'mistério', 'aventura', 'jovem adulto', 'história', 'biografia'];

    for (const term of searchTerms) {
        if (result.length >= needed) break;
        const items = await fetcher(term);
        for (const item of items) {
            const key = normalizeItemKey(item);
            if (!existingKeys.has(key)) {
                existingKeys.add(key);
                result.push(item);
                if (result.length >= needed) break;
            }
        }
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    return result.slice(0, needed);
}


// ============================================
// 🛒 GERENCIADOR DE CARRINHO (Classe)
// ============================================
// Classe que gerencia toda a lógica do carrinho:
// - add(book): adiciona um livro ao carrinho (ou aumenta quantidade se já existe)
// - remove(bookId): remove um livro do carrinho
// - getTotal(): calcula o preço total de todos os itens
// - loadCart(): carrega o carrinho salvo no localStorage
// - save(): salva o carrinho no localStorage (persistência)
// - updateUI(): atualiza a interface visual do carrinho
// - clear(): limpa todos os itens do carrinho
class Cart {
    constructor() {
        this.items = this.loadCart();
    }

    add(book) {
        this.items.push({ ...book, quantity: 1 });
        this.save();
        this.updateUI();
    }


    remove(bookId) {
        this.items = this.items.filter(item => item.id.toString() !== bookId.toString());
        this.save();
        this.updateUI();
    }

    getTotal() {
        return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    loadCart() {
        const saved = localStorage.getItem("cart");
        return saved ? JSON.parse(saved) : [];
    }

    save() {
        localStorage.setItem("cart", JSON.stringify(this.items));
    }

    updateUI() {
        updateCartUI();
    }

    clear() {
        this.items = [];
        this.save();
        this.updateUI();
    }
}
// ============================================
//  WISHLIST (Lista de Desejos) nos Cards
// ============================================
let userWishlist = []; // IDs dos livros na wishlist do usuário

async function loadUserWishlist() {
    const userId = sessionStorage.getItem('userId');
    if (!userId) return;
    try {
        const res = await fetch(`${API_URL}/desejos/${userId}`);
        const json = await res.json();
        if (json.success && json.data) {
            userWishlist = json.data.map(item => ({
                wishlistId: item.id,
                livroId: item.livro_id
            }));
            // Atualiza os botões que já estão renderizados
            document.querySelectorAll('.wishlist-card-btn').forEach(btn => {
                const bookId = btn.dataset.bookId;
                const inList = userWishlist.some(w => w.livroId === bookId || w.livroId == bookId);
                if (inList) {
                    btn.classList.add('active');
                    btn.innerHTML = '❤️';
                }
            });
        }
    } catch (e) {
        console.error('Erro ao carregar wishlist:', e);
    }
}

async function toggleWishlist(bookId, btn, event) {
    event.stopPropagation(); // Evita abrir detalhes do livro
    event.preventDefault();

    const userId = sessionStorage.getItem('userId');
    if (!userId) {
        showNotification('Faça login para salvar nos desejos', 'warning');
        return;
    }

    const isActive = btn.classList.contains('active');

    if (isActive) {
        // REMOVER da wishlist
        const entry = userWishlist.find(w => w.livroId === bookId || w.livroId == bookId);
        if (entry) {
            try {
                const res = await fetch(`${API_URL}/desejos/${entry.wishlistId}`, { method: 'DELETE' });
                const json = await res.json();
                if (json.success) {
                    btn.classList.remove('active');
                    btn.innerHTML = '🤍';
                    userWishlist = userWishlist.filter(w => w.wishlistId !== entry.wishlistId);
                    showNotification('Removido da lista de desejos', 'info');
                }
            } catch (e) {
                showNotification('Erro ao remover dos desejos', 'error');
            }
        }
    } else {
        // ADICIONAR à wishlist
        try {
            btn.innerHTML = '⏳';
            console.log('[WISHLIST] Enviando:', { perfil_id: userId, livro_id: bookId, typeOfBookId: typeof bookId });
            
            // Busca o objeto completo do livro no catálogo
            const book = books.find(b => b.id.toString() === bookId.toString());
            if (!book) {
                throw new Error('Livro não encontrado no catálogo');
            }

            // Prepara os dados do livro caso o backend precise persistir
            const bookData = {
                id: book.id,
                titulo: book.title || book.titulo,
                autor: book.author || book.autor,
                descricao: book.description || book.descricao || 'Sem descrição',
                capa_url: book.image || book.capa_url,
                preco: book.price || book.preco || 39.90,
                categoria: book.tipo || book.categoria || (book.type === 'manga' ? 'manga' : 'livro')
            };

            const res = await fetch(`${API_URL}/desejos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    perfil_id: userId, 
                    livro_id: bookId,
                    book_data: bookData // Enviamos os dados para facilitar a persistência
                })
            });
            const json = await res.json();
            console.log('[WISHLIST] Resposta:', json);
            if (json.success) {
                btn.classList.add('active');
                btn.innerHTML = '❤️';
                userWishlist.push({ wishlistId: json.data[0]?.id, livroId: bookId });
                showNotification('Adicionado à lista de desejos! ❤️', 'success');
            } else {
                btn.innerHTML = `<img src="../fotos/salvar-instagram.png" alt="Salvar">`;
                showNotification(json.message || 'Erro ao adicionar', 'error');
            }
        } catch (e) {
            btn.innerHTML = `<img src="../fotos/salvar-instagram.png" alt="Salvar">`;
            showNotification('Erro ao conectar com o servidor', 'error');
        }
    }
}

// ============================================
// 🎯 ELEMENTOS DO DOM (Seletores)
// ============================================
// Obtém referências aos elementos HTML principais do documento.
// Esses elementos são usados para manipular a interface (mostrar/ocultar modais,
// atualizar contadores, listar livros, etc.).
// Exemplo: cartBtn é o botão "Carrinho" na navbar; cartModal é o modal do carrinho.
const cart = new Cart();
const booksGrid = document.getElementById("booksGrid");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const categorySelect = document.getElementById("categorySelect");
const cartBtn = document.getElementById("cartBtn");
const cartModal = document.getElementById("cartModal");
const detailModal = document.getElementById("detailModal");
const closeCartBtn = document.getElementById("closeCart");
const closeDetailBtn = document.getElementById("closeDetail");
const cartCount = document.getElementById("cartCount");
const cartTotal = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");

// Outras variáveis de estado
let currentDetailBookId = null;

// ============================================
//  NAVEGAÇÃO PARA DADOS DO LIVRO
// ============================================
function irParaDadosLivro() {
    if (currentDetailBookId) {
        window.location.href = `/dadoslivros/?id=${currentDetailBookId}`;
    }
}

// ============================================
//  CARREGAR DADOS DAS APIs EXTERNAS
// ============================================

// Função para buscar livros do Google Books
async function loadBooksFromGoogle(searchTerm = 'ficção romance jovem adulto') {
    try {
        const response = await fetch(`${API_URL}/externo/livros?q=${encodeURIComponent(searchTerm)}`);
        const result = await response.json();

        if (result.success) {
            return result.data;
        }
        return [];
    } catch (error) {
        console.error("Erro ao buscar livros do Google Books:", error);
        return [];
    }
}

// Função para buscar mangás da Jikan API
async function loadMangasFromJikan(searchTerm = 'shounen romance') {
    try {
        const response = await fetch(`${API_URL}/externo/mangas?q=${encodeURIComponent(searchTerm)}`);
        const result = await response.json();

        if (result.success) {
            return result.data;
        }
        return [];
    } catch (error) {
        console.error("Erro ao buscar mangás da Jikan:", error);
        return [];
    }
}

// Função para busca combinada (livros e mangás)
async function searchCombined(searchTerm) {
    try {
        const livrosRes = await fetch(`${API_URL}/externo/livros?q=${encodeURIComponent(searchTerm)}`);
        const mangasRes = await fetch(`${API_URL}/externo/mangas?q=${encodeURIComponent(searchTerm)}`);

        const livrosData = await livrosRes.json();
        const mangasData = await mangasRes.json();

        let combinado = [];
        if (livrosData.success && livrosData.data) {
            combinado.push(...livrosData.data.map(l => ({ ...l, tipo: 'livro' })));
        }
        if (mangasData.success && mangasData.data) {
            combinado.push(...mangasData.data.map(m => ({ ...m, tipo: 'manga' })));
        }
        return combinado;
    } catch (error) {
        console.error("Erro na busca combinada:", error);
        return [];
    }
}

// ============================================
//  CARREGAR DADOS DA API (Mantido para compatibilidade)
// ============================================
// Função assíncrona que faz requisição GET para a API
// e popula o array 'books' com os dados retornados
// Altere para apontar para a nova rota externa no seu servidor
async function searchExternal(tipo) {
    const term = searchInput.value || "adventure"; // termo padrão
    let resultados = [];

    try {
        if (tipo === 'livro') {
            resultados = await loadBooksFromGoogle(term);
        } else if (tipo === 'manga') {
            resultados = await loadMangasFromJikan(term);
        } else {
            resultados = await searchCombined(term);
        }

        if (resultados.length > 0) {
            // Carregar promoções e aplicar aos livros
            const promotions = await loadPromotions();
            books = applyPromotionsToBooks(resultados, promotions);
            filteredBooks = [...books];
            updateBookMangaCounters();
            currentPage = 1;
            renderBooks(books);
            showNotification(`Encontrados ${resultados.length} resultados!`);
        } else {
            showNotification("Nenhum resultado encontrado", "warning");
        }
    } catch (error) {
        showNotification("Erro ao buscar dados externos", "error");
        console.error(error);
    }
}

// Função para buscar na API
async function searchBooksFromAPI(searchTerm) {
    try {
        allBooks = await searchCombined(searchTerm);

        if (allBooks.length > 0) {
            // Carregar promoções e aplicar aos livros
            const promotions = await loadPromotions();
            allBooks = applyPromotionsToBooks(allBooks, promotions);
            renderBooks(allBooks);
        }
    } catch (error) {
        console.error("Erro na busca:", error);
        showNotification("Erro ao buscar", "error");
    }
}

// Função para filtrar por categoria (livros ou mangás)
function filterByCategory(category) {
    filterBooks(); // O filterBooks agora é o hub central de filtragem visual
}

// ============================================
//  CARREGAR E APLICAR PROMOÇÕES
// ============================================

// Função para carregar promoções ativas
async function loadPromotions() {
    try {
        const response = await fetch(`${API_URL}/promocoes`);
        const result = await response.json();

        if (result.success) {
            return result.data.filter(promo => {
                const now = new Date();
                const endDate = new Date(promo.end_date);
                return endDate > now; // Apenas promoções ativas
            });
        }
        return [];
    } catch (error) {
        console.error("Erro ao carregar promoções:", error);
        return [ ];
    }
}

// Função para aplicar promoções aos livros
function applyPromotionsToBooks(books, promotions) {
    return books.map(book => {
        // Procurar promoção por ID, categoria ou global
        let promotion = promotions.find(promo => promo.book_id == book.id);

        if (!promotion) {
            // Aplicar por categoria (se a promoção tiver category)
            promotion = promotions.find(promo => promo.category && (promo.category.toLowerCase() === (book.tipo || 'livro')));
        }

        if (!promotion) {
            // Promoção global (sem book_id e sem category)
            promotion = promotions.find(promo => !promo.book_id && !promo.category);
        }

        if (promotion) {
            const originalPrice = book.price;
            let discountedPrice = originalPrice;

            if (promotion.discount_type === 'percentual') {
                discountedPrice = originalPrice * (1 - promotion.discount_value / 100);
            } else if (promotion.discount_type === 'fixo') {
                discountedPrice = Math.max(0, originalPrice - promotion.discount_value);
            }

            return {
                ...book,
                originalPrice,
                price: discountedPrice,
                onPromotion: true,
                discountType: promotion.discount_type,
                discountValue: promotion.discount_value
            };
        }
        return { ...book, onPromotion: false };
    });
}

// ============================================
// RENDERIZAR LIVROS
// ============================================
// Função que cria os cards (cartões) de cada livro no grid.
// Recebe um array de livros e gera HTML com imagem, título, autor, preço e botões.
// Botões: "Detalhes" (abre modal com info completa) e "Comprar" (adiciona ao carrinho).

// Função auxiliar para obter URL válida de imagem com fallbacks
function getValidImageUrl(book) {
    console.log('getValidImageUrl chamado para:', book.title);
    console.log('Campos de imagem disponíveis:', {
        image: book.image,
        imageLinks: book.imageLinks,
        cover_image: book.cover_image,
        image_url: book.image_url,
        images: book.images,
        volumeInfo: book.volumeInfo
    });

    // Prioriza diferentes campos de imagem
    const possibleUrls = [
        book.image,
        book.imageLinks?.thumbnail,
        book.imageLinks?.smallThumbnail,
        book.cover_image,
        book.image_url,
        book.images?.[0], // primeira imagem do array
        book.volumeInfo?.imageLinks?.thumbnail, // Google Books
        book.images?.jpg?.image_url, // Jikan
        book.images?.webp?.image_url // Jikan
    ];

    console.log('URLs possíveis:', possibleUrls);

    // Retorna a primeira URL válida
    for (const url of possibleUrls) {
        if (url && typeof url === 'string' && url.startsWith('http')) {
            console.log('URL válida encontrada:', url);
            return url;
        }
    }

    console.log('Nenhuma URL válida encontrada, usando fallback');
    // Imagem padrão se nenhuma for encontrada
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjZGRkIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q2FwYSBuw6NvIGRpc3BvbsOtdmVsPC90ZXh0Pjwvc3ZnPg==';
}

function getBookType(book) {
    return (book.tipo || book.category || book.type || 'livro').toString().toLowerCase();
}

function distributeBooksAndMangas(items) {
    const livros = items.filter(item => getBookType(item) === 'livro');
    const mangas = items.filter(item => getBookType(item) === 'manga');
    const distributed = [];
    const maxLength = Math.max(livros.length, mangas.length);

    for (let i = 0; i < maxLength; i++) {
        if (i < livros.length) distributed.push(livros[i]);
        if (i < mangas.length) distributed.push(mangas[i]);
    }

    // Se não tiver nenhum livro ou mangá, retorna a lista original
    return distributed.length ? distributed : items;
}

function renderBooks(booksToRender = filteredBooks) {
    if (!booksGrid) return;
    
    const distributedBooks = distributeBooksAndMangas(booksToRender);
    // Cálculo da fatia (slice) para a página atual
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = distributedBooks.slice(startIndex, endIndex);

    if (paginatedItems.length === 0) {
        booksGrid.innerHTML = '<div class="no-results">Nenhum livro encontrado para esta página.</div>';
        updatePaginationControls(0);
        return;
    }

    booksGrid.innerHTML = paginatedItems.map(book => {
        const imageUrl = getValidImageUrl(book);
        let priceHtml = `<div class="book-price">R$ ${Number(book.price).toFixed(2)}</div>`;

        if (book.onPromotion) {
            priceHtml = `
                <div class="book-price">
                    <span class="original-price">R$ ${Number(book.originalPrice).toFixed(2)}</span>
                    <span class="discounted-price">R$ ${Number(book.price).toFixed(2)}</span>
                </div>
            `;
        }

        const isInWishlist = userWishlist.some(w => w.livroId === book.id || w.livroId == book.id);

        return `
        <div class="book-card" data-category="${book.tipo || 'livro'}">
            <div class="book-cover-wrapper">
                <img src="${imageUrl}" alt="${book.title}" class="book-cover" onerror="this.src='https://placehold.co/300x450/222222/FFFFFF/png?text=Sem+Capa';">
                <button class="wishlist-card-btn ${isInWishlist ? 'active' : ''}" data-book-id="${book.id}" onclick="toggleWishlist('${book.id}', this, event)" title="Salvar nos Desejos">
                    ${isInWishlist ? '❤️' : '🤍'}
                </button>
            </div>
            <div class="book-info">
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">por ${book.author}</p>
                ${priceHtml}
                <div class="book-actions">
                    <button class="view-btn" onclick="showDetail('${book.id}')">Detalhes</button>
                    <button class="add-btn" onclick="addToCart('${book.id}')">Comprar</button>
                </div>
            </div>
        </div>
        `;
    }).join('');

    // Atualiza os botões de página lá embaixo
    updatePaginationControls(booksToRender.length);
}

// FUNÇÃO PARA CRIAR OS BOTÕES DE PÁGINA
function updatePaginationControls(totalItems) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    paginationContainer.innerHTML = `
        <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(-1)">
            Anterior
        </button>
        <span class="page-info">Página ${currentPage} de ${totalPages}</span>
        <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(1)">
            Próxima
        </button>
    `;
}

// FUNÇÃO PARA MUDAR DE PÁGINA
function changePage(step) {
    currentPage += step;
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Sobe o topo para a pessoa ver os livros novos
    renderBooks(filteredBooks);
}

// Função para buscar na API
async function searchBooksFromAPI(searchTerm) {
    try {
        console.log("🔍 Buscando na API:", searchTerm);
        
        // Feedback visual de carregamento
        if (booksGrid) booksGrid.innerHTML = '<div class="loading-spinner">Buscando os melhores títulos para você...</div>';
        
        const resultados = await searchCombined(searchTerm);

        if (resultados && resultados.length > 0) {
            const promotions = await loadPromotions();
            // IMPORTANTE: Atualizar 'books' para que o filtro local funcione posteriormente
            books = applyPromotionsToBooks(resultados, promotions);
            filteredBooks = [...books];
            updateBookMangaCounters();
            
            currentPage = 1;
            renderBooks(filteredBooks);
        } else {
            books = [];
            filteredBooks = [];
            renderBooks([]);
            showNotification("Nenhum item relevante encontrado.", "warning");
        }
    } catch (error) {
        console.error("Erro na busca:", error);
        showNotification("Erro ao buscar dados das APIs", "error");
        if (booksGrid) booksGrid.innerHTML = '<div class="no-results">Erro ao carregar resultados.</div>';
    }
}

// Evento do Teclado: Busca ao apertar Enter
if (searchInput) {
    searchInput.addEventListener("keypress", async (e) => {
        if (e.key === "Enter") {
            const term = searchInput.value.trim();
            if (!term) return; 
            
            showNotification("Pesquisando...", "info");
            await searchBooksFromAPI(term);
        }
    });
}

// ============================================
//  BUSCA E FILTRO LOCAL
// ============================================
// filterBooks(): filtra livros por título ou autor e também por categoria!
function filterBooks() {
    const searchTerm = searchInput.value.toLowerCase();
    const category = categorySelect ? categorySelect.value : 'all';

    filteredBooks = books.filter(book => {
        const matchesTerm = book.title.toLowerCase().includes(searchTerm) || book.author.toLowerCase().includes(searchTerm);
        const matchesCategory = category === 'all' || (book.tipo && book.tipo.toLowerCase() === category.toLowerCase());
        return matchesTerm && matchesCategory;
    });

    currentPage = 1; // Volta para a página 1 ao filtrar
    sortBooks();
    renderBooks(filteredBooks);
}

function sortBooks() {
    const sortValue = sortSelect.value;
    switch (sortValue) {
        case "name-asc":
            filteredBooks.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case "name-desc":
            filteredBooks.sort((a, b) => b.title.localeCompare(a.title));
            break;
        case "price-asc":
            filteredBooks.sort((a, b) => a.price - b.price);
            break;
        case "price-desc":
            filteredBooks.sort((a, b) => b.price - a.price);
            break;
    }
}

// ============================================
// 🎯 ELEMENTOS DO DOM (Fim das Buscas)
// ============================================
//  CARRINHO (Funções)
// ============================================
// addToCart(bookId): busca o livro por ID e o adiciona ao carrinho.
// updateCartUI(): atualiza o modal do carrinho (lista de itens e total).
// removeFromCart(bookId): remove um livro do carrinho.
function addToCart(bookId) {
    const book = books.find(b => b.id.toString() === bookId.toString());
    if (book) {
        const existingItem = cart.items.find(item => item.id === book.id);
        if (existingItem) {
            showNotification(`"${book.title}" já está no carrinho!`);
        } else {
            cart.add(book);
            showNotification(`"${book.title}" adicionado ao carrinho!`);
        }
    }
}

function updateCartUI() {
    const cartItems = document.getElementById("cartItems");
    if (cartCount) {
        cartCount.textContent = cart.items.reduce((total, item) => total + item.quantity, 0);
    }

    if (cart.items.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Carrinho vazio</p>';
    } else {
        cartItems.innerHTML = cart.items.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h3>${item.title}</h3>
                    <p>${item.author}</p>
                </div>
                <div class="cart-item-price">R$ ${(item.price * item.quantity).toFixed(2)}</div>
                <button class="cart-remove-btn" onclick="removeFromCart('${item.id}')">Remover</button>
            </div>
        `).join('');
    }

    cartTotal.textContent = `R$ ${cart.getTotal().toFixed(2)}`;
}

function removeFromCart(bookId) {
    cart.remove(bookId);
}

// ============================================
// 📋 DETALHES DO LIVRO (Modal e Galeria)
// ============================================
// showDetail(bookId): abre o modal de detalhes preenchendo imagem, título, autor,
// descrição, preço e botão "Adicionar ao Carrinho".
// Também renderiza: "Mais do autor" (livros do mesmo autor) e miniaturas (galeria).
function showDetail(bookId) {
    const book = books.find(b => b.id.toString() === bookId.toString());
    currentDetailBookId = bookId;

    if (book) {
        const imageUrl = getValidImageUrl(book);
        document.getElementById("detailImg").src = imageUrl;
        document.getElementById("detailTitle").textContent = book.title;
        document.getElementById("detailAuthor").textContent = `por ${book.author}`;
        
        // Configurar descrição com "ver mais"
        const fullDescription = book.description;
        const shortDescription = book.description.length > 200 ? book.description.substring(0, 200) + '...' : book.description;
        document.getElementById("detailDescription").textContent = shortDescription;
        
        const verMaisBtn = document.getElementById("verMaisBtn");
        if (book.description.length > 200) {
            verMaisBtn.style.display = 'block';
            verMaisBtn.textContent = 'Ver mais';
            verMaisBtn.onclick = () => {
                const currentText = document.getElementById("detailDescription").textContent;
                if (currentText.endsWith('...')) {
                    document.getElementById("detailDescription").textContent = fullDescription;
                    verMaisBtn.textContent = 'Ver menos';
                } else {
                    document.getElementById("detailDescription").textContent = shortDescription;
                    verMaisBtn.textContent = 'Ver mais';
                }
            };
        } else {
            verMaisBtn.style.display = 'none';
        }
        
        document.getElementById("detailPrice").textContent = `R$ ${book.price.toFixed(2)}`;
        document.getElementById("addCartBtn").onclick = () => addToCart(book.id);

        // Popular lista 'Mais do autor'
        renderMoreByAuthor(book.author, book.id);
        // Popular miniaturas/galeria
        renderThumbnails(book);

        detailModal.classList.add("active");
    }
}

// Renderiza outros títulos do mesmo autor no modal de detalhe
// Mostra mini-cards clicáveis para que o usuário explore outros livros do mesmo autor.
function renderMoreByAuthor(author, currentId) {
    const container = document.getElementById('moreByAuthor');
    if (!container) return;

    const others = books.filter(b => b.author === author && b.id !== currentId);

    if (others.length === 0) {
        container.innerHTML = '<p class="no-more">Nenhum outro título deste autor.</p>';
        return;
    }

    container.innerHTML = others.map(b => {
        const imageUrl = getValidImageUrl(b);
        return `
        <div class="more-card" onclick="showDetail('${b.id}')" role="button" tabindex="0">
            <img src="${imageUrl}" alt="${b.title}" class="more-thumb" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjZGRkIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjE1MCIvPjwvc3ZnPg=='">
            <div class="more-title">${b.title}</div>
        </div>
        `;
    }).join('');

    // add keyboard accessibility (Enter key)
    container.querySelectorAll('.more-card').forEach(el => {
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') el.click();
        });
    });
}

// Renderiza miniaturas no modal de detalhe e habilita troca da imagem principal.
// Clicar numa miniatura muda a imagem exibida e marca a miniatura como ativa (com borda azul).
// Suporta múltiplas imagens por livro (ex: páginas de amostra).
function renderThumbnails(book) {
    const thumbsContainer = document.getElementById('detailThumbs');
    if (!thumbsContainer) return;

    const imgs = book.images && book.images.length ? book.images : [book.image];
    const mainImg = document.getElementById('detailImg');
    const currentSrc = mainImg ? mainImg.src : book.image;

    thumbsContainer.innerHTML = imgs.map((src, idx) => `
        <button class="thumb ${src === currentSrc || (idx === 0 && !currentSrc.includes('dbz')) ? 'active' : ''}" data-src="${src}" aria-label="Miniatura ${idx + 1}">
            <img src="${src}" alt="miniatura ${idx + 1}">
        </button>
    `).join('');

    // clicar numa miniatura troca a imagem principal
    thumbsContainer.querySelectorAll('.thumb').forEach(btn => {
        btn.addEventListener('click', () => {
            const src = btn.getAttribute('data-src');
            const main = document.getElementById('detailImg');
            if (main && src) {
                main.src = src;
                // marca a miniatura ativa
                thumbsContainer.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });
}

// ============================================
// ⏸️ NOTIFICAÇÕES (Toast)
// ============================================
// Exibe uma mensagem flutuante (toast) no canto superior direito.
// Desaparece automaticamente após 3 segundos. Útil para confirmar ações do usuário.
function showNotification(message, type = "success") {
    const notification = document.createElement("div");

    // Cores baseadas no tipo
    const colors = {
        success: "#4caf50",
        error: "#f44336",
        info: "#2196F3",
        warning: "#ff9800"
    };

    notification.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        background: ${colors[type] || colors.success};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 3000;
        animation: slideIn 0.3s ease;
        font-weight: 600;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = "slideOut 0.3s ease";
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================
// 🎯 EVENT LISTENERS (Eventos)
// ============================================
// Registra ouvintes de eventos para:
// - Busca/filtro: ao digitar ou mudar ordenação
// - Botões: carrinho, fechar modais, checkout
// - Clique fora do modal: fecha o modal (backdrop)
// Esses listeners ativam as funções acima ao interagir com a interface.
searchInput.addEventListener("input", filterBooks);
sortSelect.addEventListener("change", filterBooks);
// Ao mudar a categoria, chama a função que carrega/filtera por tipo
if (categorySelect) {
    categorySelect.addEventListener("change", () => {
        const val = categorySelect.value;
        // 'all' é tratado como não-filtrado (carrega combinado)
        filterByCategory(val === 'all' ? 'all' : val);
    });
}

cartBtn.addEventListener("click", () => {
    cartModal.classList.add("active");
});

closeCartBtn.addEventListener("click", () => {
    cartModal.classList.remove("active");
});

closeDetailBtn.addEventListener("click", () => {
    detailModal.classList.remove("active");
});

checkoutBtn.addEventListener("click", async () => {
    if (cart.items.length === 0) {
        showNotification("Seu carrinho está vazio!", "warning");
        return;
    }

    const total = cart.getTotal();
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Finalizando...";
    
    try {
        // Envia para o nosso servidor registrar a venda e preencher os "Mais vendidos"
        const response = await fetch('/api/vendas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: cart.items,
                perfil_id: sessionStorage.getItem('userId') || null
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            abrirPixDisplay(result.qrCode, result.qrCodeBase64);
            verificarPagamento(result.paymentId);
            showNotification(`Pedido registrado! Gere o PIX de R$ ${total.toFixed(2)} para pagar.`, "success");
            cart.clear();
            cartModal.classList.remove("active");
        } else {
            showNotification('Não foi possivel realizar compra (Erro ao registrar compra no banco de dados.)', "error");
        }
    } catch (err) {
        console.error(err);
        showNotification('Erro de rede ao processar compra.', "error");
    } finally {
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = "Finalizar Compra";
    }
});

// Fechar modal ao clicar fora
cartModal.addEventListener("click", (e) => {
    if (e.target === cartModal) {
        cartModal.classList.remove("active");
    }
});

detailModal.addEventListener("click", (e) => {
    if (e.target === detailModal) {
        detailModal.classList.remove("active");
    }
});

// ============================================
//  INICIALIZAR (DOMContentLoaded)
// ============================================
// Executado quando o HTML termina de carregar.
// Carrega os livros e mangás das APIs, atualiza o UI do carrinho e injeta animações CSS.
document.addEventListener("DOMContentLoaded", async () => {
    // Injetar animações CSS
    const style = document.createElement("style");
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .loading { opacity: 0.6; pointer-events: none; }
    `;
    document.head.appendChild(style);

    async function loadInitialData() {
        try {
            const h1Title = document.querySelector('.books-section h1');
            if (h1Title) h1Title.textContent = "Catálogo";

            // 1. Inicia busca paralela: Famosos (Ext) + Banco Local
            console.log("🔥 Sincronizando catálogo completo...");
            const [extRes, localRes] = await Promise.all([
                fetch(`${API_URL}/externo/mais-vendidos`),
                fetch(`${API_URL}/livros`)
            ]);

            const extData = await extRes.json();
            const localData = await localRes.json();
            
            let combinados = [];
            let titulosVistos = new Set();

            // Adicionar do banco local primeiro
            if (localData.success && localData.data) {
                localData.data.forEach(item => {
                    const titleKey = item.titulo.toLowerCase().trim();
                    titulosVistos.add(titleKey);
                    combinados.push({
                        id: item.id,
                        title: item.titulo,
                        author: item.autor,
                        description: item.descricao,
                        image: item.capa_url,
                        price: item.preco,
                        tipo: item.categoria
                    });
                });
            }

            // Adicionar famosos externos (evitando duplicatas pelo título)
            if (extData.success && extData.data) {
                extData.data.forEach(item => {
                    const titleKey = item.title.toLowerCase().trim();
                    if (!titulosVistos.has(titleKey)) {
                        titulosVistos.add(titleKey);
                        combinados.push(item);
                    }
                });
            }

            // 3. FILTRAGEM DE SEGURANÇA
            const blacklistedKeywords = ['naked', 'nude', 'sexy', 'pervert', 'ecchi', 'xxx', 'hentai', 'erotica'];
            combinados = combinados.filter(item => {
                const text = `${item.title} ${item.author} ${item.description || ''}`.toLowerCase();
                return !blacklistedKeywords.some(kw => text.includes(kw));
            });

            if (combinados.length === 0) {
                showNotification("Nenhum item disponível no momento.", "warning");
                return;
            }

            // Embaralha para que os famosos e os do banco se misturem e apareçam logo de cara
            combinados = combinados.sort(() => Math.random() - 0.5);

            let booksList = dedupeItems(combinados.filter(isBook));
            let mangasList = dedupeItems(combinados.filter(isManga));

            if (booksList.length < 50) {
                const extraBooks = await fetchExtraItems(loadBooksFromGoogle, 50 - booksList.length, booksList);
                booksList = booksList.concat(extraBooks);
            }
            if (mangasList.length < 50) {
                const extraMangas = await fetchExtraItems(loadMangasFromJikan, 50 - mangasList.length, mangasList);
                mangasList = mangasList.concat(extraMangas);
            }

            booksList = booksList.slice(0, 50);
            mangasList = mangasList.slice(0, 50);
            const combinedList = distributeBooksAndMangas([...booksList, ...mangasList]);

            books = combinedList;
            filteredBooks = [...books];
            
            // Carregar promoções e aplicar
            const promotions = await loadPromotions();
            books = applyPromotionsToBooks(books, promotions);
            filteredBooks = [...books];
            updateBookMangaCounters();
            currentPage = 1;
            
            renderBooks(books);
            updateCartUI();
        } catch (error) {
            console.error("Erro ao carregar dados iniciais:", error);
            showNotification("Erro ao carregar catálogo", "error");
        }
    }

    // Carrega os dados iniciais
    await loadInitialData();

    // Carregar wishlist do usuário se logado
    if (sessionStorage.getItem('userId')) {
        await loadUserWishlist();
    }
});

// Função para traduzir a sinopse usando MyMemory (API gratuita)
async function translateSynopsis() {
    const descriptionElement = document.getElementById('detailDescription');
    let originalText = descriptionElement.textContent;
    const btn = document.getElementById('translateBtn');
    btn.textContent = 'Traduzindo...';
    btn.disabled = true;

    // Truncar texto se exceder 500 caracteres (limite da API)
    if (originalText.length > 500) {
        originalText = originalText.substring(0, 500) + '...';
    }

    try {
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(originalText)}&langpair=en|pt`);

        if (!response.ok) {
            throw new Error('Erro na API de tradução');
        }

        const data = await response.json();
        if (data.responseData && data.responseData.translatedText) {
            descriptionElement.textContent = data.responseData.translatedText;
            btn.textContent = 'Tradução Aplicada';
        } else {
            throw new Error('Resposta inválida da API');
        }
    } catch (error) {
        console.error('Erro na tradução:', error);
        alert('Erro ao traduzir. Tente novamente.');
        btn.textContent = 'Traduzir Sinopse';
    } finally {
        btn.disabled = false;
    }
}

// Adicione o event listener no carregamento da página
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    document.getElementById('translateBtn').addEventListener('click', translateSynopsis);
    // ...existing code...
});


    //==================
//pix-ana bia//
//==================

function abrirPixDisplay(qrCode, qrCodeBase64) {
    try {
        const codigoElement = document.getElementById("codigoPix");
        const qrImg = document.getElementById("qrPix");

        codigoElement.innerText = qrCode;

        // QR CODE REAL
        qrImg.src = `data:image/png;base64,${qrCodeBase64}`;

        document.getElementById("pixModal").style.display = "flex";

    } catch (erro) {
        console.log("Erro ao exibir PIX:", erro);
        alert("Erro ao exibir pagamento PIX");
    }
}

// Criar um laco de repeticao que verifica se o PIX foi pago a cada 5 segundos
let checkerPixId;
async function verificarPagamento(paymentId) {
    if (!paymentId) return;
    
    // Limpar o anterior caso ja estivesse tentando algo
    if (checkerPixId) clearInterval(checkerPixId);

    checkerPixId = setInterval(async () => {
        try {
            const res = await fetch(`/api/pagamento/status/${paymentId}`);
            const data = await res.json();
            
            if (data.success && data.status === 'approved') {
                clearInterval(checkerPixId);
                fecharPix();
                showNotification("Pagamento via PIX Aprovado! Os livros já estão disponíveis na sua biblioteca.", "success");
            }
        } catch (err) {
            console.error("Erro consultando PIX", err);
        }
    }, 5000); // 5 segundos
}

function fecharPix() {
  document.getElementById("pixModal").style.display = "none";
  if (checkerPixId) clearInterval(checkerPixId);
}

function copiarPix() {
  let texto = document.getElementById("codigoPix").innerText;

  navigator.clipboard.writeText(texto);

  alert("Código copiado");
}
//=====================
//api mercado pago
//====================