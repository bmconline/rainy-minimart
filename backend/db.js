if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Use PostgreSQL if DATABASE_URL is provided (Railway), otherwise SQLite
const usePostgres = !!process.env.DATABASE_URL;

console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

let db;

if (usePostgres) {
  // PostgreSQL for production
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
  });

  pool.on('connect', () => {
    console.log('✅ New pool connection established');
  });

  // Test connection and initialize tables
  const bcrypt = require('bcrypt');

  pool.query('SELECT NOW()', async (err, result) => {
    if (err) {
      console.error('❌ PostgreSQL connection test failed:', err.message);
      console.error('❌ DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
      console.error('❌ Full error:', err);
    } else {
      console.log('✅ PostgreSQL connected and working');

      try {
        // Create tables
        await pool.query('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL, role TEXT NOT NULL, initials TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
        console.log('✅ Users table ready');

        await pool.query('CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, type TEXT NOT NULL, date TEXT NOT NULL, doc TEXT NOT NULL, item TEXT NOT NULL, category TEXT NOT NULL, amount NUMERIC NOT NULL, payment TEXT NOT NULL, user_id TEXT NOT NULL, user_name TEXT, note TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
        console.log('✅ Transactions table ready');

        await pool.query('CREATE INDEX IF NOT EXISTS idx_date ON transactions(date)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_type ON transactions(type)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_category ON transactions(category)');
        console.log('✅ Database indexes ready');

        // Seed admin user if not exists
        const adminExists = await pool.query('SELECT COUNT(*) as count FROM users WHERE username = $1', ['admin']);
        if (adminExists.rows[0].count === 0) {
          const hashedPassword = await bcrypt.hash('1234', 10);
          await pool.query(
            'INSERT INTO users (id, name, username, password, role, initials) VALUES ($1, $2, $3, $4, $5, $6)',
            ['user-1', 'Admin', 'admin', hashedPassword, 'admin', 'AD']
          );
          console.log('✅ Admin user created');
        } else {
          console.log('✅ Admin user already exists');
        }

      } catch (initErr) {
        console.error('❌ Database initialization error:', initErr.message);
      }
    }
  });

  db = {
    run: (sql, params, callback) => {
      pool.query(sql, params, (err, result) => {
        if (callback) callback(err);
      });
    },
    get: (sql, params, callback) => {
      pool.query(sql, params, (err, result) => {
        callback(err, result?.rows?.[0]);
      });
    },
    all: (sql, params, callback) => {
      pool.query(sql, params, (err, result) => {
        callback(err, result?.rows || []);
      });
    },
    serialize: (callback) => {
      callback();
    },
    close: () => {
      pool.end();
    },
  };

  console.log('✅ Using PostgreSQL database');
} else {
  // SQLite for local development
  let sqlite3;
  try {
    sqlite3 = require('sqlite3').verbose();
  } catch (err) {
    console.error('❌ sqlite3 not available. In production, DATABASE_URL must be set for PostgreSQL connection.');
    console.error('❌ Error details:', err.message);
    throw new Error('Database initialization failed: sqlite3 not available and DATABASE_URL not set');
  }
  const path = require('path');
  const DB_PATH = process.env.DATABASE_PATH || './rainy.db';

  db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error('DB connection error:', err);
    else console.log('✅ Connected to SQLite database');
  });

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        date TEXT NOT NULL,
        doc TEXT NOT NULL,
        item TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        payment TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        initials TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_date ON transactions(date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_type ON transactions(type)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_category ON transactions(category)`);
  });
}

module.exports = db;
