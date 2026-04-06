const express = require('express');
const pool = require('./db');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { sendVerificationEmail } = require('./email');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret';

// auth middleware
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

// multer for medical certificate
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Invalid file type'));
    cb(null, true);
  }
});

// create order
router.post('/', auth, upload.single('medicalCertificate'), async (req, res) => {
  try {
    const { fullName, idCard, phone, district, sector, cell, village, disease, dosage, age, gender, paymentMethod } = req.body;
    if (!fullName || !idCard || !phone || !district || !sector || !cell || !village || !disease || !dosage || !age || !gender || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!/^1\d{15}$/.test(idCard)) return res.status(400).json({ error: 'Invalid ID card' });

    let certPath = null;
    if (req.file) {
      try {
        const fileData = fs.readFileSync(req.file.path);
        const b64 = fileData.toString('base64');
        certPath = `data:${req.file.mimetype};base64,${b64}`;
        // cleanup temp file
        fs.unlinkSync(req.file.path);
      } catch (fileErr) {
        console.error('Failed to process certificate:', fileErr);
      }
    }
    
    const [result] = await pool.query(
      `INSERT INTO orders (
        user_id, full_name, id_card, phone, district, sector, cell, village, disease, dosage, age, gender, payment_method, medical_certificate,
        admin_status, doctor_status, payment_status, pharmacy_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', 'pending', 'pending')`,
      [req.user.id, fullName, idCard, phone, district, sector, cell, village, disease, dosage, age, gender, paymentMethod, certPath]
    );

    const orderId = result.insertId;

    // Update user profile with order information for future auto-fill
    try {
      await pool.query(
        `UPDATE users SET 
          first_name = COALESCE(first_name, ?),
          id_card = COALESCE(id_card, ?),
          phone = COALESCE(phone, ?),
          district = COALESCE(district, ?),
          sector = COALESCE(sector, ?),
          cell = COALESCE(cell, ?),
          village = COALESCE(village, ?),
          gender = COALESCE(gender, ?)
        WHERE id = ?`,
        [fullName, idCard, phone, district, sector, cell, village, gender, req.user.id]
      );
    } catch (profileError) {
      console.error('Failed to update user profile:', profileError);
      // Don't fail order creation if profile update fails
    }

    // Notify all admins about the new order
    try {
      const [admins] = await pool.query("SELECT id FROM users WHERE LOWER(role) = 'admin'");
      for (const admin of admins) {
        await pool.query(
          `INSERT INTO notifications (recipient_id, recipient_type, title, message, status, order_id, created_at)
           VALUES (?, 'admin', ?, ?, 'unread', ?, NOW())`,
          [
            admin.id,
            'New Order Received',
            `Patient ${fullName} has placed a new order for ${disease}. Order ID: #${orderId}`,
            orderId
          ]
        );
      }
      
      // Emit real-time notification to all connected admins
      const emitToAdmins = req.app.get('emitToAdmins');
      if (emitToAdmins) {
        emitToAdmins('order:new_order', {
          orderId: orderId,
          patientName: fullName,
          disease: disease,
          title: 'New Order Received',
          message: `Patient ${fullName} has placed a new order for ${disease}. Order ID: #${orderId}`,
          created_at: new Date().toISOString()
        });
      }
    } catch (notifError) {
      console.error('Failed to send admin notification:', notifError);
      // Don't fail the order creation if notification fails
    }

    res.json({ message: 'Order created', id: orderId });
  } catch (e) {
    console.error(e);
  const msg = e?.message?.includes('Invalid file type') ? 'Invalid file type' : 'Server error';
  res.status(500).json({ error: msg });
  }
});

// list my orders
router.get('/my', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM orders WHERE user_id = ? AND COALESCE(canceled, 0) = 0 ORDER BY created_at DESC', [req.user.id]);
    res.json({ orders: rows });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Provider: list assigned orders (by provider_id)
router.get('/provider/assigned', auth, requireRole('provider'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM orders
       WHERE COALESCE(canceled,0)=0 AND provider_id = ?
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ orders: rows });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Provider: confirm availability and quote price for assigned order
router.post('/:id/provider-availability', auth, requireRole('provider'), async (req, res) => {
  try {
    const orderId = req.params.id;
    const { available, stock_id, quantity, note } = req.body || {};
    // Load order and validate ownership
    const [orders] = await pool.query('SELECT * FROM orders WHERE id=?', [orderId]);
    const order = orders[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (Number(order.provider_id) !== Number(req.user.id)) return res.status(403).json({ error: 'Not your assigned order' });
    // If already confirmed, block repeat actions until payment handled
    if (order.provider_confirmed) return res.status(400).json({ error: 'Already confirmed. Await admin payment.' });

    if (!available) {
      // mark rejected and free for reassignment
      const reason = (note || 'Not available').toString();
      await pool.query('UPDATE orders SET provider_status=\'rejected\', provider_reject_reason=?, provider_id=NULL, provider_confirmed=0, provider_confirmed_qty=NULL, provider_confirmed_price=NULL, provider_stock_id=NULL, provider_note=? WHERE id=?', [reason, reason, orderId]);
      // Notify admins via socket
      try { const io = req.app.get('io'); io && io.emit('order:provider_unavailable', { orderId: Number(orderId), reason }); } catch {}
      return res.json({ ok: true, status: 'rejected' });
    }

    const qty = parseInt(quantity);
    if (!stock_id || isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'stock_id and positive quantity are required' });
    // Verify stock ownership and fetch price
    const [items] = await pool.query('SELECT id, provider_id, name, quantity, unit_price FROM provider_stock WHERE id=? AND provider_id=?', [stock_id, req.user.id]);
    if (!items.length) return res.status(400).json({ error: 'Stock item not found' });
    const item = items[0];
    if (Number(item.quantity) < qty) return res.status(400).json({ error: 'Insufficient stock for requested quantity' });

    const unitPrice = parseFloat(item.unit_price || 0);
    if (isNaN(unitPrice)) return res.status(400).json({ error: 'Invalid unit price in stock' });
    const price = unitPrice * qty;
    
    if (isNaN(price)) {
      console.error('ERROR [POST /provider-availability]: Price calculation failed (NaN)', { unitPrice, qty });
      return res.status(500).json({ error: 'Internal server error during price calculation' });
    }

    await pool.query(
      'UPDATE orders SET provider_confirmed=1, provider_confirmed_qty=?, provider_confirmed_price=?, provider_stock_id=?, provider_note=?, provider_status=\'assigned\' WHERE id=?',
      [qty, price, stock_id, (note || null), orderId]
    );

    // Notify admins with quote
    try { const io = req.app.get('io'); io && io.emit('order:provider_confirmed', { orderId: Number(orderId), qty, unit_price: unitPrice, total: price }); } catch {}

    const [updated] = await pool.query('SELECT * FROM orders WHERE id=?', [orderId]);
    res.json(updated[0] || {});
  } catch (e) {
    console.error('ERROR [POST /provider-availability]:', e.message, e.stack);
    res.status(500).json({ error: 'Server error', details: e.message });
  }
});

// helper to check if editable/cancelable
async function getOrderOwned(pool, id, userId) {
  const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [id, userId]);
  return rows[0];
}

function isEditable(order) {
  if (!order) return false;
  if (order.canceled) return false;
  return (
    order.admin_status === 'pending' &&
    order.doctor_status === 'pending' &&
    order.payment_status === 'pending' &&
    order.pharmacy_status === 'pending'
  );
}

// edit order (only while all statuses are pending)
router.patch('/:id', auth, upload.single('medicalCertificate'), async (req, res) => {
  try {
    const id = req.params.id;
    const order = await getOrderOwned(pool, id, req.user.id);
    if (!order) return res.status(404).json({ error: 'Not found' });
    if (!isEditable(order)) return res.status(400).json({ error: 'Order cannot be edited at this stage' });

    const fields = ['fullName','idCard','phone','district','sector','cell','village','disease','dosage','age','gender','paymentMethod'];
    const updates = {};
    for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];

    const sqlMap = {
      fullName: 'full_name', idCard: 'id_card', phone: 'phone', district: 'district', sector: 'sector',
      cell: 'cell', village: 'village', disease: 'disease', dosage: 'dosage', age: 'age', gender: 'gender', paymentMethod: 'payment_method'
    };

    const setClauses = [];
    const params = [];
    for (const [k, v] of Object.entries(updates)) {
      setClauses.push(`${sqlMap[k]} = ?`);
      params.push(v);
    }
    if (req.file) {
      setClauses.push('medical_certificate = ?');
      params.push('uploads/' + req.file.filename);
    }
    if (setClauses.length === 0) return res.json({ message: 'No changes' });
    params.push(id);
    const sql = `UPDATE orders SET ${setClauses.join(', ')} WHERE id = ?`;
    await pool.query(sql, params);
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    res.json(rows[0] || {});
  } catch (e) {
    console.error('update order error:', e);
    const msg = e?.message?.includes('Invalid file type') ? 'Invalid file type' : 'Server error';
    res.status(500).json({ error: msg, details: e.message });
  }
});

// cancel order (soft cancel) while pending
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const id = req.params.id;
    const order = await getOrderOwned(pool, id, req.user.id);
    if (!order) return res.status(404).json({ error: 'Not found' });
    if (!isEditable(order)) return res.status(400).json({ error: 'Order cannot be canceled at this stage' });
    await pool.query('UPDATE orders SET canceled = 1 WHERE id = ?', [id]);
    res.json({ message: 'Order canceled' });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// update admin status
router.patch('/:id/admin-status', auth, requireRole('admin'), async (req, res) => {
  try {
    const { status, reason } = req.body;
    const allowed = ['pending','under_review','approved','rejected'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    // Load order for validation
    const [existingRows] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ error: 'Order not found' });
    // Prevent approving before doctor approval
    if (status === 'approved' && existing.doctor_status !== 'approved') {
      return res.status(400).json({ error: 'Doctor must approve before admin can approve' });
    }
    // Prevent approving before payment confirmation
    if (status === 'approved' && String(existing.payment_status || '').toLowerCase() !== 'confirmed') {
      return res.status(400).json({ error: 'Payment must be confirmed before admin can approve' });
    }
    if (status === 'rejected') {
      if (!reason || !String(reason).trim()) return res.status(400).json({ error: 'Rejection reason is required' });
      await pool.query('UPDATE orders SET admin_status = ?, admin_reject_reason = ? WHERE id = ?', [status, String(reason).trim(), req.params.id]);
    } else {
      await pool.query('UPDATE orders SET admin_status = ?, admin_reject_reason = NULL WHERE id = ?', [status, req.params.id]);
    }
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);

    // On admin approval emit and persist notifications to patient and provider
    if (status === 'approved') {
      try {
        const order = rows[0] || existing;
        // Load provider info if assigned
        let providerInfo = null;
        if (order.provider_id) {
          const [prov] = await pool.query('SELECT id, username, email, phone, CONCAT(first_name, " ", last_name) AS name FROM users WHERE id=?', [order.provider_id]);
          providerInfo = prov?.[0] || null;
        }
        // Persist patient notification
        try {
          await pool.query(
            `INSERT INTO notifications (recipient_id, recipient_type, title, message, status, order_id)
             VALUES (?, 'patient', ?, ?, 'unread', ?)`,
            [order.user_id, `Order #${order.id} approved`, providerInfo
              ? `Your medication is approved. Assigned provider: ${providerInfo.name || providerInfo.username || providerInfo.email || 'Provider'}.
You can coordinate pickup/delivery and chat now.`
              : `Your medication is approved.`, order.id]
          );
        } catch {}
        // Emit to patient
        try {
          const emitToUser = req.app.get('emitToUser');
          emitToUser && emitToUser('patient', order.user_id, 'order:admin_approved', {
            orderId: Number(order.id),
            provider: providerInfo ? {
              id: providerInfo.id,
              name: providerInfo.name || providerInfo.username || providerInfo.email || 'Provider',
              email: providerInfo.email || null,
              phone: providerInfo.phone || null,
            } : null,
          });
        } catch {}

        // Notify provider if assigned
        if (order.provider_id) {
          try {
            await pool.query(
              `INSERT INTO notifications (recipient_id, recipient_type, title, message, status, order_id)
               VALUES (?, 'provider', ?, ?, 'unread', ?)`,
               [order.provider_id, `Order #${order.id} approved`, `Payment is confirmed and admin approved the order. Prepare the prescription for ${order.full_name || 'the patient'}.`, order.id]
            );
          } catch {}
          try {
            const emitToUser = req.app.get('emitToUser');
            emitToUser && emitToUser('provider', order.provider_id, 'order:admin_approved', { orderId: Number(order.id) });
          } catch {}
        }
      } catch {}
    }

    res.json(rows[0] || {});
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Assign a doctor to an order and move to under_review
router.post('/:id/assign-doctor', auth, requireRole('admin'), async (req, res) => {
  try {
    const orderId = req.params.id;
    const { doctorId } = req.body;
    if (!doctorId) return res.status(400).json({ error: 'doctorId is required' });
    const [[docCount]] = await pool.query("SELECT COUNT(*) AS n FROM users WHERE id=? AND LOWER(role)='doctor'", [doctorId]);
    if (!docCount || docCount.n === 0) return res.status(400).json({ error: 'Doctor not found' });

    // Only from pending state
    const [rows0] = await pool.query('SELECT admin_status FROM orders WHERE id=?', [orderId]);
    if (!rows0.length) return res.status(404).json({ error: 'Order not found' });
    if (rows0[0].admin_status !== 'pending') return res.status(400).json({ error: 'Order must be in pending to assign a doctor' });

    await pool.query('UPDATE orders SET doctor_id=?, admin_status=\'under_review\', doctor_status=\'pending\' WHERE id=?', [doctorId, orderId]);
    const [row] = await pool.query('SELECT * FROM orders WHERE id=?', [orderId]);
    res.json(row[0] || {});
  } catch (e) {
    console.error('assign-doctor error:', e);
    res.status(500).json({ error: 'Server error', details: e.message });
  }
});

// Doctor: list assigned orders
router.get('/doctor/assigned', auth, requireRole('doctor'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM orders WHERE COALESCE(canceled,0)=0 AND doctor_id=? ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ orders: rows });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Doctor: order history (approved or rejected by this doctor)
router.get('/doctor/history', auth, requireRole('doctor'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT *
       FROM orders
       WHERE COALESCE(canceled,0)=0
         AND doctor_id = ?
         AND LOWER(doctor_status) IN ('approved','rejected')
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ orders: rows });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Doctor: list my patients (privacy-locked: only those assigned to this doctor)
router.get('/doctor/patients', auth, requireRole('doctor'), async (req, res) => {
  try {
    const doctorId = req.user?.id;
    if (!doctorId) return res.status(401).json({ error: 'User ID missing from token' });

    const [rows] = await pool.query(
      `SELECT DISTINCT
         u.id, 
         u.username, 
         u.email, 
         u.phone,
         u.first_name,
         u.last_name
       FROM orders o
       JOIN users u ON u.id = o.user_id
       WHERE o.doctor_id = ?
       ORDER BY u.first_name, u.last_name, u.email`,
      [doctorId]
    );
    res.json({ patients: rows });
  } catch (e) {
    console.error('doctor/patients error:', e);
    res.status(500).json({ error: 'Server error', details: e.message });
  }
});

// Patient: list my prescriptions (current and recent)
router.get('/my/prescriptions', auth, async (req, res) => {
  try {
    const patientId = req.user.id;
    const [rows] = await pool.query(
      `SELECT p.*, o.provider_id,
              (SELECT CONCAT(u.first_name,' ',u.last_name) FROM users u WHERE u.id=o.provider_id) AS provider_name
         FROM prescriptions p
         LEFT JOIN orders o ON o.id = p.order_id
        WHERE p.patient_id = ?
        ORDER BY p.created_at DESC
        LIMIT 100`,
      [patientId]
    );
    res.json({ prescriptions: rows });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Patient: doctor guidance from recent approved orders
router.get('/my/guidance', auth, async (req, res) => {
  try {
    const patientId = req.user.id;
    const [rows] = await pool.query(
      `SELECT id AS order_id, created_at,
              medicine_name, prescription_quantity,
              doctor_instructions, doctor_advice, adherence_plan,
              doctor_status, admin_status
         FROM orders
        WHERE user_id = ?
          AND LOWER(doctor_status) = 'approved'
        ORDER BY created_at DESC
        LIMIT 5`,
      [patientId]
    );
    res.json({ guidance: rows });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Patient: combined doctor guidance + latest prescription per approved order
router.get('/my/medication-overview', auth, async (req, res) => {
  try {
    const patientId = req.user.id;
    // Get recent approved orders with guidance
    const [orders] = await pool.query(
      `SELECT id AS order_id, created_at,
              medicine_name, prescription_quantity,
              doctor_instructions, doctor_advice, adherence_plan
         FROM orders
        WHERE user_id = ? AND LOWER(doctor_status)='approved'
        ORDER BY created_at DESC
        LIMIT 10`,
      [patientId]
    );
    if (!orders.length) return res.json({ items: [] });
    const ids = orders.map((o) => o.order_id);
    // Fetch latest prescription for each order
    const [prescRows] = await pool.query(
      `SELECT p.*
         FROM prescriptions p
        WHERE p.order_id IN (${ids.map(()=>'?').join(',')})
        ORDER BY p.order_id, p.created_at DESC`,
      ids
    );
    // Group by order_id and pick first (latest)
    const latestByOrder = new Map();
    for (const p of prescRows) {
      if (!latestByOrder.has(p.order_id)) latestByOrder.set(p.order_id, p);
    }
    const items = orders.map((o) => ({
      ...o,
      prescription: latestByOrder.get(o.order_id) || null,
    }));
    res.json({ items });
  } catch (e) {
    console.error('medication-overview error', e?.message || e);
    res.status(500).json({ error: 'Server error' });
  }
});

// update doctor status (+ persist guidance on approval, reason on rejection)
router.patch('/:id/doctor-status', auth, requireRole('doctor','admin'), async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body || {};
    const allowed = ['pending','approved','rejected'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    // Load order and enforce doctor ownership if doctor is acting
    const [existingRows] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ error: 'Order not found' });
    const role = (req.user?.role || '').toString().toLowerCase();
    if (role === 'doctor') {
      if (!existing.doctor_id || Number(existing.doctor_id) !== Number(req.user.id)) {
        return res.status(403).json({ error: 'Not your assigned order' });
      }
    }

    if (status === 'approved') {
      // Accept payload fields for guidance
      const medicine_name = (req.body?.medicine_name ?? '').toString().trim();
      // allow either 'prescription_quantity' or 'quantity'
      const prescription_quantity = (req.body?.prescription_quantity ?? req.body?.quantity ?? '').toString().trim();
      // allow 'instructions' alias for doctor_instructions
      const doctor_instructions = (req.body?.doctor_instructions ?? req.body?.instructions ?? '').toString();
      const doctor_advice = (req.body?.doctor_advice ?? req.body?.advice ?? '').toString();
      const adherence_plan = (req.body?.adherence_plan ?? '').toString();

      if (!medicine_name || !prescription_quantity || !doctor_instructions) {
        return res.status(400).json({ error: 'medicine_name, prescription_quantity and doctor_instructions are required' });
      }
      await pool.query(
        `UPDATE orders SET 
           doctor_status='approved', 
           medicine_name=?, 
           prescription_quantity=?, 
           doctor_instructions=?, 
           doctor_advice=?, 
           adherence_plan=?, 
           doctor_reject_reason=NULL
         WHERE id=?`,
        [medicine_name, prescription_quantity, doctor_instructions, doctor_advice || null, adherence_plan || null, id]
      );
    } else if (status === 'rejected') {
      const reason = (req.body?.reason ?? req.body?.doctor_reject_reason ?? '').toString().trim();
      if (!reason) return res.status(400).json({ error: 'Rejection reason is required' });
      await pool.query(
        `UPDATE orders SET 
           doctor_status='rejected', 
           doctor_reject_reason=?, 
           medicine_name=NULL, 
           prescription_quantity=NULL, 
           doctor_instructions=NULL, 
           doctor_advice=NULL, 
           adherence_plan=NULL
         WHERE id=?`,
        [reason, id]
      );
    } else {
      // reset to pending (admin-only typical). Do not modify guidance fields.
      await pool.query('UPDATE orders SET doctor_status = ? WHERE id = ?', [status, id]);
    }

    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    res.json(rows[0] || {});
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// update payment status
router.patch('/:id/payment-status', auth, requireRole('admin','provider'), async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending','confirmed','approved','failed'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    await pool.query('UPDATE orders SET payment_status = ? WHERE id = ?', [status, req.params.id]);
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    res.json(rows[0] || {});
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// update pharmacy status
router.patch('/:id/pharmacy-status', auth, requireRole('provider','admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending','ready_pickup','ready_delivery','dispatched','delivered'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    await pool.query('UPDATE orders SET pharmacy_status = ? WHERE id = ?', [status, req.params.id]);
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    res.json(rows[0] || {});
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
// Admin: find nearest providers based on order location progressively (village->cell->sector->district->province)
router.get('/:id/nearest-providers', auth, requireRole('admin'), async (req, res) => {
  try {
    const id = req.params.id;
    const [orders] = await pool.query('SELECT user_id, district, sector, cell, village FROM orders WHERE id=?', [id]);
    if (!orders.length) return res.status(404).json({ error: 'Order not found' });
    const { user_id, district, sector, cell, village } = orders[0];
    let province = null;
    try {
      const [u] = await pool.query('SELECT province FROM users WHERE id=?', [user_id]);
      if (u && u[0]) province = u[0].province || null;
    } catch {}

    const levels = [
      { where: 'village = ?', params: [village] },
      { where: 'cell = ?', params: [cell] },
      { where: 'sector = ?', params: [sector] },
      { where: 'district = ?', params: [district] },
      { where: 'province = ?', params: [province] }
    ];

    // We assume providers are stored in users with role='provider' and location fields
    for (const lvl of levels) {
      if (!lvl.params[0]) continue;
      const [rows] = await pool.query(
        `SELECT id, username, email, phone, CONCAT(first_name,' ',last_name) AS name, province, district, sector, cell, village
         FROM users
         WHERE LOWER(role)='provider' AND ${lvl.where}
         ORDER BY name IS NULL, name, username
         LIMIT 10`,
        lvl.params
      );
      if (rows.length) return res.json({ providers: rows, matchLevel: lvl.where.split(' ')[0] });
    }
    
    // If no nearest providers found, return all providers in the system
    const [allProviders] = await pool.query(
      `SELECT id, username, email, phone, CONCAT(first_name,' ',last_name) AS name, province, district, sector, cell, village
       FROM users
       WHERE LOWER(role)='provider'
       ORDER BY name IS NULL, name, username`
    );
    return res.json({ providers: allProviders, matchLevel: 'all' });
  } catch (e) {
    console.error('nearest-providers error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: assign provider/pharmacy to order (allowed only after doctor approval; does not auto-approve admin)
router.post('/:id/assign-provider', auth, requireRole('admin'), async (req, res) => {
  try {
    const orderId = req.params.id;
    const { providerId } = req.body || {};
    if (!providerId) return res.status(400).json({ error: 'providerId is required' });

    // Validate order exists and doctor approved
    const [rows] = await pool.query('SELECT id, doctor_status, provider_id, provider_status FROM orders WHERE id=?', [orderId]);
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    if (String(rows[0].doctor_status).toLowerCase() !== 'approved') {
      return res.status(400).json({ error: 'Doctor must approve before assigning a provider' });
    }
    // Enforce single-provider assignment (unless previously rejected)
    const currentProv = rows[0].provider_id;
    const provStatus = String(rows[0].provider_status || 'unassigned').toLowerCase();
    if (currentProv && provStatus !== 'rejected' && Number(currentProv) !== Number(providerId)) {
      return res.status(400).json({ error: 'Order is already assigned to a provider' });
    }

    // Validate provider
    const [[prov]] = await pool.query(
      `SELECT COUNT(*) AS n FROM users WHERE id=? AND LOWER(role)='provider'`,
      [providerId]
    );
    if (!prov || prov.n === 0) return res.status(400).json({ error: 'Provider not found' });

    await pool.query('UPDATE orders SET provider_id=?, provider_status=\'assigned\', provider_reject_reason=NULL WHERE id=?', [providerId, orderId]);
    const [updated] = await pool.query('SELECT * FROM orders WHERE id=?', [orderId]);
    res.json(updated[0] || {});
  } catch (e) {
    console.error('assign-provider error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Provider rejects an assigned order -> back to admin (clear provider_id? keep history, set status rejected)
router.post('/:id/provider-reject', auth, requireRole('provider'), async (req, res) => {
  try {
    const orderId = req.params.id;
    const reason = (req.body?.reason || '').toString().trim();
    if (!reason) return res.status(400).json({ error: 'Rejection reason is required' });

    const [rows] = await pool.query('SELECT provider_id FROM orders WHERE id=?', [orderId]);
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    const current = rows[0];
    if (!current.provider_id || Number(current.provider_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'Not your assigned order' });
    }

    // Set provider_status rejected and clear provider_id so admin can reassign
    await pool.query('UPDATE orders SET provider_status=\'rejected\', provider_reject_reason=?, provider_id=NULL WHERE id=?', [reason, orderId]);
    const [updated] = await pool.query('SELECT * FROM orders WHERE id=?', [orderId]);
    res.json(updated[0] || {});
  } catch (e) {
    console.error('provider-reject error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Provider: list my prescriptions (history) — placed before dynamic /:id routes to avoid shadowing
router.get('/provider/prescriptions', auth, requireRole('provider'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, o.full_name AS patient_name
       FROM prescriptions p
       LEFT JOIN orders o ON o.id = p.order_id
       WHERE p.provider_id=?
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json({ prescriptions: rows });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Provider: list distinct patients I've interacted with (via assigned orders)
router.get('/provider/patients', auth, requireRole('provider'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT
         u.id,
         TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS full_name,
         u.email,
         u.phone
       FROM orders o
       JOIN users u ON u.id = o.user_id
       WHERE o.provider_id = ?
       ORDER BY full_name ASC, email ASC` ,
      [req.user.id]
    );
    res.json({ patients: rows });
  } catch (e) {
    console.error('ERROR [GET /provider/patients]:', e.message);
    res.status(500).json({ error: 'Server error', details: e.message });
  }
});

// Provider: get recent orders and prescriptions for a specific patient
router.get('/provider/patients/:pid/summary', auth, requireRole('provider'), async (req, res) => {
  try {
    const patientId = Number(req.params.pid);
    if (!patientId) return res.status(400).json({ error: 'Invalid patient id' });
    const [orders] = await pool.query(
      `SELECT id, admin_status, doctor_status, payment_status, pharmacy_status, created_at
       FROM orders
       WHERE provider_id=? AND user_id=?
       ORDER BY created_at DESC
       LIMIT 10`,
      [req.user.id, patientId]
    );
    const [prescriptions] = await pool.query(
      `SELECT id, order_id, medicine_name, status, created_at, duration_days, dosage, quantity
       FROM prescriptions
       WHERE provider_id=? AND patient_id=?
       ORDER BY created_at DESC
       LIMIT 10`,
      [req.user.id, patientId]
    );
    res.json({ orders, prescriptions });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Provider: create a new prescription for an approved order (patient will see it)
router.post('/:id/prescriptions', auth, requireRole('provider'), async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const [rows] = await pool.query('SELECT * FROM orders WHERE id=?', [orderId]);
    const order = rows?.[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (Number(order.provider_id) !== Number(req.user.id)) return res.status(403).json({ error: 'Not your assigned order' });
    if (String(order.admin_status).toLowerCase() !== 'approved') return res.status(400).json({ error: 'Order must be admin-approved' });

  const medicine_name = (req.body?.medicine_name ?? order.medicine_name ?? '').toString().trim();
  const quantity = (req.body?.quantity ?? order.prescription_quantity ?? '').toString().trim();
  const dosage = (req.body?.dosage ?? '').toString().trim();
  const frequency_per_day = Number(req.body?.frequency_per_day || 0) || 0; // pieces taken per day
  // prefer explicit numeric quantity_units, else try to derive from quantity string like '30 tabs'
  const parsedQty = (() => { const m = String(quantity).match(/(\d+(?:\.\d+)?)/); return m ? Math.floor(Number(m[0])) : 0; })();
  const quantity_units = Number(req.body?.quantity_units || 0) || parsedQty;
  // compute duration days if possible
  const duration_days = frequency_per_day > 0 && quantity_units > 0 ? Math.ceil(quantity_units / frequency_per_day) : null;
  const instructions = (req.body?.instructions ?? order.doctor_instructions ?? '').toString().trim();
    const patient_id = Number(req.body?.patient_id ?? order.user_id);
    if (!medicine_name || !quantity) return res.status(400).json({ error: 'medicine_name and quantity are required' });
    if (!patient_id) return res.status(400).json({ error: 'patient_id is required' });

    // Replace existing prescription(s) for this order by canceling the old ones
    try {
      await pool.query("UPDATE prescriptions SET status='canceled' WHERE order_id=? AND status<>'canceled'", [orderId]);
    } catch {}

    const [ins] = await pool.query(
      `INSERT INTO prescriptions (
         order_id, patient_id, provider_id, medicine_name,
         quantity, dosage, frequency_per_day, quantity_units, duration_days,
         instructions
       ) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        orderId, patient_id, req.user.id, medicine_name,
        quantity || null, dosage || null, frequency_per_day || null, quantity_units || null, duration_days || null,
        instructions || null
      ]
    );
    const created = {
      id: ins.insertId,
      order_id: orderId,
      patient_id,
      provider_id: req.user.id,
      medicine_name,
      quantity,
      dosage: dosage || null,
      frequency_per_day: frequency_per_day || null,
      quantity_units: quantity_units || null,
      duration_days: duration_days || null,
      instructions: instructions || null,
      status: 'active',
      created_at: new Date(),
    };

    // Notify patient (persist + realtime)
    try {
      await pool.query(
        `INSERT INTO notifications (recipient_id, recipient_type, title, message, status, order_id)
         VALUES (?, 'patient', ?, ?, 'unread', ?)`,
        [patient_id, `New prescription for Order #${orderId}`, `The pharmacy created your prescription: ${medicine_name} — ${quantity}.`, orderId]
      );
    } catch {}
    try {
      const emitToUser = req.app.get('emitToUser');
      emitToUser && emitToUser('patient', patient_id, 'prescription:created', { orderId, prescription: created });
    } catch {}

    res.json({ ok: true, prescription: created });
  } catch (e) {
    console.error('create prescription error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get prescriptions for an order (patient or assigned provider)
router.get('/:id/prescriptions', auth, async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const [rows] = await pool.query('SELECT user_id, provider_id FROM orders WHERE id=?', [orderId]);
    const ord = rows?.[0];
    if (!ord) return res.status(404).json({ error: 'Order not found' });
    const role = String(req.user?.role || '').toLowerCase();
    if (!( (role === 'patient' && Number(req.user.id) === Number(ord.user_id)) || (role === 'provider' && Number(req.user.id) === Number(ord.provider_id)) || role === 'admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  const [presc] = await pool.query('SELECT * FROM prescriptions WHERE order_id=? ORDER BY created_at DESC', [orderId]);
    res.json({ prescriptions: presc });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Provider: list my prescriptions (history)
router.get('/me/prescriptions', auth, requireRole('provider'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, o.full_name AS patient_name
       FROM prescriptions p
       LEFT JOIN orders o ON o.id = p.order_id
       WHERE p.provider_id=?
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json({ prescriptions: rows });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Provider: update prescription status (active/completed/canceled)
router.patch('/prescriptions/:pid/status', auth, requireRole('provider'), async (req, res) => {
  try {
    const pid = Number(req.params.pid);
    const status = String(req.body?.status || '').toLowerCase();
    if (!['active','completed','canceled'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const [rows] = await pool.query('SELECT id, provider_id FROM prescriptions WHERE id=?', [pid]);
    const presc = rows?.[0];
    if (!presc) return res.status(404).json({ error: 'Not found' });
    if (Number(presc.provider_id) !== Number(req.user.id)) return res.status(403).json({ error: 'Forbidden' });
    await pool.query('UPDATE prescriptions SET status=? WHERE id=?', [status, pid]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Provider confirms patient took medicine: decrement stock and complete prescription
router.post('/:id/prescriptions/:pid/confirm-dispense', auth, requireRole('provider'), async (req, res) => {
  const orderId = Number(req.params.id);
  const pid = Number(req.params.pid);
  try {
    // Validate order ownership and stock link
    const [oRows] = await pool.query('SELECT id, provider_id, provider_stock_id FROM orders WHERE id=?', [orderId]);
    const order = oRows?.[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (Number(order.provider_id) !== Number(req.user.id)) return res.status(403).json({ error: 'Not your assigned order' });
    if (!order.provider_stock_id) return res.status(400).json({ error: 'No linked stock item for this order' });

    // Validate prescription belongs to this order and provider
    const [pRows] = await pool.query('SELECT * FROM prescriptions WHERE id=? AND order_id=?', [pid, orderId]);
    const presc = pRows?.[0];
    if (!presc) return res.status(404).json({ error: 'Prescription not found' });
    if (String(presc.status).toLowerCase() !== 'active') return res.status(400).json({ error: 'Prescription is not active' });

    const units = Number(presc.quantity_units || 0) || (String(presc.quantity || '').match(/(\d+(?:\.\d+)?)/) ? Math.floor(Number(String(presc.quantity).match(/(\d+(?:\.\d+)?)/)[0])) : 0);
    if (!units || units <= 0) return res.status(400).json({ error: 'Invalid quantity to dispense' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // Lock stock
      const [sRows] = await conn.query('SELECT * FROM provider_stock WHERE id=? AND provider_id=? FOR UPDATE', [order.provider_stock_id, req.user.id]);
      if (!sRows.length) { await conn.rollback(); return res.status(404).json({ error: 'Stock item not found' }); }
      const stock = sRows[0];

      const dispenseQty = Math.min(stock.quantity, units);
      const newQty = Math.max(0, stock.quantity - dispenseQty);
      await conn.query('UPDATE provider_stock SET quantity=? WHERE id=?', [newQty, stock.id]);
      await conn.query(
        'INSERT INTO provider_stock_moves (provider_id, stock_id, type, quantity, note) VALUES (?,?,?,?,?)',
        [req.user.id, stock.id, 'out', dispenseQty, `Dispense prescription #${pid} for order #${orderId}`]
      );
      // Complete prescription and set order delivered
      await conn.query("UPDATE prescriptions SET status='completed' WHERE id=?", [pid]);
      await conn.query("UPDATE orders SET pharmacy_status='delivered' WHERE id=?", [orderId]);
      await conn.commit();

      res.json({ ok: true, stock_quantity: newQty });
    } catch (err) {
      await conn.rollback();
      console.error('confirm-dispense tx error', err);
      res.status(500).json({ error: 'Server error' });
    } finally {
      conn.release();
    }
  } catch (e) {
    console.error('confirm-dispense error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: create and send invoice to patient
router.post('/:id/invoice', auth, requireRole('admin'), async (req, res) => {
  try {
    const orderId = req.params.id;
    const { method, medicine_total, doctor_fee, service_fee, delivery_fee, total, notes } = req.body || {};
    const allowedMethods = ['online','home_delivery','pharmacy_pickup'];
    if (!allowedMethods.includes(String(method))) return res.status(400).json({ error: 'Invalid method' });
    // Load order and patient
    const [rows] = await pool.query('SELECT * FROM orders WHERE id=?', [orderId]);
    const order = rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!order.provider_confirmed) return res.status(400).json({ error: 'Provider must confirm availability first' });
  const med = Number((medicine_total ?? order.provider_confirmed_price) || 0) || 0;
    const d = Number(doctor_fee || 0) || 0;
    const s = Number(service_fee || 0) || 0;
    const del = String(method) === 'online' ? 0 : (Number(delivery_fee || 0) || 0);
    const tot = Number(total ?? (med + d + s + del));
    await pool.query(
      `UPDATE orders SET 
        invoice_status='sent', invoice_method=?, invoice_medicine_total=?, invoice_doctor_fee=?, invoice_service_fee=?, invoice_delivery_fee=?, invoice_total=?, invoice_sent_at=NOW()
       WHERE id=?`,
      [String(method), med, d, s, del, tot, orderId]
    );
    // Persist notification for patient
    try {
      await pool.query(
        `INSERT INTO notifications (recipient_id, recipient_type, title, message, status, order_id)
         VALUES (?, 'patient', ?, ?, 'unread', ?)`,
        [order.user_id, `Invoice for Order #${orderId}`, `Your invoice is ready. Total: ${tot.toFixed(2)}. Please pay to proceed.`, orderId]
      );
    } catch (err) { console.warn('patient notification insert failed', err?.message || err); }
  // Notify patient via socket
    try {
      const emitToUser = req.app.get('emitToUser');
      emitToUser && emitToUser('patient', order.user_id, 'order:invoice_sent', { orderId: Number(orderId), total: tot });
    } catch {}
    // Email patient (if email exists)
    try {
      const [urows] = await pool.query('SELECT email FROM users WHERE id=?', [order.user_id]);
      const email = urows?.[0]?.email;
      if (email) {
        const transporter = require('nodemailer').createTransport({ service: 'gmail', auth: { user: 'goudenceuwimpuhwe47@gmail.com', pass: 'yuwhtxwxonnzdmvz' }});
        await transporter.sendMail({
          from: 'Medication Ordering System <goudenceuwimpuhwe47@gmail.com>',
          to: email,
          subject: `Invoice for Order #${orderId}`,
          html: `<p>Hello,</p><p>Your invoice for Order #${orderId} is ready.</p><ul>
            <li>Method: ${String(method)}</li>
            <li>Medicine: ${med.toFixed(2)}</li>
            <li>Doctor: ${d.toFixed(2)}</li>
            <li>Service: ${s.toFixed(2)}</li>
            <li>Delivery: ${del.toFixed(2)}</li>
            <li><strong>Total: ${tot.toFixed(2)}</strong></li>
          </ul><p>Please log in to pay your invoice.</p>`
        });
      }
    } catch {}
    res.json({ ok: true });
  } catch (e) {
    console.error('invoice error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: cancel a sent invoice (only if not yet paid) so a new one can be generated
router.patch('/:id/invoice/cancel', auth, requireRole('admin'), async (req, res) => {
  try {
    const orderId = req.params.id;
    const [rows] = await pool.query('SELECT id, user_id, invoice_status, payment_status FROM orders WHERE id=?', [orderId]);
    const order = rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const inv = String(order.invoice_status || '').toLowerCase();
    const pay = String(order.payment_status || '').toLowerCase();
    if (pay === 'confirmed' || inv === 'paid') {
      return res.status(400).json({ error: 'Cannot cancel a paid invoice' });
    }
    if (inv !== 'sent') {
      // Nothing to cancel; treat as idempotent success
      return res.json({ ok: true, orderId: Number(orderId) });
    }

    await pool.query(
      `UPDATE orders SET 
         invoice_status='draft',
         invoice_method=NULL,
         invoice_medicine_total=NULL,
         invoice_doctor_fee=NULL,
         invoice_service_fee=NULL,
         invoice_delivery_fee=NULL,
         invoice_total=NULL,
         invoice_sent_at=NULL,
         invoice_paid_at=NULL
       WHERE id=?`,
      [orderId]
    );

    // Notify patient (persist + realtime)
    try {
      await pool.query(
        `INSERT INTO notifications (recipient_id, recipient_type, title, message, status, order_id)
         VALUES (?, 'patient', ?, ?, 'unread', ?)`,
        [order.user_id, `Invoice canceled for Order #${orderId}`, `The previous invoice was canceled. You'll receive a new invoice shortly.`, orderId]
      );
    } catch (err) { console.warn('patient notification (invoice cancel) insert failed', err?.message || err); }
    try {
      const emitToUser = req.app.get('emitToUser');
      emitToUser && emitToUser('patient', order.user_id, 'order:invoice_canceled', { orderId: Number(orderId) });
    } catch {}

    res.json({ ok: true, orderId: Number(orderId) });
  } catch (e) {
    console.error('invoice cancel error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Patient: pay invoice (simple confirmation flow)
router.post('/:id/pay', auth, requireRole('patient'), async (req, res) => {
  try {
    const orderId = req.params.id;
    const [rows] = await pool.query('SELECT * FROM orders WHERE id=? AND user_id=?', [orderId, req.user.id]);
    const order = rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.invoice_status !== 'sent') return res.status(400).json({ error: 'No pending invoice' });
    await pool.query('UPDATE orders SET payment_status="confirmed", invoice_status="paid", invoice_paid_at=NOW() WHERE id=?', [orderId]);
  // notify admin(s) and provider
    try {
      const emitToAdmins = req.app.get('emitToAdmins');
      emitToAdmins && emitToAdmins('order:payment_received', { orderId: Number(orderId) });
      const emitToUser = req.app.get('emitToUser');
      if (order.provider_id) emitToUser && emitToUser('provider', order.provider_id, 'order:payment_received', { orderId: Number(orderId) });
      // also notify patient for consistency
      emitToUser && emitToUser('patient', order.user_id, 'order:payment_received', { orderId: Number(orderId) });
    } catch {}
  // Create admin notifications in MySQL
    try {
      const [admins] = await pool.query("SELECT id FROM users WHERE LOWER(role)='admin'");
      for (const a of admins) {
        await pool.query(
          `INSERT INTO notifications (recipient_id, recipient_type, title, message, status, order_id)
           VALUES (?, 'admin', ?, ?, 'unread', ?)`,
          [a.id, `Payment received for Order #${orderId}`, `Order #${orderId} has been paid.`, orderId]
        );
      }
    } catch (err) { console.warn('admin notification insert failed', err?.message || err); }
    res.json({ ok: true });
  } catch (e) {
    console.error('pay error', e);
    res.status(500).json({ error: 'Server error' });
  }
});
