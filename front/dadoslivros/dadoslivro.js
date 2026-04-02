// ============================================
// 📖 DADOS E INTERAÇÕES DA PÁGINA DE DETALHES
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. LER ID DA URL
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get('id');

    if (!bookId) {
        showNotification('Nenhum livro selecionado.', 'warning');
        return;
    }

    const API_URL = '/api';
    const container = document.querySelector('.book-details-container');
    
    // Iniciar carregamento
    try {
        await loadBookDetails(bookId);
    } catch (err) {
        console.error('Erro na inicialização:', err);
    }

    /**
     * Busca os detalhes do livro de múltiplas fontes
     */
    async function loadBookDetails(id) {
        let book = null;

        // TENTA 1: Banco de Dados Local
        try {
            console.log("🔍 [1/3] Buscando no banco local...");
            const res = await fetch(`${API_URL}/livros/${id}`);
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    console.log("✅ Encontrado no banco local!");
                    book = normalizeBookData(json.data);
                }
            }
        } catch (e) { console.log("❌ Não encontrado no banco local."); }

        // TENTA 2: APIs Externas (se não achou no banco ou se o ID parece ser de API externa)
        if (!book) {
            try {
                // 2.1 Tentativa Google Books pelo Volume ID direto
                console.log("🔍 [2/3] Buscando no Google Books pelo ID:", id);
                const gRes = await fetch(`${API_URL}/externo/livro/${id}`);
                if (gRes.ok) {
                    const gJson = await gRes.json();
                    if (gJson.success && gJson.data) {
                        console.log("✅ Encontrado no Google Books!");
                        book = normalizeBookData(gJson.data);
                    }
                }

                // 2.2 Se ainda nada e o ID for número, tenta Jikan
                if (!book && !isNaN(id)) {
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
                }
            } catch (e) {
                console.error("❌ Erro técnico na busca direta por ID:", e);
            }
        }

        if (book) {
            renderBookDetails(book);
            loadRelated(book);
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
        if (descEl) descEl.textContent = book.description;
        
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

    function setupStars() {
        const stars = document.querySelectorAll('.rating-stars .star');
        const result = document.getElementById('rating-result');

        stars.forEach(star => {
            star.onclick = () => {
                const value = star.getAttribute('data-value');
                stars.forEach(s => s.classList.remove('selected'));
                for (let i = 0; i < value; i++) stars[i].classList.add('selected');
                result.textContent = `Você avaliou com ${value} estrelas!`;
                showNotification('Avaliação enviada!', 'info');
            };
        });
    }

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        const colors = { success: '#4caf50', error: '#f44336', info: '#2196F3', warning: '#ff9800' };
        notification.style.cssText = `position: fixed; top: 90px; right: 20px; background: ${colors[type]}; color: white; padding: 15px 20px; border-radius: 8px; z-index: 3000; font-weight: 600;`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
});
