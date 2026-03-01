/**
 * Database configuration — SQLite via better-sqlite3
 * Creates tables on first run. All operations are synchronous (better-sqlite3 style).
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbPath = path.resolve(__dirname, '..', process.env.DB_PATH || './data/finance.db');

// Ensure the data directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    type TEXT CHECK(type IN ('income','expense')) NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    monthly_limit REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, category)
  );

  CREATE TABLE IF NOT EXISTS stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    qty REAL NOT NULL,
    buy_price REAL NOT NULL,
    UNIQUE(user_id, symbol)
  );

  CREATE INDEX IF NOT EXISTS idx_txn_user ON transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_txn_date ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_txn_category ON transactions(category);
  CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
  CREATE INDEX IF NOT EXISTS idx_stocks_user ON stocks(user_id);
`);

console.log('✅ Database initialized at', dbPath);

module.exports = db;
