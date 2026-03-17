const express = require('express');
const pool = require('./db');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { sendVerificationEmail } = require('./email');

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
  if (!role || !allowed.includes(role)) { return res.status(403).json({ error: 'Forbidden' }); }
    next();
  };
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) { const ext = path.extname(file.originalname).toLowerCase(); cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`); }
});
const upload = multer({ storage, limits: { fileSize: 4 * 1024 * 1024 }, fileFilter: (req, file, cb) => { const allowed = ['application/pdf', 'image/jpeg', 'image/png']; if (!allowed.includes(file.mimetype)) return cb(new Error('Invalid file type')); cb(null, true); } });

router.post('/', auth, upload.single('medicalCertificate'), async (req, res) => {
  try {
    const { fullName, idCard, phone, district, sector, cell, village, disease, dosage, age, gender, paymentMethod } = req.body;
    if (!fullName || !idCard || !phone || !district || !sector || !cell || !village || !disease || !dosage || !age || !gender || !paymentMethod) return res.status(400).json({ error: 'Missing required fields' });
    if (!/^1\d{15}$/.test(idCard)) return res.status(400).json({ error: 'Invalid ID card' });
    const certPath = req.file ? 'uploads/' + req.file.filename : null;
    const [result] = await pool.query(
      `INSERT INTO orders (
        user_id, full_name, id_card, phone, district, sector, cell, village, disease, dosage, age, gender, payment_method, medical_certificate,
        admin_status, doctor_status, payment_status, pharmacy_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', 'pending', 'pending')`,
      [req.user.id, fullName, idCard, phone, district, sector, cell, village, disease, dosage, age, gender, paymentMethod, certPath]
    );
    res.json({ message: 'Order created', id: result.insertId });
  } catch (e) {
    const msg = e?.message?.includes('Invalid file type') ? 'Invalid file type' : 'Server error';
    res.status(500).json({ error: msg });
  }
});

router.get('/my', auth, async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM orders WHERE user_id = ? AND COALESCE(canceled, 0) = 0 ORDER BY created_at DESC', [req.user.id]); res.json({ orders: rows }); } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// Many more endpoints copied from medication-backend/orders.js (doctor, admin, provider flows)
module.exports = router;
