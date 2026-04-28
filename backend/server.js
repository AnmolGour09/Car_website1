import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { initDb, getPool } from './db.js';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Initialize DB then start server
await initDb();

const pool = getPool();

// Register endpoint
app.post('/api/register', async (req, res) => {
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

    // Insert user
    await pool.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    return res.status(201).json({ success: true, message: 'User registered successfully.' });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const [rows] = await pool.query('SELECT id, name, email, password FROM users WHERE email = ?', [email]);
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
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Get all users endpoint (for admin / verification)
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, created_at FROM users ORDER BY id DESC');
    return res.json({ success: true, users: rows });
  } catch (error) {
    console.error('Fetch users error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

