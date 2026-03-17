const express = require('express');
const pool = require('./db');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret';
function auth(req, res, next) { const authHeader = req.headers.authorization || ''; const token = authHeader.split(' ')[1]; if (!token) return res.status(401).json({ error: 'No token' }); try { const decoded = jwt.verify(token, JWT_SECRET); req.user = decoded; next(); } catch { return res.status(401).json({ error: 'Invalid token' }); } }
function requireRole(...roles){return (req,res,next)=>{const role=(req.user?.role||'').toString().toLowerCase();if(!roles.map(r=>r.toString().toLowerCase()).includes(role))return res.status(403).json({error:'Forbidden'});next();}};

// List items for provider
router.get('/items', auth, requireRole('provider'), async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM provider_stock WHERE provider_id=? ORDER BY name', [req.user.id]); res.json({ items: rows }); } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// Add item
router.post('/items', auth, requireRole('provider'), async (req, res) => {
  try {
    const { name, quantity = 0, unit_price = 0, sku, mfg_date, exp_date } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const [r] = await pool.query('INSERT INTO provider_stock (provider_id, name, quantity, unit_price, sku, mfg_date, exp_date) VALUES (?,?,?,?,?,?,?)', [req.user.id, name, Number(quantity)||0, Number(unit_price)||0, sku||null, mfg_date||null, exp_date||null]);
    res.json({ id: r.insertId });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// Adjust quantity
router.post('/items/:id/adjust', auth, requireRole('provider'), async (req, res) => {
  try { const { id } = req.params; const { delta, note } = req.body; await pool.query('UPDATE provider_stock SET quantity = GREATEST(0, quantity + ?) WHERE id=? AND provider_id=?', [Number(delta)||0, id, req.user.id]); await pool.query('INSERT INTO provider_stock_moves (provider_id, stock_id, type, quantity, note) VALUES (?,?,?, ?,?)', [req.user.id, id, (Number(delta)>=0?'in':'out'), Math.abs(Number(delta)||0), note||null]); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
