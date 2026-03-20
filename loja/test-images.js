/**
 * 🧪 Script de Teste - Automação de Imagens
 * 
 * Execute com: node test-images.js
 * (Certifique-se que o servidor API está rodando: npm start)
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

/**
 * Faz requisição HTTP GET
 */
function makeRequest(endpoint) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + endpoint);
        
        const req = http.request(url, { method: 'GET' }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });
        
        req.on('error', reject);
        req.end();
    });
}

/**
 * Exibe resultado formatado
 */
function displayResults(testName, results) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 ${testName}`);
    console.log('═'.repeat(60));
    
    if (!results.success) {
        console.log(`❌ Erro: ${results.message}`);
        return;
    }
    
    console.log(`✅ Sucesso`);
    console.log(`📦 Total: ${results.count} itens`);
    console.log(`🔗 Fonte: ${results.source || results.sources?.join(', ')}`);
    
    if (results.data && results.data.length > 0) {
        console.log(`\n📚 Primeiros 3 resultados:\n`);
        results.data.slice(0, 3).forEach((item, idx) => {
            console.log(`  ${idx + 1}. ${item.title}`);
            console.log(`     Autor: ${item.author}`);
            console.log(`     Preço: R$ ${item.price.toFixed(2)}`);
            console.log(`     Imagem: ${item.image.substring(0, 60)}...`);
            console.log('');
        });
    }
}

/**
 * Testa todos os endpoints
 */
async function runTests() {
    console.log('\n🚀 Iniciando testes de automação de imagens...\n');
    
    const tests = [
        {
            name: 'Buscar Livros do Google Books',
            endpoint: '/api/livros-externos?q=ficção'
        },
        {
            name: 'Buscar Mangás da Jikan API',
            endpoint: '/api/mangas-externos?q=action'
        },
        {
            name: 'Busca Combinada (Livros + Mangás)',
            endpoint: '/api/buscar-tudo?q=bestsellers'
        }
    ];
    
    for (const test of tests) {
        try {
            console.log(`⏳ Testando: ${test.name}...`);
            const results = await makeRequest(test.endpoint);
            displayResults(test.name, results);
        } catch (error) {
            console.error(`❌ Erro ao testar ${test.name}:`);
            console.error(error.message);
            console.log('\n💡 Certifique-se que o servidor está rodando: npm start');
        }
    }
    
    console.log(`\n${'═'.repeat(60)}`);
    console.log('✨ Testes concluídos!');
    console.log('═'.repeat(60) + '\n');
}

// Executar testes
runTests().catch(console.error);
