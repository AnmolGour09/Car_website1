import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '1234',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let pool;

export async function initDb() {
  // Step 1: Connect without database to create it if needed
  const tempConn = await mysql.createConnection({
    host: DB_CONFIG.host,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
  });

  await tempConn.query(`CREATE DATABASE IF NOT EXISTS car_website CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await tempConn.end();

  // Step 2: Create pool with the database selected
  pool = mysql.createPool({
    ...DB_CONFIG,
    database: 'car_website',
  });

  // Step 3: Create users table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log('MySQL connected and database initialized.');
  return pool;
}

export function getPool() {
  if (!pool) throw new Error('Database not initialized. Call initDb() first.');
  return pool;
}

