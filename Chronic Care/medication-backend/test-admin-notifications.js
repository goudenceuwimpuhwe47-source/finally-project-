// Test script to check admin notifications
const pool = require('./db');

async function testAdminNotifications() {
  try {
    console.log('Testing admin notifications...\n');
    
    // Check if notifications table exists
    const [tables] = await pool.query("SHOW TABLES LIKE 'notifications'");
    if (tables.length === 0) {
      console.log('✗ Notifications table does not exist!');
      process.exit(1);
    }
    console.log('✓ Notifications table exists\n');
    
    // Get all admin users
    const [admins] = await pool.query("SELECT id, username, email, role FROM users WHERE LOWER(role) = 'admin'");
    console.log(`Found ${admins.length} admin(s):`);
    admins.forEach(admin => {
      console.log(`  - ID: ${admin.id}, Username: ${admin.username}, Email: ${admin.email}`);
    });
    console.log('');
    
    // Get all notifications
    const [allNotifs] = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10');
    console.log(`Total notifications in database: ${allNotifs.length}`);
    if (allNotifs.length > 0) {
      console.log('Recent notifications:');
      allNotifs.forEach(notif => {
        console.log(`  - ID: ${notif.id}, Recipient: ${notif.recipient_type}:${notif.recipient_id}, Status: ${notif.status}`);
        console.log(`    Title: ${notif.title}`);
        console.log(`    Message: ${notif.message?.substring(0, 60)}...`);
      });
    }
    console.log('');
    
    // Get notifications for each admin
    for (const admin of admins) {
      const [notifs] = await pool.query(
        `SELECT * FROM notifications WHERE recipient_type='admin' AND recipient_id=? ORDER BY created_at DESC`,
        [admin.id]
      );
      const unreadCount = notifs.filter(n => n.status === 'unread').length;
      console.log(`Admin ${admin.username} (ID: ${admin.id}):`);
      console.log(`  Total notifications: ${notifs.length}`);
      console.log(`  Unread notifications: ${unreadCount}`);
      if (notifs.length > 0) {
        console.log('  Recent:');
        notifs.slice(0, 3).forEach(n => {
          console.log(`    - [${n.status}] ${n.title} (Order #${n.order_id || 'N/A'})`);
        });
      }
      console.log('');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testAdminNotifications();
