// Test do serviço googleBooks.js com fallback
const { buscarLivros } = require('./services/googleBooks');

async function test() {
  console.log('📚 Testando buscarLivros com fallback...\n');
  
  const livros = await buscarLivros('ficção');
  
  console.log('\n✅ Resultado final:');
  console.log('  Livros encontrados:', livros.length);
  
  if (livros.length > 0) {
    console.log('\n  Primeiro livro:');
    const l = livros[0];
    console.log('    Título:', l.title);
    console.log('    Autor:', l.author);
    console.log('    Preço: R$', l.price);
    console.log('    Imagem:', l.image.substring(0, 60) + '...');
  }
}

test().catch(console.error);
