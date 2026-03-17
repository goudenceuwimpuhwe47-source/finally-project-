const pool = require('./db');
const bcrypt = require('bcryptjs');

async function checkAdmin() {
  try {
    const [admins] = await pool.query(
      `SELECT id, username, email, password, role, is_verified FROM users WHERE LOWER(role) = 'admin'`
    );
    
    if (admins.length === 0) {
      console.log('❌ No admin user found in database!');
      process.exit(1);
    }
    
    console.log('📊 Admin User Details:');
    console.log('======================');
    admins.forEach(admin => {
      console.log(`ID: ${admin.id}`);
      console.log(`Username: ${admin.username}`);
      console.log(`Email: ${admin.email}`);
      console.log(`Role: ${admin.role}`);
      console.log(`Is Verified: ${admin.is_verified ? 'YES ✅' : 'NO ❌'}`);
      console.log(`Password Hash: ${admin.password.substring(0, 20)}...`);
      console.log('');
    });
    
    // Test password
    console.log('\n🔐 Password Test:');
    console.log('Enter the password you are trying to use:');
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('Password: ', async (testPassword) => {
      const admin = admins[0];
      const match = await bcrypt.compare(testPassword, admin.password);
      console.log(`\nPassword Match: ${match ? 'YES ✅' : 'NO ❌'}`);
      
      if (!match) {
        console.log('\n⚠️  The password you entered does NOT match the database hash.');
        console.log('You may need to reset the admin password.');
      }
      
      readline.close();
      process.exit(0);
    });
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkAdmin();
