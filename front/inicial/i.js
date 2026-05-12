// ============================================
// 📚 DADOS DOS LIVROS - Carregados das APIs
// ============================================
let books = [];

// ============================================
// 🎨 ELEMENTOS DO DOM
// ============================================
const carouselTrack = document.getElementById("carousel-track");
const dotsContainer = document.getElementById("dots-container");
const memberName = document.querySelector(".member-name");
const memberRole = document.querySelector(".member-role");
const leftArrow = document.querySelector(".nav-arrow.left");
const rightArrow = document.querySelector(".nav-arrow.right");

let currentIndex = 0;
let isAnimating = false;

// ============================================
// 📡 FUNÇÕES DE CARREGAMENTO DE DADOS
// ============================================

function shuffleArray(array) {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

// Função para buscar livros do Google Books (Carrossel Inicial)
async function loadBooksFromGoogle() {
	try {
		// Buscando 3 autores para 3 livros
		const [res1, res2, res3] = await Promise.all([
			fetch('/api/externo/livros?q=inauthor:Rick Riordan'),
			fetch('/api/externo/livros?q=inauthor:J.R.R. Tolkien'),
			fetch('/api/externo/livros?q=inauthor:Douglas Adams')
		]);

		const baseData = await Promise.all([
			res1.json(), res2.json(), res3.json()
		]);

		let todosLivros = [];
		baseData.forEach(data => {
			if (data.success && data.data) {
				todosLivros.push(...data.data);
			}
		});

		// Retorna apenas 3 livros embaralhados
		let embaralhados = todosLivros.sort(() => Math.random() - 0.5);
		return embaralhados.slice(0, 3);
	} catch (error) {
		console.error('Erro ao buscar livros:', error);
		return [];
	}
}

// Função para buscar mangás do Jikan (MyAnimeList)
async function loadMangasFromJikan() {
	try {
		const response = await fetch('/api/externo/mais-vendidos');
		const result = await response.json();
		if (result.success && Array.isArray(result.data)) {
			const mangas = result.data.filter(item => {
				const type = (item.tipo || item.category || item.type || '').toString().toLowerCase();
				return type === 'manga';
			});
			return shuffleArray(mangas).slice(0, 3);
		}
		console.warn('API de mais-vendidos retornou formato inesperado:', result);
		return [];
	} catch (error) {
		console.error('Erro ao buscar mangás:', error);
		return [];
	}
}

// ============================================
//  CRIAR CARDS DINAMICAMENTE
// ============================================
function createCards() {
	books.forEach((book, index) => {
		const card = document.createElement("div");
		card.className = "card";
		card.dataset.index = index;

		card.innerHTML = `
			<div class="card-inner">
				<div class="card-face card-front">
					<img src="${book.image}" alt="${book.title}">
				</div>
				<div class="card-face card-back">
					<h3>${book.title}</h3>
					<p>${book.author}</p>
					<button class="btn-read">Ler</button>
				</div>
			</div>
		`;

		carouselTrack.appendChild(card);
	});
}

// ============================================
//  CRIAR DOTS DINAMICAMENTE
// ============================================
function createDots() {
	books.forEach((_, index) => {
		const dot = document.createElement("div");
		dot.className = "dot";
		if (index === 0) dot.classList.add("active");
		dot.dataset.index = index;
		dotsContainer.appendChild(dot);
	});
}

// ============================================
//  ATUALIZAR CARROSSEL
// ============================================
function updateCarousel(newIndex) {
	if (isAnimating) return;
	isAnimating = true;

	currentIndex = (newIndex + books.length) % books.length;
	const cards = document.querySelectorAll(".card");

	// Atualizar posição dos cards
	cards.forEach((card, i) => {
		const offset = (i - currentIndex + books.length) % books.length;

		card.classList.remove("center", "left-1", "left-2", "right-1", "right-2", "hidden");

		if (offset === 0) card.classList.add("center");
		else if (offset === 1) card.classList.add("right-1");
		else if (offset === 2) card.classList.add("right-2");
		else if (offset === books.length - 1) card.classList.add("left-1");
		else if (offset === books.length - 2) card.classList.add("left-2");
		else card.classList.add("hidden");
	});

	// Atualizar dots
	const dots = document.querySelectorAll(".dot");
	dots.forEach((dot, i) => {
		dot.classList.toggle("active", i === currentIndex);
	});

	// Atualizar informações com fade
	memberName.style.opacity = "0";
	memberRole.style.opacity = "0";

	setTimeout(() => {
		memberName.textContent = books[currentIndex].title;
		memberRole.textContent = books[currentIndex].author;
		memberName.style.opacity = "1";
		memberRole.style.opacity = "1";
	}, 300);

	setTimeout(() => {
		isAnimating = false;
	}, 800);
}

// ============================================
//  EVENT LISTENERS
// ============================================
function attachEventListeners() {
	// Setas de navegação
	leftArrow.addEventListener("click", () => updateCarousel(currentIndex - 1));
	rightArrow.addEventListener("click", () => updateCarousel(currentIndex + 1));

	// Dots
	document.querySelectorAll(".dot").forEach((dot, i) => {
		dot.addEventListener("click", () => updateCarousel(i));
	});

	// Cards
	document.querySelectorAll(".card").forEach((card, i) => {
		card.addEventListener("click", () => updateCarousel(i));
	});

	// Teclado
	document.addEventListener("keydown", (e) => {
		if (e.key === "ArrowLeft") updateCarousel(currentIndex - 1);
		else if (e.key === "ArrowRight") updateCarousel(currentIndex + 1);
	});

	// Touch/Swipe
	let touchStartX = 0;
	document.addEventListener("touchstart", (e) => {
		touchStartX = e.changedTouches[0].screenX;
	});
	document.addEventListener("touchend", (e) => {
		const touchEndX = e.changedTouches[0].screenX;
		const diff = touchStartX - touchEndX;
		const threshold = 50;

		if (Math.abs(diff) > threshold) {
			updateCarousel(currentIndex + (diff > 0 ? 1 : -1));
		}
	});
}

// ============================================
//  INICIALIZAR
// ============================================
async function init() {
	try {
		// Carrega os livros e mangás das APIs
		const livros = (await loadBooksFromGoogle()).slice(0, 3);
		const mangoes = (await loadMangasFromJikan()).slice(0, 3);

		// Combina livros e mangás (alternando: livro, mangá, livro, mangá...)
		books = [];
		for (let i = 0; i < Math.max(livros.length, mangoes.length); i++) {
			if (i < livros.length) books.push(livros[i]);
			if (i < mangoes.length) books.push(mangoes[i]);
		}

		if (books.length === 0) {
			console.warn('Nenhum livro ou mangá foi carregado');
			return;
		}

		createCards();
		createDots();
		attachEventListeners();
		updateCarousel(0);
	} catch (error) {
		console.error('Erro ao inicializar:', error);
	}
}

// Iniciar quando o DOM estiver pronto
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", init);
} else {
	init();
}
