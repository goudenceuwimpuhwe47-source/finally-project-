const express = require('express');
const pool = require('./db');
const jwt = require('jsonwebtoken');

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

// Ensure table exists on first import (idempotent)
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS health_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        pain_level TINYINT NULL,
        fatigue_level TINYINT NULL,
        notes TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_patient_created (patient_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (e) {
    console.error('Ensure health_logs table failed:', e?.message || e);
  }
})();

// Create a new symptom log (patient)
router.post('/logs', auth, async (req, res) => {
  try {
    const patientId = req.user.id;
    const pain = Math.max(0, Math.min(10, Number(req.body?.painLevel ?? req.body?.pain_level ?? 0)));
    const fatigue = Number.isFinite(Number(req.body?.fatigueLevel ?? req.body?.fatigue_level))
      ? Math.max(0, Math.min(10, Number(req.body?.fatigueLevel ?? req.body?.fatigue_level)))
      : null;
    const notes = (req.body?.notes || '').toString().trim() || null;
    await pool.query(
      `INSERT INTO health_logs (patient_id, pain_level, fatigue_level, notes) VALUES (?,?,?,?)`,
      [patientId, pain, fatigue, notes]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('health/logs create error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get today's logs for the current patient
router.get('/my/today', auth, async (req, res) => {
  try {
    const patientId = req.user.id;
    const [rows] = await pool.query(
      `SELECT id, pain_level, fatigue_level, notes, created_at
         FROM health_logs
        WHERE patient_id=? AND DATE(created_at)=CURDATE()
        ORDER BY created_at DESC
        LIMIT 100`,
      [patientId]
    );
    res.json({ logs: rows });
  } catch (e) {
    console.error('health/my/today error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Quick summary (latest pain level and today counts)
router.get('/my/summary', auth, async (req, res) => {
  try {
    const patientId = req.user.id;
    const [[latest]] = await pool.query(
      `SELECT pain_level, fatigue_level, created_at FROM health_logs WHERE patient_id=? ORDER BY created_at DESC LIMIT 1`,
      [patientId]
    );
    const [[todayCount]] = await pool.query(
      `SELECT COUNT(*) AS n FROM health_logs WHERE patient_id=? AND DATE(created_at)=CURDATE()`,
      [patientId]
    );
    res.json({ latest: latest || null, todayCount: todayCount?.n || 0 });
  } catch (e) {
    console.error('health/my/summary error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
