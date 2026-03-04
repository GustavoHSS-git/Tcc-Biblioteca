// ============================================
// 📖 DADOS E INTERAÇÕES DA PÁGINA DE DETALHES
// ============================================
// Carrega dados dinâmicos do livro/manga a partir das APIs externas
// ou da API local (compatibilidade com dados antigos)

document.addEventListener('DOMContentLoaded', async () => {
    const stars = document.querySelectorAll('.rating-stars .star');
    const result = document.getElementById('rating-result');

    // Sistema de avaliação por estrelas
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const value = star.getAttribute('data-value');
            stars.forEach(s => s.classList.remove('selected'));
            for (let i = 0; i < value; i++) stars[i].classList.add('selected');
            if (result) result.textContent = `Você avaliou com ${value} estrela${value > 1 ? 's' : ''}!`;
        });
    });

    // Buy button
    const buyBtn = document.querySelector('.btn-buy');
    if (buyBtn) {
        buyBtn.addEventListener('click', () => {
            showNotification('"Adicionado ao carrinho com sucesso!', 'success');
        });
    }

    // Ler id da query string
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return; // nada a fazer sem id

    try {
        // Tenta buscar da API local primeiro (compatibilidade)
        let book = null;
        let fromLocalAPI = false;

        try {
            const res = await fetch(`/api/livros/${id}`);
            if (res.ok) {
                const json = await res.json();
                if (json.success) {
                    book = json.data;
                    fromLocalAPI = true;
                }
            }
        } catch (err) {
            console.log('Livro não encontrado na API local, tentando APIs externas...');
        }

        // Se não encontrou localmente, busca em uma lista temporária ou retorna
        if (!book) {
            showNotification('Livro não encontrado', 'error');
            return;
        }

        // Preencher campos da página
        const titleEl = document.querySelector('.book-title');
        const authorEl = document.querySelector('.book-meta .author');
        const categoryEl = document.querySelector('.book-meta .category');
        const descEl = document.querySelector('.book-description');
        const coverImg = document.querySelector('.book-cover img');
        const priceEl = document.querySelector('.price-amount');
        const detailsList = document.querySelector('.details-list');
        const authorBio = document.querySelector('.author-bio-box p');
        const relatedGrid = document.querySelector('.related-books-grid');

        if (titleEl) titleEl.textContent = book.title || '';
        if (authorEl) authorEl.innerHTML = `por <strong>${book.author || ''}</strong>`;
        if (categoryEl) categoryEl.textContent = book.category || 'Sem categoria';
        if (descEl) descEl.textContent = book.description || 'Sem descrição disponível.';
        if (coverImg) coverImg.src = (book.images && book.images[0]) || book.image || '/fotos/default.jpg';
        if (priceEl && typeof book.price === 'number') priceEl.textContent = `R$ ${book.price.toFixed(2)}`;

        // Detalhes adicionais (autor, editora, páginas, isbn)
        if (detailsList) {
            const info = [];
            if (book.author) info.push(`<li><strong>Autor:</strong> ${book.author}</li>`);
            if (book.publisher) info.push(`<li><strong>Editora:</strong> ${book.publisher}</li>`);
            if (book.category) info.push(`<li><strong>Gênero:</strong> ${book.category}</li>`);
            if (book.pages) {
                const pageCount = Array.isArray(book.pages) ? book.pages.length : book.pageCount || '—';
                info.push(`<li><strong>Páginas:</strong> ${pageCount}</li>`);
            }
            if (book.isbn) info.push(`<li><strong>ISBN:</strong> ${book.isbn}</li>`);
            if (book.publishedDate) info.push(`<li><strong>Data de Publicação:</strong> ${book.publishedDate}</li>`);
            
            if (info.length > 0) {
                detailsList.innerHTML = info.join('');
            }
        }

        if (authorBio) {
            authorBio.textContent = book.authorBio && book.authorBio.trim()
                ? book.authorBio
                : `${book.author} — informações biográficas não disponíveis.`;
        }

        // Popular relacionados: buscar livros similares
        if (relatedGrid) {
            try {
                let relatedBooks = [];

                // Se o livro é da API local, busca relacionados localmente
                if (fromLocalAPI) {
                    const allRes = await fetch('/api/livros');
                    if (allRes.ok) {
                        const allJson = await allRes.json();
                        const allBooks = allJson.success ? allJson.data : [];
                        relatedBooks = allBooks.filter(b => 
                            b.id !== book.id && 
                            (b.category === book.category || b.author === book.author)
                        ).slice(0, 6);
                    }
                } else {
                    // Busca livros similares do Google Books usando o termo de busca
                    const searchTerm = book.title.split(' ').slice(0, 3).join(' ');
                    const res = await fetch(`/api/livros-externos?q=${encodeURIComponent(searchTerm)}`);
                    if (res.ok) {
                        const json = await res.json();
                        if (json.success) {
                            relatedBooks = json.data.filter(b => b.id !== book.id).slice(0, 6);
                        }
                    }
                }

                if (relatedBooks.length > 0) {
                    relatedGrid.innerHTML = relatedBooks.map(b => `
                        <div class="related-book-card" onclick="location.href='/dadoslivros/?id=${b.id}'">
                            <img src="${b.image || '/fotos/default.jpg'}" alt="${b.title}">
                            <h4>${b.title}</h4>
                            <p class="author-small">${b.author || 'Desconhecido'}</p>
                            <span class="price-small">R$ ${typeof b.price === 'number' ? b.price.toFixed(2) : '0.00'}</span>
                        </div>
                    `).join('');
                }
            } catch (err) {
                console.warn('Erro ao carregar livros relacionados', err);
            }
        }

    } catch (err) {
        console.error('Erro ao carregar livro:', err);
        showNotification('Erro ao carregar o livro', 'error');
    }

    // Função auxiliar para mostrar notificações
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        const colors = {
            success: '#4caf50',
            error: '#f44336',
            info: '#2196F3',
            warning: '#ff9800'
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
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Injetar estilos de animação se não existirem
    if (!document.querySelector('style[data-notifications]')) {
        const style = document.createElement('style');
        style.setAttribute('data-notifications', '');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
});
