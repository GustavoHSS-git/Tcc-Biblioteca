# 📸 Automatização de Imagens - Documentação

## Resumo das Mudanças

As imagens agora vêm **100% automaticamente das APIs externas** com sistema de fallback inteligente.

## Como Funciona

### 1. **Fluxo de Resolução de Imagens**

```
URL da API (Google Books/Jikan)
    ↓
Valída a URL? (verificação HEAD request)
    ↓ Sim
Retorna URL original da API
    ↓ Não
Tenta OpenLibrary (fallback)
    ↓
Não funcionou?
    ↓
Retorna placeholder genérico (via.placeholder.com)
```

### 2. **Serviços Envolvidos**

#### `services/imageResolver.js` (NOVO)
- **resolveImageUrl()**: Função principal que valida e resolve URLs de imagens
- **validateImageUrl()**: Verifica se uma URL de imagem está acessível
- **getImageFromOpenLibrary()**: Busca alternativa via OpenLibrary
- Suporta fallback automático para imagens genéricas

#### `services/googleBooks.js` (ATUALIZADO)
- Remove imagens locais fixas (`/fotos/ca.jfif`, `/fotos/zeri.jfif`)
- Integra automaticamente com `imageResolver`
- Cada livro obtém uma imagem real via Google Books API ou OpenLibrary
- Dados mockados sem URLs locais (imagens resolvidas dinamicamente)

#### `services/jikan.js` (ATUALIZADO)
- Remove URLs quebradas e fallbacks locais
- Integra automaticamente com `imageResolver`
- Cada manga obtém uma imagem real via Jikan API
- Dados mockados sem URLs locais (imagens resolvidas dinamicamente)

### 3. **Novos Endpoints de API**

#### `loja/api-server.js` (ATUALIZADO)
Três novos endpoints foram adicionados:

**GET /api/livros-externos?q=termo**
```javascript
// Busca livros no Google Books com imagens automáticas
fetch('/api/livros-externos?q=ficção')
  .then(r => r.json())
  .then(data => {
    // data.data contém array de livros com imagens resolvidas
    console.log(data.data[0].image); // URL garantida de imagen
  });
```

**GET /api/mangas-externos?q=termo**
```javascript
// Busca mangás na Jikan com imagens automáticas
fetch('/api/mangas-externos?q=action')
  .then(r => r.json())
  .then(data => {
    // data.data contém array de mangás com imagens resolvidas
    console.log(data.data[0].image); // URL garantida de imagen
  });
```

**GET /api/buscar-tudo?q=termo**
```javascript
// Busca combinada (livros + mangás) com imagens automáticas
fetch('/api/buscar-tudo?q=bestsellers')
  .then(r => r.json())
  .then(data => {
    // data.data contém ambos livros e mangás
    // Incluindo contadores separados: livrosCount, mangasCount
  });
```

### 4. **Exemplo de Resposta**

```json
{
  "success": true,
  "data": [
    {
      "id": "g-OL12345M",
      "title": "O Senhor dos Anéis",
      "author": "J.R.R. Tolkien",
      "price": 89.90,
      "image": "https://covers.openlibrary.org/b/id/123456-M.jpg",
      "description": "A épica fantástica mais famosa."
    },
    {
      "id": "m-12345",
      "title": "Attack on Titan",
      "author": "Hajime Isayama",
      "price": 54.90,
      "image": "https://cdn.jikan.moe/images/manga/12345.jpg",
      "description": "Humanidade contra gigantes."
    }
  ],
  "count": 2,
  "sources": ["Google Books", "Jikan API"]
}
```

## Benefícios

✅ **Automático**: Não precisa gerenciar imagens locais  
✅ **Robusto**: Sistema de fallback de 3 níveis  
✅ **Real-time**: Imagens atualizadas conforme as APIs são consultadas  
✅ **Sem Duplicação**: Validação automática de URLs antes de retornar  
✅ **Escalável**: Suporta múltiplas buscas em paralelo  

## Testes

Para testar os endpoints:

```bash
# Terminal 1: Inicia o servidor
cd e:\tcc-liblioteca\loja
npm install  # Se não tiver os módulos
npm start    # Inicia na porta 3000

# Terminal 2: Testa a API
curl "http://localhost:3000/api/livros-externos?q=ficção"
curl "http://localhost:3000/api/mangas-externos?q=action"
curl "http://localhost:3000/api/buscar-tudo?q=bestsellers"
```

## Configuração

Não há necessidade de configuração adicional. O sistema usa:
- **Google Books API** (sem autenticação necessária para buscas básicas)
- **Jikan API v4** (API pública de mangás)
- **OpenLibrary API** (fallback automático para capas)

## Limitações

- Google Books API tem rate limit de ~100 requisições por minuto por IP
- Jikan API tem rate limit de ~60 requisições por minuto por IP
- Placeholder genérico é usado como último recurso (qualidade reduzida)

## Futuras Melhorias

- [ ] Cache de imagens em memória para otimizar performance
- [ ] Armazenar imagens em CDN para latência reduzida
- [ ] Implementar retry automático com backoff exponencial
- [ ] Adicionar suporte para mais APIs de capas de livros
