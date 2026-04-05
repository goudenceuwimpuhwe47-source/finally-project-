const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Checking orders table structure...');
    const [columns] = await pool.query('DESCRIBE orders');
    console.table(columns);
    
    const [count] = await pool.query('SELECT COUNT(*) as count FROM orders');
    console.log('Total orders:', count[0].count);

    if (count[0].count > 0) {
      const [first] = await pool.query('SELECT * FROM orders LIMIT 1');
      console.log('First order columns:', Object.keys(first[0]));
    }
  } catch (err) {
    console.error('Error checking schema:', err.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
