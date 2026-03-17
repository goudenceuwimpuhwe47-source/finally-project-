// Create test notifications for admin
const pool = require('./db');

async function createTestNotifications() {
  try {
    console.log('Creating test notifications for admin...\n');
    
    // Get admin user
    const [admins] = await pool.query("SELECT id FROM users WHERE LOWER(role) = 'admin' LIMIT 1");
    if (admins.length === 0) {
      console.log('No admin user found!');
      process.exit(1);
    }
    
    const adminId = admins[0].id;
    console.log(`Admin ID: ${adminId}`);
    
    // Create 3 test notifications
    for (let i = 1; i <= 3; i++) {
      await pool.query(
        `INSERT INTO notifications (recipient_id, recipient_type, title, message, status, order_id, created_at)
         VALUES (?, 'admin', ?, ?, 'unread', NULL, NOW())`,
        [
          adminId,
          `Test Notification ${i}`,
          `This is test notification number ${i} to verify the badge is working properly.`
        ]
      );
      console.log(`✓ Created test notification ${i}`);
    }
    
    console.log('\n✅ Done! Created 3 unread test notifications.');
    console.log('Now refresh your admin panel to see the badge.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createTestNotifications();
