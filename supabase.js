// Requer que você tenha instalado a biblioteca oficial e configurado as
// variáveis de ambiente SUPABASE_URL e SUPABASE_KEY. O arquivo `.env` deve
// ficar na raiz do projeto.

const path = require('path');
const fs = require('fs');
const envPath = path.resolve(__dirname, '.env');
console.log('.env path:', envPath, 'exists?', fs.existsSync(envPath));
if (fs.existsSync(envPath)) {
    console.log('.env content:\n', fs.readFileSync(envPath, 'utf8'));
}
const result = require('dotenv').config({ path: envPath });
console.log('dotenv result:', result);
const { createClient } = require('@supabase/supabase-js');

// log simples para ajudar na depuração; tokens não são exibidos
console.log('Supabase URL:', process.env.SUPABASE_URL ? '[set]' : '[missing]');
console.log('Supabase KEY is', process.env.SUPABASE_KEY ? '[set]' : '[missing]');

const supabaseUrl = 'https://felvojelnhthbrxhsgxj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbHZvamVsbmh0aGJyeGhzZ3hqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDk0MTA1OCwiZXhwIjoyMDg2NTE3MDU4fQ.Z-FOfO1omug2Oj905neA-M6ELHR8CkrlwRdXZiVyjwg';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase: SUPABASE_URL e SUPABASE_KEY devem estar definidas em variáveis de ambiente.');
  process.exit(1); // encerra para evitar criar cliente inválido
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  },
  db: {
    schema: 'public'
  },
  auth: {
    persistSession: false
  }
});

// Configuração temporária para ignorar certificado SSL inválido
const https = require('https');
const originalFetch = global.fetch;
global.fetch = (url, options = {}) => {
  if (url.includes('supabase.co')) {
    return originalFetch(url, {
      ...options,
      agent: new https.Agent({
        rejectUnauthorized: false
      })
    });
  }
  return originalFetch(url, options);
};

module.exports = supabase;
