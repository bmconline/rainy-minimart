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
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  // Initialize database tables asynchronously (non-blocking)
  setTimeout(() => {
    pool.query('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL, role TEXT NOT NULL, initials TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)').catch(() => {});
    pool.query('CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, type TEXT NOT NULL, date TEXT NOT NULL, doc TEXT NOT NULL, item TEXT NOT NULL, category TEXT NOT NULL, amount NUMERIC NOT NULL, payment TEXT NOT NULL, user_id TEXT NOT NULL, user_name TEXT, note TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)').catch(() => {});
    pool.query('CREATE INDEX IF NOT EXISTS idx_date ON transactions(date)').catch(() => {});
    pool.query('CREATE INDEX IF NOT EXISTS idx_type ON transactions(type)').catch(() => {});
    pool.query('CREATE INDEX IF NOT EXISTS idx_category ON transactions(category)').catch(() => {});
  }, 100);

  console.log('✅ PostgreSQL connected');

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
