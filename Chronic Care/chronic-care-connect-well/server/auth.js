const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const { sendVerificationEmail } = require('./email');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

function generateCode() { return Math.floor(100000 + Math.random() * 900000).toString(); }

router.post('/register', upload.single('profilePhoto'), async (req, res) => {
  try {
    const {
      firstName, lastName, idCard, phone, username, email, password, confirmPassword,
      role, dateOfBirth, gender, province, district, sector, cell, village
    } = req.body;
    if (!['Patient', 'Provider', 'Doctor'].includes(role)) return res.status(400).json({ error: 'Invalid role selected.' });
    if (!firstName || !lastName || !idCard || !username || !email || !password || !confirmPassword) return res.status(400).json({ error: 'Missing required fields.' });
    if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match.' });
    if (!/^[1]\d{15}$/.test(idCard)) return res.status(400).json({ error: 'ID Card must be 16 digits and start with 1.' });

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? OR username = ? OR id_card = ?', [email, username, idCard]);
    if (existing.length > 0) return res.status(400).json({ error: 'User with this email, username, or ID card already exists.' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const code = generateCode();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    let profilePhotoPath = '';
    if (req.file) profilePhotoPath = 'uploads/' + req.file.filename;

    let dob = null;
    const monthNameToNumber = (m) => {
      if (m === undefined || m === null) return null;
      const asNum = Number(m);
      if (!isNaN(asNum) && asNum >= 1 && asNum <= 12) return asNum;
      const months = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
      const key = String(m).trim().toLowerCase();
      return months[key] || null;
    };
    const yearField = req.body['dateOfBirth[year]'] || req.body.dobYear || req.body.dob_year;
    const monthField = req.body['dateOfBirth[month]'] || req.body.dobMonth || req.body.dob_month;
    const dayField = req.body['dateOfBirth[day]'] || req.body.dobDay || req.body.dob_day;
    if (yearField && monthField && dayField) {
      const year = String(yearField).trim();
      const monthNum = monthNameToNumber(monthField);
      const day = String(dayField).trim();
      if (year && monthNum && day) { dob = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`; }
    }
    if (!dob && dateOfBirth) {
      if (typeof dateOfBirth === 'object' && dateOfBirth.year && dateOfBirth.month && dateOfBirth.day) {
        const monthNum = monthNameToNumber(dateOfBirth.month);
        dob = `${dateOfBirth.year}-${String(monthNum).padStart(2, '0')}-${String(dateOfBirth.day).padStart(2, '0')}`;
      } else if (typeof dateOfBirth === 'string') {
        const parsed = new Date(dateOfBirth);
        if (!isNaN(parsed.getTime())) dob = parsed.toISOString().split('T')[0]; else dob = dateOfBirth;
      }
    }
    if (dob) {
      const parsed = new Date(dob);
      if (isNaN(parsed.getTime())) return res.status(400).json({ error: 'Invalid date_of_birth provided.' });
      const [y, m, d] = dob.split('-').map((s) => Number(s));
      if (parsed.getUTCFullYear() !== y || (parsed.getUTCMonth() + 1) !== m || parsed.getUTCDate() !== d) return res.status(400).json({ error: 'Invalid date_of_birth (nonexistent date).' });
    }

    await pool.query(
      `INSERT INTO users
      (first_name, last_name, id_card, phone, username, email, password, role, date_of_birth, gender, province, district, sector, cell, village, profile_photo, is_verified, verification_code, verification_expires)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, false, ?, ?)`,
      [ firstName, lastName, idCard, phone, username, email, hashedPassword, role, dob, gender, province, district, sector, cell, village, profilePhotoPath, code, expires ]
    );

    try { await sendVerificationEmail(email, code); } catch {}
    res.json({ message: 'Registration successful! Please check your email for the verification code.', email, isVerified: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/verify', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code are required.' });
  const [users] = await pool.query('SELECT id, verification_code, verification_expires, is_verified FROM users WHERE email = ?', [email]);
  if (!users.length) return res.status(400).json({ error: 'User not found.' });
  const user = users[0];
  if (user.is_verified) return res.status(400).json({ error: 'Account already verified.' });
  if (user.verification_code !== code) return res.status(400).json({ error: 'Invalid verification code.' });
  if (new Date() > new Date(user.verification_expires)) return res.status(400).json({ error: 'Verification code expired.' });
  await pool.query('UPDATE users SET is_verified = true, verification_code = NULL, verification_expires = NULL WHERE id = ?', [user.id]);
  res.json({ message: 'Account verified! You can now log in.' });
});

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret';
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
  if (!rows.length) return res.status(400).json({ error: 'Invalid credentials' });
  const user = rows[0];
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: 'Invalid credentials' });
  if (!user.is_verified) return res.json({ error: 'not_verified', email: user.email });
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
});

router.get('/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const user = rows[0];
    res.json({ user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
