// ============================================
// 📖 DADOS E INTERAÇÕES DA PÁGINA DE DETALHES
// ============================================

const API_URL = '/api';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. LER ID DA URL
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get('id');

    if (!bookId) {
        showNotification('Nenhum livro selecionado.', 'warning');
        return;
    }

    const container = document.querySelector('.book-details-container');
    const userId = sessionStorage.getItem('userId');
    
    // Cart elements
    const cartBtn = document.getElementById('cartBtn');
    const cartModal = document.getElementById('cartModal');
    const closeCartBtn = document.getElementById('closeCart');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    // Iniciar carregamento
    try {
        await loadBookDetails(bookId);
    } catch (err) {
        console.error('Erro na inicialização:', err);
    }

    // Cart event listeners
    if (cartBtn) {
        cartBtn.addEventListener('click', () => {
            updateCartUI();
            cartModal.style.display = 'block';
        });
    }

    if (closeCartBtn) {
        closeCartBtn.addEventListener('click', () => {
            cartModal.style.display = 'none';
        });
    }

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            alert('Checkout não implementado ainda.');
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === cartModal) {
            cartModal.style.display = 'none';
        }
    });

    function updateCartUI() {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.textContent = cart.reduce((total, item) => total + item.quantity, 0);
        }

        if (cart.length === 0) {
            cartItems.innerHTML = '<p class="empty-cart">Carrinho vazio</p>';
        } else {
            cartItems.innerHTML = cart.map(item => `
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

        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cartTotal.textContent = `R$ ${total.toFixed(2)}`;
    }

    function removeFromCart(bookId) {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const updatedCart = cart.filter(item => item.id.toString() !== bookId.toString());
        localStorage.setItem('cart', JSON.stringify(updatedCart));
        updateCartUI();
        const cartCount = document.getElementById('cartCount');
        if (cartCount) cartCount.textContent = updatedCart.reduce((total, item) => total + item.quantity, 0);
    }

    // Make removeFromCart global
    window.removeFromCart = removeFromCart;

    // Initial cart update
    updateCartUI();

    /**
     * Busca os detalhes do livro de múltiplas fontes
     */
    async function loadBookDetails(id) {
        let book = null;

        // TENTA 1: Banco de Dados Local sempre, pois IDs UUID podem ser de livros no Supabase.
        try {
            console.log("🔍 [1/3] Buscando no banco local pelo ID:", id);
            const res = await fetch(`${API_URL}/livros/${id}`);
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    console.log("✅ Encontrado no banco local!");
                    book = normalizeBookData(json.data);
                }
            } else {
                console.log("❌ Banco local não encontrou o livro (status", res.status + ")");
            }
        } catch (e) {
            console.log("❌ Erro ao buscar no banco local:", e);
        }

        // TENTA 2: Google Books por volume ID
        if (!book) {
            try {
                console.log("🔍 [2/3] Buscando no Google Books pelo ID:", id);
                const gRes = await fetch(`${API_URL}/externo/livro/${id}`);
                if (gRes.ok) {
                    const gJson = await gRes.json();
                    if (gJson.success && gJson.data) {
                        console.log("✅ Encontrado no Google Books!");
                        book = normalizeBookData(gJson.data);
                    }
                } else {
                    console.log("❌ Google Books não encontrou o livro (status", gRes.status + ")");
                }
            } catch (e) {
                console.log("❌ Erro ao buscar no Google Books:", e);
            }
        }

        // TENTA 3: Jikan para IDs numéricos (mangás)
        if (!book && !isNaN(id)) {
            try {
                console.log("🔍 [3/3] Buscando no Jikan (Mangá) pelo ID:", id);
                const mRes = await fetch(`${API_URL}/externo/manga/${id}`);
                if (mRes.ok) {
                    const mJson = await mRes.json();
                    if (mJson.success && mJson.data) {
                        console.log("✅ Encontrado no Jikan!");
                        book = normalizeBookData(mJson.data);
                    }
                } else {
                    console.log("❌ Jikan retornou erro", mRes.status);
                }
            } catch (e) {
                console.error("❌ Erro técnico na busca no Jikan:", e);
            }
        }

        if (book) {
            renderBookDetails(book);
            setupRatingSection(book, userId);
            loadRelated(book);
            setupBuyButton(book);
            setupWishlistButton(book, userId);
            setupReadButton(book);
        } else {
            showNotification('Livro não encontrado no sistema.', 'error');
            document.querySelector('.book-title').textContent = "Livro não encontrado";
        }
    }

    /**
     * Padroniza os dados independente da origem (Banco ou API)
     */
    function normalizeBookData(data) {
        return {
            id: data.id,
            title: data.titulo || data.title,
            author: data.autor || data.author || 'Autor Desconhecido',
            image: data.capa_url || data.image || '/fotos/default-book.png',
            description: data.descricao || data.description || 'Nenhuma sinopse disponível.',
            // Forçar preço público para R$1
            price: 1,
            category: mapCategory(data.categoria || data.category || (data.tipo === 'manga' ? 'Mangá' : 'Livro')),
            isbn: data.isbn || '—',
            publisher: data.editora || data.publisher || '—'
        };
    }

    function mapCategory(category) {
        if (!category) return 'Livro';
        const value = category.toString().toLowerCase();
        const map = {
            'fiction': 'Ficção',
            'fantasy': 'Fantasia',
            'romance': 'Romance',
            'horror': 'Terror',
            'mystery': 'Mistério',
            'thriller': 'Suspense',
            'science fiction': 'Ficção Científica',
            'sci-fi': 'Ficção Científica',
            'biography': 'Biografia',
            'history': 'História',
            'adventure': 'Aventura',
            'young adult': 'Jovem Adulto',
            'manga': 'Mangá',
            'comic': 'Quadrinho',
            'children': 'Infantil'
        };
        for (const key in map) {
            if (value.includes(key)) {
                return map[key];
            }
        }
        return category;
    }

    /**
     * Função que procura a imagem em vários campos possíveis (mesma da loja)
     */
    function getValidImageUrl(book) {
        const possibleUrls = [
            book.capa_url,
            book.image,
            book.imageLinks?.extraLarge,
            book.imageLinks?.large,
            book.imageLinks?.medium,
            book.imageLinks?.thumbnail,
            book.imageLinks?.smallThumbnail,
            book.volumeInfo?.imageLinks?.thumbnail,
            book.images?.jpg?.large_image_url,
            book.images?.jpg?.image_url,
            book.cover_image
        ];

        for (const url of possibleUrls) {
            if (url && typeof url === 'string' && (url.startsWith('http') || url.startsWith('/'))) {
                // Se for Google (zoom=1), tenta forçar Alta Resolução
                if (url.includes('google')) {
                    return url.replace(/zoom=[0-9]/, 'zoom=3').replace(/^http:\/\//i, 'https://');
                }
                return url;
            }
        }
        return 'https://placehold.co/320x480/eeeeee/777777?text=Capa+Indisponivel';
    }

    /**
     * Atualiza o DOM com os dados do livro
     */
    function renderBookDetails(book) {
        console.log("🎨 Renderizando detalhes do livro:", book.title);
        document.title = `${book.title} - Livraria Digital`;
        
        const titleEl = document.querySelector('.book-title');
        const authorEl = document.querySelector('.book-meta .author');
        const categoryEl = document.querySelector('.book-meta .category');
        const descEl = document.querySelector('.book-description');
        const coverImg = document.querySelector('.book-cover img');
        const priceAmount = document.querySelector('.price-amount');
        const bioP = document.querySelector('.author-bio-box p');

        if (titleEl) titleEl.textContent = book.title;
        if (authorEl) authorEl.innerHTML = `por <strong>${book.author}</strong>`;
        if (categoryEl) categoryEl.textContent = book.category;
        if (descEl) {
            const fullDescription = book.description;
            const shortDescription = book.description.length > 200 ? book.description.substring(0, 200) + '...' : book.description;
            descEl.textContent = shortDescription;
            
            const verMaisBtn = document.getElementById("verMaisBtnDados");
            if (book.description.length > 200) {
                verMaisBtn.style.display = 'block';
                verMaisBtn.textContent = 'Ver mais';
                verMaisBtn.onclick = () => {
                    const currentText = descEl.textContent;
                    if (currentText.endsWith('...')) {
                        descEl.textContent = fullDescription;
                        verMaisBtn.textContent = 'Ver menos';
                    } else {
                        descEl.textContent = shortDescription;
                        verMaisBtn.textContent = 'Ver mais';
                    }
                };
            } else {
                verMaisBtn.style.display = 'none';
            }
        }
        
        if (coverImg) {
            coverImg.src = getValidImageUrl(book);
            coverImg.alt = `Capa do livro ${book.title}`;
        }

        // PREÇO: Exatamente igual ao da loja
        const displayPrice = Number(book.price || 0);
        if (priceAmount) priceAmount.textContent = `R$ ${displayPrice.toFixed(2)}`;

        // BIOGRAFIA DO AUTOR (Dinamizada)
        if (bioP) {
            const bioTemplates = [
                `${book.author} é uma figura proeminente no universo de ${book.category}, reconhecido pela profundidade narrativa em obras como "${book.title}".`,
                `Com vasta contribuição para o gênero ${book.category}, ${book.author} traz nesta obra sua marca registrada de criatividade e impacto narrativo.`,
                `Como um dos grandes expoentes de ${book.category}, ${book.author} continua a cativar leitores com títulos memoráveis e personagens inesquecíveis.`
            ];
            // Escolhe uma bio aleatória baseada no ID do livro (assim ela fica fixa para aquele livro)
            const bioIndex = Math.abs(book.id.toString().split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % bioTemplates.length;
            bioP.textContent = bioTemplates[bioIndex];
        }

        // Detalhes técnicos e Estrelas
        const detailsList = document.querySelector('.details-list');
        if (detailsList) {
            detailsList.innerHTML = `
                <li><strong>Autor:</strong> ${book.author}</li>
                <li><strong>Gênero:</strong> ${book.category}</li>
                <li><strong>Editora:</strong> ${book.publisher || 'Não informada'}</li>
                <li><strong>ID:</strong> ${book.id}</li>
            `;
        }
        setupTranslateButton();
    }

    async function loadBookReviews(livroId) {
        try {
            const response = await fetch(`${API_URL}/avaliacoes/${encodeURIComponent(livroId)}`);
            if (!response.ok) {
                throw new Error(`Status ${response.status}`);
            }
            const json = await response.json();
            return json.success && Array.isArray(json.data) ? json.data : [];
        } catch (error) {
            console.error('Erro ao carregar avaliações:', error);
            return [];
        }
    }

    function renderRatingSummary(reviews) {
        const summary = document.getElementById('ratingSummary');
        if (!summary) return;
        if (!reviews || reviews.length === 0) {
            summary.textContent = 'Seja o primeiro a avaliar este livro.';
            return;
        }

        const average = reviews.reduce((sum, review) => sum + Number(review.nota || 0), 0) / reviews.length;
        const filledStars = Math.round(average);
        const starsHtml = Array.from({ length: 5 }, (_, index) => {
            return `<span class="star ${index < filledStars ? 'selected' : ''}">★</span>`;
        }).join('');

        summary.innerHTML = `
            <div class="rating-summary-stars">${starsHtml}</div>
            <div class="rating-text">${average.toFixed(1)} / 5 - ${reviews.length} avaliação${reviews.length > 1 ? 'es' : 's'}</div>
        `;
    }

    function escapeHtml(value) {
        if (value == null) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getHighlightReviewIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('highlightReview');
    }

    function applyHighlightedReview() {
        const reviewIdToHighlight = getHighlightReviewIdFromUrl();
        if (!reviewIdToHighlight) return;

        const commentWrapper = document.getElementById(`review-comment-${reviewIdToHighlight}`);
        if (!commentWrapper) return;

        const reviewItem = commentWrapper.closest('.review-item');
        if (reviewItem) {
            reviewItem.classList.add('review-highlight-active');
            reviewItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        commentWrapper.classList.add('review-highlight-active');
        setTimeout(() => {
            if (reviewItem) reviewItem.classList.remove('review-highlight-active');
            commentWrapper.classList.remove('review-highlight-active');
        }, 2000);
    }

    function renderReviews(reviews, currentUserId) {
        const reviewList = document.getElementById('reviewList');
        if (!reviewList) return;
        if (!reviews || reviews.length === 0) {
            reviewList.innerHTML = '<p>Nenhuma avaliação publicada ainda.</p>';
            return;
        }
        const currentUser = currentUserId || sessionStorage.getItem('userId');
        reviewList.innerHTML = reviews.map((review, index) => {
            const authorName = escapeHtml(review.perfil?.nome || 'Usuário');
            const rating = Number(review.nota || 0);
            const avatar = review.perfil?.foto_perfil || review.perfil?.foto || 'https://placehold.co/80x80/eeeeee/777777?text=Avatar';
            const avatarUrl = avatar && (avatar.startsWith('http') || avatar.startsWith('/') || avatar.startsWith('data:')) ? avatar : 'https://placehold.co/80x80/eeeeee/777777?text=Avatar';
            const rawComment = review.comentario || '';
            const safeComment = rawComment ? escapeHtml(rawComment).replace(/\n/g, '<br>') : '';
            const reviewId = escapeHtml(review.id ?? `review-${index}`);
            const commentLines = rawComment.split('\n').length;
            const hasLongComment = commentLines > 3 || rawComment.length > 220;
            const comment = safeComment ? `
                <div class="review-comment-wrapper${hasLongComment ? ' collapsed' : ''}" id="review-comment-${reviewId}">
                    <p class="review-text">${safeComment}</p>
                </div>
            ` : '';
            const toggleButton = hasLongComment ? `<button class="review-toggle-btn" data-review-id="${reviewId}">Ver mais</button>` : '';
            const canManage = currentUser && String(currentUser) === String(review.perfil_id || review.perfil?.id);
            const disableButton = canManage ? `
                <button class="disable-review-btn-nova" data-review-id="${reviewId}">Excluir comentário</button>
            ` : '';
            const stars = Array.from({ length: 5 }, (_, index) => `<span class="star ${index < rating ? 'selected' : ''}">★</span>`).join('');
            return `
                <div class="review-item">
                    <div class="review-row">
                        <img src="${avatarUrl}" alt="${authorName}" class="review-avatar" onerror="this.src='https://placehold.co/80x80/eeeeee/777777?text=Avatar'">
                        <div class="review-content">
                            <div class="review-meta">
                                <span class="review-author">${authorName}</span>
                                <span class="review-stars">${stars}</span>
                            </div>
                            ${comment}
                            <div class="review-actions">
                                ${toggleButton}
                                ${disableButton}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        attachDisableReviewButtons();
        setupReviewToggleButtons();
    }

    function attachDisableReviewButtons() {
        const buttons = document.querySelectorAll('.disable-review-btn');
        buttons.forEach(button => {
            button.addEventListener('click', async () => {
                const reviewId = button.dataset.reviewId;
                if (!reviewId) return;
                const confirmDisable = confirm('Deseja realmente inativar este comentário?');
                if (!confirmDisable) return;
                button.disabled = true;
                button.textContent = 'Inativando...';
                try {
                    const response = await fetch(`${API_URL}/avaliacoes/${reviewId}`, { method: 'DELETE' });
                    const json = await response.json();
                    if (response.ok && json.success) {
                        showNotification('Comentário excluído com sucesso.', 'success');
                        const bookId = document.getElementById('ratingComment')?.dataset.bookId;
                        const reviewBookId = bookId || window.location.search.split('=')[1];
                        const reviews = await loadBookReviews(reviewBookId);
                        renderRatingSummary(reviews);
                        renderReviews(reviews, sessionStorage.getItem('userId'));
                    } else {
                        let errorMsg = 'Erro ao excluir comentário';
                        if (json && json.message) errorMsg = json.message;
                        throw new Error(errorMsg);
                    }
                } catch (error) {
                    console.error('Falha ao excluir comentário:', error);
                    const errorMessage = error?.message || 'Não foi possível excluir o comentário.';
                    showNotification(errorMessage, 'error');
                    button.disabled = false;
                    button.textContent = 'Excluir comentário';
                }
            });
        });
    }

    function setupReviewToggleButtons() {
        const buttons = document.querySelectorAll('.review-toggle-btn');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const reviewId = button.dataset.reviewId;
                if (!reviewId) return;
                const commentWrapper = document.getElementById(`review-comment-${reviewId}`);
                if (!commentWrapper) return;
                const isExpanded = commentWrapper.classList.toggle('expanded');
                commentWrapper.classList.toggle('collapsed', !isExpanded);
                button.textContent = isExpanded ? 'Ver menos' : 'Ver mais';
            });
        });
    }

    function highlightStarRating(rating) {
        const stars = document.querySelectorAll('.rating-stars .star');
        stars.forEach((star, index) => {
            star.classList.toggle('selected', index < rating);
        });
    }

    async function setupRatingSection(book, userId) {
        const stars = Array.from(document.querySelectorAll('.rating-stars .star'));
        const result = document.getElementById('rating-result');
        const commentInput = document.getElementById('ratingComment');
        const submitBtn = document.getElementById('submitRatingBtn');
        if (commentInput) {
            commentInput.dataset.bookId = book.id;
        }

        let selectedRating = 0;
        let reviews = await loadBookReviews(book.id);
        renderRatingSummary(reviews);
        renderReviews(reviews, userId);
        applyHighlightedReview();

        // Se o usuário já avaliou este livro, aplicar a avaliação como seleção atual
        if (userId) {
            const userReview = reviews.find(r => String(r.perfil_id) === String(userId) || String(r.perfil?.id) === String(userId));
            if (userReview) {
                selectedRating = Number(userReview.nota || 0);
                highlightStarRating(selectedRating);
                if (commentInput) commentInput.value = userReview.comentario || '';
                if (result) result.textContent = `Você avaliou com ${selectedRating} estrela${selectedRating > 1 ? 's' : ''}.`;
            }
        }

        if (!userId) {
            if (result) result.textContent = 'Faça login para enviar sua avaliação.';
            if (commentInput) commentInput.disabled = true;
            if (submitBtn) submitBtn.disabled = true;
        }

        stars.forEach(star => {
            star.addEventListener('click', () => {
                selectedRating = Number(star.dataset.value || '0');
                highlightStarRating(selectedRating);
                if (result) {
                    result.textContent = `Você escolheu ${selectedRating} estrela${selectedRating > 1 ? 's' : ''}.`;
                }
            });
        });

        if (submitBtn) {
            submitBtn.addEventListener('click', async () => {
                if (!userId) {
                    showNotification('Faça login para enviar sua avaliação.', 'warning');
                    return;
                }
                if (!selectedRating) {
                    showNotification('Selecione uma nota antes de enviar.', 'warning');
                    return;
                }

                const comentario = commentInput?.value.trim() || null;
                submitBtn.disabled = true;
                submitBtn.textContent = 'Enviando...';

                try {
                    const response = await fetch(`${API_URL}/avaliacoes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            livro_id: book.id,
                            perfil_id: userId,
                            nota: selectedRating,
                            comentario
                        })
                    });
                    const json = await response.json();
                    if (json.success) {
                        const msg = json.message || 'Avaliação registrada com sucesso!';
                        showNotification(msg, 'success');
                        reviews = await loadBookReviews(book.id);
                        renderRatingSummary(reviews);
                        renderReviews(reviews);
                        // manter as estrelas de input colorizadas conforme a seleção do usuário
                        highlightStarRating(selectedRating);
                        if (commentInput) commentInput.value = '';
                        if (result) result.textContent = msg;
                        // feedback temporário no botão
                        submitBtn.textContent = json.message && json.message.toLowerCase().includes('atualiz') ? 'Atualizado' : 'Enviado';
                        setTimeout(() => {
                            if (submitBtn) submitBtn.textContent = 'Enviar avaliação';
                        }, 2200);
                    } else {
                        throw new Error(json.message || 'Erro ao salvar avaliação');
                    }
                } catch (error) {
                    console.error('Erro ao enviar avaliação:', error);
                    showNotification('Não foi possível enviar a avaliação. Tente novamente.', 'error');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Enviar avaliação';
                }
            });
        }
    }

    async function translateText(text) {
        const chunkSize = 450;
        const chunks = [];

        for (let i = 0; i < text.length; i += chunkSize) {
            chunks.push(text.slice(i, i + chunkSize));
        }

        const translatedChunks = [];
        for (const chunk of chunks) {
            const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|pt`);
            if (!response.ok) {
                throw new Error('Erro na API de tradução');
            }

            const data = await response.json();
            if (!data.responseData || !data.responseData.translatedText) {
                throw new Error('Resposta inválida da API');
            }

            translatedChunks.push(data.responseData.translatedText);
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        return translatedChunks.join(' ');
    }

    function setupTranslateButton() {
        const btn = document.getElementById('translateBtnDados');
        const descEl = document.querySelector('.book-description');
        if (!btn || !descEl || btn.dataset.translateInitialized === 'true') return;
        btn.dataset.translateInitialized = 'true';

        btn.addEventListener('click', async () => {
            const originalText = descEl.textContent.trim();
            if (!originalText) {
                showNotification('Nenhuma sinopse disponível para traduzir.', 'info');
                return;
            }

            btn.disabled = true;
            const originalLabel = btn.textContent;
            btn.textContent = 'Traduzindo...';

            try {
                const translated = await translateText(originalText);
                descEl.textContent = translated;
                btn.textContent = 'Tradução Aplicada';
            } catch (error) {
                console.error('Erro ao traduzir sinopse:', error);
                showNotification('Erro ao traduzir sinopse. Tente novamente.', 'error');
                btn.textContent = originalLabel;
            } finally {
                btn.disabled = false;
            }
        });
    }

    /**
     * Busca livros parecidos (Lógica Híbrida: Banco Local + APIs Externas)
     */
    /**
     * Busca livros relacionados (Priorizando a mesma série/título)
     */
    async function loadRelated(book) {
        const grid = document.querySelector('.related-books-grid');
        if (!grid) {
            console.warn("⚠️ .related-books-grid não encontrado no DOM");
            return;
        }

        try {
            console.log("📖 Iniciando carregamento de livros relacionados...");
            console.log("   Livro atual:", { id: book.id, title: book.title, author: book.author });

            // Tenta extrair o nome da série (ex: "Boruto" de "Boruto Vol. 3")
            const seriesName = book.title.split(/vol|:|#/i)[0].trim();
            console.log("🔍 Buscando série relacionada:", seriesName);

            // Busca por volumes da mesma série
            const url = `${API_URL}/externo/livros?q=${encodeURIComponent(seriesName)}`;
            console.log("   URL requisição:", url);
            
            const response = await fetch(url);
            console.log("   Status resposta:", response.status);
            
            if (!response.ok) {
                console.error(`   ❌ Erro HTTP: ${response.status} ${response.statusText}`);
                throw new Error(`HTTP ${response.status}`);
            }
            
            const json = await response.json();
            console.log("   JSON resposta:", json);
            
            let related = [];
            if (json.success && json.data) {
                console.log(`   📚 API retornou ${json.data.length} livros para a série "${seriesName}"`);
                related = json.data.filter(b => 
                    b.id !== book.id && 
                    b.title.toLowerCase() !== book.title.toLowerCase()
                );
                console.log(`   ✅ Após filtro: ${related.length} livros relacionados`);
            } else {
                console.warn("   ⚠️ Resposta sem dados ou success=false");
            }

            // Se não encontrou o suficiente na série, busca pelo autor
            if (related.length < 3 && book.author && book.author !== 'Autor Desconhecido') {
                const authorOnly = book.author.split(',')[0].trim();
                console.log(`🔍 Buscando por autor: "${authorOnly}"`);
                
                const authorUrl = `${API_URL}/externo/livros?q=inauthor:${encodeURIComponent(authorOnly)}`;
                console.log("   URL requisição:", authorUrl);
                
                const authorResp = await fetch(authorUrl);
                console.log("   Status resposta:", authorResp.status);
                
                if (!authorResp.ok) {
                    console.error(`   ❌ Erro HTTP: ${authorResp.status}`);
                    throw new Error(`HTTP ${authorResp.status}`);
                }
                
                const authorJson = await authorResp.json();
                console.log("   JSON resposta:", authorJson);
                
                if (authorJson.success && authorJson.data) {
                    console.log(`   📚 API retornou ${authorJson.data.length} livros do autor`);
                    const moreBooks = authorJson.data.filter(b => 
                        !related.find(r => r.title === b.title) && 
                        b.id !== book.id
                    );
                    console.log(`   ✅ Adicionando ${moreBooks.length} livros do autor`);
                    related = [...related, ...moreBooks];
                } else {
                    console.warn("   ⚠️ Resposta do autor sem dados ou success=false");
                }
            }

            // Renderizar apenas os 3 primeiros que sobrarem
            const displayItems = related.slice(0, 3);
            console.log(`🎯 Renderizando ${displayItems.length} livros relacionados`);
            
            if (displayItems.length > 0) {
                const html = displayItems.map(b => `
                    <div class="related-book-card" onclick="window.location.href='/dadoslivros/?id=${b.id}'">
                        <img src="${getValidImageUrl(b)}" alt="${b.title}">
                        <h4>${b.title}</h4>
                        <p class="author-small">${b.author || 'Desconhecido'}</p>
                        <span class="price-small">R$ ${Number(b.price || 39.90).toFixed(2)}</span>
                    </div>
                `).join('');
                grid.innerHTML = html;
                console.log("✅ Livros relacionados renderizados com sucesso");
            } else {
                console.log("⚠️ Nenhuma recomendação encontrada");
                grid.innerHTML = '<p class="no-related">Nenhuma recomendação encontrada para este título.</p>';
            }

        } catch (err) {
            console.error("❌ Erro ao carregar relacionados:", err);
            console.error("   Stack:", err.stack);
            grid.innerHTML = '<p class="no-related">Erro ao carregar recomendações.</p>';
        }
    }

    function setupBuyButton(book) {
        const buyBtn = document.querySelector('.btn-buy');
        if (buyBtn) {
            buyBtn.addEventListener('click', () => {
                const cart = JSON.parse(localStorage.getItem('cart') || '[]');
                const existingItem = cart.find(item => item.id === book.id);
                if (existingItem) {
                    showNotification(`"${book.title}" já está no carrinho!`);
                } else {
                    cart.push({ ...book, quantity: 1 });
                    localStorage.setItem('cart', JSON.stringify(cart));
                    showNotification(`"${book.title}" adicionado ao carrinho!`);
                    // Update cart count
                    const cartCount = document.getElementById('cartCount');
                    if (cartCount) cartCount.textContent = cart.length;
                }
            });
        }
    }

    function setupReadButton(book) {
        const readBtn = document.querySelector('.btn-read');
        if (readBtn) {
            readBtn.addEventListener('click', () => {
                // Show sample text in a modal or alert
                const sampleText = book.description.length > 500 ? book.description.substring(0, 500) + '...' : book.description;
                alert(`Amostra do livro:\n\n${sampleText}`);
            });
        }
    }
});

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    const colors = { success: '#4caf50', error: '#f44336', info: '#2196F3', warning: '#ff9800' };
    notification.style.cssText = `position: fixed; top: 90px; right: 20px; background: ${colors[type]}; color: white; padding: 15px 20px; border-radius: 8px; z-index: 3000; font-weight: 600;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}


/**
     * Configura o botão de adicionar à lista de desejos
     */
    async function setupWishlistButton(book, userId) {
        const bookId = book.id;
        const wishlistBtn = document.getElementById('wishlistBtn');

        if (!wishlistBtn) return;

        wishlistBtn.disabled = false;
        wishlistBtn.style.opacity = '';
        wishlistBtn.style.cursor = '';

        if (!userId) {
            wishlistBtn.disabled = true;
            wishlistBtn.style.opacity = '0.5';
            wishlistBtn.style.cursor = 'not-allowed';
            wishlistBtn.addEventListener('click', () => {
                showNotification('Faça login para adicionar à lista de desejos', 'warning');
            });
            return;
        }

        // Verificar se o livro já está na lista de desejos
        await checkIfInWishlist(userId, bookId, wishlistBtn);

        wishlistBtn.addEventListener('click', async () => {
            if (wishlistBtn.disabled) return;
            wishlistBtn.disabled = true;

            try {
                if (wishlistBtn.classList.contains('active')) {
                    await removeFromWishlist(userId, bookId, wishlistBtn);
                } else {
                    await addToWishlist(userId, book, wishlistBtn);
                }
            } finally {
                wishlistBtn.disabled = false;
            }
        });
    }

    async function checkIfInWishlist(userId, bookId, btn) {
        try {
            const response = await fetch(`${API_URL}/desejos/${userId}`);
            const result = await response.json();

            if (result.success && result.data) {
                const exists = result.data.some(item =>
                    item.livro_id === bookId || item.livro_id == bookId
                );

                if (exists) {
                    btn.classList.add('active');
                    btn.textContent = '❤️ Na Lista de Desejos';
                } else {
                    btn.classList.remove('active');
                    btn.textContent = '❤️ Adicionar aos Desejos';
                }
            }
        } catch (error) {
            console.error('Erro ao verificar wishlist:', error);
        }
    }

    async function addToWishlist(userId, book, btn) {
        const bookId = book.id;
        try {
            const bookData = {
                titulo: book.title || book.titulo || 'Livro sem título',
                autor: book.author || book.autor || 'Autor desconhecido',
                capa_url: book.image || book.capa_url || null,
                descricao: book.description || book.descricao || 'Sem descrição',
                preco: book.price || book.preco || 39.90,
                categoria: book.category || book.categoria || 'Livro'
            };

            const response = await fetch(`${API_URL}/desejos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    perfil_id: userId,
                    livro_id: String(bookId),
                    book_data: bookData
                })
            });

            const result = await response.json();

            if (result.success) {
                btn.classList.add('active');
                btn.textContent = '❤️ Na Lista de Desejos';
                showNotification('Adicionado à lista de desejos!', 'success');
            } else {
                const errorMsg = result.message || 'Erro desconhecido';
                showNotification(`Erro: ${errorMsg}`, 'error');
                console.error('Erro ao adicionar:', result);
            }
        } catch (error) {
            console.error('Erro ao adicionar à wishlist:', error);
            showNotification('Erro ao conectar com o servidor. Servidor pode estar offline.', 'error');
        }
    }

    async function removeFromWishlist(userId, bookId, btn) {
        try {
            const response = await fetch(`${API_URL}/desejos/${userId}`);
            const result = await response.json();

            if (result.success && result.data) {
                const wishlistItem = result.data.find(item =>
                    item.livro_id === bookId || item.livro_id == bookId
                );

                if (!wishlistItem) {
                    showNotification('Livro não encontrado na lista de desejos', 'warning');
                    return;
                }

                const deleteResponse = await fetch(`${API_URL}/desejos/${wishlistItem.id}`, {
                    method: 'DELETE'
                });

                const deleteResult = await deleteResponse.json();

                if (deleteResult.success) {
                    btn.classList.remove('active');
                    btn.textContent = '❤️ Adicionar aos Desejos';
                    showNotification('Removido da lista de desejos!', 'success');
                } else {
                    showNotification('Erro ao remover da lista de desejos', 'error');
                }
            }
        } catch (error) {
            console.error('Erro ao remover da wishlist:', error);
            showNotification('Erro ao remover da lista de desejos', 'error');
        }
    }

