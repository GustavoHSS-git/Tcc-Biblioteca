document.addEventListener('DOMContentLoaded', async () => {
    // --- SESSION CONTROL ---
    const userId = sessionStorage.getItem('userId');
    const userEmail = sessionStorage.getItem('userEmail');

    if (!userId) {
        window.location.href = '/Login/Login.html';
        return;
    }

    // --- DOM ELEMENTS ---
    const profileContainer = document.getElementById('profileContent');
    const logoutBtn = document.getElementById('logoutBtn');

    // --- INITIALIZATION ---
    loadUserProfile(userId);

    // --- LOGOUT ---
    logoutBtn.addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = '/Login/Login.html';
    });

    async function loadUserProfile(id) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const response = await fetch(`/api/perfil/${id}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const result = await response.json();

            if (result.success) {
                const user = result.data;
                renderProfile(user);
                loadUserRatings(id);
            } else {
                profileContainer.innerHTML = `<p class="error-msg">Erro: ${result.message}</p>`;
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                profileContainer.innerHTML = `<p class="error-msg">Timeout: Servidor não respondeu.</p>`;
            } else {
                profileContainer.innerHTML = `<p class="error-msg">Erro ao conectar com o servidor.</p>`;
            }
        }
    }

    /**
     * Renders the profile header and info
     */
    function renderProfile(user) {
        const avatarUrl = user.foto_perfil || 'https://placehold.co/150x150/222222/00d2ff?text=User';
        const bio = user.bio || "Este usuário ainda não escreveu uma bio.";

        profileContainer.innerHTML = `
            <div class="profile-header">
                <div class="avatar-wrapper">
                    <div class="profile-avatar-container">
                        <img src="${avatarUrl}" alt="${user.nome}" class="profile-avatar" id="currentAvatar">
                    </div>
                    <label for="avatarInput" class="avatar-edit-overlay" title="Trocar foto">📷</label>
                    <input type="file" id="avatarInput" accept="image/*" style="display: none;">
                </div>
                
                <div class="profile-info">
                    <h1 class="profile-username">${user.nome}</h1>
                    <p class="profile-email" style="color: var(--text-secondary); margin-top: -10px; margin-bottom: 20px;">${user.email}</p>
                    
                    <div id="bioDisplay">
                        <p class="profile-bio" id="bioText">${bio}</p>
                        <button class="btn-save-bio" id="editBioBtn">Editar Bio</button>
                    </div>
                    
                    <div id="bioEditContainer" style="display: none">
                        <textarea id="bioTextArea" class="bio-editor" placeholder="Escreva sobre você..." maxlength="300">${user.bio || ''}</textarea>
                        <div style="text-align: right; font-size: 0.8rem; color: var(--text-secondary); margin-top: -10px; margin-bottom: 15px;" id="bioCharCount">0 / 300</div>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn-save-bio" id="saveBioBtn">Salvar</button>
                            <button class="btn-save-bio" id="cancelBioBtn" style="background: rgba(255,255,255,0.1)">Cancelar</button>
                        </div>
                    </div>
                    
                    <div class="profile-stats">
                        <div class="stat-item">
                            <div class="stat-value" id="statsCount">0</div>
                            <div class="stat-label">Avaliações</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="wishlistCount">0</div>
                            <div class="stat-label">Desejos</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="section-title-row">
                <h3 class="section-title">Minha Lista de Desejos</h3>
                <a href="/desejos/desejos.html" class="btn-go-desejos">Ver todos os desejos</a>
            </div>
            <div id="wishlistShowcase" class="library-showcase">
                <div class="loading-container">
                    <div class="spinner" style="width: 30px; height: 30px;"></div>
                </div>
            </div>

            <div class="section-title-row">
                <h3 class="section-title">Minhas Avaliações</h3>
                <div id="ratingsAction"></div>
            </div>
            <div id="ratingsList" class="ratings-grid">
                <div class="loading-container">
                    <div class="spinner" style="width: 30px; height: 30px;"></div>
                </div>
            </div>

            <h3 class="section-title">Minha Biblioteca Pessoal</h3>
            <div id="libraryShowcase" class="library-showcase">
                <div class="loading-container">
                    <div class="spinner" style="width: 30px; height: 30px;"></div>
                </div>
            </div>
        `;

        // Atribuir eventos após renderizar
        setupEvents(user);
    }

    /**
     * Setups up internal events for the rendered profile
     */
    function setupEvents(user) {
        const editBioBtn = document.getElementById('editBioBtn');
        const saveBioBtn = document.getElementById('saveBioBtn');
        const cancelBioBtn = document.getElementById('cancelBioBtn');
        const avatarInput = document.getElementById('avatarInput');
        const bioTextArea = document.getElementById('bioTextArea');
        const bioCharCount = document.getElementById('bioCharCount');

        let currentBioText = user.bio || '';

        const updateCharCount = () => {
            if (bioTextArea && bioCharCount) {
                bioCharCount.textContent = `${bioTextArea.value.length} / 300 caracteres`;
            }
        };

        if (bioTextArea) {
            bioTextArea.addEventListener('input', updateCharCount);
        }

        editBioBtn.addEventListener('click', () => {
            document.getElementById('bioDisplay').style.display = 'none';
            document.getElementById('bioEditContainer').style.display = 'block';
            updateCharCount();
        });

        cancelBioBtn.addEventListener('click', () => {
            bioTextArea.value = currentBioText;
            document.getElementById('bioDisplay').style.display = 'block';
            document.getElementById('bioEditContainer').style.display = 'none';
            updateCharCount();
        });

        saveBioBtn.addEventListener('click', async () => {
            const newBio = document.getElementById('bioTextArea').value;
            saveBioBtn.disabled = true;
            saveBioBtn.textContent = "...";

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

                const response = await fetch(`/api/perfil/${user.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome: user.nome, bio: newBio, foto_perfil: user.foto_perfil }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                const result = await response.json();
                if (result.success) {
                    showToast("Bio atualizada!", "#4caf50");
                    currentBioText = newBio;
                    document.getElementById('bioText').textContent = newBio || "Este usuário ainda não escreveu uma bio.";
                    cancelBioBtn.click();
                } else {
                    showToast("Erro ao salvar bio.");
                }
            } catch (e) {
                showToast("Erro de conexão.");
            } finally {
                saveBioBtn.disabled = false;
                saveBioBtn.textContent = "Salvar";
            }
        });

        avatarInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Para um TCC real, aqui você usaria um serviço de upload.
            // Para simplicidade, vamos usar FileReader para preview e fingir o salvamento da URL
            const reader = new FileReader();
            reader.onload = async (event) => {
                const imgData = event.target.result;
                document.getElementById('currentAvatar').src = imgData;

                // Salvar no banco (URL base64 ou mock de upload)
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);

                            await fetch(`/api/perfil/${user.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nome: user.nome, bio: user.bio, foto_perfil: imgData }),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    showToast("Avatar atualizado!", "#4caf50");
                } catch (err) {
                    showToast("Erro ao salvar avatar.");
                }
            };
            reader.readAsDataURL(file);
        });
    }

    async function loadUserRatings(id) {
        const ratingsList = document.getElementById('ratingsList');
        const statsCount = document.getElementById('statsCount');

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`/api/avaliacoes/user/${id}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const result = await response.json();

            if (result.success && Array.isArray(result.data)) {
                const ratings = result.data;
                statsCount.textContent = ratings.length;
                renderRatings(ratings.slice(0, 6));
                renderRatingsPreviewActions(ratings.length);
            } else {
                statsCount.textContent = '0';
                ratingsList.innerHTML = `<p>Não foi possível carregar suas avaliações.</p>`;
            }
        } catch (error) {
            console.error('[Ratings] Error:', error);
            statsCount.textContent = '0';
            ratingsList.innerHTML = `<p>Erro ao carregar avaliações.</p>`;
        }

        // Carregar wishlist count e exibição
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const wishlistRes = await fetch(`/api/desejos/${id}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const wishlistData = await wishlistRes.json();

            if (wishlistData.success && Array.isArray(wishlistData.data)) {
                document.getElementById('wishlistCount').textContent = wishlistData.data.length;
                loadWishlist(wishlistData.data);
            }
        } catch (e) {
            // Erro silencioso se a lista de desejos falhar
        }

        // Carregar biblioteca pessoal
        loadLibraryShowcase(id);
    }

    function renderRatingsPreviewActions(totalCount) {
        const ratingsAction = document.getElementById('ratingsAction');
        if (!ratingsAction) return;

        if (totalCount > 0) {
            ratingsAction.innerHTML = `
                <button class="btn-go-desejos" onclick="window.location.href='/perfil/avaliacoes.html'">
                    Ver todas as avaliações (${totalCount})
                </button>
            `;
        } else {
            ratingsAction.innerHTML = '';
        }
    }

    function renderRatings(ratings) {
        const ratingsList = document.getElementById('ratingsList');
        if (!ratingsList) return;

        if (!ratings.length) {
            ratingsList.innerHTML = `<p>Você ainda não avaliou nenhum livro.</p>`;
            return;
        }

        ratingsList.innerHTML = ratings.map((review) => {
            const livro = Array.isArray(review.livros) ? review.livros[0] : review.livros || {};
            const title = livro.titulo || livro.title || `Livro #${review.livro_id}`;
            const author = livro.autor || livro.author || 'Autor desconhecido';
            const cover = livro.capa_url || livro.image || 'https://placehold.co/220x300/222222/00d2ff?text=Sem+Capa';
            const note = Number(review.nota || 0).toFixed(1);
            const comment = review.comentario || 'Sem comentário';
            const date = review.created_at ? new Date(review.created_at).toLocaleDateString('pt-BR') : '';
            const bookId = livro.id || review.livro_id;
            const snippet = comment.length > 90 ? `${comment.slice(0, 90)}...` : comment;

            return `
                <div class="d-steam-card-wrapper">
                    <div class="d-steam-card wishlist-card" style="background-image: linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.55)), url('${cover}')">
                        <div class="wishlist-card-overlay"></div>
                        <div class="wishlist-card-meta">
                            <h3>${title}</h3>
                            <p>${author}</p>
                            ${date ? `<p style="margin-top:0.6rem; font-size:0.82rem; color:#c7d9ff;">${date}</p>` : ''}
                            <p style="margin-top:0.65rem; font-size:0.84rem; line-height:1.35; color:#f5f5f5; white-space: normal; max-height:4.5rem; overflow:hidden;">${snippet}</p>
                            <p style="margin-top:0.7rem; font-size:0.85rem; color:#00d2ff; font-weight:700;">Nota: ${note} / 5</p>
                            ${bookId ? `<button class="btn-go-desejos" onclick="window.location.href='/dadoslivros/?id=${bookId}'">Ver livro</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Exibe os livros da lista de desejos
     */
    function loadWishlist(wishlistData) {
        try {
            const container = document.getElementById('wishlistShowcase');

            if (!container) return;

            if (!wishlistData || wishlistData.length === 0) {
                container.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                        <p style="color: var(--text-secondary); font-size: 1.1rem;">Sua lista de desejos está vazia. Adicione livros para exibir!</p>
                    </div>
                `;
                return;
            }

            const displayedItems = wishlistData.slice(0, 6);
            const html = displayedItems.map((item, index) => {
                const livroId = item.livro_id;
                const delay = `${index * 0.08}s`;
                const relatedLivro = Array.isArray(item.livros) ? item.livros[0] : item.livros || {};
                const coverUrl = relatedLivro?.capa_url || relatedLivro?.image || item.capa_url || item.image || 'https://via.placeholder.com/200x300/222222/00d2ff?text=Livro';
                const title = relatedLivro?.titulo || relatedLivro?.title || `Livro #${livroId}`;
                const author = relatedLivro?.autor || relatedLivro?.author || 'Autor desconhecido';
                const bookId = relatedLivro?.id || livroId;

                return `
                    <div class="d-steam-card-wrapper" style="animation-delay: ${delay}">
                        <div class="d-steam-card wishlist-card" data-book-id="${bookId}" style="background-image: linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.55)), url('${coverUrl}')">
                            <div class="wishlist-card-overlay"></div>
                            <div class="wishlist-card-meta">
                                <h3>${title}</h3>
                                <p>${author}</p>
                                <div style="margin-top: auto; display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                                    <button class="btn-go-desejos" type="button">Ver livro</button>
                                    <button class="btn-remove-wishlist" type="button" data-id="${item.id}" title="Remover dos desejos">✕</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = html;

            document.querySelectorAll('#wishlistShowcase .d-steam-card').forEach(card => {
                card.addEventListener('click', () => {
                    const bookId = card.getAttribute('data-book-id');
                    if (bookId) {
                        window.location.href = `/dadoslivros/?id=${bookId}`;
                    }
                });
            });

            document.querySelectorAll('#wishlistShowcase .btn-remove-wishlist').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const itemId = btn.getAttribute('data-id');
                    removeWishlistItem(itemId, btn);
                });
            });
        } catch (err) {
            console.error('[Wishlist] Erro:', err.message);
        }
    }

    /**
     * Remove um item da lista de desejos
     */
    async function removeWishlistItem(itemId, btn) {
        try {
            const response = await fetch(`/api/desejos/${itemId}`, {
                method: 'DELETE'
            });
            const result = await response.json();

            if (result.success) {
                btn.closest('.book-shelf-item').style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    btn.closest('.book-shelf-item').remove();
                    // Atualizar o contador
                    const count = document.querySelectorAll('.book-shelf-item').length;
                    document.getElementById('wishlistCount').textContent = count;

                    // Se ficou vazio, mostrar mensagem
                    if (count === 0) {
                        const container = document.getElementById('wishlistShowcase');
                        container.innerHTML = `
                            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                                <p style="color: var(--text-secondary); font-size: 1.1rem;">💝 Sua lista de desejos está vazia.</p>
                            </div>
                        `;
                    }
                }, 300);
                showToast('Removido da lista de desejos', '#4caf50');
            }
        } catch (e) {
            showToast('Erro ao remover da lista', '#f44336');
        }
    }

    async function loadLibraryShowcase(id) {
        const libraryContainer = document.getElementById('libraryShowcase');

        if (!libraryContainer) return;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`/api/avaliacoes/user/${id}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const result = await response.json();
            libraryContainer.innerHTML = `<p> Você tem ${result.data ? result.data.length : 0} avaliações</p>`;
        } catch (error) {
            libraryContainer.innerHTML = `<p>Erro ao carregar biblioteca</p>`;
        }
    }

    /**
     * Substitui o antigo layout do toast por avisos nativos.
     */
    function showToast(message, color = "#333") {
        alert(message);
    }
});
