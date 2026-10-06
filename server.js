const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
// Кореневий тестовий маршрут
app.get('/', (req, res) => {
  res.json({ message: 'Сервер АІС «Автомобільні товари» успішно запущено!' });
});

// Маршрут для отримання каталогу товарів із бази
app.get('/api/products', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.product_id, p.article, p.name, p.price, p.stock_quantity, p.description, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      ORDER BY p.product_id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Помилка виконання SQL-запиту:', err);
    res.status(500).json({ error: 'Помилка отримання даних із сервера' });
  }
});
 // Авторизація користувача (перевірка логіна та пароля з БД)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.query(
      'SELECT user_id, username, full_name, role FROM users WHERE username = $1 AND password_hash = $2',
      [username, password]
    );

    if (result.rows.length > 0) {
      res.json({ success: true, user: result.rows[0] });
    } else {
      res.status(401).json({ success: false, message: 'Невірний логін або пароль' });
    }
  } catch (err) {
    console.error('Помилка авторизації:', err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});
app.listen(PORT, () => {
  console.log(`Сервер запущено: http://localhost:${PORT}`);
});