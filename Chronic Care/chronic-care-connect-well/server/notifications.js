const express = require('express');
const pool = require('./db');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret';
function auth(req, res, next) { const authHeader = req.headers.authorization || ''; const token = authHeader.split(' ')[1]; if (!token) return res.status(401).json({ error: 'No token' }); try { const decoded = jwt.verify(token, JWT_SECRET); req.user = decoded; next(); } catch { return res.status(401).json({ error: 'Invalid token' }); } }

router.get('/', auth, async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100', [req.user.id]); res.json({ notifications: rows }); } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/read', auth, async (req, res) => {
  try { const { ids } = req.body; if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' }); await pool.query(`UPDATE notifications SET read_at = NOW() WHERE id IN (${ids.map(() => '?').join(',')}) AND user_id=?`, [...ids, req.user.id]); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
