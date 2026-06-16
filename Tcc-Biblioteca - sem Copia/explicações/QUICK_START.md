# 🚀 Quick Start - Automação de Imagens

## ⚡ 5 Minutos para Começar

### 1️⃣ Instale as Dependências
```bash
cd e:\tcc-liblioteca\loja
npm install
```

### 2️⃣ Inicie o Servidor
```bash
npm start
```
Você verá:
```
╔════════════════════════════════════════╗
║  📚 API LIVRARIA RODANDO              ║
║  Servidor: http://localhost:3000        ║
╚════════════════════════════════════════╝
```

### 3️⃣ Teste os Endpoints

**Em outro terminal:**
```bash
cd e:\tcc-liblioteca\loja
node test-images.js
```

**Ou manualmente:**
```bash
# Livros com imagens automáticas
curl "http://localhost:3000/api/livros-externos?q=ficção"

# Mangás com imagens automáticas
curl "http://localhost:3000/api/mangas-externos?q=action"

# Combinado
curl "http://localhost:3000/api/buscar-tudo?q=bestsellers"
```

### 4️⃣ Use no Seu Website
```html
<script>
// Quando a página carrega, busca livros com imagens automáticas
fetch('/api/livros-externos?q=bestsellers')
  .then(r => r.json())
  .then(data => {
    data.data.forEach(livro => {
      console.log(`${livro.title} - ${livro.image}`);
    });
  });
</script>
```

---

## 📊 O que Cada Endpoint Retorna

### `/api/livros-externos?q=termo`
```json
{
  "success": true,
  "data": [
    {
      "id": "g-OL123456M",
      "title": "O Senhor dos Anéis",
      "author": "J.R.R. Tolkien",
      "price": 89.90,
      "image": "https://covers.openlibrary.org/b/id/123456-M.jpg",
      "description": "A épica fantástica mais famosa."
    }
  ],
  "count": 1,
  "source": "Google Books"
}
```

### `/api/mangas-externos?q=termo`
```json
{
  "success": true,
  "data": [
    {
      "id": "m-12345",
      "title": "Attack on Titan",
      "author": "Hajime Isayama",
      "price": 54.90,
      "image": "https://cdn.jikan.moe/images/manga/12345.jpg",
      "description": "Humanidade contra gigantes."
    }
  ],
  "count": 1,
  "source": "Jikan API"
}
```

### `/api/buscar-tudo?q=termo`
```json
{
  "success": true,
  "data": [
    { /* livro */ },
    { /* manga */ }
  ],
  "count": 2,
  "sources": ["Google Books", "Jikan API"],
  "livrosCount": 1,
  "mangasCount": 1
}
```

---

## 🔍 Termos de Busca Recomendados

### Para Livros
- `fiction` - Ficção geral
- `romance` - Romances
- `mystery` - Mistério
- `science fiction` - Ficção científica
- `fantasy` - Fantasia
- `adventure` - Aventura

### Para Mangás
- `action` - Ação
- `adventure` - Aventura
- `drama` - Drama
- `fantasy` - Fantasia
- `slice of life` - Slice of Life
- `comedy` - Comédia

---

## 🎨 Display no HTML

```html
<div class="livro-card">
  <img src="${livro.image}" alt="${livro.title}" class="livro-imagem">
  <h3>${livro.title}</h3>
  <p>${livro.author}</p>
  <p>R$ ${livro.price.toFixed(2)}</p>
</div>

<style>
.livro-imagem {
  width: 200px;
  height: 300px;
  object-fit: cover;
  border-radius: 8px;
}
</style>
```

---

## ⚠️ Troubleshooting

### ❌ "Cannot find module 'imageResolver'"
**Solução:** Certifique-se de estar no diretório correto
```bash
cd e:\tcc-liblioteca\loja
npm install
```

### ❌ "ECONNREFUSED - Connection Refused"
**Solução:** O servidor não está rodando
```bash
npm start  # Em um terminal separado
```

### ❌ "API retorna 0 resultados"
**Solução:** Verifique a Internet ou tente outro termo de busca
```bash
curl "http://localhost:3000/api/livros-externos?q=harry"
```

### ⚠️ Imagens lentas
**Motivo:** APIs externas podem ter latência  
**Solução:** Adicione loading spinner ou cache em memória

---

## 📚 Arquivos Criados/Modificados

```
✅ NOVO:      loja/services/imageResolver.js
✅ ATUALIZADO: loja/services/googleBooks.js
✅ ATUALIZADO: loja/services/jikan.js
✅ ATUALIZADO: loja/api-server.js
✅ NOVO:      loja/AUTOMATIZACAO_IMAGENS.md
✅ NOVO:      loja/test-images.js
✅ NOVO:      RESUMO_AUTOMACAO_IMAGENS.md
```

---

## 📖 Documentação Completa

Para mais detalhes, veja: [AUTOMATIZACAO_IMAGENS.md](./loja/AUTOMATIZACAO_IMAGENS.md)

---

## 🎯 Próximos Passos

1. ✅ APIs funcionando - teste os endpoints
2. ⏭️ Integre no seu website (copie os fetch examples)
3. ⏭️ Customize o styling para suas imagens
4. ⏭️ (Opcional) Implemente cache para performance

---

## 💬 Dúvidas?

Revise:
- [AUTOMATIZACAO_IMAGENS.md](./loja/AUTOMATIZACAO_IMAGENS.md) - Documentação técnica
- [test-images.js](./loja/test-images.js) - Exemplos de uso
- [api-server.js](./loja/api-server.js) - Endpoints disponíveis
