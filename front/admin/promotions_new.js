// Admin Panel - Gerenciamento de Promoções
const PROMOTIONS_API_URL = '/api/promocoes';
let promotions = [];
let books = [];
let editingPromotionId = null;

const promotionForm = document.getElementById('promotionForm');
const promotionsList = document.getElementById('promotionsList');
const cancelPromotionBtn = document.getElementById('cancelPromotionBtn');
const promotionBook = document.getElementById('promotionBook');
const discountType = document.getElementById('discountType');
const discountValue = document.getElementById('discountValue');

// ============================================
// CARREGAR E RENDERIZAR PROMOÇÕES
// ============================================

async function loadPromotions() {
    try {
        const response = await fetch(`${PROMOTIONS_API_URL}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            promotions = result.data;
            renderPromotions();
        }
    } catch (error) {
        console.error('Erro ao carregar promoções:', error);
        promotionsList.innerHTML = '<p class="error">Erro ao carregar promoções</p>';
    }
}

function renderPromotions() {
    if (promotions.length === 0) {
        promotionsList.innerHTML = '<p class="loading">Nenhuma promoção cadastrada</p>';
        return;
    }

    promotionsList.innerHTML = promotions.map(promo => {
        const startDate = new Date(promo.start_date).toLocaleDateString('pt-BR');
        const endDate = new Date(promo.end_date).toLocaleDateString('pt-BR');
        const isActive = new Date() < new Date(promo.end_date);
        const statusClass = isActive ? 'status-active' : 'status-expired';
        const discountDisplay = promo.discount_type === 'percentual' 
            ? `${promo.discount_value}%` 
            : `R$ ${parseFloat(promo.discount_value).toFixed(2)}`;

        let title = 'Promoção Global';
        if (promo.category) {
            title = `Promoção para ${promo.category === 'livro' ? 'Livros' : 'Mangás'}`;
        } else if (promo.book_id) {
            const book = books.find(b => b.id == promo.book_id);
            title = book ? book.title : `Livro ID ${promo.book_id}`;
        }

        return `
            <div class="promotion-item ${statusClass}">
                <div class="promotion-info">
                    <h4>${title}</h4>
                    <p><strong>Desconto:</strong> ${discountDisplay}</p>
                    <p><strong>Tipo:</strong> ${promo.discount_type === 'percentual' ? 'Percentual' : 'Valor Fixo'}</p>
                    <p><strong>Início:</strong> ${startDate}</p>
                    <p><strong>Fim:</strong> ${endDate}</p>
                    <p class="status-label">${isActive ? '✅ Ativa' : '⏸️ Expirada'}</p>
                </div>
                <div class="promotion-actions">
                    <button class="btn-edit" onclick="editPromotion(${promo.id})">Editar</button>
                    <button class="btn-delete" onclick="deletePromotion(${promo.id})">Deletar</button>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// EDITAR PROMOÇÃO
// ============================================

async function editPromotion(promotionId) {
    const promo = promotions.find(p => p.id === promotionId);
    if (!promo) return;

    editingPromotionId = promotionId;
    document.getElementById('promotionId').value = promo.id;
    
    // Definir o valor do select baseado no tipo de promoção
    let selectValue = '';
    if (promo.category) {
        selectValue = promo.category === 'livro' ? 'book' : 'manga';
    } else if (promo.book_id) {
        selectValue = promo.book_id;
    } else {
        selectValue = 'all';
    }
    document.getElementById('promotionBook').value = selectValue;
    
    document.getElementById('discountType').value = promo.discount_type;
    document.getElementById('discountValue').value = promo.discount_value;
    document.getElementById('startDate').value = formatDateForInput(promo.start_date);
    document.getElementById('endDate').value = formatDateForInput(promo.end_date);

    // Scroll para o formulário
    document.querySelector('.promotion-form').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('discountValue').focus();
}

// ============================================
// SUBMETER FORMULÁRIO (Create/Update)
// ============================================

promotionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const bookValue = document.getElementById('promotionBook').value;
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);

    if (startDate >= endDate) {
        alert('A data de fim deve ser posterior à data de início!');
        return;
    }

    let promotionData = {
        discount_type: document.getElementById('discountType').value,
        discount_value: parseFloat(document.getElementById('discountValue').value),
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
    };

    if (bookValue === 'all') {
        // Promoção global
    } else if (bookValue === 'book' || bookValue === 'manga') {
        promotionData.category = bookValue === 'book' ? 'livro' : 'manga';
    } else {
        // Livro específico
        promotionData.book_id = parseInt(bookValue);
    }

    // Validação
    if (!promotionData.discount_type || promotionData.discount_value <= 0) {
        alert('Preencha todos os campos obrigatórios com valores válidos!');
        return;
    }

    try {
        if (editingPromotionId) {
            // UPDATE
            const response = await fetch(`${PROMOTIONS_API_URL}/${editingPromotionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(promotionData)
            });

            const result = await response.json();
            if (result.success) {
                alert('Promoção atualizada com sucesso!');
                resetPromotionForm();
                await loadPromotions();
            } else {
                alert('Erro ao atualizar promoção: ' + result.message);
            }
        } else {
            // CREATE
            const response = await fetch(PROMOTIONS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(promotionData)
            });

            const result = await response.json();
            if (result.success) {
                alert('Promoção criada com sucesso!');
                resetPromotionForm();
                await loadPromotions();
            } else {
                alert('Erro ao criar promoção: ' + result.message);
            }
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao salvar promoção na API');
    }
});

// ============================================
// DELETAR PROMOÇÃO
// ============================================

async function deletePromotion(promotionId) {
    if (!confirm('Tem certeza que deseja deletar esta promoção?')) return;

    try {
        const response = await fetch(`${PROMOTIONS_API_URL}/${promotionId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (result.success) {
            alert('Promoção deletada com sucesso!');
            loadPromotions();
        } else {
            alert('Erro ao deletar promoção: ' + result.message);
        }
    } catch (error) {
        console.error('Erro ao deletar promoção:', error);
        alert('Erro ao deletar promoção');
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function formatDateForInput(dateString) {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16); // Formato YYYY-MM-DDTHH:MM
}

function resetPromotionForm() {
    promotionForm.reset();
    editingPromotionId = null;
    document.getElementById('promotionId').value = '';
}

// ============================================
// INICIALIZAÇÃO
// ============================================

// Carregar promoções ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    loadPromotions();
});

// Cancelar edição
cancelPromotionBtn.addEventListener('click', resetPromotionForm);