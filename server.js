const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'manol_auto_parts_secret_key_2026';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Middleware для захисту маршрутів та перевірки ролі оператора/адміністратора
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // формат "Bearer <TOKEN>"

  if (!token) {
    return res.status(401).json({ error: 'Доступ заборонено: відсутній токен авторизації' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Недійсний або прострочений токен' });
    }
    
    // Перевірка дозволеної ролі
    if (decoded.role !== 'operator' && decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Недостатньо прав для виконання цієї операції' });
    }

    req.user = decoded;
    next();
  });
};

// Кореневий тестовий маршрут
app.get('/', (req, res) => {
  res.json({ message: 'Сервер АІС «Автомобільні товари» успішно запущено!' });
});

// Публічний перегляд каталогу (доступно всім)
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

// Публічний список категорій (доступно всім)
app.get('/api/categories', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM categories ORDER BY category_id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Помилка отримання категорій:', err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Безпечна авторизація користувача з видачею підписаного JWT-токена
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.query(
      'SELECT user_id, username, full_name, role FROM users WHERE username = $1 AND password_hash = $2',
      [username, password]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];

      // Генеруємо захищений токен із терміном дії 8 годин
      const token = jwt.sign(
        { user_id: user.user_id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      res.json({ 
        success: true, 
        token, 
        user: { username: user.username, full_name: user.full_name, role: user.role } 
      });
    } else {
      res.status(401).json({ success: false, message: 'Невірний логін або пароль' });
    }
  } catch (err) {
    console.error('Помилка авторизації:', err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// --- ЗАХИЩЕНІ ОПЕРАЦІЇ СКЛАДУ (вимагають verifyToken) ---

// Додавання нового товару (POST)
app.post('/api/products', verifyToken, async (req, res) => {
  const { category_id, article, name, price, stock_quantity, description } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO products (category_id, article, name, price, stock_quantity, description)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [category_id, article, name, price, stock_quantity, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Помилка додавання товару:', err);
    res.status(500).json({ error: 'Не вдалося додати товар' });
  }
});

// Оновлення товару (ціна та кількість) (PUT)
app.put('/api/products/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { price, stock_quantity } = req.body;
  try {
    const result = await db.query(
      `UPDATE products SET price = $1, stock_quantity = $2 WHERE product_id = $3 RETURNING *`,
      [price, stock_quantity, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Помилка оновлення товару:', err);
    res.status(500).json({ error: 'Не вдалося оновити товар' });
  }
});

// Списання / видалення товару (DELETE)
app.delete('/api/products/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM products WHERE product_id = $1', [id]);
    res.json({ success: true, message: 'Товар успішно видалено' });
  } catch (err) {
    console.error('Помилка видалення товару:', err);
    res.status(500).json({ error: 'Не вдалося видалити товар' });
  }
});
// Створення нового замовлення з кошика (доступно клієнту)
app.post('/api/orders', async (req, res) => {
  const { customer_name, items, total_amount } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Кошик порожній' });
  }

  try {
    // 1. Створюємо запис замовлення
    const orderRes = await db.query(
      `INSERT INTO orders (customer_name, total_amount, status) 
       VALUES ($1, $2, 'Нове') RETURNING *`,
      [customer_name || 'Гість', total_amount]
    );
    const newOrder = orderRes.rows[0];

    // 2. Додаємо позиції та списуємо залишки товару
    for (const item of items) {
      await db.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price) 
         VALUES ($1, $2, $3, $4, $5)`,
        [newOrder.order_id, item.product_id, item.name, item.count, item.price]
      );

      // Автоматичне зменшення кількості на складі при замовленні
      await db.query(
        `UPDATE products SET stock_quantity = stock_quantity - $1 WHERE product_id = $2`,
        [item.count, item.product_id]
      );
    }

    res.status(201).json({ success: true, order_id: newOrder.order_id });
  } catch (err) {
    console.error('Помилка оформлення замовлення:', err);
    res.status(500).json({ error: 'Не вдалося оформити замовлення' });
  }
});

// Отримання всіх замовлень для оператора (захищено JWT)
app.get('/api/orders', verifyToken, async (req, res) => {
  try {
    const ordersRes = await db.query(`
      SELECT o.order_id, o.customer_name, o.total_amount, o.status, 
             TO_CHAR(o.created_at, 'DD.MM.YYYY HH24:MI') as date,
             COALESCE(json_agg(json_build_object('name', oi.product_name, 'count', oi.quantity, 'price', oi.price)) 
             FILTER (WHERE oi.item_id IS NOT NULL), '[]') AS items
      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      GROUP BY o.order_id
      ORDER BY o.order_id DESC
    `);
    res.json(ordersRes.rows);
  } catch (err) {
    console.error('Помилка отримання замовлень:', err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Оновлення статусу замовлення оператором (наприклад, "Виконано")
app.patch('/api/orders/:id/status', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await db.query('UPDATE orders SET status = $1 WHERE order_id = $2', [status, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Помилка зміни статусу:', err);
    res.status(500).json({ error: 'Не вдалося оновити статус' });
  }
});
app.listen(PORT, () => {
  console.log(`Сервер запущено: http://localhost:${PORT}`);
});