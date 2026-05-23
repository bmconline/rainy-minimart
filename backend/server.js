require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// =============== Authentication ===============
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    try {
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(401).json({ error: 'Invalid username or password' });

      res.json({
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        initials: user.initials,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

// =============== API Routes ===============

// Get all transactions
app.get('/api/transactions', (req, res) => {
  const { type, category, from, to, search } = req.query;
  let query = 'SELECT * FROM transactions WHERE 1=1';
  const params = [];

  if (type && type !== 'all') {
    query += ' AND type = ?';
    params.push(type);
  }
  if (category && category !== 'all') {
    query += ' AND category = ?';
    params.push(category);
  }
  if (from) {
    query += ' AND date >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND date <= ?';
    params.push(to);
  }
  if (search) {
    query += ' AND (doc LIKE ? OR item LIKE ? OR category LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  query += ' ORDER BY date DESC LIMIT 1000';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Get transaction by ID
app.get('/api/transactions/:id', (req, res) => {
  db.get('SELECT * FROM transactions WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });
});

// Create transaction
app.post('/api/transactions', (req, res) => {
  const { id, type, date, doc, item, category, amount, payment, user_id, user_name, note } = req.body;

  if (!id || !type || !date || !item || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.run(
    `INSERT INTO transactions (id, type, date, doc, item, category, amount, payment, user_id, user_name, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, type, date, doc, item, category, amount, payment, user_id, user_name, note],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id, message: 'Transaction created' });
    }
  );
});

// Delete transaction
app.delete('/api/transactions/:id', (req, res) => {
  db.run('DELETE FROM transactions WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Deleted' });
  });
});

// Update transaction
app.put('/api/transactions/:id', (req, res) => {
  const { type, date, doc, item, category, amount, payment, user_id, user_name, note } = req.body;
  const fields = [];
  const values = [];

  if (type !== undefined) { fields.push('type = ?'); values.push(type); }
  if (date !== undefined) { fields.push('date = ?'); values.push(date); }
  if (doc !== undefined) { fields.push('doc = ?'); values.push(doc); }
  if (item !== undefined) { fields.push('item = ?'); values.push(item); }
  if (category !== undefined) { fields.push('category = ?'); values.push(category); }
  if (amount !== undefined) { fields.push('amount = ?'); values.push(amount); }
  if (payment !== undefined) { fields.push('payment = ?'); values.push(payment); }
  if (user_id !== undefined) { fields.push('user_id = ?'); values.push(user_id); }
  if (user_name !== undefined) { fields.push('user_name = ?'); values.push(user_name); }
  if (note !== undefined) { fields.push('note = ?'); values.push(note); }

  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  values.push(req.params.id);
  const query = `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`;

  db.run(query, values, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Updated' });
  });
});

// Get summary stats
app.get('/api/summary', (req, res) => {
  const { period } = req.query; // day, month, year

  db.all(
    `SELECT
      SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as total_income,
      SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as total_expense,
      COUNT(*) as total_count,
      COUNT(DISTINCT DATE(date)) as days_count
     FROM transactions`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const row = rows[0] || {};
      const profit = (row.total_income || 0) - (row.total_expense || 0);
      res.json({
        income: row.total_income || 0,
        expense: row.total_expense || 0,
        profit: profit,
        count: row.total_count || 0
      });
    }
  );
});

// Get all users
app.get('/api/users', (req, res) => {
  db.all('SELECT * FROM users ORDER BY name', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files (frontend)
const parentDir = path.join(__dirname, '..');
app.use(express.static(parentDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'text/javascript');
    if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
  }
}));

// Serve index.html for all non-API routes (SPA fallback)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(parentDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend running on port ${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
});
