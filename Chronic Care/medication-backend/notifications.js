const express = require('express');
const pool = require('./db');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Local auth middleware (mirrors other routers)
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

// Get unread count for badge
router.get('/unread-count', auth, async (req, res) => {
  try {
    const role = String(req.user.role || '').toLowerCase();
    const [rows] = await pool.query(
      `SELECT COUNT(*) as count FROM notifications WHERE recipient_type=? AND recipient_id=? AND status='unread'`,
      [role, req.user.id]
    );
    res.json({ unreadCount: rows[0]?.count || 0 });
  } catch (e) {
    console.error('get unread count error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get my notifications (for any role). Supports optional limit.
router.get('/my', auth, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
    const role = String(req.user.role || '').toLowerCase();
    const [rows] = await pool.query(
      `SELECT id, title, message, status, order_id, created_at
       FROM notifications
       WHERE recipient_type=? AND recipient_id=?
       ORDER BY created_at DESC
       LIMIT ?`,
      [role, req.user.id, limit]
    );
    res.json({ notifications: rows });
  } catch (e) {
    console.error('get my notifications error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark one as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
    const role = String(req.user.role || '').toLowerCase();
    const [result] = await pool.query(
      `UPDATE notifications SET status='read' WHERE id=? AND recipient_type=? AND recipient_id=?`,
      [id, role, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('mark read error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
