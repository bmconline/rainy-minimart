console.log('Starting server...');
require('dotenv').config();
console.log('Dotenv loaded');

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');

let db;
let dbReady = false;

try {
  console.log('Loading db from:', path.join(__dirname, './db'));
  db = require(path.join(__dirname, './db'));
  console.log('✅ Database module loaded');

  // Give database 5 seconds to initialize before accepting requests
  setTimeout(() => {
    dbReady = true;
    console.log('✅ Database ready to accept requests');
  }, 5000);
} catch (err) {
  console.error('❌ Failed to load database:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
}

const app = express();
const PORT = 3000;

const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Set timeout for all requests (30 seconds)
app.use((req, res, next) => {
  // Skip health checks and API health checks - they don't need database
  if (req.path === '/health' || req.path === '/api/health') {
    return next();
  }

  // Check if database is ready for other requests
  if (!dbReady) {
    console.warn(`⏳ Database not ready yet, delaying: ${req.method} ${req.path}`);
    return res.status(503).json({ error: 'Database initializing. Please try again in a moment.' });
  }

  req.setTimeout(30000, () => {
    console.error(`❌ Request timeout: ${req.method} ${req.path}`);
    res.status(408).json({ error: 'Request timeout' });
  });
  res.setTimeout(30000, () => {
    console.error(`❌ Response timeout: ${req.method} ${req.path}`);
    res.status(408).json({ error: 'Response timeout' });
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Import sample transactions
app.post('/api/import-transactions', async (req, res) => {
  console.log('[Import] Starting sample transaction import...');

  try {
    const today = new Date(2026, 4, 23); // May 23, 2026
    const sampleData = [
      { type: 'income', item: 'ขายสินค้า วันที่ 1', amount: 5420 },
      { type: 'income', item: 'ขายสินค้า วันที่ 2', amount: 6850 },
      { type: 'income', item: 'ขายสินค้า วันที่ 3', amount: 4200 },
      { type: 'expense', item: 'ค่าน้ำ/ไฟ', amount: 1500 },
      { type: 'expense', item: 'ค่าสินค้า', amount: 3000 },
      { type: 'income', item: 'ขายสินค้า วันที่ 4', amount: 7340 },
      { type: 'expense', item: 'ค่าแรง', amount: 2000 },
      { type: 'income', item: 'ขายสินค้า วันที่ 5', amount: 5890 },
    ];

    let imported = 0;

    // Insert sample data
    for (let i = 0; i < sampleData.length; i++) {
      const data = sampleData[i];
      const transactionId = `tx-${Date.now()}-${i}`;
      const date = new Date(today);
      date.setDate(date.getDate() - (sampleData.length - i - 1));

      db.run(
        `INSERT INTO transactions (id, type, date, doc, item, category, amount, payment, user_id, user_name, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transactionId,
          data.type,
          date.toISOString().split('T')[0],
          `Doc-${i+1}`,
          data.item,
          data.type === 'income' ? 'Sales' : 'Expense',
          data.amount,
          'Cash',
          'user-1',
          'Admin',
          'Sample import data'
        ],
        (err) => {
          if (!err) imported++;
          else console.error('Error inserting:', err.message);
        }
      );
    }

    res.json({
      message: '✅ Sample transactions imported!',
      imported: sampleData.length,
      count: sampleData.length,
      note: 'Added 8 sample transactions (income & expense)'
    });

  } catch (err) {
    console.error('[Import] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Debug endpoint to seed admin user (for deployment troubleshooting)
app.post('/api/seed-admin', async (req, res) => {
  console.log('[Seed] Seeding admin user...');
  try {
    const hashedPassword = await bcrypt.hash('1234', 10);
    db.run(
      'INSERT INTO users (id, name, username, password, role, initials) VALUES (?, ?, ?, ?, ?, ?)',
      ['user-1', 'Admin', 'admin', hashedPassword, 'admin', 'AD'],
      (err) => {
        if (err) {
          console.error('[Seed] Error:', err.message);
          return res.status(500).json({ error: 'Failed to create admin user: ' + err.message });
        }
        console.log('[Seed] ✅ Admin user created');
        res.json({ message: 'Admin user created successfully', username: 'admin', password: '1234' });
      }
    );
  } catch (err) {
    console.error('[Seed] Error:', err.message);
    res.status(500).json({ error: 'Error: ' + err.message });
  }
});

// =============== Authentication ===============
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  console.log(`[Login] Attempting login for user: ${username}`);

  let responded = false;

  // Add safety timeout
  const loginTimeout = setTimeout(() => {
    console.error(`[Login] Request timeout for user: ${username}`);
    if (!responded) {
      responded = true;
      res.status(500).json({ error: 'Login request timeout. Database may be slow. Please try again.' });
    }
  }, 10000); // 10 second timeout

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    clearTimeout(loginTimeout);

    if (responded) {
      console.log(`[Login] Callback fired after response sent for user: ${username}`);
      return;
    }

    if (err) {
      console.error(`[Login] Database error for user ${username}:`, err.message);
      responded = true;
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }

    if (!user) {
      console.log(`[Login] User not found: ${username}`);
      responded = true;
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    try {
      console.log(`[Login] User found: ${username}, comparing password...`);
      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        console.log(`[Login] Invalid password for user: ${username}`);
        responded = true;
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      console.log(`[Login] ✅ Successful login for user: ${username}`);
      responded = true;
      res.json({
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        initials: user.initials,
      });
    } catch (error) {
      console.error(`[Login] Password comparison error for user ${username}:`, error.message);
      if (!responded) {
        responded = true;
        res.status(500).json({ error: 'Authentication error: ' + error.message });
      }
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
      SUM(CASE WHEN type='income' THEN CAST(amount AS NUMERIC) ELSE 0 END) as total_income,
      SUM(CASE WHEN type='expense' THEN CAST(amount AS NUMERIC) ELSE 0 END) as total_expense,
      COUNT(*) as total_count,
      COUNT(DISTINCT DATE(date)) as days_count
     FROM transactions`,
    (err, rows) => {
      if (err) {
        console.error('Summary error:', err);
        return res.status(500).json({ error: err.message });
      }
      const row = rows[0] || {};
      const income = parseFloat(row.total_income) || 0;
      const expense = parseFloat(row.total_expense) || 0;
      const profit = income - expense;

      console.log('[Summary] income:', income, 'expense:', expense, 'count:', row.total_count);

      res.json({
        income: income,
        expense: expense,
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
    // No cache for HTML files to ensure fresh code loads
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'text/javascript');
    if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
  }
}));

// Serve index.html for all non-API routes (SPA fallback)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(parentDir, 'index.html'));
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend running on port ${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err);
  process.exit(1);
});
