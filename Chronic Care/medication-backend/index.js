const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./db');

const app = express();
const server = http.createServer(app);

// Simple Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(cors());
app.use(express.json());
// static files for uploaded certificates (read-only)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test route
app.get('/', (req, res) => {
  res.send('Medication Ordering System API is running!');
});

const authRoutes = require('./auth');
app.use('/auth', authRoutes);
const orderRoutes = require('./orders');
const paymentsRouter = require('./payments');
const stockRoutes = require('./stock');
app.use('/orders', orderRoutes);
app.use('/payments', paymentsRouter);
app.use('/stock', stockRoutes);
const adminRoutes = require('./admin');
app.use('/admin', adminRoutes);
const { router: chatRoutes } = require('./chat');
app.use('/', chatRoutes);
const notificationsRoutes = require('./notifications');
app.use('/notifications', notificationsRoutes);
const remindersRoutes = require('./reminders');
app.use('/alerts', remindersRoutes);
const healthRoutes = require('./health');
app.use('/health', healthRoutes);
const usersRoutes = require('./users');
app.use('/users', usersRoutes);


async function ensureSchema() {

  // ── STEP 0: Create core tables first (everything else depends on these) ──

  // orders — must exist before any ALTER or FK references
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        id_card VARCHAR(32) NOT NULL,
        phone VARCHAR(32) NOT NULL,
        district VARCHAR(128) NOT NULL,
        sector VARCHAR(128) NOT NULL,
        cell VARCHAR(128) NOT NULL,
        village VARCHAR(128) NOT NULL,
        disease VARCHAR(64) NOT NULL,
        dosage VARCHAR(32) NOT NULL,
        age INT NOT NULL,
        gender VARCHAR(16) NOT NULL,
        payment_method VARCHAR(32) NOT NULL,
        medical_certificate LONGTEXT NULL,
        medicine_name VARCHAR(255) NULL,
        prescription_quantity VARCHAR(64) NULL,
        doctor_instructions TEXT NULL,
        doctor_advice TEXT NULL,
        adherence_plan TEXT NULL,
        doctor_reject_reason TEXT NULL,
        canceled TINYINT(1) NOT NULL DEFAULT 0,
        admin_status ENUM('pending','under_review','approved','rejected') DEFAULT 'pending',
        admin_reject_reason TEXT NULL,
        doctor_status ENUM('pending','approved','rejected') DEFAULT 'pending',
        doctor_id INT NULL,
        provider_id INT NULL,
        provider_status ENUM('unassigned','assigned','rejected') NOT NULL DEFAULT 'unassigned',
        provider_reject_reason TEXT NULL,
        provider_confirmed TINYINT(1) NOT NULL DEFAULT 0,
        provider_confirmed_qty INT NULL,
        provider_confirmed_price DECIMAL(10,2) NULL,
        provider_stock_id INT NULL,
        provider_note TEXT NULL,
        payment_status ENUM('pending','confirmed','approved','failed') DEFAULT 'pending',
        pharmacy_status ENUM('pending','ready_pickup','ready_delivery','dispatched','delivered') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_doctor (doctor_id),
        INDEX idx_provider (provider_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Ensured orders table with full schema');
  } catch (e) {
    console.error('Ensure orders table failed:', e.message);
  }

  // ── STEP 1: ALTERs to add columns that may be missing from orders (Robust Migration) ──
  try {
    const ordersCols = [
      { name: 'doctor_id', ddl: "ALTER TABLE orders ADD COLUMN doctor_id INT NULL AFTER doctor_status" },
      { name: 'provider_id', ddl: "ALTER TABLE orders ADD COLUMN provider_id INT NULL AFTER doctor_id" },
      { name: 'medicine_name', ddl: "ALTER TABLE orders ADD COLUMN medicine_name VARCHAR(255) NULL AFTER medical_certificate" },
      { name: 'prescription_quantity', ddl: "ALTER TABLE orders ADD COLUMN prescription_quantity VARCHAR(64) NULL AFTER medicine_name" },
      { name: 'doctor_instructions', ddl: "ALTER TABLE orders ADD COLUMN doctor_instructions TEXT NULL AFTER prescription_quantity" },
      { name: 'doctor_advice', ddl: "ALTER TABLE orders ADD COLUMN doctor_advice TEXT NULL AFTER doctor_instructions" },
      { name: 'adherence_plan', ddl: "ALTER TABLE orders ADD COLUMN adherence_plan TEXT NULL AFTER doctor_advice" },
      { name: 'doctor_reject_reason', ddl: "ALTER TABLE orders ADD COLUMN doctor_reject_reason TEXT NULL AFTER adherence_plan" },
      { name: 'admin_reject_reason', ddl: "ALTER TABLE orders ADD COLUMN admin_reject_reason TEXT NULL AFTER admin_status" },
      { name: 'provider_status', ddl: "ALTER TABLE orders ADD COLUMN provider_status ENUM('unassigned','assigned','rejected') NOT NULL DEFAULT 'unassigned' AFTER provider_id" },
      { name: 'provider_reject_reason', ddl: "ALTER TABLE orders ADD COLUMN provider_reject_reason TEXT NULL AFTER provider_status" },
      { name: 'provider_confirmed', ddl: "ALTER TABLE orders ADD COLUMN provider_confirmed TINYINT(1) NOT NULL DEFAULT 0 AFTER provider_reject_reason" },
      { name: 'provider_confirmed_qty', ddl: "ALTER TABLE orders ADD COLUMN provider_confirmed_qty INT NULL AFTER provider_confirmed" },
      { name: 'provider_confirmed_price', ddl: "ALTER TABLE orders ADD COLUMN provider_confirmed_price DECIMAL(10,2) NULL AFTER provider_confirmed_qty" },
      { name: 'provider_stock_id', ddl: "ALTER TABLE orders ADD COLUMN provider_stock_id INT NULL AFTER provider_confirmed_price" },
      { name: 'provider_note', ddl: "ALTER TABLE orders ADD COLUMN provider_note TEXT NULL AFTER provider_stock_id" },
      { name: 'invoice_status', ddl: "ALTER TABLE orders ADD COLUMN invoice_status ENUM('draft','sent','paid') NULL AFTER provider_note" },
      { name: 'invoice_method', ddl: "ALTER TABLE orders ADD COLUMN invoice_method ENUM('online','home_delivery','pharmacy_pickup') NULL AFTER invoice_status" },
      { name: 'invoice_medicine_total', ddl: "ALTER TABLE orders ADD COLUMN invoice_medicine_total DECIMAL(10,2) NULL AFTER invoice_method" },
      { name: 'invoice_doctor_fee', ddl: "ALTER TABLE orders ADD COLUMN invoice_doctor_fee DECIMAL(10,2) NULL AFTER invoice_medicine_total" },
      { name: 'invoice_service_fee', ddl: "ALTER TABLE orders ADD COLUMN invoice_service_fee DECIMAL(10,2) NULL AFTER invoice_doctor_fee" },
      { name: 'invoice_delivery_fee', ddl: "ALTER TABLE orders ADD COLUMN invoice_delivery_fee DECIMAL(10,2) NULL AFTER invoice_service_fee" },
      { name: 'invoice_total', ddl: "ALTER TABLE orders ADD COLUMN invoice_total DECIMAL(10,2) NULL AFTER invoice_delivery_fee" },
      { name: 'invoice_sent_at', ddl: "ALTER TABLE orders ADD COLUMN invoice_sent_at DATETIME NULL AFTER invoice_total" },
      { name: 'invoice_paid_at', ddl: "ALTER TABLE orders ADD COLUMN invoice_paid_at DATETIME NULL AFTER invoice_sent_at" },
      { name: 'medical_certificate_longtext', ddl: "ALTER TABLE orders MODIFY COLUMN medical_certificate LONGTEXT NULL" }
    ];

    for (const col of ordersCols) {
      try {
        await pool.query(col.ddl);
        console.log(`Successfully added missing column '${col.name}' to orders`);
      } catch (err) {
        // Error code 'ER_DUP_FIELDNAME' means column already exists, which is fine
        if (err.code === 'ER_DUP_FIELDNAME') {
          // Skip logging common already-exists messages to avoid spam
        } else {
          console.error(`Migration error on '${col.name}':`, err.message);
        }
      }
    }
  } catch (e) {
    console.error('Core migration failed:', e.message);
  }

  // Ensure messages table exists
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        from_user_id INT NOT NULL,
        from_role ENUM('patient','provider','doctor','admin') NOT NULL,
        to_user_id INT NULL,
        to_role ENUM('patient','provider','doctor','admin') NOT NULL,
        content TEXT NOT NULL,
        status ENUM('sent','delivered','read') NOT NULL DEFAULT 'sent',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_from (from_user_id, from_role),
        INDEX idx_to (to_user_id, to_role),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (e) {
    console.error('Ensure messages table failed:', e.message);
  }

  // Ensure messages table exists

  // Ensure provider stock tables exist
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS provider_stock (
        id INT AUTO_INCREMENT PRIMARY KEY,
        provider_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(64) NULL,
        quantity INT NOT NULL DEFAULT 0,
        unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        mfg_date DATE NULL,
        exp_date DATE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_provider (provider_id),
        INDEX idx_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS provider_stock_moves (
        id INT AUTO_INCREMENT PRIMARY KEY,
        provider_id INT NOT NULL,
        stock_id INT NOT NULL,
        type ENUM('in','out','adjust') NOT NULL,
        quantity INT NOT NULL,
        note VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_provider (provider_id),
        INDEX idx_stock (stock_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (e) {
    console.error('Ensure provider stock tables failed:', e.message);
  }

  // Ensure MoMo payments table exists
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS momo_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        reference_id VARCHAR(64) NOT NULL UNIQUE,
        msisdn VARCHAR(32) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(8) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        raw_json JSON NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        INDEX (order_id),
        CONSTRAINT fk_momo_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Ensured momo_payments table');
  } catch (e) {
    console.error('Ensure momo_payments table failed:', e.message);
  }

  // Ensure notifications table exists (MySQL-based persistence replacing Supabase)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipient_id INT NOT NULL,
        recipient_type ENUM('patient','provider','doctor','admin') NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status ENUM('unread','read') NOT NULL DEFAULT 'unread',
        order_id INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_recipient (recipient_type, recipient_id),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (e) {
    console.error('Ensure notifications table failed:', e.message);
  }

  // Ensure users table exists (core table required before any optional columns)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        id_card VARCHAR(32) NOT NULL UNIQUE,
        phone VARCHAR(32) NULL,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('Patient','Provider','Doctor','Admin') NOT NULL DEFAULT 'Patient',
        date_of_birth DATE NULL,
        gender VARCHAR(16) NULL,
        province VARCHAR(128) NULL,
        district VARCHAR(128) NULL,
        sector VARCHAR(128) NULL,
        cell VARCHAR(128) NULL,
        village VARCHAR(128) NULL,
        profile_photo VARCHAR(255) NULL DEFAULT '',
        is_verified TINYINT(1) NOT NULL DEFAULT 0,
        verification_code VARCHAR(10) NULL,
        verification_expires DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_username (username),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Ensured users table');
  } catch (e) {
    console.error('Ensure users table failed:', e.message);
  }

  // Ensure users optional columns referenced by admin endpoints exist (Robust Migration)
  try {
    const userCols = [
      { name: 'address', ddl: "ALTER TABLE users ADD COLUMN address VARCHAR(255) NULL" },
      { name: 'license_number', ddl: "ALTER TABLE users ADD COLUMN license_number VARCHAR(64) NULL" },
      { name: 'delivery_radius', ddl: "ALTER TABLE users ADD COLUMN delivery_radius INT NULL" },
      { name: 'status', ddl: "ALTER TABLE users ADD COLUMN status ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active'" },
      { name: 'verification_status', ddl: "ALTER TABLE users ADD COLUMN verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending'" },
      { name: 'specialty', ddl: "ALTER TABLE users ADD COLUMN specialty VARCHAR(128) NULL" },
      { name: 'hospital_affiliation', ddl: "ALTER TABLE users ADD COLUMN hospital_affiliation VARCHAR(255) NULL" }
    ];

    for (const col of userCols) {
      try {
        await pool.query(col.ddl);
        console.log(`Successfully added missing column '${col.name}' to users`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          // Skip
        } else {
          console.error(`Migration error on users.'${col.name}':`, err.message);
        }
      }
    }
  } catch (e) {
    console.error('Users migration failed:', e.message);
  }

  // Ensure reports table exists for admin analytics
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('patient_engagement','medication_usage','provider_activity') NOT NULL,
        title VARCHAR(255) NOT NULL,
        data JSON NULL,
        generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by INT NULL,
        INDEX idx_type (type),
        INDEX idx_generated (generated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (e) {
    console.error('Ensure reports table failed:', e.message);
  }

  // Ensure settings key/value table exists and defaults are seeded
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        key_name VARCHAR(64) NOT NULL UNIQUE,
        value_json JSON NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    // Seed defaults if missing
    const defaults = [
      ['email_notifications_enabled', JSON.stringify(true)],
      ['backup_schedule_cron', JSON.stringify('')],
      ['require_2fa', JSON.stringify(false)],
    ];
    for (const [k, v] of defaults) {
      try {
        const [rows] = await pool.query('SELECT id FROM settings WHERE key_name=? LIMIT 1', [k]);
        if (!rows.length) await pool.query('INSERT INTO settings (key_name, value_json) VALUES (?, ?)', [k, v]);
      } catch {}
    }
  } catch (e) {
    console.error('Ensure settings table failed:', e.message);
  }

  // Ensure prescriptions table exists
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NULL,
        patient_id INT NULL,
        provider_id INT NULL,
        medicine_name VARCHAR(255) NULL,
        quantity VARCHAR(64) NULL,
        instructions TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_order (order_id),
        INDEX idx_patient (patient_id),
        INDEX idx_provider (provider_id),
        CONSTRAINT fk_presc_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    // For pre-existing schemas, add any missing columns required by the API
    const dbName = process.env.DB_NAME;
    const needed = [
      { name: 'order_id', ddl: 'ALTER TABLE prescriptions ADD COLUMN order_id INT NULL' },
      { name: 'patient_id', ddl: 'ALTER TABLE prescriptions ADD COLUMN patient_id INT NULL' },
      { name: 'provider_id', ddl: 'ALTER TABLE prescriptions ADD COLUMN provider_id INT NULL' },
      { name: 'medicine_name', ddl: 'ALTER TABLE prescriptions ADD COLUMN medicine_name VARCHAR(255) NULL' },
      { name: 'quantity', ddl: 'ALTER TABLE prescriptions ADD COLUMN quantity VARCHAR(64) NULL' },
      { name: 'instructions', ddl: 'ALTER TABLE prescriptions ADD COLUMN instructions TEXT NULL' },
      { name: 'dosage', ddl: 'ALTER TABLE prescriptions ADD COLUMN dosage VARCHAR(128) NULL' },
      { name: 'frequency_per_day', ddl: 'ALTER TABLE prescriptions ADD COLUMN frequency_per_day INT NULL' },
      { name: 'quantity_units', ddl: 'ALTER TABLE prescriptions ADD COLUMN quantity_units INT NULL' },
      { name: 'duration_days', ddl: 'ALTER TABLE prescriptions ADD COLUMN duration_days INT NULL' },
      { name: 'status', ddl: "ALTER TABLE prescriptions ADD COLUMN status ENUM('active','completed','canceled') NOT NULL DEFAULT 'active'" },
    ];
    for (const col of needed) {
      try {
        const [chk] = await pool.query(
          "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='prescriptions' AND COLUMN_NAME=?",
          [dbName, col.name]
        );
        if ((chk?.[0]?.cnt || 0) === 0) {
          await pool.query(col.ddl);
        }
      } catch {}
    }
  } catch (e) {
    console.error('Ensure prescriptions table failed:', e.message);
  }

  // Ensure medication reminders tables exist
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS medication_reminders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        order_id INT NOT NULL,
        prescription_id INT NOT NULL,
        provider_id INT NULL,
        frequency_per_day INT NOT NULL,
        times_json JSON NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status ENUM('active','completed','canceled') NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_patient (patient_id),
        INDEX idx_order (order_id),
        INDEX idx_prescription (prescription_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS medication_reminder_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reminder_id INT NOT NULL,
        patient_id INT NOT NULL,
        order_id INT NOT NULL,
        prescription_id INT NOT NULL,
        when_at DATETIME NOT NULL,
        prealert_sent TINYINT(1) NOT NULL DEFAULT 0,
        status ENUM('pending','sent','taken','skipped') NOT NULL DEFAULT 'pending',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_reminder (reminder_id),
        INDEX idx_patient_when (patient_id, when_at),
        CONSTRAINT fk_rem_ev_rem FOREIGN KEY (reminder_id) REFERENCES medication_reminders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    // Add missing prealert_sent column if needed
    try {
      const dbName = process.env.DB_NAME;
      const [chkPre] = await pool.query(
        "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='medication_reminder_events' AND COLUMN_NAME='prealert_sent'",
        [dbName]
      );
      if ((chkPre?.[0]?.cnt || 0) === 0) {
        await pool.query("ALTER TABLE medication_reminder_events ADD COLUMN prealert_sent TINYINT(1) NOT NULL DEFAULT 0 AFTER when_at");
        console.log("Added 'prealert_sent' to medication_reminder_events");
      }
    } catch (e) { console.warn('prealert_sent migration warn:', e?.message || e); }
  } catch (e) {
    console.error('Ensure reminders tables failed:', e.message);
  }

  // Ensure provider stock tables exist
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        provider_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(64) NULL,
        quantity INT NOT NULL DEFAULT 0,
        price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        expiry_date DATE NULL,
        manufactured_date DATE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX idx_provider (provider_id),
        INDEX idx_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL,
        provider_id INT NOT NULL,
        type ENUM('in','out','adjust') NOT NULL,
        quantity INT NOT NULL,
        note VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_item (item_id),
        INDEX idx_provider (provider_id),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (e) {
    console.error('Ensure stock tables failed:', e.message);
  }
}

const PORT = process.env.PORT || 5000;
(async () => {
  await ensureSchema();
  // Initialize Socket.IO
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST', 'PATCH'] }
  });
  app.set('io', io);
  // Start reminders scheduler loop
  try { require('./reminders').startScheduler(app); } catch {}

  const JWT_SECRET = process.env.JWT_SECRET || 'your_secret';
  const userSockets = new Map(); // key: `${role}:${id}` -> Set(socketIds)
  // helper emitters
  const emitToUser = (role, id, event, payload) => {
    try {
      const set = userSockets.get(`${String(role).toLowerCase()}:${Number(id)}`);
      if (!set) return;
      for (const sid of set) io.to(sid).emit(event, payload);
    } catch {}
  };
  const emitToAdmins = (event, payload) => {
    try {
      for (const k of userSockets.keys()) if (k.startsWith('admin:')) for (const sid of userSockets.get(k)) io.to(sid).emit(event, payload);
    } catch {}
  };
  const isUserOnline = (role, id) => {
    try {
      const set = userSockets.get(`${String(role).toLowerCase()}:${Number(id)}`);
      return !!(set && set.size > 0);
    } catch { return false; }
  };
  app.set('emitToUser', emitToUser);
  app.set('emitToAdmins', emitToAdmins);
  app.set('isUserOnline', isUserOnline);

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers['x-auth-token'];
    if (!token) return next(new Error('no token'));
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      socket.user = { id: payload.id, role: String(payload.role || '').toLowerCase() };
      next();
    } catch (err) {
      next(new Error('bad token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.user;
    const key = `${role}:${id}`;
    if (!userSockets.has(key)) userSockets.set(key, new Set());
    userSockets.get(key).add(socket.id);

    // Broadcast presence updates
    try {
  if (role === 'admin') {
        // Any admin online?
        let adminOnline = false;
        for (const k of userSockets.keys()) if (k.startsWith('admin:') && userSockets.get(k).size > 0) { adminOnline = true; break; }
        io.emit('presence:update', { role: 'admin', online: adminOnline });
      } else if (role === 'patient') {
        io.emit('presence:update', { role: 'patient', userId: id, online: true });
      } else if (role === 'doctor') {
        io.emit('presence:update', { role: 'doctor', userId: id, online: true });
      } else if (role === 'provider') {
        io.emit('presence:update', { role: 'provider', userId: id, online: true });
      }
    } catch {}

    // Send a presence snapshot to the newly connected client so they know current online states
    try {
      let adminOnline = false;
      const onlineDoctors = [];
      for (const k of userSockets.keys()) {
        if (k.startsWith('admin:') && userSockets.get(k).size > 0) adminOnline = true;
        if (k.startsWith('doctor:') && userSockets.get(k).size > 0) {
          const docId = Number(k.split(':')[1]);
          if (Number.isFinite(docId)) onlineDoctors.push(docId);
        }
        // compute providers online as well
        // kept as a set to avoid duplicates
      }
      const onlineProviders = [];
      for (const k of userSockets.keys()) {
        if (k.startsWith('provider:') && userSockets.get(k).size > 0) {
          const provId = Number(k.split(':')[1]);
          if (Number.isFinite(provId)) onlineProviders.push(provId);
        }
      }
      io.to(socket.id).emit('presence:snapshot', { adminOnline, doctorsOnline: onlineDoctors, providersOnline: onlineProviders });
    } catch {}

    socket.on('disconnect', () => {
      const set = userSockets.get(key);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) userSockets.delete(key);
      }
      // Broadcast presence update on disconnect
      try {
        if (role === 'admin') {
          let adminOnline = false;
          for (const k of userSockets.keys()) if (k.startsWith('admin:') && userSockets.get(k).size > 0) { adminOnline = true; break; }
          io.emit('presence:update', { role: 'admin', online: adminOnline });
        } else if (role === 'patient') {
          io.emit('presence:update', { role: 'patient', userId: id, online: false });
        } else if (role === 'doctor') {
          io.emit('presence:update', { role: 'doctor', userId: id, online: false });
        } else if (role === 'provider') {
          io.emit('presence:update', { role: 'provider', userId: id, online: false });
        }
      } catch {}
    });

    // Send message
    socket.on('message:send', async (payload, cb) => {
      try {
        const from_user_id = id;
        const from_role = role;
        const to_user_id = payload.toUserId ?? null;
        const to_role = String(payload.toRole || '').toLowerCase();
        const content = String(payload.content || '').trim();
        if (!to_role || !content) return cb && cb({ error: 'Invalid payload' });

        const [result] = await pool.query(
          'INSERT INTO messages (from_user_id, from_role, to_user_id, to_role, content, status) VALUES (?,?,?,?,?,?)',
          [from_user_id, from_role, to_user_id, to_role, content, 'sent']
        );
        const message = {
          id: result.insertId,
          from_user_id,
          from_role,
          to_user_id,
          to_role,
          content,
          status: 'sent',
          created_at: new Date()
        };

        // Ack to sender
        cb && cb({ ok: true, message });

        // Determine recipient sockets
        const deliverTo = [];
        if (to_role === 'admin' && to_user_id == null) {
          for (const k of userSockets.keys()) {
            if (k.startsWith('admin:')) {
              for (const sid of userSockets.get(k)) deliverTo.push(sid);
            }
          }
        } else {
          const set = userSockets.get(`${to_role}:${to_user_id}`);
          if (set) for (const sid of set) deliverTo.push(sid);
        }

        // Emit to recipients
        for (const sid of deliverTo) io.to(sid).emit('message:new', message);

        if (deliverTo.length > 0) {
          await pool.query('UPDATE messages SET status="delivered" WHERE id=?', [message.id]);
          message.status = 'delivered';
          io.to(socket.id).emit('message:status', { id: message.id, status: 'delivered' });
        }
      } catch (err) {
        console.error('message:send error', err);
        cb && cb({ error: 'Server error' });
      }
    });

    // Mark read for a conversation
    socket.on('message:markRead', async (payload, cb) => {
      try {
        const counterpartyRole = String(payload.counterpartyRole || '').toLowerCase();
        const withUserId = payload.withUserId ?? null;
        if (!counterpartyRole) return cb && cb({ error: 'Invalid payload' });
        if (role === 'admin' && withUserId != null) {
          await pool.query(
            `UPDATE messages SET status='read'
             WHERE from_role='patient' AND to_role='admin' AND from_user_id=? AND status <> 'read'`,
            [withUserId]
          );
        } else if (role === 'patient' && counterpartyRole === 'admin') {
          await pool.query(
            `UPDATE messages SET status='read'
             WHERE from_role='admin' AND to_role='patient' AND to_user_id=? AND status <> 'read'`,
            [id]
          );
        } else if (role === 'patient' && counterpartyRole === 'doctor' && withUserId != null) {
          await pool.query(
            `UPDATE messages SET status='read'
             WHERE from_role='doctor' AND to_role='patient' AND to_user_id=? AND status <> 'read'`,
            [id]
          );
        } else if (role === 'doctor' && counterpartyRole === 'patient' && withUserId != null) {
          await pool.query(
            `UPDATE messages SET status='read'
             WHERE from_role='patient' AND to_role='doctor' AND to_user_id=? AND status <> 'read'`,
            [id]
          );
        }
        cb && cb({ ok: true });
      } catch (err) {
        console.error('message:markRead error', err);
        cb && cb({ error: 'Server error' });
      }
    });

    // Typing indicators
    socket.on('typing:start', (payload = {}) => {
      const toRole = String(payload.toRole || '').toLowerCase();
      const toUserId = payload.toUserId ?? null;
      if (!toRole) return;
      const event = { fromRole: role, fromUserId: id, toRole, toUserId };
      if (toRole === 'admin' && toUserId == null) {
        for (const k of userSockets.keys()) if (k.startsWith('admin:')) for (const sid of userSockets.get(k)) io.to(sid).emit('typing:start', event);
      } else {
        const set = userSockets.get(`${toRole}:${toUserId}`);
        if (set) for (const sid of set) io.to(sid).emit('typing:start', event);
      }
    });
    socket.on('typing:stop', (payload = {}) => {
      const toRole = String(payload.toRole || '').toLowerCase();
      const toUserId = payload.toUserId ?? null;
      if (!toRole) return;
      const event = { fromRole: role, fromUserId: id, toRole, toUserId };
      if (toRole === 'admin' && toUserId == null) {
        for (const k of userSockets.keys()) if (k.startsWith('admin:')) for (const sid of userSockets.get(k)) io.to(sid).emit('typing:stop', event);
      } else {
        const set = userSockets.get(`${toRole}:${toUserId}`);
        if (set) for (const sid of set) io.to(sid).emit('typing:stop', event);
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();