# 🏗️ Arquitetura da Automação de Imagens

## Diagrama da Solução

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENTE (Browser)                      │
│                    catalogo.html / JS                        │
└────────────┬────────────────────────────────────────────────┘
             │ fetch('/api/livros-externos?q=termo')
             │
┌────────────▼────────────────────────────────────────────────┐
│                   API SERVER (Node.js)                       │
│                    api-server.js:3000                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Novos Endpoints:                                      │   │
│  │ • GET /api/livros-externos?q=termo                   │   │
│  │ • GET /api/mangas-externos?q=termo                   │   │
│  │ • GET /api/buscar-tudo?q=termo                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Services de Busca (com automação de imagens):         │   │
│  │ • googleBooks.js                                      │   │
│  │ • jikan.js                                            │   │
│  │ • imageResolver.js ⭐ (NOVO)                          │   │
│  └──────────────────────────────────────────────────────┘   │
└────┬───────────────────────────────────────────────┬────────┘
     │                                               │
     ▼                                               ▼
┌────────────────────┐                    ┌─────────────────────┐
│  Google Books API  │                    │   Jikan API v4      │
│  (Livros + Imagens)│                    │  (Mangás + Imagens) │
└────────┬───────────┘                    └────────┬────────────┘
         │                                          │
         └──────────────────┬───────────────────────┘
                            ▼
                ┌──────────────────────────────┐
                │ ImageResolver (Validação)    │
                │ 1. Valida URL original       │
                │ 2. OpenLibrary (fallback)    │
                │ 3. Placeholder genérico      │
                └──────────────────────────────┘
                            │
                            ▼
                    Imagem Garantida ✅
```

---

## Fluxo de Dados

```
Cliente solicita: /api/livros-externos?q=ficção
  │
  ├─ GoogleBooks.js executa ──► API Google Books
  │                             │
  │                             ├─ Retorna livros com imagens
  │                             │
  │ Cada livro passa por ──────► ImageResolver.js
  │                             │
  │                             ├─ Valida URL original (HEAD request)
  │                             │   ├─ ✅ Válida? Retorna
  │                             │   └─ ❌ Inválida?
  │                             │       │
  │                             │       ├─ Tenta OpenLibrary
  │                             │       │   ├─ ✅ Encontrou? Retorna
  │                             │       │   └─ ❌ Não encontrou?
  │                             │           │
  │                             │           └─ Placeholder genérico
  │                             │
  │ Resposta com imagens ──────► HTTP 200 OK
  │                             {
  │                               success: true,
  │                               data: [...livros com imagens],
  │                               count: X,
  │                               source: "Google Books"
  │                             }
  │
  └─ Cliente renderiza imagens no HTML
```

---

## Estrutura de Arquivos

```
e:\tcc-liblioteca\
├── loja/
│   ├── api-server.js ⭐ ATUALIZADO
│   │   └── Novos endpoints com automação
│   │
│   ├── catalogo.js
│   │   └── Já chama os novos endpoints
│   │
│   ├── catalogo.html
│   │   └── Exibe imagens automáticas
│   │
│   ├── services/
│   │   ├── imageResolver.js ⭐ NOVO
│   │   │   └── Resolução automática de imagens
│   │   │
│   │   ├── googleBooks.js ⭐ ATUALIZADO
│   │   │   └── Integrado com imageResolver
│   │   │
│   │   ├── jikan.js ⭐ ATUALIZADO
│   │   │   └── Integrado com imageResolver
│   │   │
│   │   └── bookAutoloader.js
│   │       └── Usa os serviços atualizados
│   │
│   ├── package.json
│   │   └── axios, cors, express
│   │
│   ├── AUTOMATIZACAO_IMAGENS.md ⭐ NOVO
│   │   └── Documentação técnica completa
│   │
│   └── test-images.js ⭐ NOVO
│       └── Script de teste dos endpoints
│
├── QUICK_START.md ⭐ NOVO
│   └── Guia de 5 minutos
│
└── RESUMO_AUTOMACAO_IMAGENS.md ⭐ NOVO
    └── Resumo das mudanças
```

---

## Fluxo de Requisição HTTP

```
GET /api/livros-externos?q=ficção
│
├─ api-server.js roteia para endpoint
│
├─ Executa buscarLivros('ficção')
│  │
│  ├─ Chamada axios para Google Books API
│  │
│  ├─ Para cada livro retornado:
│  │  │
│  │  ├─ Extrai URL da imagem
│  │  │
│  │  ├─ Passa para resolveImageUrl()
│  │  │
│  │  ├─ imageResolver.js:
│  │  │  ├─ axios.head(imageUrl) - valida
│  │  │  │
│  │  │  ├─ Se falhar: tenta OpenLibrary
│  │  │  │
│  │  │  └─ Se falhar: placeholder genérico
│  │  │
│  │  └─ Retorna objeto com image garantida
│  │
│  └─ Array final com imagens resolvidas
│
├─ Converte para JSON
│
└─ HTTP 200 com resposta
```

---

## Comparação: Antes vs Depois

### ANTES ❌
```javascript
// googleBooks.js
const livrosMockados = [
  { ..., image: '/fotos/ca.jfif' },  // Local fixo
  { ..., image: '/fotos/zeri.jfif' } // Sem variedade
];

// Sempre retorna mesmas imagens
// Sem validação
// Sem fallback automático
```

### DEPOIS ✅
```javascript
// googleBooks.js + imageResolver.js
const livrosMockados = [
  { ..., image: undefined },  // Resolvida dinamicamente
  { ..., image: undefined }   // Via imageResolver
];

// Cada busca traz imagens diferentes
// URLs validadas com HEAD requests
// Fallbacks automáticos (OpenLibrary → Placeholder)
```

---

## Stack Técnico

| Camada | Tecnologia | Função |
|--------|-----------|--------|
| **Frontend** | HTML/CSS/JS | Exibe catálogo com imagens |
| **API** | Express.js | Servir endpoints |
| **Services** | Node.js | Lógica de busca e resolução |
| **Externo 1** | Google Books API | Buscar livros |
| **Externo 2** | Jikan API v4 | Buscar mangás |
| **Externo 3** | OpenLibrary API | Fallback de imagens |
| **Validação** | axios | Requisições e HEAD checks |

---

## Padrão de Design

```
┌─────────────────────────────┐
│   Controller (api-server)   │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│    Service Layer            │
│  (googleBooks, jikan)       │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│   Utility Layer             │
│  (imageResolver)            │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│   External APIs             │
│  (Google, Jikan, OpenLib)   │
└─────────────────────────────┘
```

**Benefício**: Separação de responsabilidades
- Controller: Roteamento
- Service: Lógica de busca
- Utility: Lógica de resolução de imagens
- Externo: Dados puros

---

## Performance

```
Requisição típica: /api/livros-externos?q=ficção

Tempo esperado:
├─ Google Books API: ~500-1000ms
├─ Processamento/imageResolver: ~100-300ms (validações paralelas)
├─ Network round-trip: ~50ms
└─ Total: 650-1350ms

Com cache (futuro):
├─ Lookup no cache: ~1ms
├─ Total: ~1ms (para buscas repetidas)
```

---

## Dúvidas Frequentes

**P: Por que validar imagens com HEAD?**  
R: Para garantir que a URL é acessível antes de enviar ao cliente

**P: Qual é o fallback final?**  
R: Placeholder via.placeholder.com (genérico mas funcional)

**P: Posso adicionar mais APIs de fallback?**  
R: Sim! Edite `imageResolver.js` e adicione novos serviços

**P: As imagens são cacheadas?**  
R: Atualmente não, mas é possível implementar no futuro
