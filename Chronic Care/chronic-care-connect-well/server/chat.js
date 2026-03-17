const express = require('express');
const pool = require('./db');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret';
function auth(req, res, next) { const authHeader = req.headers.authorization || ''; const token = authHeader.split(' ')[1]; if (!token) return res.status(401).json({ error: 'No token' }); try { const decoded = jwt.verify(token, JWT_SECRET); req.user = decoded; next(); } catch { return res.status(401).json({ error: 'Invalid token' }); } }

router.get('/threads', auth, async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM messages WHERE user_id=? OR recipient_id=? ORDER BY created_at DESC LIMIT 100', [req.user.id, req.user.id]); res.json({ messages: rows }); } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/send', auth, async (req, res) => {
  try { const { to, body } = req.body; if (!to || !body) return res.status(400).json({ error: 'to and body required' }); const [result] = await pool.query('INSERT INTO messages (user_id, recipient_id, body, status) VALUES (?, ?, ?, ?)', [req.user.id, to, body, 'sent']); res.json({ id: result.insertId }); } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
