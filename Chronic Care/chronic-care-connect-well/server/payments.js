const express = require('express');
const pool = require('./db');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret';
function auth(req, res, next) { const authHeader = req.headers.authorization || ''; const token = authHeader.split(' ')[1]; if (!token) return res.status(401).json({ error: 'No token' }); try { const decoded = jwt.verify(token, JWT_SECRET); req.user = decoded; next(); } catch { return res.status(401).json({ error: 'Invalid token' }); } }

// Initiate MTN MoMo payment (Collections). Fallback to mock when 401 or config missing.
router.post('/initiate', auth, async (req, res) => {
  try {
    const { orderId, amount, currency = 'RWF' } = req.body;
    if (!orderId || !amount) return res.status(400).json({ error: 'orderId and amount required' });
    await pool.query('INSERT INTO momo_payments (order_id, amount, currency, status) VALUES (?, ?, ?, ?)', [orderId, amount, currency, 'PENDING']);
    // TODO: integrate real MTN MoMo here; for now return mock reference
    const referenceId = 'REF-' + Date.now();
    await pool.query('UPDATE momo_payments SET reference_id=? WHERE order_id=?', [referenceId, orderId]);
    res.json({ referenceId, status: 'PENDING' });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// Poll payment status
router.get('/status/:referenceId', auth, async (req, res) => {
  try { const { referenceId } = req.params; const [rows] = await pool.query('SELECT * FROM momo_payments WHERE reference_id=?', [referenceId]); if (!rows.length) return res.status(404).json({ error: 'Not found' }); res.json({ status: rows[0].status, payment: rows[0] }); } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
