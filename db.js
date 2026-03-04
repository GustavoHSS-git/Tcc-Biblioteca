require('dotenv').config();
const mysql = require('mysql2/promise');

// Cria um pool de conexões para o banco de dados MySQL. Ajuste os valores
// conforme o seu ambiente (via .env ou padrões abaixo).
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'biblioteca',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
