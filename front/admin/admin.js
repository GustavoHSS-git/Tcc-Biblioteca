// Admin Panel - Gerenciamento de Livros (CRUD)
// Configuração das URLs da sua API Local
const API_BASE_URL = '/api'; 
const BOOKS_API_URL = '/api/livros';      
const PROMOTIONS_API_URL = '/api/promocoes'; 
let books = [];
let editingBookId = null;

const MAX_WORDS_DEFAULT = 50;

function countWords(text) {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

function enforceWordLimit(textarea, counter, limit = MAX_WORDS_DEFAULT) {
    const words = textarea.value.trim().split(/\s+/).filter(Boolean);
    if (words.length > limit) {
        textarea.value = words.slice(0, limit).join(' ');
    }
    const currentWords = countWords(textarea.value);
    if (counter) {
        counter.textContent = `${currentWords} / ${limit} palavras`;
    }
}

const showLivrosBtn = document.getElementById('showLivros');
const showPromosBtn = document.getElementById('showPromos');
const livrosSection = document.getElementById('livros-section');
const promosSection = document.getElementById('promocoes-section');
const promotionForm = document.getElementById('promotionForm');

showLivrosBtn.addEventListener('click', () => {
    livrosSection.classList.remove('hidden');
    promosSection.classList.add('hidden');
});

showPromosBtn.addEventListener('click', () => {
    promosSection.classList.remove('hidden');
    livrosSection.classList.remove('hidden');
    livrosSection.classList.add('hidden');
});

showPromosBtn.addEventListener('click', () => {
    promosSection.classList.remove('hidden');
    livrosSection.classList.add('hidden');
});
const bookForm = document.getElementById('bookForm');
const booksList = document.getElementById('booksList');
const cancelBtn = document.getElementById('cancelBtn');
const logoutBtn = document.getElementById('logoutBtn');
const promotionDescription = document.getElementById('promotionDescription');
const promotionDescriptionCount = document.getElementById('promotionDescriptionCount');

if (promotionDescription) {
    const limit = parseInt(promotionDescription.dataset.wordLimit, 10) || MAX_WORDS_DEFAULT;
    promotionDescription.addEventListener('input', () => enforceWordLimit(promotionDescription, promotionDescriptionCount, limit));
    enforceWordLimit(promotionDescription, promotionDescriptionCount, limit);
}

// Carregar livros da API
async function loadBooks() {
    // Não carrega livros locais, pois as promoções são globais ou por categoria
}

promotionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const bookValue = document.getElementById('promotionBook').value;
    let promoData = {
        discount_value: parseFloat(document.getElementById('discountValue').value),
        discount_type: document.getElementById('discountType').value,
        start_date: document.getElementById('startDate').value,
        end_date: document.getElementById('endDate').value
    };

    if (bookValue === 'all') {
        // Promoção global
    } else if (bookValue === 'book' || bookValue === 'manga') {
        promoData.category = bookValue === 'book' ? 'livro' : 'manga';
    } else {
        // Livro específico
        promoData.book_id = bookValue;
    }

    try {
        const response = await fetch(PROMOTIONS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(promoData)
        });
        const result = await response.json();
        if (result.success) {
            alert('Promoção salva com sucesso!');
            promotionForm.reset();
            loadPromotions();
        } else {
            alert('Erro ao salvar promoção: ' + result.message);
        }
    } catch (error) {
        alert('Erro ao salvar promoção na API');
    }
});

// Renderizar lista de livros
function renderBooks() {
    if (books.length === 0) {
        booksList.innerHTML = '<p class="loading">Nenhum livro cadastrado</p>';
        return;
    }

    booksList.innerHTML = books.map(book => `
        <div class="book-item">
            <div class="book-info">
                <h3>${book.title}</h3>
                <p><strong>Autor:</strong> ${book.author}</p>
                <p><strong>Preço:</strong> R$ ${book.price.toFixed(2)}</p>
                <p><strong>Categoria:</strong> ${book.category}</p>
            </div>
            <div class="book-actions">
                <button class="btn-edit" onclick="editBook(${book.id})">Editar</button>
                <button class="btn-delete" onclick="deleteBook(${book.id})">Deletar</button>
            </div>
        </div>
    `).join('');
}

// Carregar dados do livro para edição
async function editBook(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    editingBookId = bookId;
    document.getElementById('bookId').value = book.id;
    document.getElementById('bookTitle').value = book.title;
    document.getElementById('bookAuthor').value = book.author;
    document.getElementById('bookPrice').value = book.price;
    document.getElementById('bookImage').value = book.image;
    document.getElementById('bookCategory').value = book.category;
    document.getElementById('bookDescription').value = book.description || '';
    document.getElementById('bookPages').value = (book.pages || []).join(', ');

    // Scroll para o formulário
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('bookTitle').focus();
}

// Submeter formulário (Create/Update)
bookForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const bookData = {
        title: document.getElementById('bookTitle').value.trim(),
        author: document.getElementById('bookAuthor').value.trim(),
        price: parseFloat(document.getElementById('bookPrice').value),
        image: document.getElementById('bookImage').value.trim(),
        category: document.getElementById('bookCategory').value,
        description: document.getElementById('bookDescription').value.trim(),
        pages: document.getElementById('bookPages').value
            .split(',')
            .map(p => p.trim())
            .filter(p => p.length > 0)
    };

    // Validação básica
    if (!bookData.title || !bookData.author || !bookData.image || !bookData.category) {
        alert('Preencha todos os campos obrigatórios!');
        return;
    }

    try {
        if (editingBookId) {
            // UPDATE
            const response = await fetch(`${BOOKS_API_URL}/${editingBookId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookData)
            });

            const result = await response.json();
            if (result.success) {
                alert('Livro atualizado com sucesso!');
                resetForm();
                // await loadBooks();
            } else {
                alert('Erro ao atualizar livro: ' + result.message);
            }
        } else {
            // CREATE
            const response = await fetch(`${BOOKS_API_URL}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookData)
            });

            const result = await response.json();
            if (result.success) {
                alert('Livro adicionado com sucesso!');
                resetForm();
                // await loadBooks();
            } else {
                alert('Erro ao adicionar livro: ' + result.message);
            }
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao salvar livro: ' + error.message);
    }
});

// Deletar livro
async function deleteBook(bookId) {
    if (!confirm('Tem certeza que deseja deletar este livro?')) return;

    try {
        const response = await fetch(`${BOOKS_API_URL}/${bookId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (result.success) {
            alert('Livro deletado com sucesso!');
            // await loadBooks();
        } else {
            alert('Erro ao deletar livro: ' + result.message);
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao deletar livro: ' + error.message);
    }
}

// Resetar formulário
function resetForm() {
    bookForm.reset();
    document.getElementById('bookId').value = '';
    editingBookId = null;
}

// Cancelar edição
cancelBtn.addEventListener('click', resetForm);

// Logout
logoutBtn.addEventListener('click', () => {
    if (confirm('Deseja sair do painel de admin?')) {
        window.location.href = '/';
    }
});

// Carregar livros ao iniciar
// document.addEventListener('DOMContentLoaded', loadBooks);
