const pool = require('./db');

async function migrateDatabase() {
  try {
    const dbName = process.env.DB_NAME;
    console.log(`Starting migration for database: ${dbName || 'current'}`);

    const tablesToUpdate = {
      orders: [
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
        { name: 'provider_note', ddl: "ALTER TABLE orders ADD COLUMN provider_note TEXT NULL AFTER provider_stock_id" }
      ],
      users: [
        { name: 'license_number', ddl: "ALTER TABLE users ADD COLUMN license_number VARCHAR(64) NULL" },
        { name: 'specialty', ddl: "ALTER TABLE users ADD COLUMN specialty VARCHAR(128) NULL" },
        { name: 'hospital_affiliation', ddl: "ALTER TABLE users ADD COLUMN hospital_affiliation VARCHAR(255) NULL" },
        { name: 'address', ddl: "ALTER TABLE users ADD COLUMN address VARCHAR(255) NULL" },
        { name: 'delivery_radius', ddl: "ALTER TABLE users ADD COLUMN delivery_radius INT NULL" },
        { name: 'status', ddl: "ALTER TABLE users ADD COLUMN status ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active'" },
        { name: 'verification_status', ddl: "ALTER TABLE users ADD COLUMN verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending'" }
      ]
    };

    for (const [tableName, columns] of Object.entries(tablesToUpdate)) {
      console.log(`\nChecking table: ${tableName}`);
      for (const col of columns) {
        try {
          // Check if column exists
          const [chk] = await pool.query(
            `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = COALESCE(?, DATABASE()) AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
            [dbName || null, tableName, col.name]
          );

          if ((chk?.[0]?.cnt || 0) === 0) {
            console.log(`   Adding column: ${col.name}...`);
            await pool.query(col.ddl);
            console.log(`   ✅ Added ${col.name} to ${tableName}`);
          } else {
            console.log(`   ⏭️ Column ${col.name} already exists in ${tableName}`);
          }
        } catch (colErr) {
          console.error(`   ❌ Failed to add ${col.name}: ${colErr.message}`);
        }
      }
    }

    console.log('\n✅ Database migration completed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration Error:', err.message);
    process.exit(1);
  }
}

migrateDatabase();
