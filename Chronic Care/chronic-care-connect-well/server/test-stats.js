// Test script to check database statistics
const pool = require('./db');

async function testStats() {
  try {
    console.log('Testing database connection and statistics...\n');
    
    // Test connection
    const [connection] = await pool.query('SELECT 1 as test');
    console.log('✓ Database connection successful\n');
    
    // Check if users table exists
    const [tables] = await pool.query("SHOW TABLES LIKE 'users'");
    if (tables.length === 0) {
      console.log('✗ Users table does not exist!');
      process.exit(1);
    }
    console.log('✓ Users table exists\n');
    
    // Count all users
    const [allUsers] = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`Total users in database: ${allUsers[0].count}`);
    
    // Count by role (case insensitive)
    const [patients] = await pool.query("SELECT COUNT(*) as count FROM users WHERE LOWER(role) = 'patient'");
    console.log(`Patients: ${patients[0].count}`);
    
    const [providers] = await pool.query("SELECT COUNT(*) as count FROM users WHERE LOWER(role) = 'provider'");
    console.log(`Providers: ${providers[0].count}`);
    
    const [doctors] = await pool.query("SELECT COUNT(*) as count FROM users WHERE LOWER(role) = 'doctor'");
    console.log(`Doctors: ${doctors[0].count}`);
    
    const [admins] = await pool.query("SELECT COUNT(*) as count FROM users WHERE LOWER(role) = 'admin'");
    console.log(`Admins: ${admins[0].count}\n`);
    
    // Show sample of users with their roles
    const [sampleUsers] = await pool.query(
      'SELECT id, username, email, role, is_verified FROM users LIMIT 10'
    );
    
    if (sampleUsers.length > 0) {
      console.log('Sample users:');
      sampleUsers.forEach(user => {
        console.log(`  - ID: ${user.id}, Username: ${user.username}, Role: ${user.role}, Verified: ${user.is_verified}`);
      });
    } else {
      console.log('No users found in database. Please register some users first.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error testing stats:', error.message);
    process.exit(1);
  }
}

testStats();
