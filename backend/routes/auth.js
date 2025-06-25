const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
require('dotenv').config();

const router = express.Router();

// Middleware to verify JWT
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id }
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
}

// === Register ===
router.post('/register', async (req, res) => {
  const { name, email, dob, gender, password } = req.body;

  if (!name || !email || !dob || !gender || !password) {
    return res.status(400).json({ message: 'All fields required' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const query = 'INSERT INTO users (name, email, dob, gender, password) VALUES (?, ?, ?, ?, ?)';
  db.query(query, [name, email, dob, gender, hashedPassword], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Email already registered' });
      }
      return res.status(500).json({ message: 'Database error', error: err });
    }
    res.status(201).json({ message: 'User registered' });
  });
});

// === Login ===
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login successful', token });
  });
});

// === Get Profile by Email ===
router.get('/profile/:email', (req, res) => {
  const email = req.params.email;

  db.query(
    'SELECT id, name, email, dob, gender, profile_image FROM users WHERE email = ?',
    [email],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const user = results[0];
      user.profile_image = user.profile_image
        ? user.profile_image.startsWith('http')
        ? user.profile_image
        : `${req.protocol}://${req.get('host')}${user.profile_image}`
        : null;

      res.json(user);
    }
  );
});

// === Update Profile (auth required) ===
router.put('/profile', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { name, dob, gender, profile_image } = req.body;

  const query = 'UPDATE users SET name = ?, dob = ?, gender = ?, profile_image = ? WHERE id = ?';
  db.query(query, [name, dob, gender, profile_image, userId], (err) => {
    if (err) {
      console.error('Profile update error:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.json({ message: 'Profile updated successfully' });
  });
});

// === Upload Profile Image ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return cb(new Error('Unauthorized'), null);

    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
    } catch {
      return cb(new Error('Invalid token'), null);
    }

    db.query('SELECT name FROM users WHERE id = ?', [userId], (err, results) => {
      if (err || results.length === 0) return cb(new Error('User not found'), null);

      const folder = `uploads/${results[0].name}`;
      if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
      cb(null, folder);
    });
  },
  filename: (req, file, cb) => {
    cb(null, 'profile' + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.post('/upload-profile-image', authMiddleware, upload.single('profile_image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const userId = req.user.id;
  const imagePath = '/' + req.file.path.replace(/\\/g, '/');

  db.query('UPDATE users SET profile_image = ? WHERE id = ?', [imagePath, userId], (err) => {
    if (err) return res.status(500).json({ message: 'Database error' });

    res.json({ message: 'Image uploaded', imageUrl: `${req.protocol}://${req.get('host')}${imagePath}` });
  });
});

// DELETE current profile image and remove path from DB
router.delete('/profile-image', authMiddleware, (req, res) => {
  const userId = req.user.id;

  // First, get the image path from DB
  db.query('SELECT profile_image FROM users WHERE id = ?', [userId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const imagePath = results[0].profile_image;
    if (!imagePath) {
      return res.status(400).json({ message: 'No image to delete' });
    }

    const fullPath = path.join(__dirname, '..', imagePath);

    fs.unlink(fullPath, (unlinkErr) => {
      if (unlinkErr && unlinkErr.code !== 'ENOENT') {
        return res.status(500).json({ message: 'Could not delete image', error: unlinkErr });
      }

      // Remove path from DB
      db.query('UPDATE users SET profile_image = NULL WHERE id = ?', [userId], (dbErr) => {
        if (dbErr) {
          return res.status(500).json({ message: 'Database error', error: dbErr });
        }

        res.json({ message: 'Image deleted' });
      });
    });
  });
});


module.exports = router;
