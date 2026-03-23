# 📚 Biblioteca API - Guia de Uso

Sua API REST foi criada com sucesso! Aqui está o guia completo para usar.

## 🚀 Instalação e Execução

### 1. Instalar dependências
```bash
cd d:\tcc biblioteca\loja
npm install
```

### 2. Iniciar o servidor
```bash
npm start
```

Você verá uma mensagem como:
```
╔════════════════════════════════════════╗
║  📚 API LIVRARIA RODANDO              ║
║  Servidor: http://localhost:3000      ║
╚════════════════════════════════════════╝
```

## 📡 Endpoints Disponíveis

### 1. **Listar todos os livros**
```
GET http://localhost:3000/api/livros
```
Retorna todos os livros e mangás cadastrados.

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "As Relíquias da Morte",
      "author": "J.K. Rowling",
      "price": 89.90,
      "image": "../fotos/33.jpg",
      "images": ["../fotos/33.jpg"],
      "description": "...",
      "category": "livro"
    }
  ],
  "count": 10
}
```

---

### 2. **Obter um livro específico**
```
GET http://localhost:3000/api/livros/1
```
Retorna um livro pelo ID.

**Exemplo:**
```
GET http://localhost:3000/api/livros/7
```

---

### 3. **Listar todos os mangás**
```
GET http://localhost:3000/api/mangas
```
Retorna apenas os mangás cadastrados.

---

### 4. **Buscar livros por autor**
```
GET http://localhost:3000/api/livros/autor/Akira%20Toriyama
```
Retorna todos os livros/mangás de um autor específico.

**Exemplos:**
```
GET http://localhost:3000/api/livros/autor/J.K.%20Rowling
GET http://localhost:3000/api/livros/autor/Akira%20Toriyama
```

---

### 5. **Filtrar por categoria**
```
GET http://localhost:3000/api/categorias/manga
GET http://localhost:3000/api/categorias/livro
```

---

### 6. **Buscar por título ou autor**
```
GET http://localhost:3000/api/buscar?q=Dragon
```
Busca por título ou nome do autor.

**Exemplos:**
```
GET http://localhost:3000/api/buscar?q=Harry
GET http://localhost:3000/api/buscar?q=Toriyama
GET http://localhost:3000/api/buscar?q=manga
```

---

### 7. **Health Check**
```
GET http://localhost:3000/api/status
```
Verifica se a API está rodando.

---

## 🔧 Como Usar no Frontend

Seu arquivo `catalogo.js` foi atualizado para consumir a API automaticamente!

### Função para carregar livros:
```javascript
// Carrega todos os livros da API
await loadBooksFromAPI();
```

### Função para buscar:
```javascript
// Busca por termo (título ou autor)
await searchBooksFromAPI("Dragon Ball");
```

### Função para filtrar por categoria:
```javascript
// Filtra por categoria
await filterByCategory("manga");
```

---

## 📝 Adicionar Novos Livros

Para adicionar novos livros, edite o arquivo `api-server.js` e adicione novos objetos ao array `books`:

```javascript
const books = [
    // ... livros existentes ...
    {
        id: 11,
        title: "Novo Livro",
        author: "Novo Autor",
        price: 59.90,
        image: "../fotos/novo.jpg",
        images: ["../fotos/novo.jpg"],
        description: "Descrição do novo livro",
        category: "livro" // ou "manga"
    }
];
```

Depois reinicie o servidor:
```bash
npm start
```

---

## ⚙️ Troubleshooting

### A API não está respondendo?
1. Verifique se o servidor está rodando: `npm start`
2. Verifique se está em `http://localhost:3000`
3. Abra o browser e vá para `http://localhost:3000/api/status`

### CORS Error?
O CORS já está configurado no `api-server.js`. Se ainda tiver erro:
1. Certifique-se que o servidor está rodando
2. Limpe o cache do navegador (Ctrl+Shift+Delete)
3. Reinicie o servidor

### Livros não aparecem no catálogo?
1. Confirme que a API está rodando
2. Abra o console do navegador (F12) e veja os erros
3. Verifique a URL da API no `catalogo.js`: `const API_URL = "http://localhost:3000/api";`

---

## 🎯 Próximos Passos

- [ ] Adicionar mais livros e mangás
- [ ] Implementar endpoint POST para adicionar livros (banco de dados)
- [ ] Implementar filtros avançados
- [ ] Adicionar autenticação (login)
- [ ] Implementar carrinho persistente no backend

---

**API criada com sucesso! 🎉**
