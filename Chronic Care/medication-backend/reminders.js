const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const { sendEmail } = require('./email');

const router = express.Router();

// Simple auth middleware
function auth(requiredRoles = []) {
	return (req, res, next) => {
		try {
			const token = (req.headers.authorization || '').replace('Bearer ', '');
			const payload = jwt.verify(token, process.env.JWT_SECRET || 'your_secret');
			req.user = { id: payload.id, role: String(payload.role || '').toLowerCase(), email: payload.email };
			if (requiredRoles.length && !requiredRoles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
			next();
		} catch {
			res.status(401).json({ error: 'Unauthorized' });
		}
	};
}

// Provider or Doctor creates a reminder schedule
router.post('/reminders', auth(['provider', 'doctor']), async (req, res) => {
	try {
		const providerId = req.user.role === 'provider' ? req.user.id : null;
		const { patient_id, order_id, prescription_id, frequency_per_day, times, start_date, end_date, dosage } = req.body;
		if (!patient_id || !order_id || !frequency_per_day || !Array.isArray(times) || !start_date || !end_date) {
			return res.status(400).json({ error: 'Missing fields' });
		}
		const timesSan = times.filter(t => /^\d{2}:\d{2}$/.test(String(t))).slice(0, 4);
		if (timesSan.length === 0) return res.status(400).json({ error: 'Invalid times' });

		const [r] = await pool.query(
			`INSERT INTO medication_reminders (patient_id, order_id, prescription_id, provider_id, frequency_per_day, dosage, times_json, start_date, end_date)
			 VALUES (?,?,?,?,?,?,?,?,?)`,
			[patient_id, order_id, prescription_id, providerId, Number(frequency_per_day), dosage || null, JSON.stringify(timesSan), start_date, end_date]
		);
		const reminderId = r.insertId;

		// Pre-generate reminder events for each day
		const start = new Date(`${start_date}T00:00:00`);
		const end = new Date(`${end_date}T00:00:00`);
		for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
			for (const t of timesSan) {
				const [hh, mm] = t.split(':').map(Number);
				const whenAt = new Date(d);
				whenAt.setHours(hh, mm, 0, 0);
				await pool.query(
					`INSERT INTO medication_reminder_events (reminder_id, patient_id, order_id, prescription_id, when_at, dosage)
					 VALUES (?,?,?,?,?,?)`,
					[reminderId, patient_id, order_id, prescription_id, whenAt, dosage || null]
				);
			}
		}
		// Emit socket event
		try { req.app.get('emitToUser')('patient', patient_id, 'alert:scheduled', { reminderId }); } catch {}
		res.json({ ok: true, id: reminderId });
	} catch (e) {
		console.error('POST /reminders error', e.message);
		res.status(500).json({ error: 'Server error' });
	}
});

	// Provider: list my reminders (optional filters patient_id/order_id)
	router.get('/provider/reminders', auth(['provider']), async (req, res) => {
		try {
			const providerId = req.user.id;
			const patientId = req.query.patient_id ? Number(req.query.patient_id) : null;
			const orderId = req.query.order_id ? Number(req.query.order_id) : null;
			const params = [providerId];
			let where = 'WHERE r.provider_id=?';
			if (patientId) { where += ' AND r.patient_id=?'; params.push(patientId); }
			if (orderId) { where += ' AND r.order_id=?'; params.push(orderId); }
			const [rows] = await pool.query(
				`SELECT r.*, p.medicine_name,
						(SELECT COUNT(*) FROM medication_reminder_events e WHERE e.reminder_id=r.id AND e.status='pending') AS pending_events,
						(SELECT COUNT(*) FROM medication_reminder_events e WHERE e.reminder_id=r.id AND e.status='sent') AS sent_events,
						(SELECT COUNT(*) FROM medication_reminder_events e WHERE e.reminder_id=r.id AND e.status='taken') AS taken_events
				 FROM medication_reminders r
				 LEFT JOIN prescriptions p ON p.id=r.prescription_id
				 ${where}
				 ORDER BY r.created_at DESC`,
				params
			);
			res.json({ reminders: rows });
		} catch (e) {
			console.error('GET /alerts/provider/reminders error', e.message);
			res.status(500).json({ error: 'Server error' });
		}
	});

	// Provider: cancel a reminder (set status=canceled and skip future pending events)
	router.patch('/:id/cancel', auth(['provider']), async (req, res) => {
		try {
			const id = Number(req.params.id);
			const providerId = req.user.id;
			const [rows] = await pool.query('SELECT id FROM medication_reminders WHERE id=? AND provider_id=?', [id, providerId]);
			if (!rows.length) return res.status(404).json({ error: 'Not found' });
			await pool.query("UPDATE medication_reminders SET status='canceled' WHERE id=?", [id]);
			await pool.query("UPDATE medication_reminder_events SET status='skipped' WHERE reminder_id=? AND status='pending' AND when_at >= NOW()", [id]);
			res.json({ ok: true });
		} catch (e) {
			console.error('PATCH /alerts/:id/cancel error', e.message);
			res.status(500).json({ error: 'Server error' });
		}
	});

	// Provider: delete a reminder (hard delete, cascades events via FK)
	router.delete('/:id', auth(['provider']), async (req, res) => {
		try {
			const id = Number(req.params.id);
			const providerId = req.user.id;
			const [r] = await pool.query('DELETE FROM medication_reminders WHERE id=? AND provider_id=?', [id, providerId]);
			if (r.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
			res.json({ ok: true });
		} catch (e) {
			console.error('DELETE /alerts/:id error', e.message);
			res.status(500).json({ error: 'Server error' });
		}
	});

// Patient lists their alerts
router.get('/my', auth(['patient']), async (req, res) => {
	try {
		const patientId = req.user.id;
		const page = Math.max(1, Number(req.query.page || 1));
		const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 10)));
		const offset = (page - 1) * pageSize;
		const [rows] = await pool.query(
			`SELECT e.id, e.when_at, e.status, e.order_id, e.prescription_id,
							p.medicine_name, p.dosage, p.frequency_per_day
				 FROM medication_reminder_events e
		LEFT JOIN prescriptions p ON p.id = e.prescription_id
				WHERE e.patient_id=?
				ORDER BY e.when_at DESC
				LIMIT ? OFFSET ?`,
			[patientId, pageSize, offset]
		);
		const [cnt] = await pool.query(`SELECT COUNT(*) AS c FROM medication_reminder_events WHERE patient_id=?`, [patientId]);
		res.json({ alerts: rows, total: cnt[0].c });
	} catch (e) {
		console.error('GET /alerts/my error', e.message);
		res.status(500).json({ error: 'Server error' });
	}
});

// Patient reminder schedules (Master schedule view)
router.get('/my/schedules', auth(['patient']), async (req, res) => {
	try {
		const patientId = req.user.id;
		const [rows] = await pool.query(
			`SELECT r.*, p.medicine_name
				 FROM medication_reminders r
				 LEFT JOIN prescriptions p ON p.id = r.prescription_id
				WHERE r.patient_id=?
				ORDER BY r.created_at DESC`,
			[patientId]
		);
		res.json({ schedules: rows });
	} catch (e) {
		console.error('GET /alerts/my/schedules error', e.message);
		res.status(500).json({ error: 'Server error' });
	}
});

// Patient next alert (only one at a time: due or within next 2 minutes)
router.get('/my/next', auth(['patient']), async (req, res) => {
	try {
		const patientId = req.user.id;
		const [rows] = await pool.query(
			`SELECT e.id, e.when_at, e.status, e.order_id, e.prescription_id,
							p.medicine_name, p.dosage, p.frequency_per_day
				 FROM medication_reminder_events e
				 LEFT JOIN prescriptions p ON p.id = e.prescription_id
				WHERE e.patient_id=?
					AND e.status IN ('pending','sent')
					AND e.when_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
				ORDER BY (e.status='sent') DESC, e.when_at ASC
				LIMIT 1`,
			[patientId]
		);
		const alert = rows?.[0] || null;
		res.json({ alert });
	} catch (e) {
		console.error('GET /alerts/my/next error', e.message);
		res.status(500).json({ error: 'Server error' });
	}
});

// Patient medication history (last 5 status-changed events)
router.get('/my/history', auth(['patient']), async (req, res) => {
	try {
		const patientId = req.user.id;
		const [rows] = await pool.query(
			`SELECT e.id, e.when_at, e.status, e.order_id, e.prescription_id,
							p.medicine_name, p.dosage, p.frequency_per_day
				 FROM medication_reminder_events e
				 LEFT JOIN prescriptions p ON p.id = e.prescription_id
				WHERE e.patient_id=?
					AND e.status IN ('taken', 'missed', 'skipped')
				ORDER BY e.when_at DESC
				LIMIT 5`,
			[patientId]
		);
		res.json({ history: rows });
	} catch (e) {
		console.error('GET /alerts/my/history error', e.message);
		res.status(500).json({ error: 'Server error' });
	}
});

// Patient alerts count (exact, for sidebar badge)
router.get('/my/count', auth(['patient']), async (req, res) => {
	try {
		const patientId = req.user.id;
		const [rows] = await pool.query(
			`SELECT
				 SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending,
				 COUNT(*) AS total
			 FROM medication_reminder_events
			 WHERE patient_id=?`,
			[patientId]
		);
		const pending = Number(rows?.[0]?.pending || 0);
		const total = Number(rows?.[0]?.total || 0);
		res.json({ pending, total });
	} catch (e) {
		console.error('GET /alerts/my/count error', e.message);
		res.status(500).json({ error: 'Server error' });
	}
});

// Patient marks alert taken
router.post('/:id/mark-taken', auth(['patient']), async (req, res) => {
	try {
		const id = Number(req.params.id);
		const patientId = req.user.id;
		const [r] = await pool.query(`UPDATE medication_reminder_events SET status='taken' WHERE id=? AND patient_id=?`, [id, patientId]);
		if (r.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
		res.json({ ok: true });
	} catch (e) {
		console.error('POST /alerts/:id/mark-taken error', e.message);
		res.status(500).json({ error: 'Server error' });
	}
});

// Lightweight scheduler to send emails and socket alerts when due (with 2-min pre-alert)
let schedulerStarted = false;
async function tick(app) {
	const now = new Date();
	// Pre-alerts: events pending within next 2 minutes and not yet prealerted
	const [preDue] = await pool.query(
		`SELECT e.id, e.patient_id, e.when_at, e.prealert_sent, u.email, p.medicine_name
		 FROM medication_reminder_events e
		 LEFT JOIN users u ON u.id = e.patient_id
		 LEFT JOIN prescriptions p ON p.id = e.prescription_id
		 JOIN medication_reminders r ON r.id = e.reminder_id AND r.status='active'
		 WHERE e.status='pending' AND e.prealert_sent=0 AND e.when_at > ? AND e.when_at <= DATE_ADD(?, INTERVAL 2 MINUTE)`,
		[now, now]
	);
	for (const ev of preDue) {
		try {
			// set prealert_sent first to avoid duplicate
			await pool.query(`UPDATE medication_reminder_events SET prealert_sent=1 WHERE id=? AND prealert_sent=0`, [ev.id]);
			// socket early warning
			try { app.get('emitToUser')('patient', ev.patient_id, 'alert:upcoming', { id: ev.id, when_at: ev.when_at, medicine_name: ev.medicine_name, minutes: 2 }); } catch {}
			// email early reminder
			if (ev.email) {
				const subj = `Upcoming in 2 min: ${ev.medicine_name || 'Medication'}`;
				const html = `<div style="font-family: Arial, sans-serif; color: #222;">
				  <h2>${subj}</h2>
				  <p>This is a heads-up that your medication time is in about 2 minutes.</p>
				  <p><small>${new Date(ev.when_at).toLocaleString()}</small></p>
				</div>`;
				await sendEmail(ev.email, subj, html);
			}
		} catch (e) {
			console.error('pre-alert failed', e?.message || e);
		}
	}

	// On-time: events due now or past and still pending
	const [due] = await pool.query(
		`SELECT e.*, u.email, p.medicine_name
		 FROM medication_reminder_events e
		 LEFT JOIN users u ON u.id = e.patient_id
		 LEFT JOIN prescriptions p ON p.id = e.prescription_id
		 JOIN medication_reminders r ON r.id = e.reminder_id AND r.status='active'
		 WHERE e.status='pending' AND e.when_at <= ?`,
		[now]
	);
	for (const ev of due) {
		try {
			// Mark as sent first (idempotent protection)
			await pool.query(`UPDATE medication_reminder_events SET status='sent' WHERE id=? AND status='pending'`, [ev.id]);
			// Socket alert to patient
			try { app.get('emitToUser')('patient', ev.patient_id, 'alert:due', { id: ev.id, when_at: ev.when_at, medicine_name: ev.medicine_name }); } catch {}
			// Optional: admin or provider notify of email sent
			try { app.get('emitToUser')('patient', ev.patient_id, 'alert:email_sent', { id: ev.id }); } catch {}
			// Email the patient
			if (ev.email) {
				const subj = `Time to take your medicine: ${ev.medicine_name || 'Medication'}`;
				const html = `<div style="font-family: Arial, sans-serif; color: #222;">
					<h2>${subj}</h2>
					<p>This is your scheduled reminder.</p>
					<p>Please take your medication now.</p>
					<p><small>Order #${ev.order_id} • Prescription #${ev.prescription_id} • ${new Date(ev.when_at).toLocaleString()}</small></p>
				</div>`;
				await sendEmail(ev.email, subj, html);
			}
		} catch (e) {
			console.error('on-time alert failed', e?.message || e);
		}
	}
}

function startScheduler(app) {
	if (schedulerStarted) return;
	schedulerStarted = true;
	setInterval(() => tick(app).catch(()=>{}), 60 * 1000);
}

module.exports = router;
module.exports.startScheduler = startScheduler;
