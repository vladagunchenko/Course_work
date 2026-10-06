const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'auto_parts_db',
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Помилка підключення до PostgreSQL:', err.stack);
  }
  console.log('Успішне підключення до бази даних PostgreSQL (auto_parts_db)');
  release();
});

module.exports = pool;