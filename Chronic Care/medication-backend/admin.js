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

function requireRole(...roles) {
  return (req, res, next) => {
    const role = (req.user?.role || '').toString().toLowerCase();
    const allowed = roles.map(r => r.toString().toLowerCase());
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

router.get('/stats', auth, requireRole('admin'), async (req, res) => {
  try {
    const [[{ totalOrders }]] = await pool.query("SELECT COUNT(*) AS totalOrders FROM orders WHERE COALESCE(canceled,0)=0");
  const [[{ pendingOrders }]] = await pool.query("SELECT COUNT(*) AS pendingOrders FROM orders WHERE admin_status IN ('pending','under_review') AND COALESCE(canceled,0)=0");
  const [[{ totalUsers }]] = await pool.query("SELECT COUNT(*) AS totalUsers FROM users WHERE LOWER(role)='patient'");
  const [[{ totalProviders }]] = await pool.query("SELECT COUNT(*) AS totalProviders FROM users WHERE LOWER(role)='provider'");
  const [[{ totalDoctors }]] = await pool.query("SELECT COUNT(*) AS totalDoctors FROM users WHERE LOWER(role)='doctor'");
    res.json({ pendingOrders, totalOrders, totalUsers, totalProviders, totalDoctors });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/recent-orders', auth, requireRole('admin'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '8', 10) || 8, 50);
    const [rows] = await pool.query(
      `SELECT o.*, u.username, u.email, CONCAT(u.first_name,' ',u.last_name) AS user_full_name
       FROM orders o
       JOIN users u ON u.id = o.user_id
       WHERE COALESCE(o.canceled,0)=0
       ORDER BY o.created_at DESC
       LIMIT ?`,
      [limit]
    );
    res.json({ orders: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Full orders list with filters
router.get('/orders', auth, requireRole('admin'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset || '0', 10) || 0, 0);
    const adminStatus = req.query.adminStatus ? String(req.query.adminStatus) : (req.query.status ? String(req.query.status) : null);
    const pharmacyStatus = req.query.pharmacy_status ? String(req.query.pharmacy_status) : null;
    const q = req.query.q ? String(req.query.q) : null;

    let sql = `SELECT o.*, u.username, u.email, CONCAT(u.first_name,' ',u.last_name) AS user_full_name
               FROM orders o
               JOIN users u ON u.id = o.user_id
               WHERE COALESCE(o.canceled,0)=0`;
    const params = [];
    if (adminStatus) {
      sql += ` AND o.admin_status = ?`;
      params.push(adminStatus);
    }
    if (pharmacyStatus) {
      sql += ` AND o.pharmacy_status = ?`;
      params.push(pharmacyStatus);
    }
    if (q) {
      sql += ` AND (o.disease LIKE ? OR u.username LIKE ? OR u.email LIKE ? OR CONCAT(u.first_name,' ',u.last_name) LIKE ?)`;
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }
    sql += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.query(sql, params);
    res.json({ orders: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Doctors list for assignment
router.get('/doctors', auth, requireRole('admin'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '200', 10) || 200, 500);
    const [rows] = await pool.query(
      `SELECT id, username, email, CONCAT(first_name,' ',last_name) AS full_name
       FROM users
       WHERE LOWER(role)='doctor'
       ORDER BY first_name, last_name
       LIMIT ?`,
      [limit]
    );
  res.json({ users: rows.map(u => ({ id: u.id, username: u.username, name: u.full_name || u.username || u.email, email: u.email })) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin notifications list (MySQL)
router.get('/notifications', auth, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, message, status, order_id, created_at
       FROM notifications
       WHERE recipient_type='admin' AND recipient_id=?
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ notifications: rows });
  } catch (e) {
    console.error('admin/notifications error', e?.message || e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark admin notification as read (MySQL)
router.patch('/notifications/:id/read', auth, requireRole('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
    const [r] = await pool.query(
      `UPDATE notifications SET status='read' WHERE id=? AND recipient_type='admin' AND recipient_id=?`,
      [id, req.user.id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('admin/notifications read error', e?.message || e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Below: Providers and Pharmacies admin endpoints, and inventory across providers

// List providers (healthcare/pharmacy) for admin
router.get('/providers', auth, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, username, email, first_name, last_name, role,
              license_number, specialty, hospital_affiliation,
              COALESCE(verification_status,'pending') AS verification_status,
              created_at
         FROM users
        WHERE LOWER(role) IN ('provider','pharmacy','doctor')
        ORDER BY created_at DESC`
    );
  const providers = rows.map(r => ({
      id: r.id,
      username: r.username,
      email: r.email,
      first_name: r.first_name,
      last_name: r.last_name,
      full_name: [r.first_name, r.last_name].filter(Boolean).join(' ').trim(),
      role: r.role,
      license_number: r.license_number,
      specialty: r.specialty,
      hospital_affiliation: r.hospital_affiliation,
      verification_status: r.verification_status,
      created_at: r.created_at,
  }));
  res.json({ providers });
  } catch (e) {
    console.error('admin/providers error', e?.message || e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify or reject a provider
router.patch('/providers/:id/verify', auth, requireRole('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body || {};
    if (!id || !['verified','rejected','pending'].includes(String(status))) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    // Ensure column exists
    try {
      const dbName = process.env.DB_NAME;
      const [chk] = await pool.query(
        `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='users' AND COLUMN_NAME='verification_status'`,
        [dbName]
      );
      if ((chk?.[0]?.cnt || 0) === 0) {
        await pool.query(`ALTER TABLE users ADD COLUMN verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending'`);
      }
    } catch {}
    const [r] = await pool.query(`UPDATE users SET verification_status=? WHERE id=?`, [status, id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('admin/providers verify error', e?.message || e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Pharmacies list (treat providers role as pharmacy too)
router.get('/pharmacies', auth, requireRole('admin'), async (req, res) => {
  try {
    // Use users with role=provider as pharmacies for now
    const [rows] = await pool.query(
      `SELECT id, username, email, first_name, last_name, phone,
              address, license_number, delivery_radius, COALESCE(status,'active') AS status,
              created_at
         FROM users
        WHERE LOWER(role) IN ('provider','pharmacy')
        ORDER BY created_at DESC`
    );
    const pharmacies = rows.map(r => ({
      id: r.id,
      name: [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || r.username || r.email,
      address: r.address || '',
      phone: r.phone || '',
      email: r.email || '',
      license_number: r.license_number || '',
      delivery_radius: r.delivery_radius || 10,
      status: r.status || 'active',
      created_at: r.created_at,
    }));
    res.json({ pharmacies });
  } catch (e) {
    console.error('admin/pharmacies error', e?.message || e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a pharmacy record (mapped to users table with role=provider)
router.post('/pharmacies', auth, requireRole('admin'), async (req, res) => {
  try {
    const { name, address, phone, email, license_number, contact_person, delivery_radius, status } = req.body || {};
    if (!name || !address || !phone || !license_number) return res.status(400).json({ error: 'Missing fields' });
    // Split name if possible
    const parts = String(name).trim().split(/\s+/);
    const first_name = parts.shift() || name;
    const last_name = parts.join(' ') || null;
    // Ensure columns exist on users
    try {
      const dbName = process.env.DB_NAME;
      const need = [
        { n: 'address', ddl: "ALTER TABLE users ADD COLUMN address VARCHAR(255) NULL" },
        { n: 'license_number', ddl: "ALTER TABLE users ADD COLUMN license_number VARCHAR(64) NULL" },
        { n: 'delivery_radius', ddl: "ALTER TABLE users ADD COLUMN delivery_radius INT NULL" },
        { n: 'status', ddl: "ALTER TABLE users ADD COLUMN status ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active'" },
      ];
      for (const col of need) {
        const [chk] = await pool.query(
          `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='users' AND COLUMN_NAME=?`,
          [dbName, col.n]
        );
        if ((chk?.[0]?.cnt || 0) === 0) await pool.query(col.ddl);
      }
    } catch {}
    const [r] = await pool.query(
      `INSERT INTO users (first_name,last_name,address,phone,email,username,role,license_number,delivery_radius,status,is_verified)
       VALUES (?,?,?,?,?,?,?,?,?, ?, true)`,
      [first_name, last_name, address, phone, email || null, email || `${Date.now()}`, 'provider', license_number, delivery_radius || 10, status || 'active']
    );
    res.json({ id: r.insertId });
  } catch (e) {
    console.error('admin/pharmacies create error', e?.message || e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Pharmacy messages list (admin ↔ pharmacy) using messages table
router.get('/pharmacies/:id/messages', auth, requireRole('admin'), async (req, res) => {
  try {
    const pharmacyId = parseInt(req.params.id, 10);
    const [rows] = await pool.query(
      `SELECT id, from_user_id, from_role, to_user_id, to_role, content AS message, created_at,
              CASE WHEN from_role='admin' THEN 'admin' ELSE 'pharmacy' END AS sender_type,
              'general' AS message_type,
              NULL AS order_id
         FROM messages
        WHERE (from_role='admin' AND to_role='provider' AND to_user_id=?)
           OR (from_role='provider' AND to_role='admin' AND from_user_id=?)
        ORDER BY created_at DESC`,
      [pharmacyId, pharmacyId]
    );
    res.json({ messages: rows });
  } catch (e) {
    console.error('admin/pharmacies messages error', e?.message || e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/pharmacies/:id/messages', auth, requireRole('admin'), async (req, res) => {
  try {
    const pharmacyId = parseInt(req.params.id, 10);
    const { message, message_type, order_id } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message required' });
    const [r] = await pool.query(
      `INSERT INTO messages (from_user_id, from_role, to_user_id, to_role, content, status)
       VALUES (?,?,?,?,?,?)`,
      [req.user.id, 'admin', pharmacyId, 'provider', String(message), 'sent']
    );
    // notify via socket if available
    try {
      const io = req.app.get('io');
      const emitToUser = req.app.get('emitToUser');
      const isUserOnline = req.app.get('isUserOnline');
      const payload = {
        id: r.insertId,
        from_user_id: req.user.id,
        from_role: 'admin',
        to_user_id: pharmacyId,
        to_role: 'provider',
        content: message,
        status: 'sent',
        created_at: new Date().toISOString()
      };
  // Target only the provider recipient; use canonical event name 'message:new'.
  if (emitToUser) emitToUser('provider', pharmacyId, 'message:new', payload);
      // If provider is online, mark delivered and inform sender sockets
      if (isUserOnline && isUserOnline('provider', pharmacyId)) {
        try { await pool.query('UPDATE messages SET status="delivered" WHERE id=?', [r.insertId]); } catch {}
        const statusEvt = { id: r.insertId, status: 'delivered' };
        if (emitToUser) emitToUser('admin', req.user.id, 'message:status', statusEvt);
      }
    } catch {}
    res.json({ id: r.insertId, ok: true });
  } catch (e) {
    console.error('admin/pharmacies send message error', e?.message || e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Inventory: list all stock across providers
router.get('/inventory', auth, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.provider_id, u.username, CONCAT(u.first_name,' ',u.last_name) AS provider_name,
              s.name, s.sku, s.quantity, s.unit_price, s.mfg_date, s.exp_date, s.created_at, s.updated_at
         FROM provider_stock s
         JOIN users u ON u.id = s.provider_id
        ORDER BY s.updated_at DESC`
    );
    res.json({ items: rows });
  } catch (e) {
    console.error('admin/inventory error', e?.message || e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

// Patients list
router.get('/patients', auth, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, username, email, CONCAT(first_name,' ',last_name) AS full_name,
              phone, date_of_birth, CONCAT_WS(', ', province, district, sector, cell, village) AS address,
              created_at
         FROM users
        WHERE LOWER(role)='patient'
        ORDER BY created_at DESC`
    );
    res.json({ patients: rows });
  } catch (e) {
    console.error('admin/patients error', e?.message || e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Patient details by id
router.get('/patients/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const [rows] = await pool.query(
      `SELECT id, username, email, first_name, last_name,
              phone, date_of_birth, gender,
              province, district, sector, cell, village,
              CONCAT(first_name,' ',last_name) AS full_name,
              created_at
         FROM users
        WHERE id=? AND LOWER(role)='patient'
        LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const user = rows[0];

    const [[{ ordersCount }]] = await pool.query(`SELECT COUNT(*) AS ordersCount FROM orders WHERE user_id=? AND COALESCE(canceled,0)=0`, [id]);
    const [[{ prescriptionsCount }]] = await pool.query(`SELECT COUNT(*) AS prescriptionsCount FROM prescriptions WHERE patient_id=?`, [id]);
    const [[{ remindersCount }]] = await pool.query(`SELECT COUNT(*) AS remindersCount FROM medication_reminders WHERE patient_id=?`, [id]);

    const addressParts = [user.province, user.district, user.sector, user.cell, user.village].filter(Boolean);
    const address = addressParts.join(', ');

    res.json({
      patient: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        date_of_birth: user.date_of_birth,
        gender: user.gender,
        address,
        created_at: user.created_at,
        stats: { ordersCount, prescriptionsCount, remindersCount }
      }
    });
  } catch (e) {
    console.error('admin/patient detail error', e?.message || e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reports: list generated reports
router.get('/reports', auth, requireRole('admin'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 200);
    const [rows] = await pool.query(
      `SELECT id, type, title, data, generated_at FROM reports ORDER BY generated_at DESC LIMIT ?`,
      [limit]
    );
    res.json({ reports: rows });
  } catch (e) {
    console.error('admin/reports list error', e?.message || e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reports: generate on-demand simple aggregates
router.post('/reports/generate', auth, requireRole('admin'), async (req, res) => {
  try {
    const { type } = req.body || {};
    if (!['patient_engagement','medication_usage','provider_activity'].includes(String(type))) {
      return res.status(400).json({ error: 'Invalid report type' });
    }
    let title = '';
    let data = {};
    if (type === 'patient_engagement') {
      const [[{ totalPatients }]] = await pool.query("SELECT COUNT(*) AS totalPatients FROM users WHERE LOWER(role)='patient'");
      const [[{ totalOrders }]] = await pool.query("SELECT COUNT(*) AS totalOrders FROM orders WHERE COALESCE(canceled,0)=0");
      title = 'Patient Engagement Overview';
      data = { totalPatients, totalOrders };
    } else if (type === 'medication_usage') {
      const [[{ totalMedicationOrders }]] = await pool.query("SELECT COUNT(*) AS totalMedicationOrders FROM orders WHERE COALESCE(canceled,0)=0");
      title = 'Medication Usage Summary';
      data = { totalMedicationOrders };
    } else if (type === 'provider_activity') {
      const [[{ totalProviders }]] = await pool.query("SELECT COUNT(*) AS totalProviders FROM users WHERE LOWER(role) IN ('provider','pharmacy')");
      const [[{ totalPrescriptions }]] = await pool.query("SELECT COUNT(*) AS totalPrescriptions FROM prescriptions");
      title = 'Provider Activity';
      data = { totalProviders, totalPrescriptions };
    }
    const [r] = await pool.query(
      `INSERT INTO reports (type,title,data,created_by) VALUES (?,?,?,?)`,
      [type, title, JSON.stringify(data), req.user.id]
    );
    res.json({ id: r.insertId, type, title, data, generated_at: new Date().toISOString() });
  } catch (e) {
    console.error('admin/reports generate error', e?.message || e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reports: export by id (streamed). Supports format=csv|json (default json)
router.get('/reports/:id/export', auth, requireRole('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const [rows] = await pool.query(`SELECT id, type, title, data, generated_at FROM reports WHERE id=? LIMIT 1`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const report = rows[0];
    const type = String(req.query.format || 'json').toLowerCase();
    const filenameBase = `${report.type}-${new Date(report.generated_at || Date.now()).toISOString().replace(/[:.]/g,'-')}`;

    if (type === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.csv"`);
      // Stream CSV lines
      const write = (line) => res.write(line + '\n');
      write('metric,value');
      let dataObj = {};
      try { dataObj = typeof report.data === 'string' ? JSON.parse(report.data || '{}') : (report.data || {}); } catch { dataObj = {}; }
      const flat = (obj) => {
        const out = [];
        for (const k of Object.keys(obj || {})) {
          const v = obj[k];
          if (v && typeof v === 'object') {
            // Flatten one level deep for simple structures
            for (const k2 of Object.keys(v)) out.push({ key: `${k}.${k2}`, val: v[k2] });
          } else {
            out.push({ key: k, val: v });
          }
        }
        return out;
      };
      for (const row of flat(dataObj)) {
        const safeKey = String(row.key).replace(/[\n\r,]+/g, ' ').trim();
        const safeVal = (row.val === undefined || row.val === null) ? '' : String(row.val).replace(/[\n\r,]+/g, ' ').trim();
        write(`${safeKey},${safeVal}`);
      }
      res.end();
      return;
    }
    // Default JSON
    res.setHeader('Content-Type', 'application/json');
    try {
      const payload = {
        id: report.id,
        type: report.type,
        title: report.title,
        generated_at: report.generated_at,
        data: typeof report.data === 'string' ? JSON.parse(report.data || '{}') : (report.data || {})
      };
      // Stream minimally
      res.write(JSON.stringify(payload));
    } catch (e) {
      // Fallback raw
      res.write(JSON.stringify(report));
    }
    res.end();
  } catch (e) {
    console.error('admin/reports export error', e?.message || e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Settings: list
router.get('/settings', auth, requireRole('admin'), async (req, res) => {
  try {
  const [rows] = await pool.query(`SELECT key_name AS key_name, value_json FROM settings ORDER BY key_name ASC`);
    const settings = {};
  for (const r of rows) settings[r.key_name] = r.value_json ? JSON.parse(r.value_json) : null;
    res.json({ settings });
  } catch (e) {
    console.error('admin/settings list error', e?.message || e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Settings: update a small subset
router.patch('/settings', auth, requireRole('admin'), async (req, res) => {
  try {
    const allowed = ['email_notifications_enabled','backup_schedule_cron','require_2fa'];
    const input = req.body || {};
    const entries = Object.entries(input).filter(([k]) => allowed.includes(k));
    // Basic validation
    for (const [k, v] of entries) {
      if (k === 'email_notifications_enabled' || k === 'require_2fa') {
        if (typeof v !== 'boolean') return res.status(400).json({ error: `${k} must be boolean` });
      }
      if (k === 'backup_schedule_cron') {
        if (v !== null && v !== '' && typeof v !== 'string') return res.status(400).json({ error: 'backup_schedule_cron must be string' });
        // naive cron validation: 5 fields separated by spaces (minute hour day month weekday); allow empty string to disable
        if (typeof v === 'string' && v.trim() !== '') {
          const parts = v.trim().split(/\s+/);
          if (parts.length !== 5 && parts.length !== 6) return res.status(400).json({ error: 'Invalid CRON format' });
        }
      }
    }
    for (const [k, v] of entries) {
      await pool.query(`INSERT INTO settings (key_name,value_json) VALUES (?,?) ON DUPLICATE KEY UPDATE value_json=VALUES(value_json)`, [k, JSON.stringify(v)]);
    }
    // Return updated settings snapshot
    const [rows] = await pool.query(`SELECT key_name, value_json FROM settings WHERE key_name IN ('email_notifications_enabled','backup_schedule_cron','require_2fa')`);
    const settings = {};
    for (const r of rows) settings[r.key_name] = r.value_json ? JSON.parse(r.value_json) : null;
    res.json({ ok: true, settings });
  } catch (e) {
    console.error('admin/settings update error', e?.message || e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
