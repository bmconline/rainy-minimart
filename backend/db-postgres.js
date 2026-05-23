const { Pool } = require('pg');
require('dotenv').config();

// Railway provides DATABASE_URL automatically
const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL_DEV;

if (!connectionString) {
  console.error('❌ DATABASE_URL is not set. Falling back to SQLite.');
  module.exports = require('./db');
} else {
  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  // Create tables if they don't exist
  pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      initials TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      doc TEXT NOT NULL,
      item TEXT NOT NULL,
      category TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      payment TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT,
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_category ON transactions(category);
  `, (err) => {
    if (err) console.error('Error creating tables:', err);
    else console.log('✅ PostgreSQL tables ready');
  });

  // Wrapper object to match sqlite3 API
  module.exports = {
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
}
