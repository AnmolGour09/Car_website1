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

  // Step 3: Create users table if not exists (with role field)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('user','admin') DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Step 4: Create cars table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cars (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      brand VARCHAR(100) NOT NULL,
      model VARCHAR(100) NOT NULL,
      price VARCHAR(50) NOT NULL,
      year INT NOT NULL,
      image VARCHAR(255) DEFAULT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Step 5: Create interests junction table (many-to-many)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS interests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      car_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_interest (user_id, car_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Step 6: Seed 10 cars if table is empty
  const [carRows] = await pool.query('SELECT COUNT(*) as count FROM cars');
  if (carRows[0].count === 0) {
    const carsData = [
      { name: 'Dodge Challenger SRT', brand: 'Dodge', model: 'Challenger SRT Hellcat', price: '$85,000', year: 2024, image: '/src/assets/why.jpg', description: 'A true masterpiece of American muscle engineering with a supercharged 6.2L HEMI V8 engine.' },
      { name: 'BMW F30 3 Series', brand: 'BMW', model: 'F30 320d', price: '$45,000', year: 2023, image: '/src/assets/v1.jpg', description: 'Modern luxury sedan blending power with elegance and precision driving dynamics.' },
      { name: 'BMW 3 Series GT', brand: 'BMW', model: '3 GT 330i', price: '$52,000', year: 2023, image: '/src/assets/v2.jpg', description: 'Luxury Gran Turismo with coupe-like design and extra interior space.' },
      { name: 'Mercedes-AMG GT', brand: 'Mercedes', model: 'AMG GT R', price: '$165,000', year: 2024, image: '/src/assets/v3.jpg', description: 'Supreme tuning delivers up to +130 HP for breathtaking acceleration.' },
      { name: 'MGA 1600 Roadster', brand: 'MG', model: '1600 Roadster', price: '$38,000', year: 1960, image: '/src/assets/eve.jpg', description: 'Timeless classic British sports car with elegant curves and open-top design.' },
      { name: 'BMW M4 Competition', brand: 'BMW', model: 'M4 Competition', price: '$78,000', year: 2024, image: '/src/assets/goc.jpg', description: 'High-performance coupe combining dynamic power with refined luxury.' },
      { name: 'Porsche 911 Carrera', brand: 'Porsche', model: '911 Carrera S', price: '$125,000', year: 2024, image: '/src/assets/img_1.jpg', description: 'Iconic sports car with timeless design and exhilarating performance.' },
      { name: 'Audi R8 V10', brand: 'Audi', model: 'R8 V10 Plus', price: '$195,000', year: 2023, image: '/src/assets/img_2.jpg', description: 'Mid-engine supercar with naturally aspirated V10 and quattro all-wheel drive.' },
      { name: 'Ford Mustang GT', brand: 'Ford', model: 'Mustang GT Premium', price: '$55,000', year: 2024, image: '/src/assets/img_3.jpg', description: 'American muscle icon with a roaring 5.0L V8 and aggressive styling.' },
      { name: 'Chevrolet Corvette Z06', brand: 'Chevrolet', model: 'Corvette Z06', price: '$110,000', year: 2024, image: '/src/assets/img_4.jpg', description: 'Flat-plane crank V8 supercar delivering race-track performance.' },
    ];

    for (const car of carsData) {
      await pool.query(
        'INSERT INTO cars (name, brand, model, price, year, image, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [car.name, car.brand, car.model, car.price, car.year, car.image, car.description]
      );
    }
    console.log('10 cars seeded successfully.');
  }

  console.log('MySQL connected and database initialized.');
  return pool;
}

export function getPool() {
  if (!pool) throw new Error('Database not initialized. Call initDb() first.');
  return pool;
}
