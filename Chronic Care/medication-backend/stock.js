const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret';

function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const role = (req.user?.role || '').toString().toLowerCase();
    const allowed = roles.map(r => r.toString().toLowerCase());
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// List stock items for provider
router.get('/', auth, requireRole('provider'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM provider_stock WHERE provider_id = ? ORDER BY name ASC',
      [req.user.id]
    );
    res.json({ items: rows });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create stock item
router.post('/', auth, requireRole('provider'), async (req, res) => {
  try {
    const { name, sku, quantity, unit_price, mfg_date, exp_date } = req.body || {};
    if (!name || quantity == null || unit_price == null) {
      return res.status(400).json({ error: 'name, quantity, unit_price are required' });
    }
    const qty = Math.max(0, parseInt(quantity));
    const price = Number(unit_price);
    const [result] = await pool.query(
      `INSERT INTO provider_stock (provider_id, name, sku, quantity, unit_price, mfg_date, exp_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, String(name).trim(), sku || null, qty, price, mfg_date || null, exp_date || null]
    );
    res.json({ id: result.insertId });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update stock item (own provider only)
router.patch('/:id', auth, requireRole('provider'), async (req, res) => {
  try {
    const id = req.params.id;
    // Ensure ownership
    const [own] = await pool.query('SELECT * FROM provider_stock WHERE id=? AND provider_id=?', [id, req.user.id]);
    if (!own.length) return res.status(404).json({ error: 'Not found' });

    const fields = ['name','sku','quantity','unit_price','mfg_date','exp_date'];
    const set = [];
    const params = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        set.push(`${f} = ?`);
        if (f === 'quantity') params.push(Math.max(0, parseInt(req.body[f])));
        else if (f === 'unit_price') params.push(Number(req.body[f]));
        else params.push(req.body[f] || null);
      }
    }
    if (set.length === 0) return res.json({ message: 'No changes' });
    params.push(id, req.user.id);
    await pool.query(`UPDATE provider_stock SET ${set.join(', ')} WHERE id=? AND provider_id=?`, params);
    const [rows] = await pool.query('SELECT * FROM provider_stock WHERE id=?', [id]);
    res.json(rows[0] || {});
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete stock item
router.delete('/:id', auth, requireRole('provider'), async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query('DELETE FROM provider_stock WHERE id=? AND provider_id=?', [id, req.user.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Stock movement (in/out/adjust)
router.post('/:id/move', auth, requireRole('provider'), async (req, res) => {
  try {
    const id = req.params.id;
    const { type, quantity, note } = req.body || {};
    if (!['in','out','adjust'].includes(String(type))) return res.status(400).json({ error: 'Invalid type' });
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'Invalid quantity' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [own] = await conn.query('SELECT * FROM provider_stock WHERE id=? AND provider_id=? FOR UPDATE', [id, req.user.id]);
      if (!own.length) { await conn.rollback(); return res.status(404).json({ error: 'Not found' }); }
      const item = own[0];

      let newQty = item.quantity;
      if (type === 'in') newQty = item.quantity + qty;
      if (type === 'out') newQty = Math.max(0, item.quantity - qty);
      if (type === 'adjust') newQty = qty; // set absolute

      await conn.query('UPDATE provider_stock SET quantity=? WHERE id=?', [newQty, id]);
      await conn.query(
        'INSERT INTO provider_stock_moves (provider_id, stock_id, type, quantity, note) VALUES (?,?,?,?,?)',
        [req.user.id, id, type, qty, note || null]
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const [rows] = await pool.query('SELECT * FROM provider_stock WHERE id=?', [id]);
    res.json(rows[0] || {});
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// List stock movements for one item
router.get('/:id/moves', auth, requireRole('provider'), async (req, res) => {
  try {
    const id = req.params.id;
    const [rows] = await pool.query(
      'SELECT * FROM provider_stock_moves WHERE provider_id=? AND stock_id=? ORDER BY created_at DESC',
      [req.user.id, id]
    );
    res.json({ moves: rows });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
