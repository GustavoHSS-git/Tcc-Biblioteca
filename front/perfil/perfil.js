/**
 * 👤 USER PROFILE MANAGEMENT
 * Handles fetching, rendering, and updating user profiles and ratings.
 */

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

    /**
     * Loads the complete user profile including stats and bio
     */
    async function loadUserProfile(id) {
        try {
            const response = await fetch(`/api/perfil/${id}`);
            const result = await response.json();

            if (result.success) {
                const user = result.data;
                renderProfile(user);
                loadUserRatings(id);
            } else {
                profileContainer.innerHTML = `<p class="error-msg">Erro: ${result.message}</p>`;
            }
        } catch (error) {
            profileContainer.innerHTML = `<p class="error-msg">Erro ao conectar com o servidor.</p>`;
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

            <h3 class="section-title">Minhas Avaliações</h3>
            <div id="ratingsList" class="ratings-grid">
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
                const response = await fetch(`/api/perfil/${user.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome: user.nome, bio: newBio, foto_perfil: user.foto_perfil })
                });
                
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
                    await fetch(`/api/perfil/${user.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nome: user.nome, bio: user.bio, foto_perfil: imgData })
                    });
                    showToast("Avatar atualizado!", "#4caf50");
                } catch (err) {
                    showToast("Erro ao salvar avatar.");
                }
            };
            reader.readAsDataURL(file);
        });
    }

    /**
     * Loads the user ratings and updates the stats
     */
    async function loadUserRatings(id) {
        const ratingsList = document.getElementById('ratingsList');
        const statsCount = document.getElementById('statsCount');
        
        try {
            const response = await fetch(`/api/avaliacoes/user/${id}`);
            const result = await response.json();

            if (result.success && result.data) {
                const ratings = result.data;
                statsCount.textContent = ratings.length;
                
                if (ratings.length === 0) {
                    ratingsList.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 2rem;">Você ainda não avaliou nenhum livro.</p>`;
                    return;
                }

                ratingsList.innerHTML = ratings.map(rating => {
                    const livro = rating.livros || {};
                    const capa = livro.capa_url || '/fotos/default-book.png';
                    const score = "⭐".repeat(Math.round(rating.nota)) || "N/A";
                    
                    return `
                        <div class="rating-card">
                            <div class="card-image-wrap">
                                <img src="${capa}" class="card-image" alt="${livro.titulo}">
                                <div class="card-badge">${livro.categoria || 'Livro'}</div>
                            </div>
                            <div class="card-content">
                                <div class="card-title">${livro.titulo || 'Título Desconhecido'}</div>
                                <div class="card-score">${score} (${rating.nota})</div>
                                <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 5px;">
                                    ${rating.comentario ? `"${rating.comentario}"` : "Sem comentário."}
                                </p>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch (error) {
            ratingsList.innerHTML = `<p>Erro ao carregar avaliações.</p>`;
        }

        // Carregar wishlist count separately if endpoint exists
        try {
            const wishlistRes = await fetch(`/api/desejos/${id}`);
            const wishlistData = await wishlistRes.json();
            if (wishlistData.success) {
                document.getElementById('wishlistCount').textContent = wishlistData.data.length;
            }
        } catch (e) { console.warn("Wishlist count fail"); }
    }

    /**
     * Shows a toast notification
     */
    function showToast(message, color = "#333") {
        toast.textContent = message;
        toast.style.backgroundColor = color;
        toast.className = "toast show";
        setTimeout(() => { toast.classList.remove("show"); }, 3000);
    }
});
