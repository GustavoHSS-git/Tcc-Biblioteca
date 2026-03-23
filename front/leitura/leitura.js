// páginas padrão (usado se não houver nada em localStorage)
const defaultPages = [
    "/fotos/paginas/3 (1).jpg",
    "/fotos/paginas/3 (2).jpg",
    "/fotos/paginas/3 (3).jpg",
    "/fotos/paginas/3 (4).jpg",
    "/fotos/paginas/3 (5).jpg",
    "/fotos/paginas/3 (6).jpg",
    "/fotos/paginas/3 (7).jpg",
];

// Carrega páginas e metadados do localStorage se disponíveis
let pages = defaultPages;
try {
    const stored = localStorage.getItem('readerPages');
    if (stored) pages = JSON.parse(stored);
} catch (err) {
    console.warn('Erro ao ler readerPages do localStorage', err);
}

let currentPage = 1;
let totalPages = pages.length;
let controlsTimeout;
const readerBookId = localStorage.getItem('readerBookId') || 'default-book';
const readerTitleStored = localStorage.getItem('readerTitle') || '';

// Elementos
const pageImage = document.getElementById('pageImage');
const pageSlider = document.getElementById('pageSlider');
const pageInfo = document.getElementById('pageInfo');
const bookTitle = document.getElementById('bookTitle');
const settingsPanel = document.getElementById('settingsPanel');
const readerDisplay = document.getElementById('readerDisplay');

function initReader() {
    // título do livro (se fornecido pela página anterior)
    bookTitle.textContent = readerTitleStored || 'Livro';
    totalPages = pages.length;
    pageSlider.max = totalPages;

    // tenta restaurar progresso salvo para este livro
    const saved = localStorage.getItem(`readerProgress_${readerBookId}`);
    if (saved) {
        const savedPage = parseInt(saved, 10);
        if (!isNaN(savedPage) && savedPage >= 1 && savedPage <= totalPages) currentPage = savedPage;
    }

    // respeitar query param ?page=
    const params = new URLSearchParams(window.location.search);
    const qp = parseInt(params.get('page'), 10);
    if (!isNaN(qp) && qp >= 1 && qp <= totalPages) currentPage = qp;

    updatePage();
    resetTimer();
}

function updatePage() {
    pageImage.style.opacity = '0';
    setTimeout(() => {
        pageImage.src = pages[currentPage - 1];
        pageSlider.value = currentPage;
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        pageImage.onload = () => pageImage.style.opacity = '1';
    }, 200);
}

// salvar progresso automaticamente quando a página muda
function saveProgress() {
    try {
        localStorage.setItem(`readerProgress_${readerBookId}`, String(currentPage));
    } catch (err) {
        console.warn('Erro salvando progresso', err);
    }
}

// intercepta mudanças de página para salvar
const origUpdatePage = updatePage;
updatePage = function() {
    origUpdatePage();
    saveProgress();
};

function nextPage() { if (currentPage < totalPages) { currentPage++; updatePage(); } }
function prevPage() { if (currentPage > 1) { currentPage--; updatePage(); } }

// Navegação por clique na imagem (clique à direita vai pra próxima, à esquerda volta)
if (pageImage) {
    pageImage.addEventListener('click', (e) => {
        const rect = pageImage.getBoundingClientRect();
        (e.clientX - rect.left > rect.width / 2) ? nextPage() : prevPage();
    });
}

// Eventos de botões e slider
const btnNext = document.getElementById('btnNextPage');
const btnPrev = document.getElementById('btnPrevPage');
if (btnNext) btnNext.onclick = nextPage;
if (btnPrev) btnPrev.onclick = prevPage;
if (pageSlider) pageSlider.oninput = (e) => { currentPage = parseInt(e.target.value); updatePage(); };

// caso as páginas tenham sido carregadas via localStorage, certifica-se de atualizar slider e total
if (pageSlider) {
    pageSlider.max = pages.length;
}

// Interface Inteligente
function toggleUI(show) {
    const selectors = ['.page-top', '.reader-toolbar', '.reader-controls', '.reader-nav'];
    selectors.forEach(s => {
        document.querySelectorAll(s).forEach(el => {
            el.style.opacity = show ? '1' : '0';
            el.style.visibility = show ? 'visible' : 'hidden';
        });
    });
}

function resetTimer() {
    toggleUI(true);
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
        if (!settingsPanel.classList.contains('active')) toggleUI(false);
    }, 3000);
}

// Listeners de atividade
['mousemove', 'touchstart', 'keydown'].forEach(evt => 
    document.addEventListener(evt, resetTimer)
);

// Painel e Brilho
const btnSettings = document.getElementById('btnSettings');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const brightnessInput = document.getElementById('brightness');
if (btnSettings) btnSettings.onclick = () => settingsPanel.classList.toggle('active');
if (btnCloseSettings) btnCloseSettings.onclick = () => settingsPanel.classList.remove('active');
if (brightnessInput) brightnessInput.oninput = (e) => { readerDisplay.style.filter = `brightness(${e.target.value}%)`; };

// Cores de fundo para leitura
const colorButtons = document.querySelectorAll('.color-btn');
const currentBackgroundColor = localStorage.getItem('readerBackgroundColor') || '#ffffff';

// Aplicar cor salva ao carregar
document.body.style.backgroundColor = currentBackgroundColor;
colorButtons.forEach(btn => {
    if (btn.getAttribute('data-color') === currentBackgroundColor) {
        btn.classList.add('active');
    }
    btn.addEventListener('click', (e) => {
        const color = e.target.getAttribute('data-color');
        document.body.style.backgroundColor = color;
        localStorage.setItem('readerBackgroundColor', color);
        
        // Atualizar estado visual dos botões
        colorButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
    });
});

// Fullscreen e Voltar
const btnFullscreen = document.getElementById('btnFullscreen');
const btnBack = document.getElementById('btnBack');
if (btnFullscreen) btnFullscreen.onclick = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
};
if (btnBack) btnBack.onclick = () => window.history.back();

initReader();

// Navegação por teclado
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { nextPage(); resetTimer(); }
    if (e.key === 'ArrowLeft') { prevPage(); resetTimer(); }
    if (e.key === 'Escape') { if (settingsPanel.classList.contains('active')) settingsPanel.classList.remove('active'); }
});