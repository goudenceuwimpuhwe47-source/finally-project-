const express = require('express');
const router = express.Router();
const pool = require('./db');
const jwt = require('jsonwebtoken');

// Local auth + role middleware (decoupled from ./auth router)
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
const requireRole = (...roles) => (req, res, next) => {
  const role = (req.user?.role || '').toString().toLowerCase();
  const allowed = roles.map(r => r.toString().toLowerCase());
  if (!role) return res.status(401).json({ error: 'Unauthorized' });
  if (!allowed.includes(role)) return res.status(403).json({ error: 'Forbidden' });
  next();
};

const MOMO_BASE = process.env.MOMO_BASE_URL || 'https://sandbox.momodeveloper.mtn.com';
const MOMO_SUB_KEY = process.env.MOMO_SUBSCRIPTION_KEY || '';
const MOMO_API_USER = process.env.MOMO_API_USER || '';
const MOMO_API_KEY = process.env.MOMO_API_KEY || '';
const MOMO_ENV = process.env.MOMO_TARGET_ENV || 'sandbox';
const MOMO_CURRENCY = process.env.MOMO_CURRENCY || 'EUR';
const MOMO_ENABLE_MOCK = String(process.env.MOMO_ENABLE_MOCK || '').toLowerCase() === 'true';
const MOMO_MISSING_CREDS = !MOMO_SUB_KEY || !MOMO_API_USER || !MOMO_API_KEY;
const MOMO_SHOULD_MOCK = true; // Forcing simulation mode as requested

function b64(str) {
  return Buffer.from(str).toString('base64');
}

async function getAccessToken() {
  if (MOMO_SHOULD_MOCK) {
    return 'mock-token';
  }
  // Basic auth with apiuser:apikey
  const res = await fetch(`${MOMO_BASE}/collection/token/`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${b64(`${MOMO_API_USER}:${MOMO_API_KEY}`)}`,
      'Ocp-Apim-Subscription-Key': MOMO_SUB_KEY,
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Token failed: ${res.status} ${txt}`);
  }
  const body = await res.json();
  if (!body?.access_token) throw new Error('No access_token');
  return body.access_token;
}

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 8);
    return v.toString(16);
  });
}

// Initiate MoMo requestToPay for a patient order
router.post('/mtn/request', auth, requireRole('patient'), async (req, res) => {
  const { orderId, msisdn } = req.body || {};
  if (!orderId || !msisdn) return res.status(400).json({ error: 'orderId and msisdn required' });

  let normalizedMsisdn = String(msisdn).trim();
  if (normalizedMsisdn.startsWith('0') && normalizedMsisdn.length === 10) {
    normalizedMsisdn = '250' + normalizedMsisdn.slice(1);
  }
  // Standard Rwandan MSISDN format check: 2507XXXXXXXX (12 digits)
  if (!/^2507\d{8}$/.test(normalizedMsisdn)) return res.status(400).json({ error: 'Invalid phone number. Use format 2507XXXXXXXX' });
  try {
    const [rows] = await pool.query('SELECT id, user_id, invoice_status, invoice_total, payment_status FROM orders WHERE id=? AND user_id=?', [orderId, req.user.id]);
    const order = rows?.[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.payment_status === 'confirmed') return res.status(400).json({ error: 'Already paid' });
    if (order.invoice_status !== 'sent') return res.status(400).json({ error: 'No payable invoice' });
    const amount = Number(order.invoice_total || 0);
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid invoice amount' });
    const referenceId = uuid();

    // MOCK path: create PENDING record and auto-success after a short delay
    if (MOMO_SHOULD_MOCK) {
      try {
        await pool.query(
          `INSERT INTO momo_payments (order_id, reference_id, msisdn, amount, currency, status, created_at, updated_at)
           VALUES (?,?,?,?,?,'PENDING', NOW(), NOW())`,
          [orderId, referenceId, String(normalizedMsisdn), amount, MOMO_CURRENCY]
        );
        // auto mark as SUCCESSFUL shortly and update the order
        setTimeout(async () => {
          try {
            await pool.query('UPDATE momo_payments SET status="SUCCESSFUL", updated_at=NOW() WHERE reference_id=?', [referenceId]);
            await pool.query('UPDATE orders SET payment_status="confirmed", invoice_status="paid", invoice_paid_at=NOW() WHERE id=? AND payment_status!="confirmed"', [orderId]);
            // emit events
            const emitToAdmins = req.app.get('emitToAdmins');
            emitToAdmins && emitToAdmins('order:payment_received', { orderId: Number(orderId) });
            const emitToUser = req.app.get('emitToUser');
            const [usr] = await pool.query('SELECT user_id, provider_id FROM orders WHERE id=?', [orderId]);
            const U = usr?.[0];
            if (U?.provider_id) emitToUser && emitToUser('provider', U.provider_id, 'order:payment_received', { orderId: Number(orderId) });
            emitToUser && emitToUser('patient', U?.user_id, 'order:payment_received', { orderId: Number(orderId) });
            try {
              const [admins] = await pool.query("SELECT id FROM users WHERE LOWER(role)='admin'");
              for (const a of admins) {
                await pool.query(
                  `INSERT INTO notifications (recipient_id, recipient_type, title, message, status, order_id)
                   VALUES (?, 'admin', ?, ?, 'unread', ?)`,
                  [a.id, `Payment received for Order #${orderId}`, `Order #${orderId} has been paid.`, orderId]
                );
              }
            } catch {}
          } catch {}
        }, 1500);
      } catch {}
      return res.json({ ok: true, referenceId, status: 'PENDING', mock: true });
    }

    // REAL path
    let token;
    try { token = await getAccessToken(); } catch (err) {
      // fallback to mock if token fails (e.g., invalid keys)
      try {
        await pool.query(
          `INSERT INTO momo_payments (order_id, reference_id, msisdn, amount, currency, status, created_at, updated_at)
           VALUES (?,?,?,?,?,'PENDING', NOW(), NOW())`,
          [orderId, referenceId, String(normalizedMsisdn), amount, MOMO_CURRENCY]
        );
        setTimeout(async () => {
          try {
            await pool.query('UPDATE momo_payments SET status="SUCCESSFUL", updated_at=NOW() WHERE reference_id=?', [referenceId]);
            await pool.query('UPDATE orders SET payment_status="confirmed", invoice_status="paid", invoice_paid_at=NOW() WHERE id=? AND payment_status!="confirmed"', [orderId]);
            const emitToAdmins = req.app.get('emitToAdmins');
            emitToAdmins && emitToAdmins('order:payment_received', { orderId: Number(orderId) });
            const emitToUser = req.app.get('emitToUser');
            const [usr] = await pool.query('SELECT user_id, provider_id FROM orders WHERE id=?', [orderId]);
            const U = usr?.[0];
            if (U?.provider_id) emitToUser && emitToUser('provider', U.provider_id, 'order:payment_received', { orderId: Number(orderId) });
            emitToUser && emitToUser('patient', U?.user_id, 'order:payment_received', { orderId: Number(orderId) });
            try {
              const [admins] = await pool.query("SELECT id FROM users WHERE LOWER(role)='admin'");
              for (const a of admins) {
                await pool.query(
                  `INSERT INTO notifications (recipient_id, recipient_type, title, message, status, order_id)
                   VALUES (?, 'admin', ?, ?, 'unread', ?)`,
                  [a.id, `Payment received for Order #${orderId}`, `Order #${orderId} has been paid.`, orderId]
                );
              }
            } catch {}
          } catch {}
        }, 1500);
      } catch {}
      return res.json({ ok: true, referenceId, status: 'PENDING', mock: true });
    }

    const payload = {
      amount: amount.toFixed(2),
      currency: MOMO_CURRENCY,
      externalId: String(orderId),
      payer: { partyIdType: 'MSISDN', partyId: String(normalizedMsisdn) },
      payerMessage: 'Medication Order Payment',
      payeeNote: `Order #${orderId}`
    };

    const r = await fetch(`${MOMO_BASE}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': MOMO_ENV,
        'Ocp-Apim-Subscription-Key': MOMO_SUB_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (r.status !== 202) {
      const txt = await r.text().catch(() => '');
      return res.status(400).json({ error: `MoMo request failed: ${r.status} ${txt}` });
    }

    await pool.query(
      `INSERT INTO momo_payments (order_id, reference_id, msisdn, amount, currency, status, created_at, updated_at)
       VALUES (?,?,?,?,?,'PENDING', NOW(), NOW())`,
      [orderId, referenceId, String(normalizedMsisdn), amount, MOMO_CURRENCY]
    );

    res.json({ ok: true, referenceId, status: 'PENDING' });
  } catch (e) {
    console.error('mtn/request error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Poll status for a reference; on SUCCESSFUL, mark order paid
router.get('/mtn/status/:referenceId', auth, async (req, res) => {
  const ref = req.params.referenceId;
  try {
    const [rows] = await pool.query('SELECT * FROM momo_payments WHERE reference_id=?', [ref]);
    const rec = rows?.[0];
    if (!rec) return res.status(404).json({ error: 'Not found' });
    // Only owner patient or admin can poll
    const [o] = await pool.query('SELECT user_id, provider_id FROM orders WHERE id=?', [rec.order_id]);
    const own = o?.[0];
    if (!own) return res.status(404).json({ error: 'Order missing' });
    if (!(req.user.role === 'admin' || req.user.id === own.user_id)) return res.status(403).json({ error: 'Forbidden' });

    if (MOMO_SHOULD_MOCK) {
      // Just return DB status; may have been auto-updated by mock timer
      const status = String(rec.status || 'PENDING').toUpperCase();
      if (status === 'SUCCESSFUL') {
        // ensure order is updated (idempotent)
        await pool.query('UPDATE orders SET payment_status="confirmed", invoice_status="paid", invoice_paid_at=NOW() WHERE id=? AND payment_status!="confirmed"', [rec.order_id]);
      }
      return res.json({ ok: true, status, raw: { mock: true } });
    }

    const token = await getAccessToken();
    const r = await fetch(`${MOMO_BASE}/collection/v1_0/requesttopay/${ref}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Target-Environment': MOMO_ENV,
        'Ocp-Apim-Subscription-Key': MOMO_SUB_KEY,
      }
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      return res.status(400).json({ error: `Status fetch failed: ${r.status} ${txt}` });
    }
    const body = await r.json();
    const status = String(body.status || rec.status || 'PENDING').toUpperCase();
    await pool.query('UPDATE momo_payments SET status=?, raw_json=?, updated_at=NOW() WHERE id=?', [status, JSON.stringify(body), rec.id]);

  if (status === 'SUCCESSFUL') {
      // apply payment to order (idempotent)
      await pool.query('UPDATE orders SET payment_status="confirmed", invoice_status="paid", invoice_paid_at=NOW() WHERE id=? AND payment_status!="confirmed"', [rec.order_id]);
      try {
        const emitToAdmins = req.app.get('emitToAdmins');
        emitToAdmins && emitToAdmins('order:payment_received', { orderId: Number(rec.order_id) });
        const emitToUser = req.app.get('emitToUser');
        const [usr] = await pool.query('SELECT user_id, provider_id FROM orders WHERE id=?', [rec.order_id]);
        const U = usr?.[0];
        if (U?.provider_id) emitToUser && emitToUser('provider', U.provider_id, 'order:payment_received', { orderId: Number(rec.order_id) });
        emitToUser && emitToUser('patient', U?.user_id, 'order:payment_received', { orderId: Number(rec.order_id) });
        // persistent admin notification
        try {
          const [admins] = await pool.query("SELECT id FROM users WHERE LOWER(role)='admin'");
          for (const a of admins) {
            await pool.query(
              `INSERT INTO notifications (recipient_id, recipient_type, title, message, status, order_id)
               VALUES (?, 'admin', ?, ?, 'unread', ?)`,
              [a.id, `Payment received for Order #${rec.order_id}`, `Order #${rec.order_id} has been paid.`, rec.order_id]
            );
          }
        } catch {}
      } catch {}
    }

    res.json({ ok: true, status, raw: body });
  } catch (e) {
    console.error('mtn/status error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
