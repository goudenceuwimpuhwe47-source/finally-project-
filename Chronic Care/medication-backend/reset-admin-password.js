const pool = require('./db');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
  try {
    // Find admin user
    const [admins] = await pool.query(
      `SELECT id, username, email, role, is_verified FROM users WHERE LOWER(role) = 'admin'`
    );
    
    if (admins.length === 0) {
      console.log('❌ No admin user found in database!');
      console.log('\nCreating a default admin account...');
      
      // Create admin account with default credentials
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        `INSERT INTO users (username, email, password, role, is_verified, first_name, last_name, id_card) 
         VALUES ('admin', 'admin@chroniccare.com', ?, 'admin', true, 'Admin', 'User', '1000000000000000')`,
        [hashedPassword]
      );
      
      console.log('✅ Admin account created!');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   Email: admin@chroniccare.com');
      
    } else {
      const admin = admins[0];
      console.log('📊 Current Admin User:');
      console.log(`   Username: ${admin.username}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Is Verified: ${admin.is_verified ? 'YES' : 'NO'}`);
      console.log('');
      
      // Reset password to 'admin123'
      const newPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await pool.query(
        `UPDATE users SET password = ?, is_verified = true WHERE id = ?`,
        [hashedPassword, admin.id]
      );
      
      console.log('✅ Admin password has been reset!');
      console.log(`   Username: ${admin.username}`);
      console.log(`   New Password: ${newPassword}`);
      console.log('   Is Verified: YES');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

resetAdminPassword();
