const express = require('express');
const pool = require('./db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

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

// Ensure optional medical fields exist on users (idempotent)
(async () => {
  try {
    const dbName = process.env.DB_NAME;
    const fields = [
      { name: 'diagnosis', ddl: 'ALTER TABLE users ADD COLUMN diagnosis VARCHAR(255) NULL' },
      { name: 'allergies', ddl: 'ALTER TABLE users ADD COLUMN allergies TEXT NULL' },
      { name: 'medical_history', ddl: 'ALTER TABLE users ADD COLUMN medical_history TEXT NULL' },
      { name: 'primary_doctor_name', ddl: 'ALTER TABLE users ADD COLUMN primary_doctor_name VARCHAR(255) NULL' },
      { name: 'id_card', ddl: 'ALTER TABLE users ADD COLUMN id_card VARCHAR(32) NULL' },
    ];
    for (const f of fields) {
      try {
        const [r] = await pool.query(
          `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='users' AND COLUMN_NAME=?`,
          [dbName, f.name]
        );
        if ((r?.[0]?.cnt || 0) === 0) await pool.query(f.ddl);
      } catch {}
    }
  } catch (e) {
    console.warn('users schema ensure warn:', e?.message || e);
  }
})();

// GET /users/me — full profile
router.get('/me', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, username, email, role,
              first_name, last_name, phone, id_card,
              date_of_birth, gender, province, district, sector, cell, village,
              profile_photo,
              diagnosis, allergies, medical_history, primary_doctor_name
         FROM users WHERE id=? LIMIT 1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /users/me — update basic profile
router.patch('/me', auth, async (req, res) => {
  try {
    const map = {
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email',
      phone: 'phone',
      idCard: 'id_card',
      dateOfBirth: 'date_of_birth',
      gender: 'gender',
      province: 'province',
      district: 'district',
      sector: 'sector',
      cell: 'cell',
      village: 'village',
    };
    const set = [];
    const params = [];
    for (const [k, col] of Object.entries(map)) {
      if (req.body[k] !== undefined) { set.push(`${col}=?`); params.push(req.body[k] || null); }
    }
    if (!set.length) return res.json({ ok: true });
    params.push(req.user.id);
    await pool.query(`UPDATE users SET ${set.join(', ')} WHERE id=?`, params);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /users/me/medical — update medical info
router.patch('/me/medical', auth, async (req, res) => {
  try {
    const map = {
      diagnosis: 'diagnosis',
      allergies: 'allergies',
      medicalHistory: 'medical_history',
      primaryDoctorName: 'primary_doctor_name',
    };
    const set = [];
    const params = [];
    for (const [k, col] of Object.entries(map)) {
      if (req.body[k] !== undefined) { set.push(`${col}=?`); params.push(req.body[k] || null); }
    }
    if (!set.length) return res.json({ ok: true });
    params.push(req.user.id);
    await pool.query(`UPDATE users SET ${set.join(', ')} WHERE id=?`, params);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /users/me/password — change password
router.patch('/me/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (!currentPassword || !newPassword || !confirmPassword) return res.status(400).json({ error: 'Missing fields' });
    if (newPassword !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });
    const [rows] = await pool.query('SELECT id, password FROM users WHERE id=?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const ok = await bcrypt.compare(currentPassword, rows[0].password);
    if (!ok) return res.status(400).json({ error: 'Current password incorrect' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password=? WHERE id=?', [hashed, req.user.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /users/stats — Public endpoint for system statistics
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
