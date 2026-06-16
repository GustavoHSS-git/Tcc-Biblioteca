document.addEventListener('DOMContentLoaded', () => {
    const userId = sessionStorage.getItem('userId');
    const ratingsContainer = document.getElementById('ratingsContainer');
    const searchInput = document.getElementById('ratingsSearchInput');
    let reviews = [];

    if (!userId) {
        window.location.href = '/Login/Login.html';
        return;
    }

    loadReviews();

    if (searchInput) {
        searchInput.addEventListener('input', filterReviews);
    }

    async function loadReviews() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const response = await fetch(`/api/avaliacoes/user/${userId}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Erro ao carregar avaliações');
            }

            reviews = result.data || [];
            renderReviews(reviews);
        } catch (error) {
            ratingsContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #2e2e2e;">
                    <p>Não foi possível carregar suas avaliações.</p>
                    <p style="font-size: 12px;">${error.message || 'Verifique sua conexão.'}</p>
                </div>
            `;
            console.error('[Avaliacoes] Erro:', error);
        }
    }

    function filterReviews() {
        const query = searchInput?.value.trim().toLowerCase() || '';
        const filtered = reviews.filter((item) => {
            const livro = Array.isArray(item.livros) ? item.livros[0] : item.livros || {};
            const title = (livro.titulo || livro.title || '').toString().toLowerCase();
            const comment = (item.comentario || '').toString().toLowerCase();
            return title.includes(query) || comment.includes(query);
        });
        renderReviews(filtered);
    }

    function renderReviews(items) {
        if (!items || items.length === 0) {
            ratingsContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #2e2e2e;">
                    <p>Você ainda não avaliou nenhum livro.</p>
                </div>
            `;
            return;
        }

        ratingsContainer.innerHTML = '';

        items.forEach((review) => {
            const livro = Array.isArray(review.livros) ? review.livros[0] : review.livros || {};
            const title = livro.titulo || livro.title || `Livro #${review.livro_id}`;
            const author = livro.autor || livro.author || 'Autor desconhecido';
            const coverUrl = livro.capa_url || livro.image || 'https://via.placeholder.com/200x300/222222/00d2ff?text=Sem+Capa';
            const bookId = livro.id || review.livro_id || '';
            const ratingText = Number(review.nota || 0).toFixed(1);
            const comment = review.comentario || 'Sem comentário';
            const createdAt = review.created_at ? new Date(review.created_at).toLocaleDateString('pt-BR') : '';

            const snippet = comment.length > 120 ? comment.slice(0, 120) + '...' : comment;
            const wrapper = document.createElement('div');
            wrapper.className = 'd-steam-card-wrapper';

            const card = document.createElement('div');
            card.className = 'd-steam-card wishlist-card';
            card.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.55)), url('${coverUrl}')`;
            card.style.cursor = 'pointer';

            card.innerHTML = `
                <div class="wishlist-card-overlay"></div>
                <div class="wishlist-card-meta">
                    <h3>${title}</h3>
                    <p>${author}</p>
                    <p style="margin-top: 0.65rem; font-size: 0.85rem; color: #d6d6d6;">${createdAt}</p>
                    <p class="wishlist-review-snippet" style="margin-top: 0.75rem; font-size: 0.9rem; color: #fff; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${snippet}</p>
                    <div style="margin-top: 0.9rem; display: flex; gap: 0.6rem; align-items: center;">
                        <span style="background: rgba(0, 210, 255, 0.18); padding: 0.35rem 0.7rem; border-radius: 999px; font-weight: 700; color: #00d2ff;">${ratingText} / 5</span>
                        ${bookId ? `<button class="btn-go-desejos" style="padding: 0.55rem 0.85rem;">Ver livro</button>` : ''}
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                if (!bookId || !review.id) return;
                window.location.href = `/dadoslivros/?id=${bookId}&highlightReview=${encodeURIComponent(review.id)}`;
            });

            wrapper.appendChild(card);
            ratingsContainer.appendChild(wrapper);
        });
    }
});
