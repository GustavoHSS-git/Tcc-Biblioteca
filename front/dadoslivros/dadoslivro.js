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
            price: data.preco || data.price || 0,
            category: data.categoria || data.category || (data.tipo === 'manga' ? 'Mangá' : 'Livro'),
            isbn: data.isbn || '—',
            publisher: data.editora || data.publisher || '—'
        };
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
        return '/fotos/default-book.png';
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
        setupStars();
    }

    /**
     * Busca livros parecidos (Lógica Híbrida: Banco Local + APIs Externas)
     */
    /**
     * Busca livros relacionados (Priorizando a mesma série/título)
     */
    async function loadRelated(book) {
        const grid = document.querySelector('.related-books-grid');
        if (!grid) return;

        try {
            // Tenta extrair o nome da série (ex: "Boruto" de "Boruto Vol. 3")
            const seriesName = book.title.split(/vol|:|#/i)[0].trim();
            console.log("🔍 Buscando série relacionada:", seriesName);

            // Busca por volumes da mesma série
            const response = await fetch(`${API_URL}/externo/livros?q=${encodeURIComponent(seriesName)}`);
            const json = await response.json();
            
            let related = [];
            if (json.success && json.data) {
                related = json.data.filter(b => 
                    b.id !== book.id && 
                    b.title.toLowerCase() !== book.title.toLowerCase() &&
                    getValidImageUrl(b) !== '/fotos/default-book.png'
                );
            }

            // Se não encontrou o suficiente na série, busca pelo autor
            if (related.length < 3) {
                const authorOnly = book.author.split(',')[0].trim();
                const authorResp = await fetch(`${API_URL}/externo/livros?q=inauthor:${encodeURIComponent(authorOnly)}`);
                const authorJson = await authorResp.json();
                
                if (authorJson.success && authorJson.data) {
                    const moreBooks = authorJson.data.filter(b => 
                        !related.find(r => r.title === b.title) && 
                        b.id !== book.id &&
                        getValidImageUrl(b) !== '/fotos/default-book.png'
                    );
                    related = [...related, ...moreBooks];
                }
            }

            // Renderizar apenas os 3 primeiros que sobrarem
            const displayItems = related.slice(0, 3);
            
            if (displayItems.length > 0) {
                grid.innerHTML = displayItems.map(b => `
                    <div class="related-book-card" onclick="window.location.href='/dadoslivros/?id=${b.id}'">
                        <img src="${getValidImageUrl(b)}" alt="${b.title}">
                        <h4>${b.title}</h4>
                        <p class="author-small">${b.author}</p>
                        <span class="price-small">R$ ${Number(b.price || 39.90).toFixed(2)}</span>
                    </div>
                `).join('');
            } else {
                grid.innerHTML = '<p class="no-related">Nenhuma recomendação encontrada para este título.</p>';
            }

        } catch (err) {
            console.error("❌ Erro ao carregar relacionados:", err);
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
        
        // Se não estiver autenticado, desabilitar botão
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

        // Adicionar listener ao botão
        wishlistBtn.addEventListener('click', async () => {
            // Verificar se já está ativo
            if (wishlistBtn.classList.contains('active')) {
                // Remover da lista
                await removeFromWishlist(userId, bookId, wishlistBtn);
            } else {
                // Adicionar à lista
                await addToWishlist(userId, book, wishlistBtn);
            }
        });
    }

    /**
     * Verifica se o livro está na lista de desejos
     */
    async function checkIfInWishlist(userId, bookId, btn) {
        try {
            const response = await fetch(`${API_URL}/desejos/${userId}`);
            const result = await response.json();

            if (result.success && result.data) {
                // Verificar se o livro está na lista
                const exists = result.data.some(item => 
                    (item.livro_id === bookId || item.livro_id == bookId)
                );

                if (exists) {
                    btn.classList.add('active');
                    btn.textContent = '❤️ Na Lista de Desejos';
                }
            }
        } catch (error) {
            console.error('Erro ao verificar wishlist:', error);
        }
    }

    /**
     * Adiciona o livro à lista de desejos
     */
    async function addToWishlist(userId, book, btn) {
        const bookId = book.id;
        try {
            // Prepara os dados para persistência caso não existam no banco
            const bookData = {
                id: book.id,
                titulo: book.title || book.titulo,
                autor: book.author || book.autor,
                descricao: book.description || book.descricao || 'Sem descrição',
                capa_url: book.image || book.capa_url,
                preco: book.price || book.preco || 39.90,
                categoria: book.category || book.categoria || 'livro'
            };

            const response = await fetch(`${API_URL}/desejos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    perfil_id: userId,
                    livro_id: bookId,
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

    /**
     * Remove o livro da lista de desejos
     */
    async function removeFromWishlist(userId, bookId, btn) {
        try {
            // Primeiro, preciso encontrar o ID da entrada na tabela lista_de_desejos
            const response = await fetch(`${API_URL}/desejos/${userId}`);
            const result = await response.json();

            if (result.success && result.data) {
                const wishlistItem = result.data.find(item => 
                    item.livro_id === bookId || item.livro_id == bookId
                );

                if (wishlistItem) {
                    // Agora fazer delete usando o ID da entrada
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
            }

            console.log('userId da sessão:', sessionStorage.getItem('userId'));
            console.log('bookId da URL:', new URLSearchParams(window.location.search).get('id'));

        } catch (error) {
            console.error('Erro ao remover da wishlist:', error);
            showNotification('Erro ao remover da lista de desejos', 'error');
        }
    }

