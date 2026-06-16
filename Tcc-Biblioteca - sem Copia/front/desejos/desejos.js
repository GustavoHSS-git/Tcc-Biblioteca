document.addEventListener("DOMContentLoaded", () => {
    const userId = sessionStorage.getItem("userId");
    const steamCards = document.querySelector(".js-steamCards");

    if (!userId) {
        window.location.href = "/Login/Login.html";
        return;
    }

    loadWishlist();

    async function loadWishlist() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const response = await fetch(`/api/desejos/${userId}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || "Erro ao carregar desejos");
            }

            renderWishlist(result.data || []);
        } catch (error) {
            steamCards.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #2e2e2e;">
                    <p>Não foi possível carregar seus desejos.</p>
                    <p style="font-size: 12px;">${error.message || "Verifique sua conexão."}</p>
                </div>  
            `;
            console.error("[Desejos] Erro:", error);
        }
    }

    function renderWishlist(items) {
        if (!items || items.length === 0) {
            steamCards.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #2e2e2e;">
                    <p>Você ainda não adicionou nenhum livro à sua lista de desejos.</p>
                </div>
            `;
            return;
        }

        steamCards.innerHTML = "";

        items.forEach((item) => {
            const relatedLivro = Array.isArray(item.livros) ? item.livros[0] : item.livros || {};
            const title = relatedLivro?.titulo || relatedLivro?.title || item.titulo || item.title || "Livro desejado";
            const author = relatedLivro?.autor || relatedLivro?.author || item.autor || item.author || "Autor desconhecido";
            const coverUrl = relatedLivro?.capa_url || relatedLivro?.image || item.capa_url || item.image || "https://via.placeholder.com/200x300/222222/00d2ff?text=Sem+Capa";
            const bookId = relatedLivro?.id || item.livro_id || item.id || "";
            const removedId = item.id || item.livro_id || "";

            const wrapper = document.createElement("div");
            wrapper.className = "d-steam-card-wrapper";

            const card = document.createElement("div");
            card.className = "d-steam-card wishlist-card";
            card.style.backgroundImage = `url('${coverUrl}')`;
            card.dataset.bookId = bookId;

            card.innerHTML = `
                <div class="wishlist-card-overlay"></div>
                <div class="wishlist-card-top">
                    <button class="btn remove-button" data-id="${removedId}">✖</button>
                </div>
                <div class="wishlist-card-meta">
                    <h3>${title}</h3>
                    <p>${author}</p>
                </div>
            `;

            card.addEventListener("click", (e) => {
                if (!e.target.closest(".remove-button")) {
                    if (bookId) window.location.href = `/dadoslivros/?id=${bookId}`;
                }
            });

            wrapper.appendChild(card);
            steamCards.appendChild(wrapper);
        });

        document.querySelectorAll(".remove-button").forEach((btn) => {
            btn.addEventListener("click", async (e) => {
                e.stopPropagation();
                const itemId = btn.dataset.id;
                await removeWishlistItem(itemId, btn);
            });
        });
    }

    async function removeWishlistItem(itemId, button) {
        if (!itemId) return;

        try {
            button.disabled = true;
            const response = await fetch(`/api/desejos/${itemId}`, {
                method: "DELETE"
            });
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || "N�o foi poss�vel remover");
            }

            const wrapper = button.closest(".d-steam-card-wrapper");
            if (wrapper) {
                wrapper.style.opacity = "0";
                wrapper.style.transform = "scale(0.95)";
                setTimeout(() => wrapper.remove(), 250);
            }

            await new Promise((resolve) => setTimeout(resolve, 300));
            loadWishlist();
        } catch (error) {
            button.disabled = false;
            console.error("[Desejos] Remove error:", error);
        }
    }
});
