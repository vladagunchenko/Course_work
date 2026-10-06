-- 1. Створення таблиці категорій
CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- 2. Створення таблиці користувачів
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) DEFAULT 'operator'
);

-- 3. Створення таблиці автотоварів
CREATE TABLE IF NOT EXISTS products (
    product_id SERIAL PRIMARY KEY,
    article VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category_id INT NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Додавання категорії
INSERT INTO categories (name, description) VALUES
('Синтетичні моторні оливи', 'Високоякісні синтетичні моторні оливи з допусками світових автовиробників')
ON CONFLICT (name) DO NOTHING;

-- Додавання облікового запису оператора
INSERT INTO users (username, password_hash, full_name, role) VALUES
('operator1', 'admin123', 'Влада Гунченко', 'operator')
ON CONFLICT (username) DO NOTHING;

-- Додавання 10 реальних позицій із прайсу Mannol
INSERT INTO products (article, name, category_id, price, stock_quantity, description) VALUES
('MN7902-4', 'Mannol Racing+Ester 10W-60 4л', 1, 1039.20, 25, 'Синтетична моторна олива на естеровій основі, API SN/CH-4'),
('MN7902-1', 'Mannol Racing+Ester 10W-60 1л', 1, 252.80, 40, 'Синтетична моторна олива на естеровій основі, API SN/CH-4'),
('MN7903-4', 'Mannol Elite 5W-40 4л', 1, 941.20, 32, 'ACEA A3/B4, API SN/CH-4, MB-Approval 229.5, Renault RN 0710/0700'),
('MN7903-1', 'Mannol Elite 5W-40 1л', 1, 280.80, 50, 'ACEA A3/B4, API SN/CH-4, MB-Approval 229.5, Renault RN 0710/0700'),
('MN7904-5', 'Mannol Diesel Turbo 5W-40 5л', 1, 1039.20, 18, 'Олива для дизельних турбодвигунів, API CJ-4/SL, ACEA A3/B4'),
('MN7904-1', 'Mannol Diesel Turbo 5W-40 1л', 1, 293.22, 22, 'Олива для дизельних турбодвигунів, API CJ-4/SL, ACEA A3/B4'),
('MN7906-4', 'Mannol Energy Ultra JP 5W-20 4л', 1, 1002.00, 14, 'Енергозберігаюча олива для авто з Японії та Кореї, API SN, ILSAC GF-5, GM dexos1'),
('MN7906-1', 'Mannol Energy Ultra JP 5W-20 1л', 1, 324.13, 30, 'Енергозберігаюча олива, API SN, ILSAC GF-5, GM dexos1'),
('MN7907-4', 'Mannol Energy Combi LL 5W-30 4л', 1, 1199.60, 28, 'Синтетична олива для сучасних двигунів VAG/BMW/MB, API SN, ACEA C3'),
('MN7907-5', 'Mannol Energy Combi LL 5W-30 5л', 1, 1842.00, 12, 'Синтетична олива зі збільшеним інтервалом заміни (Longlife), API SN, ACEA C3')
ON CONFLICT (article) DO NOTHING;