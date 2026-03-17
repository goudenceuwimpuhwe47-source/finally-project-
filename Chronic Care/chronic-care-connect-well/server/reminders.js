const express = require('express');
const pool = require('./db');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret';
function auth(req, res, next) { const authHeader = req.headers.authorization || ''; const token = authHeader.split(' ')[1]; if (!token) return res.status(401).json({ error: 'No token' }); try { const decoded = jwt.verify(token, JWT_SECRET); req.user = decoded; next(); } catch { return res.status(401).json({ error: 'Invalid token' }); } }

router.get('/', auth, async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM reminders WHERE user_id=? ORDER BY time ASC', [req.user.id]); res.json({ reminders: rows }); } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', auth, async (req, res) => {
  try { const { time, label } = req.body; if (!time) return res.status(400).json({ error: 'time required' }); const [result] = await pool.query('INSERT INTO reminders (user_id, time, label) VALUES (?, ?, ?)', [req.user.id, time, label || null]); res.json({ id: result.insertId }); } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/taken', auth, async (req, res) => {
  try { const { id } = req.params; await pool.query('UPDATE reminders SET taken = 1, taken_at = NOW() WHERE id=? AND user_id=?', [id, req.user.id]); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

function startScheduler(app) {
  const io = app.get('io');
  let timer = null;
  async function tick() {
    try {
      // Pre-alerts: events within next 2 minutes and not prealerted
      const [pre] = await pool.query(
        `SELECT id, patient_id, when_at FROM medication_reminder_events
         WHERE status='pending' AND prealert_sent=0 AND when_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 2 MINUTE)
         ORDER BY when_at ASC LIMIT 200`
      );
      for (const ev of pre) {
        try {
          await pool.query('UPDATE medication_reminder_events SET prealert_sent=1 WHERE id=?', [ev.id]);
          io && io.emit('reminder:pre', { patientId: ev.patient_id, whenAt: ev.when_at });
        } catch {}
      }
      // On-time alerts: events due now
      const [due] = await pool.query(
        `SELECT id, patient_id, when_at FROM medication_reminder_events
         WHERE status='pending' AND when_at <= NOW()
         ORDER BY when_at ASC LIMIT 200`
      );
      for (const ev of due) {
        try {
          await pool.query("UPDATE medication_reminder_events SET status='sent' WHERE id=?", [ev.id]);
          io && io.emit('reminder:due', { patientId: ev.patient_id, whenAt: ev.when_at });
        } catch {}
      }
    } catch {}
  }
  // every 30s
  clearInterval(timer);
  timer = setInterval(tick, 30000);
  tick();
}

module.exports = router;
module.exports.startScheduler = startScheduler;
