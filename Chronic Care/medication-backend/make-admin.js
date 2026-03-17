/**
 * make-admin.js
 * Creates or updates the admin account in the medication_system database.
 * Run once: node make-admin.js
 */
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./db');

async function main() {
  const email = 'goudenceuwimpuhwe47@gmail.com';
  const password = '123456';
  const firstName = 'Uwimpuhwe';
  const lastName = 'Gaudence';
  const username = 'goudenceadmin';
  const idCard = '1199980123456789'; // 16-digit placeholder – update if needed
  const role = 'Admin';

  try {
    const hashed = await bcrypt.hash(password, 10);

    // Check if user already exists by email
    const [existing] = await pool.query('SELECT id, role, email FROM users WHERE email = ? LIMIT 1', [email]);

    if (existing.length > 0) {
      // Update existing user to Admin
      await pool.query(
        `UPDATE users
           SET role = ?, password = ?, is_verified = 1,
               verification_code = NULL, verification_expires = NULL,
               first_name = ?, last_name = ?, status = 'active',
               verification_status = 'verified'
         WHERE email = ?`,
        [role, hashed, firstName, lastName, email]
      );
      console.log(`✅ User with email "${email}" updated to Admin role and password reset.`);
    } else {
      // Insert new admin user
      await pool.query(
        `INSERT INTO users
           (first_name, last_name, id_card, phone, username, email, password, role,
            is_verified, verification_code, verification_expires, status, verification_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, NULL, 'active', 'verified')`,
        [firstName, lastName, idCard, '0780000000', username, email, hashed, role]
      );
      console.log(`✅ New Admin user created with email "${email}".`);
    }

    // Verify
    const [result] = await pool.query('SELECT id, email, role, is_verified FROM users WHERE email = ?', [email]);
    console.log('Admin user record:', result[0]);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

main();
