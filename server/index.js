import express from 'express';
import cors from 'cors';
import { createHash } from 'node:crypto';
import { initDatabase, pool, testConnection } from './db.js';
import { roleGuard } from './middleware.js';

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json());

const hashPassword = (pw) => createHash('sha256').update(String(pw)).digest('hex');

const insertTransaction = async (conn, { itemId, type, quantity, userId }) => {
  try {
    await conn.query(
      'INSERT INTO transactions (item_id, type, quantity, user_id) VALUES (?, ?, ?, ?)',
      [itemId, type, quantity, userId || null]
    );
  } catch (error) {
    // Backward compatibility for databases where user_id does not exist yet
    if (error?.code === 'ER_BAD_FIELD_ERROR') {
      await conn.query(
        'INSERT INTO transactions (item_id, type, quantity) VALUES (?, ?, ?)',
        [itemId, type, quantity]
      );
      return;
    }
    throw error;
  }
};

// ── Health ────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ── Auth ──────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!username) return res.status(400).json({ message: 'Username is required' });
  if (!password) return res.status(400).json({ message: 'Password is required' });

  try {
    const [rows] = await pool.query(
      'SELECT id, username, role, password_hash, password FROM users WHERE username = ? LIMIT 1',
      [username]
    );
    if (!rows.length) return res.status(404).json({ message: 'User not found' });

    const user = rows[0];
    const hashed = hashPassword(password);

    const matchedByHash = !!user.password_hash && hashed === user.password_hash;
    const matchedByLegacy = !!user.password && (password === user.password || hashed === user.password);
    if (!matchedByHash && !matchedByLegacy) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    return res.json({ user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    return res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

app.post('/api/logout', roleGuard('admin', 'staff'), async (req, res) => {
  try {
    await pool.query('UPDATE users SET last_active = NULL WHERE id = ?', [req.user.id]);
    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Logout failed', error: error.message });
  }
});

// ── Staff Account Management (admin only) ─────────────────
// List all accounts (admin + staff)
app.get('/api/staff', roleGuard('admin'), async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, role, last_active FROM users ORDER BY role, username'
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch accounts', error: error.message });
  }
});

// Create a staff or admin account
app.post('/api/staff', roleGuard('admin'), async (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const role     = ['staff', 'admin'].includes(req.body?.role) ? req.body.role : 'staff';

  if (!username) return res.status(400).json({ message: 'Username is required' });
  if (password.length < 4) return res.status(400).json({ message: 'Password must be at least 4 characters' });

  try {
    const hashed = hashPassword(password);
    let result;
    try {
      [result] = await pool.query(
        'INSERT INTO users (username, role, password_hash, password) VALUES (?, ?, ?, ?)',
        [username, role, hashed, hashed]
      );
    } catch (insertError) {
      // Backward compatibility when legacy `password` column is missing
      if (insertError?.code !== 'ER_BAD_FIELD_ERROR') throw insertError;
      [result] = await pool.query(
        'INSERT INTO users (username, role, password_hash) VALUES (?, ?, ?)',
        [username, role, hashed]
      );
    }
    return res.status(201).json({ id: result.insertId, message: `${role} account created` });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Username already exists' });
    }
    return res.status(500).json({ message: 'Failed to create account', error: error.message });
  }
});

app.delete('/api/staff/:id', roleGuard('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (id === 1) return res.status(403).json({ message: 'Cannot delete the admin account' });
  try {
    await pool.query("DELETE FROM users WHERE id = ? AND role = 'staff'", [id]);
    return res.json({ message: 'Staff account deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete staff account', error: error.message });
  }
});

app.put('/api/staff/:id/password', roleGuard('admin'), async (req, res) => {
  const id = Number(req.params.id);
  const password = String(req.body?.password || '');
  if (password.length < 4) return res.status(400).json({ message: 'Password must be at least 4 characters' });
  try {
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ? AND role = 'staff'", [hashPassword(password), id]);
    return res.json({ message: 'Password updated' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update password', error: error.message });
  }
});

// ── Items ─────────────────────────────────────────────────
app.get('/api/items', roleGuard('admin', 'staff'), async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        i.id, i.name, i.category, i.stock, i.price, i.item_type, i.created_at,
        (SELECT COUNT(*) FROM recipes r WHERE r.product_id = i.id) AS has_recipe
      FROM items i
      ORDER BY i.category, i.name
    `);
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch items', error: error.message });
  }
});

app.post('/api/items', roleGuard('admin', 'staff'), async (req, res) => {
  let { name, category, stock = 0, price = 0, item_type = 'ingredient' } = req.body || {};
  if (!name || !category) return res.status(400).json({ message: 'Name and category are required' });
  if (!['product', 'ingredient'].includes(item_type)) return res.status(400).json({ message: 'Invalid item_type' });
  // If staff, force products only and zero stock init
  if (req.user?.role === 'staff') {
    item_type = 'product';
    stock = 0;
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO items (name, category, stock, price, item_type) VALUES (?, ?, ?, ?, ?)',
      [String(name).trim(), String(category).trim(), Number(stock) || 0, Number(price) || 0, item_type]
    );
    return res.status(201).json({ id: result.insertId, message: 'Item created' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create item', error: error.message });
  }
});

app.put('/api/items/:id', roleGuard('admin'), async (req, res) => {
  const { id } = req.params;
  const { name, category, stock = 0, price = 0, item_type } = req.body || {};
  try {
    const fields = ['name = ?', 'category = ?', 'stock = ?', 'price = ?'];
    const params = [
      String(name).trim(),
      String(category).trim(),
      Number(stock) || 0,
      Number(price) || 0
    ];
    if (item_type) {
      if (!['product', 'ingredient'].includes(item_type)) return res.status(400).json({ message: 'Invalid item_type' });
      fields.push('item_type = ?');
      params.push(item_type);
    }
    params.push(Number(id));
    const sql = `UPDATE items SET ${fields.join(', ')} WHERE id = ?`;
    await pool.query(sql, params);
    return res.json({ message: 'Item updated' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update item', error: error.message });
  }
});

// ── Recipes (admin) ─────────────────────────────────────────
app.get('/api/recipes/:productId', roleGuard('admin'), async (req, res) => {
  const productId = Number(req.params.productId);
  if (!productId) return res.status(400).json({ message: 'Invalid product id' });
  try {
    const [rows] = await pool.query(
      `SELECT r.ingredient_id, i.name AS ingredient_name, r.qty_per_serving, r.unit
       FROM recipes r
       JOIN items i ON i.id = r.ingredient_id
       WHERE r.product_id = ?`,
      [productId]
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch recipe', error: error.message });
  }
});

// Replace recipe rows for a product
app.put('/api/recipes/:productId', roleGuard('admin'), async (req, res) => {
  const productId = Number(req.params.productId);
  const rows = Array.isArray(req.body?.ingredients) ? req.body.ingredients : [];
  if (!productId) return res.status(400).json({ message: 'Invalid product id' });
  try {
    // Ensure target is a product
    const [prodRows] = await pool.query('SELECT id, item_type FROM items WHERE id = ?', [productId]);
    if (!prodRows.length || prodRows[0].item_type !== 'product') {
      return res.status(400).json({ message: 'Target item is not a product' });
    }
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM recipes WHERE product_id = ?', [productId]);
      for (const r of rows) {
        const ingId = Number(r.ingredient_id);
        const qty = Number(r.qty_per_serving);
        const unit = String(r.unit || '').trim();
        if (!ingId || !(qty > 0)) {
          await conn.rollback();
          conn.release();
          return res.status(400).json({ message: 'Invalid ingredient row' });
        }
        const [ingType] = await conn.query('SELECT item_type FROM items WHERE id = ?', [ingId]);
        if (!ingType.length || ingType[0].item_type !== 'ingredient') {
          await conn.rollback();
          conn.release();
          return res.status(400).json({ message: 'Ingredient must be of type ingredient' });
        }
        await conn.query(
          'INSERT INTO recipes (product_id, ingredient_id, qty_per_serving, unit) VALUES (?, ?, ?, ?)',
          [productId, ingId, qty, unit]
        );
      }
      await conn.commit();
      conn.release();
      return res.json({ message: 'Recipe saved' });
    } catch (e) {
      await conn.rollback();
      conn.release();
      throw e;
    }
  } catch (error) {
    return res.status(500).json({ message: 'Failed to save recipe', error: error.message });
  }
});

// ── Sales (product -> deduct ingredients) ───────────────────
app.post('/api/sales', roleGuard('admin', 'staff'), async (req, res) => {
  const productId = Number(req.body?.product_id);
  const qty = Number(req.body?.quantity);
  if (!productId || !(qty > 0)) return res.status(400).json({ message: 'Invalid product or quantity' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Validate product type
    const [prodRows] = await conn.query('SELECT id, item_type FROM items WHERE id = ? FOR UPDATE', [productId]);
    if (!prodRows.length || prodRows[0].item_type !== 'product') {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ message: 'Item is not a sellable product' });
    }
    // Load recipe
    const [recipe] = await conn.query(
      'SELECT ingredient_id, qty_per_serving FROM recipes WHERE product_id = ?',
      [productId]
    );
    if (recipe.length) {
      // Made-to-order: check ingredient stocks
      for (const row of recipe) {
        const need = Number(row.qty_per_serving) * qty;
        const [ing] = await conn.query('SELECT stock FROM items WHERE id = ? FOR UPDATE', [row.ingredient_id]);
        if (!ing.length || Number(ing[0].stock) < need) {
          await conn.rollback();
          conn.release();
          return res.status(400).json({ message: 'Insufficient ingredient stock', ingredient_id: row.ingredient_id });
        }
      }
      // Deduct ingredients
      for (const row of recipe) {
        const need = Number(row.qty_per_serving) * qty;
        const [ing] = await conn.query('SELECT stock FROM items WHERE id = ? FOR UPDATE', [row.ingredient_id]);
        const current = Number(ing[0].stock);
        await conn.query('UPDATE items SET stock = ? WHERE id = ?', [current - need, row.ingredient_id]);
      }
      // Log product sale
      await insertTransaction(conn, {
        itemId: productId,
        type: 'sale',
        quantity: qty,
        userId: req.user?.id
      });
    } else {
      // Ready-made: deduct finished goods stock directly
      const [prodStock] = await conn.query('SELECT stock FROM items WHERE id = ? FOR UPDATE', [productId]);
      const current = Number(prodStock[0]?.stock ?? 0);
      const next = current - qty;
      if (next < 0) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ message: 'Insufficient product stock' });
      }
      await conn.query('UPDATE items SET stock = ? WHERE id = ?', [next, productId]);
      await insertTransaction(conn, {
        itemId: productId,
        type: 'sale',
        quantity: qty,
        userId: req.user?.id
      });
    }
    await conn.commit();
    conn.release();
    return res.json({ message: 'Sale recorded', sold: qty, product_id: productId });
  } catch (error) {
    await conn.rollback();
    conn.release();
    return res.status(500).json({ message: 'Failed to process sale', error: error.message });
  }
});

app.delete('/api/items/:id', roleGuard('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM items WHERE id = ?', [Number(req.params.id)]);
    return res.json({ message: 'Item deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete item', error: error.message });
  }
});

// ── Stock ─────────────────────────────────────────────────
const changeStock = async (req, res, mode) => {
  const itemId = Number(req.body?.item_id);
  const quantity = Number(req.body?.quantity);
  if (!itemId || !quantity || quantity < 1) return res.status(400).json({ message: 'Invalid item or quantity' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT stock FROM items WHERE id = ? FOR UPDATE', [itemId]);
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Item not found' });
    }
    const current = Number(rows[0].stock);
    const next = mode === 'sale' ? current - quantity : current + quantity;
    if (next < 0) {
      await conn.rollback();
      return res.status(400).json({ message: 'Insufficient stock' });
    }
    await conn.query('UPDATE items SET stock = ? WHERE id = ?', [next, itemId]);
    await insertTransaction(conn, {
      itemId,
      type: mode,
      quantity,
      userId: req.user?.id
    });
    await conn.commit();
    return res.json({ message: 'Stock updated', stock: next });
  } catch (error) {
    await conn.rollback();
    return res.status(500).json({ message: 'Failed to update stock', error: error.message });
  } finally {
    conn.release();
  }
};

app.post('/api/stock/add', roleGuard('admin', 'staff'), (req, res) => changeStock(req, res, 'restock'));
app.post('/api/stock/deduct', roleGuard('admin', 'staff'), (req, res) => changeStock(req, res, 'sale'));

// ── Transactions ──────────────────────────────────────────
app.get('/api/transactions', roleGuard('admin', 'staff'), async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT t.id, t.type, t.quantity, t.created_at, i.name AS item_name
      FROM transactions t
      LEFT JOIN items i ON i.id = t.item_id
      ORDER BY t.created_at DESC
      LIMIT 500
    `);
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch transactions', error: error.message });
  }
});

// ── Admin: Remove ALL items (and related data) ────────────
app.delete('/api/admin/items', roleGuard('admin'), async (_req, res) => {
  try {
    // Delete recipe rows first to satisfy FK RESTRICT on ingredient_id
    await pool.query('DELETE FROM recipes');
    // Delete transactions (or rely on ON DELETE CASCADE from items)
    await pool.query('DELETE FROM transactions');
    // Finally delete items
    await pool.query('DELETE FROM items');
    return res.json({ message: 'All items, recipes, and transactions removed' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to remove items', error: error.message });
  }
});

// ── Start ─────────────────────────────────────────────────
const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if (error?.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.warn(`Port ${port} in use. Retrying on ${nextPort}...`);
      startServer(nextPort);
      return;
    }
    console.error('Server failed to start:', error.message);
    process.exit(1);
  });
};

try {
  await initDatabase();
  await testConnection();
  startServer(PORT);
} catch (error) {
  console.error('Failed to initialize database:', error.message);
  process.exit(1);
}
