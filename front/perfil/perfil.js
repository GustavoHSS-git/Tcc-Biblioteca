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
    const toast = document.getElementById('toast');

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
                <div class="profile-avatar-container">
                    <img src="${avatarUrl}" alt="${user.nome}" class="profile-avatar" id="currentAvatar">
                    <label for="avatarInput" class="avatar-edit-overlay">📷</label>
                    <input type="file" id="avatarInput" accept="image/*" style="display: none">
                </div>
                
                <div class="profile-info">
                    <h1 class="profile-username">${user.nome}</h1>
                    <p class="profile-email" style="color: var(--text-secondary); margin-top: -10px; margin-bottom: 20px;">${user.email}</p>
                    
                    <div id="bioDisplay">
                        <p class="profile-bio" id="bioText">${bio}</p>
                        <button class="btn-save-bio" id="editBioBtn">Editar Bio</button>
                    </div>
                    
                    <div id="bioEditContainer" style="display: none">
                        <textarea id="bioTextArea" class="bio-editor" placeholder="Escreva sobre você...">${user.bio || ''}</textarea>
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

            <h3 class="section-title">Minha Lista de Desejos</h3>
            <div id="wishlistShowcase" class="library-showcase">
                <div class="loading-container">
                    <div class="spinner" style="width: 30px; height: 30px;"></div>
                </div>
            </div>

            <h3 class="section-title">Minhas Avaliações</h3>
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

        editBioBtn.addEventListener('click', () => {
            document.getElementById('bioDisplay').style.display = 'none';
            document.getElementById('bioEditContainer').style.display = 'block';
        });

        cancelBioBtn.addEventListener('click', () => {
            document.getElementById('bioDisplay').style.display = 'block';
            document.getElementById('bioEditContainer').style.display = 'none';
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
                    document.getElementById('bioText').textContent = newBio;
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
            console.log('[Ratings] Iniciando...');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                console.log('[Ratings] TIMEOUT!');
                controller.abort();
            }, 5000);
            
            const response = await fetch(`/api/avaliacoes/user/${id}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            console.log('[Ratings] Resposta recebida');
            const result = await response.json();
            console.log('[Ratings] Dados:', result);

            if (result.success && result.data) {
                const ratings = result.data;
                statsCount.textContent = ratings.length;
                console.log('[Ratings] Total:', ratings.length);
                
                if (ratings.length === 0) {
                    ratingsList.innerHTML = `<p>Você ainda não avaliou nenhum livro.</p>`;
                } else {
                    ratingsList.innerHTML = `<p>${ratings.length} avaliações carregadas</p>`;
                }
            }
        } catch (error) {
            console.error('[Ratings] Error:', error.message);
            ratingsList.innerHTML = `<p>Erro ao carregar avaliações: ${error.message}</p>`;
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
                        <p style="color: var(--text-secondary); font-size: 1.1rem;">💝 Sua lista de desejos está vazia. Adicione livros para acompanhá-los!</p>
                    </div>
                `;
                return;
            }

            const html = wishlistData.map((item, index) => {
                const livroId = item.livro_id;
                const delay = `${index * 0.08}s`;
                const relatedLivro = Array.isArray(item.livros) ? item.livros[0] : item.livros || {};
                const coverUrl = relatedLivro?.capa_url || relatedLivro?.image || item.capa_url || item.image || 'https://via.placeholder.com/200x300/222222/00d2ff?text=Livro';
                const title = relatedLivro?.titulo || relatedLivro?.title || `Livro #${livroId}`;
                
                return `
                    <div class="book-shelf-item" style="animation-delay: ${delay}">
                        <div class="book-3d-container">
                            <div class="book-spine"></div>
                            <img src="${coverUrl}" alt="${title}" class="book-cover" onclick="window.location.href='/dadoslivros/?id=${livroId}'" style="cursor: pointer;">
                            <div class="book-shine"></div>
                            <button class="btn-remove-wishlist" data-id="${item.id}">✕</button>
                        </div>
                        <div class="book-info-popover">
                            <h4>${title}</h4>
                            <p style="font-size: 0.85rem; color: var(--text-secondary);">Clique para ver detalhes</p>
                        </div>
                    </div>
                `;
            }).join('');
            
            container.innerHTML = html;

            // Adicionar listeners aos botões de remover
            document.querySelectorAll('.btn-remove-wishlist').forEach(btn => {
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
     * Shows a toast notification with enhanced styling
     */
    function showToast(message, color = "#333") {
        toast.textContent = message;
        toast.style.backgroundColor = color;
        toast.style.borderLeft = `4px solid ${color === "#333" ? "#00d2ff" : color}`;
        toast.className = "toast show";
        
        // Auto hide after 3s
        setTimeout(() => { 
            toast.classList.remove("show");
        }, 3000);
    }
});
