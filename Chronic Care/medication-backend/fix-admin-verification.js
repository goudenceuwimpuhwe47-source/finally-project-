const pool = require('./db');

async function fixAdminVerification() {
  try {
    // Update all admin users to be verified
    const [result] = await pool.query(
      `UPDATE users SET is_verified = true WHERE LOWER(role) = 'admin'`
    );
    
    console.log('✅ Admin verification fixed!');
    console.log(`   Updated ${result.affectedRows} admin user(s)`);
    
    // Show admin users
    const [admins] = await pool.query(
      `SELECT id, username, email, role, is_verified FROM users WHERE LOWER(role) = 'admin'`
    );
    
    console.log('\nAdmin users:');
    admins.forEach(admin => {
      console.log(`   - ${admin.username} (${admin.email}) - Verified: ${admin.is_verified ? 'YES' : 'NO'}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixAdminVerification();
