// Script de debug para testar a busca de livros
const axios = require('axios');

async function testGoogleBooks() {
  try {
    console.log('🔍 Testando Google Books API...');
    const url = 'https://www.googleapis.com/books/v1/volumes?q=ficção&maxResults=12';
    console.log('URL:', url);
    
    const response = await axios.get(url, { timeout: 5000 });
    
    console.log('✅ Resposta recebida');
    console.log('Items encontrados:', response.data.items?.length);
    
    if (response.data.items && response.data.items.length > 0) {
      console.log('\n📚 Primeiro livro:');
      const item = response.data.items[0];
      console.log('  Título:', item.volumeInfo?.title);
      console.log('  Autor:', item.volumeInfo?.authors?.[0]);
      console.log('  Imagem:', item.volumeInfo?.imageLinks?.thumbnail);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

async function testJikan() {
  try {
    console.log('\n🔍 Testando Jikan API...');
    const url = 'https://api.jikan.moe/v4/manga?q=action&limit=12';
    console.log('URL:', url);
    
    const response = await axios.get(url, { timeout: 5000 });
    
    console.log('✅ Resposta recebida');
    console.log('Mangás encontrados:', response.data.data?.length);
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('\n🎌 Primeiro mangá:');
      const item = response.data.data[0];
      console.log('  Título:', item.title);
      console.log('  Autor:', item.authors?.[0]?.name);
      console.log('  Imagem:', item.images?.jpg?.image_url);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

async function test() {
  await testGoogleBooks();
  await testJikan();
}

test();
