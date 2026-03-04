// ============================================
// 📚 DADOS DOS LIVROS E MANGÁS (Carregados via APIs Externas)
// ============================================
// Arrays que serão preenchidos pelas APIs do Google Books e Jikan
// URLs das APIs externas: Google Books e Jikan
const API_URL = "/api";
let books = [];
let allBooks = []; // Para armazenar livros + mangás combinados

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
        const existingItem = this.items.find(item => item.id === book.id);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.items.push({ ...book, quantity: 1 });
        }

        this.save();
        this.updateUI();
    }

    remove(bookId) {
        this.items = this.items.filter(item => item.id !== bookId);
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
const cartBtn = document.getElementById("cartBtn");
const cartModal = document.getElementById("cartModal");
const detailModal = document.getElementById("detailModal");
const closeCartBtn = document.getElementById("closeCart");
const closeDetailBtn = document.getElementById("closeDetail");
const cartCount = document.getElementById("cartCount");
const cartTotal = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");

let filteredBooks = [...books];
let currentDetailBookId = null;

// ============================================
// 🔗 NAVEGAÇÃO PARA DADOS DO LIVRO
// ============================================
function irParaDadosLivro() {
    if (currentDetailBookId) {
        window.location.href = `/dadoslivros/?id=${currentDetailBookId}`;
    }
}

// ============================================
// 🔄 CARREGAR DADOS DAS APIs EXTERNAS
// ============================================

// Função para buscar livros do Google Books
async function loadBooksFromGoogle(searchTerm = 'bestsellers') {
    try {
        const response = await fetch(`${API_URL}/livros-externos?q=${encodeURIComponent(searchTerm)}`);
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
async function loadMangasFromJikan(searchTerm = 'bestsellers') {
    try {
        const response = await fetch(`${API_URL}/mangas-externos?q=${encodeURIComponent(searchTerm)}`);
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
        const response = await fetch(`${API_URL}/buscar-tudo?q=${encodeURIComponent(searchTerm)}`);
        const result = await response.json();
        
        if (result.success) {
            return result.data;
        }
        return [];
    } catch (error) {
        console.error("Erro na busca combinada:", error);
        return [];
    }
}

// ============================================
// 🔄 CARREGAR DADOS DA API (Mantido para compatibilidade)
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
            books = resultados;
            filteredBooks = [...books];
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
            filteredBooks = allBooks;
            renderBooks(filteredBooks);
        } else {
            showNotification("Nenhum resultado encontrado", "warning");
        }
    } catch (error) {
        console.error("Erro na busca:", error);
        showNotification("Erro ao buscar", "error");
    }
}

// Função para filtrar por categoria (livros ou mangás)
async function filterByCategory(category) {
    try {
        if (category === 'livro') {
            books = await loadBooksFromGoogle('fiction');
        } else if (category === 'manga') {
            books = await loadMangasFromJikan('action');
        } else {
            books = await searchCombined('bestsellers');
        }

        filteredBooks = [...books];
        renderBooks(filteredBooks);
    } catch (error) {
        console.error("Erro ao filtrar por categoria:", error);
        showNotification("Erro ao filtrar", "error");
    }
}

// ============================================
// 📖 RENDERIZAR LIVROS
// ============================================
// Função que cria os cards (cartões) de cada livro no grid.
// Recebe um array de livros e gera HTML com imagem, título, autor, preço e botões.
// Botões: "Detalhes" (abre modal com info completa) e "Comprar" (adiciona ao carrinho).
function renderBooks(booksToRender = books) {
    booksGrid.innerHTML = booksToRender.map(book => `
        <div class="book-card">
            <img src="${book.image}" alt="${book.title}" class="book-image">
            <div class="book-info">
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">por ${book.author}</p>
                <div class="book-price">R$ ${book.price.toFixed(2)}</div>
                <div class="book-actions">
                        <button class="view-btn" onclick="showDetail('${book.id}')">Detalhes</button>

                    <button class="add-btn" onclick="addToCart('${book.id}')">Comprar</button>
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================
// 🔍 BUSCA E FILTRO
// ============================================
// filterBooks(): filtra livros por título ou autor conforme o usuário digita.
// sortBooks(): ordena os livros por nome (A-Z ou Z-A) ou preço (menor ou maior).
// Ambas atualizam a exibição chamando renderBooks().
function filterBooks() {
    const searchTerm = searchInput.value.toLowerCase();

    filteredBooks = books.filter(book =>
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm)
    );

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
// 🛍️ CARRINHO (Funções)
// ============================================
// addToCart(bookId): busca o livro por ID e o adiciona ao carrinho.
// updateCartUI(): atualiza o modal do carrinho (lista de itens e total).
// removeFromCart(bookId): remove um livro do carrinho.
function addToCart(bookId) {
    const book = books.find(b => b.id === bookId);
    if (book) {
        cart.add(book);
        showNotification(`"${book.title}" adicionado ao carrinho!`);
    }
}

function updateCartUI() {
    cartCount.textContent = cart.items.length;

    const cartItems = document.getElementById("cartItems");

    if (cart.items.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Carrinho vazio</p>';
    } else {
        cartItems.innerHTML = cart.items.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h3>${item.title}</h3>
                    <p>${item.author} - Qtd: ${item.quantity}</p>
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
    const book = books.find(b => b.id === bookId);
    currentDetailBookId = bookId;

    if (book) {
        document.getElementById("detailImg").src = book.image;
        document.getElementById("detailTitle").textContent = book.title;
        document.getElementById("detailAuthor").textContent = `por ${book.author}`;
        document.getElementById("detailDescription").textContent = book.description;
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

    container.innerHTML = others.map(b => `
        <div class="more-card" onclick="showDetail('${b.id}')" role="button" tabindex="0">
            <img src="${b.image}" alt="${b.title}" class="more-thumb">
            <div class="more-title">${b.title}</div>
        </div>
    `).join('');

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
        <button class="thumb ${src === currentSrc || (idx === 0 && !currentSrc.includes('dbz')) ? 'active' : ''}" data-src="${src}" aria-label="Miniatura ${idx+1}">
            <img src="${src}" alt="miniatura ${idx+1}">
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

cartBtn.addEventListener("click", () => {
    cartModal.classList.add("active");
});

closeCartBtn.addEventListener("click", () => {
    cartModal.classList.remove("active");
});

closeDetailBtn.addEventListener("click", () => {
    detailModal.classList.remove("active");
});

checkoutBtn.addEventListener("click", () => {
    if (cart.items.length === 0) {
        alert("Seu carrinho está vazio!");
        return;
    }

    const total = cart.getTotal();
    alert(`Finalizando compra no valor de R$ ${total.toFixed(2)}...\n\nEsta é uma demonstração. Em um sistema real, você seria redirecionado para o gateway de pagamento.`);

    cart.clear();
    cartModal.classList.remove("active");
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
// 🚀 INICIALIZAR (DOMContentLoaded)
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

    // Carregamento inicial de livros e mangás populares
    async function loadInitialData() {
        try {
            // Carrega livros e mangás populares
            const livros = await loadBooksFromGoogle('bestsellers');
            const mangas = await loadMangasFromJikan('bestsellers');
            
            // combinar ambos e embaralhar para variedade
            let combinados = [...livros, ...mangas];
            if (combinados.length === 0) {
                showNotification("Não foi possível carregar os itens iniciais", "warning");
                return;
            }

            // embaralhar para evitar repetições seguidas
            combinados = combinados.sort(() => Math.random() - 0.5);

            books = combinados;
            filteredBooks = [...books];
            renderBooks(books);
            updateCartUI();
        } catch (error) {
            console.error("Erro ao carregar dados iniciais:", error);
            showNotification("Erro ao carregar catálogo", "error");
        }
    }

    // Carrega os dados iniciais
    await loadInitialData();
});
