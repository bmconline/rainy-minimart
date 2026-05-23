const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DB_PATH = process.env.DATABASE_PATH || './rainy.db';

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error('DB connection error:', err);
  else console.log('Connected to SQLite database');
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

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_date ON transactions(date)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_type ON transactions(type)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_category ON transactions(category)
  `);
});

module.exports = db;
