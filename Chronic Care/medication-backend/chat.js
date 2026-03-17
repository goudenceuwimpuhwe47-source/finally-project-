const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret';

function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role }
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

// Admin: list patients with last message and unread count
router.get('/admin/chat/users', auth, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, CONCAT(u.first_name,' ',u.last_name) AS name, u.email,
              (
                SELECT m2.content FROM messages m2
                WHERE (m2.from_user_id=u.id AND m2.from_role='patient' AND m2.to_role='admin')
                   OR (m2.to_user_id=u.id AND m2.to_role='patient' AND m2.from_role='admin')
                ORDER BY m2.created_at DESC LIMIT 1
              ) AS lastMessage,
              (
                SELECT COUNT(*) FROM messages m3
                WHERE m3.from_user_id=u.id AND m3.from_role='patient' AND m3.to_role='admin' AND m3.status IN ('sent','delivered')
              ) AS unreadCount
       FROM users u
       WHERE EXISTS (
         SELECT 1 FROM messages m
          WHERE (m.from_user_id=u.id AND m.from_role='patient' AND m.to_role='admin')
             OR (m.to_user_id=u.id AND m.to_role='patient' AND m.from_role='admin')
       )
       ORDER BY u.id DESC`
    );
    res.json({ users: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: get messages with a patient
router.get('/admin/chat/messages/:patientId', auth, requireRole('admin'), async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId, 10);
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(100, Math.max(10, parseInt(req.query.pageSize || '30', 10)));
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query(
      `SELECT id, from_user_id, from_role, to_user_id, to_role, content, status, created_at
       FROM messages
       WHERE (from_user_id=? AND from_role='patient' AND to_role='admin')
          OR (to_user_id=? AND to_role='patient' AND from_role='admin')
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [patientId, patientId, pageSize, offset]
    );
    res.json({ messages: rows });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark messages read (admin viewing patient conversation)
router.post('/admin/chat/mark-read', auth, requireRole('admin'), async (req, res) => {
  try {
    const { patientId } = req.body;
    if (!patientId) return res.status(400).json({ error: 'patientId required' });
    // Find affected message IDs
    const [idsRows] = await pool.query(
      `SELECT id FROM messages WHERE from_user_id=? AND from_role='patient' AND to_role='admin' AND status <> 'read'`,
      [patientId]
    );
    await pool.query(
      `UPDATE messages SET status='read'
       WHERE from_user_id=? AND from_role='patient' AND to_role='admin' AND status <> 'read'`,
      [patientId]
    );
    // Emit status updates
    try {
      const io = req.app.get('io');
      if (io && Array.isArray(idsRows)) {
        for (const r of idsRows) {
          io.emit('message:status', { id: r.id, status: 'read' });
        }
      }
    } catch {}
    res.json({ ok: true, updated: (idsRows || []).length });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Patient: list messages with admin
router.get('/chat/messages/admin', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(100, Math.max(10, parseInt(req.query.pageSize || '30', 10)));
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query(
      `SELECT id, from_user_id, from_role, to_user_id, to_role, content, status, created_at
       FROM messages
       WHERE (from_user_id=? AND from_role='patient' AND to_role='admin')
          OR (to_user_id=? AND to_role='patient' AND from_role='admin')
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, userId, pageSize, offset]
    );
    res.json({ messages: rows });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Patient marks admin messages as read
router.post('/chat/mark-read/admin', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const [idsRows] = await pool.query(
      `SELECT id FROM messages WHERE to_user_id=? AND to_role='patient' AND from_role='admin' AND status <> 'read'`,
      [userId]
    );
    await pool.query(
      `UPDATE messages SET status='read'
       WHERE to_user_id=? AND to_role='patient' AND from_role='admin' AND status <> 'read'`,
      [userId]
    );
    try {
      const io = req.app.get('io');
      if (io && Array.isArray(idsRows)) {
        for (const r of idsRows) {
          io.emit('message:status', { id: r.id, status: 'read' });
        }
      }
    } catch {}
    res.json({ ok: true, updated: (idsRows || []).length });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = { router };
// Provider: list messages with admin
router.get('/provider/chat/admin/messages', auth, requireRole('provider'), async (req, res) => {
  try {
    const providerId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(100, Math.max(10, parseInt(req.query.pageSize || '30', 10)));
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query(
      `SELECT id, from_user_id, from_role, to_user_id, to_role, content, status, created_at
       FROM messages
       WHERE (from_role='admin' AND to_role='provider' AND to_user_id=?)
          OR (from_role='provider' AND to_role='admin' AND from_user_id=?)
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [providerId, providerId, pageSize, offset]
    );
    res.json({ messages: rows });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Provider: mark admin messages as read
router.post('/provider/chat/admin/mark-read', auth, requireRole('provider'), async (req, res) => {
  try {
    const providerId = req.user.id;
    const [idsRows] = await pool.query(
      `SELECT id FROM messages WHERE to_user_id=? AND to_role='provider' AND from_role='admin' AND status <> 'read'`,
      [providerId]
    );
    await pool.query(
      `UPDATE messages SET status='read'
       WHERE to_user_id=? AND to_role='provider' AND from_role='admin' AND status <> 'read'`,
      [providerId]
    );
    try {
      const io = req.app.get('io');
      if (io && Array.isArray(idsRows)) {
        for (const r of idsRows) io.emit('message:status', { id: r.id, status: 'read' });
      }
    } catch {}
    res.json({ ok: true, updated: (idsRows || []).length });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Patient: list messages with a specific doctor
router.get('/chat/messages/doctor', auth, requireRole('patient'), async (req, res) => {
  try {
    const userId = req.user.id;
    const doctorId = parseInt(req.query.doctorId || '0', 10);
    if (!doctorId) return res.status(400).json({ error: 'doctorId required' });
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(100, Math.max(10, parseInt(req.query.pageSize || '30', 10)));
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query(
      `SELECT id, from_user_id, from_role, to_user_id, to_role, content, status, created_at
       FROM messages
       WHERE (from_user_id=? AND from_role='patient' AND to_role='doctor' AND to_user_id=?)
          OR (from_user_id=? AND from_role='doctor' AND to_role='patient' AND to_user_id=?)
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, doctorId, doctorId, userId, pageSize, offset]
    );
    res.json({ messages: rows });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Patient: list messages with a specific provider (pharmacy)
router.get('/chat/messages/provider', auth, requireRole('patient'), async (req, res) => {
  try {
    const userId = req.user.id;
    const providerId = parseInt(req.query.providerId || '0', 10);
    if (!providerId) return res.status(400).json({ error: 'providerId required' });
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(100, Math.max(10, parseInt(req.query.pageSize || '30', 10)));
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query(
      `SELECT id, from_user_id, from_role, to_user_id, to_role, content, status, created_at
       FROM messages
       WHERE (from_user_id=? AND from_role='patient' AND to_role='provider' AND to_user_id=?)
          OR (from_user_id=? AND from_role='provider' AND to_role='patient' AND to_user_id=?)
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, providerId, providerId, userId, pageSize, offset]
    );
    res.json({ messages: rows });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Patient marks provider messages as read
router.post('/chat/mark-read/provider', auth, requireRole('patient'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { providerId } = req.body;
    if (!providerId) return res.status(400).json({ error: 'providerId required' });
    const [idsRows] = await pool.query(
      `SELECT id FROM messages WHERE to_user_id=? AND to_role='patient' AND from_role='provider' AND from_user_id=? AND status <> 'read'`,
      [userId, providerId]
    );
    await pool.query(
      `UPDATE messages SET status='read'
       WHERE to_user_id=? AND to_role='patient' AND from_role='provider' AND from_user_id=? AND status <> 'read'`,
      [userId, providerId]
    );
    try {
      const io = req.app.get('io');
      if (io && Array.isArray(idsRows)) {
        for (const r of idsRows) {
          io.emit('message:status', { id: r.id, status: 'read' });
        }
      }
    } catch {}
    res.json({ ok: true, updated: (idsRows || []).length });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Provider: list chat users (patients) who have assigned orders to this provider
router.get('/provider/chat/users', auth, requireRole('provider'), async (req, res) => {
  try {
    const providerId = req.user.id;
    const [rows] = await pool.query(
      `SELECT DISTINCT u.id, CONCAT(u.first_name,' ',u.last_name) AS name, u.username, u.email,
              (
                SELECT m2.content FROM messages m2
                WHERE (m2.from_user_id=u.id AND m2.from_role='patient' AND m2.to_role='provider' AND m2.to_user_id=?)
                   OR (m2.from_user_id=? AND m2.from_role='provider' AND m2.to_role='patient' AND m2.to_user_id=u.id)
                ORDER BY m2.created_at DESC LIMIT 1
              ) AS lastMessage,
              (
                SELECT COUNT(*) FROM messages m3
                WHERE m3.from_user_id=u.id AND m3.from_role='patient' AND m3.to_role='provider' AND m3.to_user_id=? AND m3.status IN ('sent','delivered')
              ) AS unreadCount
       FROM users u
       WHERE EXISTS (
         SELECT 1 FROM orders o WHERE o.user_id=u.id AND COALESCE(o.canceled,0)=0 AND o.provider_id=?
       )
       ORDER BY u.id DESC`,
      [providerId, providerId, providerId, providerId]
    );
    res.json({ users: rows.map(r => ({ id: r.id, name: r.name, username: r.username, email: r.email, lastMessage: r.lastMessage, unreadCount: r.unreadCount })) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Provider: get messages with a patient
router.get('/provider/chat/messages/:patientId', auth, requireRole('provider'), async (req, res) => {
  try {
    const providerId = req.user.id;
    const patientId = parseInt(req.params.patientId, 10);
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(100, Math.max(10, parseInt(req.query.pageSize || '30', 10)));
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query(
      `SELECT id, from_user_id, from_role, to_user_id, to_role, content, status, created_at
       FROM messages
       WHERE (from_user_id=? AND from_role='patient' AND to_role='provider' AND to_user_id=?)
          OR (from_user_id=? AND from_role='provider' AND to_role='patient' AND to_user_id=?)
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [patientId, providerId, providerId, patientId, pageSize, offset]
    );
    res.json({ messages: rows });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Provider marks patient messages as read
router.post('/provider/chat/mark-read', auth, requireRole('provider'), async (req, res) => {
  try {
    const providerId = req.user.id;
    const { patientId } = req.body;
    if (!patientId) return res.status(400).json({ error: 'patientId required' });
    const [idsRows] = await pool.query(
      `SELECT id FROM messages WHERE to_user_id=? AND to_role='provider' AND from_role='patient' AND from_user_id=? AND status <> 'read'`,
      [providerId, patientId]
    );
    await pool.query(
      `UPDATE messages SET status='read'
       WHERE to_user_id=? AND to_role='provider' AND from_role='patient' AND from_user_id=? AND status <> 'read'`,
      [providerId, patientId]
    );
    try {
      const io = req.app.get('io');
      if (io && Array.isArray(idsRows)) {
        for (const r of idsRows) {
          io.emit('message:status', { id: r.id, status: 'read' });
        }
      }
    } catch {}
    res.json({ ok: true, updated: (idsRows || []).length });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Patient marks doctor messages as read
router.post('/chat/mark-read/doctor', auth, requireRole('patient'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { doctorId } = req.body;
    if (!doctorId) return res.status(400).json({ error: 'doctorId required' });
    const [idsRows] = await pool.query(
      `SELECT id FROM messages WHERE to_user_id=? AND to_role='patient' AND from_role='doctor' AND from_user_id=? AND status <> 'read'`,
      [userId, doctorId]
    );
    await pool.query(
      `UPDATE messages SET status='read'
       WHERE to_user_id=? AND to_role='patient' AND from_role='doctor' AND from_user_id=? AND status <> 'read'`,
      [userId, doctorId]
    );
    try {
      const io = req.app.get('io');
      if (io && Array.isArray(idsRows)) {
        for (const r of idsRows) {
          io.emit('message:status', { id: r.id, status: 'read' });
        }
      }
    } catch {}
    res.json({ ok: true, updated: (idsRows || []).length });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Doctor: list chat users (patients) who have assigned orders to this doctor with lastMessage and unreadCount
router.get('/doctor/chat/users', auth, requireRole('doctor'), async (req, res) => {
  try {
    const doctorId = req.user.id;
    const [rows] = await pool.query(
      `SELECT DISTINCT u.id, CONCAT(u.first_name,' ',u.last_name) AS name, u.username, u.email,
              (
                SELECT m2.content FROM messages m2
                WHERE (m2.from_user_id=u.id AND m2.from_role='patient' AND m2.to_role='doctor' AND m2.to_user_id=?)
                   OR (m2.from_user_id=? AND m2.from_role='doctor' AND m2.to_role='patient' AND m2.to_user_id=u.id)
                ORDER BY m2.created_at DESC LIMIT 1
              ) AS lastMessage,
              (
                SELECT COUNT(*) FROM messages m3
                WHERE m3.from_user_id=u.id AND m3.from_role='patient' AND m3.to_role='doctor' AND m3.to_user_id=? AND m3.status IN ('sent','delivered')
              ) AS unreadCount
       FROM users u
       WHERE EXISTS (
         SELECT 1 FROM orders o WHERE o.user_id=u.id AND COALESCE(o.canceled,0)=0 AND o.doctor_id=?
       )
       ORDER BY u.id DESC`,
      [doctorId, doctorId, doctorId, doctorId]
    );
    res.json({ users: rows.map(r => ({ id: r.id, name: r.name, username: r.username, email: r.email, lastMessage: r.lastMessage, unreadCount: r.unreadCount })) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Doctor: get messages with a patient
router.get('/doctor/chat/messages/:patientId', auth, requireRole('doctor'), async (req, res) => {
  try {
    const doctorId = req.user.id;
    const patientId = parseInt(req.params.patientId, 10);
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(100, Math.max(10, parseInt(req.query.pageSize || '30', 10)));
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query(
      `SELECT id, from_user_id, from_role, to_user_id, to_role, content, status, created_at
       FROM messages
       WHERE (from_user_id=? AND from_role='patient' AND to_role='doctor' AND to_user_id=?)
          OR (from_user_id=? AND from_role='doctor' AND to_role='patient' AND to_user_id=?)
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [patientId, doctorId, doctorId, patientId, pageSize, offset]
    );
    res.json({ messages: rows });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Doctor marks patient messages as read
router.post('/doctor/chat/mark-read', auth, requireRole('doctor'), async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { patientId } = req.body;
    if (!patientId) return res.status(400).json({ error: 'patientId required' });
    const [idsRows] = await pool.query(
      `SELECT id FROM messages WHERE to_user_id=? AND to_role='doctor' AND from_role='patient' AND from_user_id=? AND status <> 'read'`,
      [doctorId, patientId]
    );
    await pool.query(
      `UPDATE messages SET status='read'
       WHERE to_user_id=? AND to_role='doctor' AND from_role='patient' AND from_user_id=? AND status <> 'read'`,
      [doctorId, patientId]
    );
    try {
      const io = req.app.get('io');
      if (io && Array.isArray(idsRows)) {
        for (const r of idsRows) {
          io.emit('message:status', { id: r.id, status: 'read' });
        }
      }
    } catch {}
    res.json({ ok: true, updated: (idsRows || []).length });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});
