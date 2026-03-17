const express = require('express');
const pool = require('./db');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret';
function auth(req, res, next) { const authHeader = req.headers.authorization || ''; const token = authHeader.split(' ')[1]; if (!token) return res.status(401).json({ error: 'No token' }); try { const decoded = jwt.verify(token, JWT_SECRET); req.user = decoded; next(); } catch { return res.status(401).json({ error: 'Invalid token' }); } }

router.get('/me', auth, async (req, res) => {
  try { const [rows] = await pool.query('SELECT id, name, email, role, phone FROM users WHERE id=?', [req.user.id]); res.json(rows[0] || null); } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/search', auth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ users: [] });
    const [rows] = await pool.query("SELECT id, name, email, role FROM users WHERE name LIKE ? OR email LIKE ? ORDER BY name LIMIT 50", [`%${q}%`, `%${q}%`]);
    res.json({ users: rows });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// Public endpoint for system statistics
router.get('/stats', async (req, res) => {
  try {
    // Count all patients (role = 'patient' or 'Patient')
    const [patientsResult] = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE LOWER(role) = 'patient'"
    );
    const activePatients = patientsResult[0]?.count || 0;

    // Count healthcare providers (role = 'provider' or 'Provider')
    const [providersResult] = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE LOWER(role) = 'provider'"
    );
    const healthcareProviders = providersResult[0]?.count || 0;

    // Count doctors (role = 'doctor' or 'Doctor')
    const [doctorsResult] = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE LOWER(role) = 'doctor'"
    );
    const doctors = doctorsResult[0]?.count || 0;

    // Uptime is always 99.9% (or you can implement actual uptime tracking)
    const uptime = 99.9;

    res.json({
      activePatients,
      healthcareProviders,
      doctors,
      uptime
    });
  } catch (e) {
    console.error('Stats error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
