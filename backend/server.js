import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { initDb, getPool } from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: "https://main.d2ulwf1p11m13e.amplifyapp.com"
}));
app.use(express.json());

// Start the HTTP server immediately so the port is open
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

let pool = null;

// Initialize DB asynchronously so a MySQL failure doesn't crash the server
(async () => {
  try {
    await initDb();
    pool = getPool();
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Database initialization failed:', err.message);
    console.error('Make sure MySQL is running and credentials in db.js are correct.');
  }
})();

function ensureDbReady(req, res, next) {
  if (!pool) {
    return res.status(503).json({
      success: false,
      message: 'Database not ready. Please ensure MySQL is running and try again later.',
    });
  }
  next();
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, message: 'Database not initialized.' });
  }
  return res.json({ success: true, message: 'Server and database are healthy.' });
});

// =================== AUTH ENDPOINTS ===================

// Register endpoint
app.post('/api/register', ensureDbReady, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // Check if user already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user (default role: user)
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, 'user']
    );

    return res.status(201).json({ success: true, message: 'User registered successfully.', userId: result.insertId });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Login endpoint
app.post('/api/login', ensureDbReady, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const [rows] = await pool.query('SELECT id, name, email, password, role FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    return res.json({
      success: true,
      message: 'Login successful.',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// =================== CARS ENDPOINTS ===================

// Get all cars
app.get('/api/cars', ensureDbReady, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM cars ORDER BY id ASC');
    return res.json({ success: true, cars: rows });
  } catch (error) {
    console.error('Fetch cars error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Get single car by ID
app.get('/api/cars/:id', ensureDbReady, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM cars WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Car not found.' });
    }
    return res.json({ success: true, car: rows[0] });
  } catch (error) {
    console.error('Fetch car error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// =================== INTEREST ENDPOINTS ===================

// Add interest (user marks interest in a car)
app.post('/api/interest', ensureDbReady, async (req, res) => {
  try {
    const { userId, carId } = req.body;

    if (!userId || !carId) {
      return res.status(400).json({ success: false, message: 'userId and carId are required.' });
    }

    // Check if user exists
    const [userRows] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Check if car exists
    const [carRows] = await pool.query('SELECT id FROM cars WHERE id = ?', [carId]);
    if (carRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Car not found.' });
    }

    // Insert interest (unique constraint prevents duplicates)
    await pool.query('INSERT INTO interests (user_id, car_id) VALUES (?, ?)', [userId, carId]);

    return res.status(201).json({ success: true, message: 'Interest added successfully.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'You have already shown interest in this car.' });
    }
    console.error('Add interest error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Remove interest
app.delete('/api/interest', ensureDbReady, async (req, res) => {
  try {
    const { userId, carId } = req.body;

    if (!userId || !carId) {
      return res.status(400).json({ success: false, message: 'userId and carId are required.' });
    }

    const [result] = await pool.query('DELETE FROM interests WHERE user_id = ? AND car_id = ?', [userId, carId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Interest not found.' });
    }

    return res.json({ success: true, message: 'Interest removed successfully.' });
  } catch (error) {
    console.error('Remove interest error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Get all cars a specific user is interested in
app.get('/api/user/interests/:userId', ensureDbReady, async (req, res) => {
  try {
    const userId = req.params.userId;
    const [rows] = await pool.query(`
      SELECT c.*, i.created_at as interest_date
      FROM interests i
      JOIN cars c ON i.car_id = c.id
      WHERE i.user_id = ?
      ORDER BY i.created_at DESC
    `, [userId]);

    return res.json({ success: true, interests: rows });
  } catch (error) {
    console.error('Fetch user interests error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Check if user is interested in a specific car
app.get('/api/interest/check', ensureDbReady, async (req, res) => {
  try {
    const { userId, carId } = req.query;
    if (!userId || !carId) {
      return res.status(400).json({ success: false, message: 'userId and carId are required.' });
    }

    const [rows] = await pool.query('SELECT id FROM interests WHERE user_id = ? AND car_id = ?', [userId, carId]);
    return res.json({ success: true, isInterested: rows.length > 0 });
  } catch (error) {
    console.error('Check interest error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// =================== ADMIN DASHBOARD ENDPOINTS ===================

// Get all users with their interested cars
app.get('/api/admin/users-with-interests', ensureDbReady, async (req, res) => {
  try {
    // Get all users
    const [users] = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY id DESC');

    // For each user, get their interested cars
    const usersWithInterests = await Promise.all(
      users.map(async (user) => {
        const [cars] = await pool.query(`
          SELECT c.id, c.name, c.brand, c.model, c.price, c.year, i.created_at as interest_date
          FROM interests i
          JOIN cars c ON i.car_id = c.id
          WHERE i.user_id = ?
          ORDER BY i.created_at DESC
        `, [user.id]);

        return { ...user, interestedCars: cars };
      })
    );

    return res.json({ success: true, users: usersWithInterests });
  } catch (error) {
    console.error('Admin users with interests error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Get all cars with interested users
app.get('/api/admin/cars-with-interests', ensureDbReady, async (req, res) => {
  try {
    // Get all cars
    const [cars] = await pool.query('SELECT * FROM cars ORDER BY id ASC');

    // For each car, get interested users
    const carsWithInterests = await Promise.all(
      cars.map(async (car) => {
        const [users] = await pool.query(`
          SELECT u.id, u.name, u.email, i.created_at as interest_date
          FROM interests i
          JOIN users u ON i.user_id = u.id
          WHERE i.car_id = ?
          ORDER BY i.created_at DESC
        `, [car.id]);

        return { ...car, interestedUsers: users };
      })
    );

    return res.json({ success: true, cars: carsWithInterests });
  } catch (error) {
    console.error('Admin cars with interests error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Get all users (for admin verification)
app.get('/api/users', ensureDbReady, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY id DESC');
    return res.json({ success: true, users: rows });
  } catch (error) {
    console.error('Fetch users error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});
