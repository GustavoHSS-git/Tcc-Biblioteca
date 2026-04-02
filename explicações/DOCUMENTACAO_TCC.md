# Manual Definitivo do Projeto: Entendendo o nosso TCC 🚀

Fala guerreiro! Este documento foi criado especialmente para você entender **de ponta a ponta** como o nosso TCC (A Plataforma de Livraria/Biblioteca Digital) funciona. 

Não se preocupe se você não entende 100% de JavaScript ou se perde nas pastas do projeto. Aqui, vamos destrinchar cada pedaço do projeto, com uma atenção fortíssima ao Javascript, para que você possa entender o que está acontecendo "debaixo dos panos", conseguir apresentar o projeto aos professores com tranquilidade e até dar manutenção!

---

## 1. Visão Geral (O que é e o que usamos)

Nosso TCC é uma aplicação web completa (um site dinâmico) onde os usuários podem visualizar livros, ler mangás, colocar itens no carrinho e efetuar compras. Para fazer isso acontecer, dividimos a aplicação em duas metades:

1. **O Backend (O Cérebro / Servidor):** Construído com **Node.js** e o framework **Express**. Ele roda na nossa máquina (ou no servidor) na porta `3000` (`http://localhost:3000`). Ele interage com o Banco de Dados (**Supabase**) e com APIs externas na nuvem (Google Books e Jikan Manga).
2. **O Frontend (A Cara / Cliente):** São os arquivos que o navegador (Chrome, Edge, etc.) do usuário baixa e executa. Foi construído usando **HTML, CSS e Vanilla JavaScript** (JavaScript puro, sem React ou Vue). Ele fica dentro da pasta `/front`.

---

## 2. A Estrutura de Pastas

No nosso repositório, você vai notar algumas pastas e arquivos cruciais:

- 📄 `server.js` -> É a porta de entrada do Backend. Quando rodamos `npm start`, é esse arquivo que o Node.js lê primeiro.
- 📄 `supabase.js` -> Configuração simples com as nossas senhas para acessar o **Supabase** (nosso banco de dados estilo PostgreSQL na nuvem).
- 📁 `api/` -> Onde ficam as rotas e funções adicionais do Backend (ex: `api.js`, `googleBooks.js`).
- 📁 `front/` -> Aqui moram os arquivos visuais e de interação que o usuário vê. Dentro dele, temos subpastas como `loja/`, `Login/`, `admin/`, etc.

---

## 3. Como o Backend Funciona (O `server.js`)

Se você abrir o `server.js`, vai ver muito código Javascript rodando através do Node.js. 
As principais funções do Backend no nosso projeto são:

1. **Servir as páginas estáticas:** Ele pega a pasta `front/` e "abre" para o mundo. O comando `app.use('/loja', express.static(path.join(__dirname, 'front', 'loja')));` literalmente diz: *"Se alguém acessar /loja no navegador, mande os arquivos HTML e CSS daquela pasta"*.
2. **Criar "Rotas" ou "Endpoints" (APIs):** O frontend não acessa o banco de dados diretamente por motivo de segurança. Em vez disso, o `server.js` cria rotas como `app.get('/api/livros', ...)` para o frontend pedir os livros.
3. **Conversar com o Supabase:** O Backend importa o cliente do Supabase e faz consultas (Queries) prontas:
   ```javascript
   // Exemplo real tirado do Backend: Pede todos os livros do banco
   const { data, error } = await supabase.from('livros').select('*');
   ```

### 🧠 Dica de JS (Backend): O tal do "async / await"
No Javascript, as coisas não acontecem na hora. O servidor é rápido demais, mas a internet até o banco de dados demora alguns milisegundos. Para o Node não ficar "travado" esperando, usamos `async` antes de uma função e `await` antes de tarefas demoradas. Isso diz ao código: *"Espera aí o banco responder antes de ir para a próxima linha"*.

---

## 4. Como o Frontend Funciona (Onde a Mágica do JS Acontece)

É aqui que a documentação ganha peso. Se abrirmos um arquivo como o `front/loja/catalogo.js`, encontraremos o coração visual do site. O arquivo HTML tem estruturas vazias (como `<div id="booksGrid"></div>`), e é a responsabilidade do **JavaScript do Frontend** preencher isso tudo dinamicamente criando botões, imagens e preços.

Aqui vão os principais conceitos de JS aplicados na prática no nosso projeto:

### A) Selecionando elementos da Tela (`document.getElementById`)
No começo do arquivo `.js`, você sempre verá coisas assim:
```javascript
const booksGrid = document.getElementById("booksGrid");
const cartBtn = document.getElementById("cartBtn");
```
**O que isso faz:** Ele "pesca" a div do HTML que tem aquele ID específico e coloca dentro de uma variável (como a `booksGrid`). Então, quando quisermos colocar os livros na tela, nós simplesmente mandamos o Javascript "injetar" algo dentro dessa variável.

### B) Reagindo ao usuário (O `addEventListener`)
Para que um botão faça alguma coisa quando clicado, você amarra uma "escuta" de evento nele. 
```javascript
cartBtn.addEventListener("click", () => {
    cartModal.classList.add("active"); // Mostra o pop-up do carrinho!
});
```
Se o usuário apertar na barra de pesquisa (digitar e der Enter), temos um evento "keypress" esperando pela tecla "Enter".

### C) Comunicação com o Backend (`fetch`)
Quando você clica na vitrine, o Frontend dispara uma requisição de busca aos servidores (o servidor `server.js` que mencionamos lá em cima). Ele usa o `fetch` pra fazer essa "ligação".

```javascript
// Exemplo inspirado no nosso 'searchCombined'
async function searchCombined(searchTerm) {
    // 1. O frontend "liga" pro servidor do nosso backend
    const resposta = await fetch(`/api/externo/livros?q=${searchTerm}`);
    
    // 2. Transforma a resposta que chegou bagunçada em JSON organizado
    const livros = await resposta.json();
    
    // 3. Devolve esses livros para quem chamou
    return livros.data; 
}
```

### D) Transformando Dados em Visual (O `map` e os Backticks)
Digamos que recebemos 10 livros da nossa API. Como criamos 10 "cartões com foto" no site? Através de uma função de array chamada `.map()`. Ela pega uma lista de itens, e "mapeia" (transforma) em outra coisa, geralmente num pedaço de códico HTML.

Repare como usamos os "templantes literais" (que são essas aspas crases \`...\` com símbolos como `${livro.title}` dentro). Isso é ótimo para colar variáveis em meio a um montão de código HTML!

```javascript
function renderBooks(booksList) {
    // Pegamos a section invisível vazia no HTML (booksGrid)
    // Usamos 'map' para desenhar caixas de HTML para cada livro
    const htmlDosLivros = booksList.map(book => {
        return `
            <div class="book-card">
                <img src="${book.image}" alt="Capa">
                <h3>${book.title}</h3>
                <p>R$ ${book.price}</p>
                <button onclick="addToCart('${book.id}')">Comprar</button>
            </div>
        `;
    });
    
    // Join junta tudo num textão único, e o innerHTML engole esse texto para tela!
    booksGrid.innerHTML = htmlDosLivros.join(''); 
}
```

### E) Classes e Persistência de Dados (O Carrinho)
Nós usamos uma construção moderna chamada `class Cart` para organizar o código do carrinho de supermercado. O legal do carrinho é o **`localStorage`**. 
O localStorage é como uma "memória muscular" do navegador do computador. Se o usuário montar um carrinho e der um f5 a página ou fechar a aba por acidente, nós puxamos tudo de volta do Storage (`JSON.parse(localStorage.getItem('cart'))`), poupando os itens!

---

## 5. O Fluxo Completo: Do Clique até a Compra Final

Para resumir sua vida e a explicação num só laço contínuo de lógica, aqui vai o Passo-a-Passo ("Jornada do Usuário"):

1. **Acessando o site:** O usuário abre `localhost:3000/loja`. O Express (no Backend) retorna a ele o `catalogo.html`.
2. **Carregamento Automático Inicial:** Assim que a tela é desenhada (`DOMContentLoaded`), nosso Javascript no Frontend vai rodar a rotina inicial e buscar diversos grandes títulos (livros da Marvel, Harry Potter, mangas de Naruto) via chamadas da API (`fetch('/api/externo/livros')`).
3. **Decisão:** Na API, o nosso Backend primeiramente vê se aqueles livros estão guardados em **cache local** do Supabase (para economizar recursos). Se sim, entrega, se não, pega do "Google Books" e do "Jikan", e filtra tudo num formato mastigado para o Javascript front end desenhar.
4. **Interação de Filtros:** Se o usuário clicar no botão de "Promoções", o javascript frontal aplica a função `.filter` no Array principal cortando preços. Tudo atualizado em tempo-real via `booksGrid.innerHTML`.
5. **Comprando:** O Usuário clica em "Comprar". A função `cart.add(livro)` é disprada, os números sobem. 
6. **Checkout (Pagamento Fictício):** O usuário clica "Finalizar Compra". Isso roda a rotina atrelada ao `checkoutBtn`, que compila sua sacola e dispara a requisição `POST /api/vendas`. 
7. **Sucesso:** O Backend atualiza e loga as finanças no Supabase (no banco de dados real), devolve "Sucesess", o front limpa o `localStorage` e cria um pop-up Verde *"Compra de x reais finalizada com sucesso!*".

E assim todo o ecossistema funciona de maneira independente e limpa! 🎉

Espero que esse material ajude a compreender como montamos e moldamos essa biblioteca do absoluto zero. Você pode ir no repositório das pastas listadas pra ver como o código que foi explicado em pedaços aqui roda todo integrado!
