const express = require('express');
const pool = require('./db');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret';

function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { const decoded = jwt.verify(token, JWT_SECRET); req.user = decoded; next(); } catch { return res.status(401).json({ error: 'Invalid token' }); }
}
function requireRole(...roles) {
  return (req, res, next) => {
    const role = (req.user?.role || '').toString().toLowerCase();
    const allowed = roles.map(r => r.toString().toLowerCase());
    if (!role || !allowed.includes(role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

router.get('/stats', auth, requireRole('admin'), async (req, res) => {
  try {
    const [[{ totalOrders }]] = await pool.query("SELECT COUNT(*) AS totalOrders FROM orders WHERE COALESCE(canceled,0)=0");
    const [[{ pendingOrders }]] = await pool.query("SELECT COUNT(*) AS pendingOrders FROM orders WHERE admin_status IN ('pending','under_review') AND COALESCE(canceled,0)=0");
    const [[{ totalUsers }]] = await pool.query("SELECT COUNT(*) AS totalUsers FROM users WHERE LOWER(role)='patient'");
    const [[{ totalProviders }]] = await pool.query("SELECT COUNT(*) AS totalProviders FROM users WHERE LOWER(role)='provider'");
    res.json({ pendingOrders, totalOrders, totalUsers, totalProviders });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// ... (full endpoints copied from medication-backend/admin.js)
module.exports = router;
