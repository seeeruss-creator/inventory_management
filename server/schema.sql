CREATE DATABASE IF NOT EXISTS `batchoy_inventory`;
USE `batchoy_inventory`;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  role ENUM('admin', 'staff') NOT NULL,
  password VARCHAR(255) NOT NULL DEFAULT '',
  password_hash VARCHAR(64) NOT NULL DEFAULT '',
  last_active TIMESTAMP NULL DEFAULT NULL
);

-- Add password_hash and last_active if upgrading from old schema (MySQL 8.0+)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(64) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP NULL DEFAULT NULL;

CREATE TABLE IF NOT EXISTS items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add item_type to classify items as product or ingredient
ALTER TABLE items ADD COLUMN IF NOT EXISTS item_type ENUM('product','ingredient') NOT NULL DEFAULT 'ingredient';

-- Map product to ingredients required per serving
CREATE TABLE IF NOT EXISTS recipes (
  product_id INT NOT NULL,
  ingredient_id INT NOT NULL,
  qty_per_serving DECIMAL(10,3) NOT NULL,
  unit VARCHAR(32) NOT NULL DEFAULT '',
  PRIMARY KEY (product_id, ingredient_id),
  FOREIGN KEY (product_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES items(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  type ENUM('sale', 'restock') NOT NULL,
  quantity INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- Add created_at if upgrading from old schema
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Seed default users with hashed passwords
-- admin password: admin123 | staff password: staff123
INSERT IGNORE INTO users (id, username, role, password_hash) VALUES
  (1, 'admin', 'admin', SHA2('admin123', 256)),
  (2, 'staff', 'staff', SHA2('staff123', 256));

-- Update passwords for existing seeded users that have no password set
UPDATE users SET password_hash = SHA2('admin123', 256) WHERE id = 1 AND password_hash = '';
UPDATE users SET password_hash = SHA2('staff123', 256) WHERE id = 2 AND password_hash = '';

-- Seed default items
INSERT IGNORE INTO items (id, name, category, stock, price, item_type) VALUES
  (1, 'Coca Cola', 'Drinks', 50, 25.00, 'product'),
  (2, 'Pepsi', 'Drinks', 45, 25.00, 'product'),
  (3, 'Egg', 'Raw Ingredients', 100, 10.00, 'ingredient'),
  (4, 'Noodles', 'Raw Ingredients', 80, 50.00, 'ingredient'),
  (5, 'Beef Stock', 'Raw Ingredients', 20, 150.00, 'ingredient'),
  (6, 'La Paz Batchoy (Classic)', 'Menu', 0, 0.00, 'product'),
  (7, 'Special Batchoy', 'Menu', 0, 0.00, 'product'),
  (8, 'Chicken Batchoy', 'Menu', 0, 0.00, 'product'),
  (9, 'Batchoy with Rice (Budget Meal)', 'Menu', 0, 0.00, 'product'),
  (10, 'Fresh Egg Noodles (Miki)', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (11, 'Pork Broth (Slow-Cooked Bones)', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (12, 'Pork Liver (Sliced)', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (13, 'Pork Intestines (Cleaned and Boiled)', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (14, 'Ground Pork', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (15, 'Chicharon (Crushed)', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (16, 'Garlic (Fried)', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (17, 'Onion', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (18, 'Fish Sauce', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (19, 'Beef Strips', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (20, 'Spring Onions', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (21, 'Chicken Broth', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (22, 'Shredded Chicken', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (23, 'Steamed Rice', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (24, 'Soda Water', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (25, 'Fruit Syrup - Strawberry', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (26, 'Fruit Syrup - Blueberry', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (27, 'Fresh Fruit Bits', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (28, 'Vanilla Ice Cream', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (29, 'Whipped Cream', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (30, 'Milo Powder', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (31, 'Milk', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (32, 'Matcha Powder', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (33, 'Sweetener (Sugar or Syrup)', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (34, 'Blueberry Syrup', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (35, 'Strawberry Syrup', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (36, 'Espresso Shot', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (37, 'Coca-Cola', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (38, 'Crushed Ice / Slush Base', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (39, 'Flavor Syrup - Lemon', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (40, 'Flavor Syrup - Blue Lemon', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (41, 'Fresh Cucumber', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (42, 'Tea', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (43, 'Water', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (44, 'Sugar', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (45, 'Ice', 'Raw Ingredients', 0, 0.00, 'ingredient'),
  (46, 'Fruit Soda (Strawberry)', 'Drinks', 0, 0.00, 'product'),
  (47, 'Fruit Soda (Blueberry)', 'Drinks', 0, 0.00, 'product'),
  (48, 'Fruit Soda Float', 'Drinks', 0, 0.00, 'product'),
  (49, 'Milo Float', 'Drinks', 0, 0.00, 'product'),
  (50, 'Milo Dinosaur', 'Drinks', 0, 0.00, 'product'),
  (51, 'Matcha Blueberry Milk', 'Drinks', 0, 0.00, 'product'),
  (52, 'Strawberry Matcha', 'Drinks', 0, 0.00, 'product'),
  (53, 'Dirty Matcha Latte', 'Drinks', 0, 0.00, 'product'),
  (54, 'Coke Float', 'Drinks', 0, 0.00, 'product'),
  (55, 'Lemon Iced Slushy', 'Drinks', 0, 0.00, 'product'),
  (56, 'Lemon Iced Tea', 'Drinks', 0, 0.00, 'product'),
  (57, 'Blue Lemonade', 'Drinks', 0, 0.00, 'product'),
  (58, 'Cucumber Lemonade', 'Drinks', 0, 0.00, 'product'),
  (59, 'Sprite', 'Drinks', 0, 0.00, 'product'),
  (60, 'Royal', 'Drinks', 0, 0.00, 'product'),
  (61, 'Litro', 'Drinks', 0, 0.00, 'product'),
  (62, 'Mineral Water', 'Drinks', 0, 0.00, 'product');
