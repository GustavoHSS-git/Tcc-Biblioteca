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

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase: SUPABASE_URL e SUPABASE_KEY devem estar definidas em variáveis de ambiente.');
  process.exit(1); // encerra para evitar criar cliente inválido
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
