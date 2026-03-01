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
    is_verified INTEGER DEFAULT 0,
    otp_hash TEXT,
    otp_expires_at TEXT,
    otp_attempts INTEGER DEFAULT 0,
    last_otp_sent TEXT,
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

// ── Migration: add OTP columns to existing users table ──
// Safe to run repeatedly — uses try/catch for "duplicate column" errors
const otpColumns = [
  { name: 'is_verified', sql: 'ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0' },
  { name: 'otp_hash', sql: 'ALTER TABLE users ADD COLUMN otp_hash TEXT' },
  { name: 'otp_expires_at', sql: 'ALTER TABLE users ADD COLUMN otp_expires_at TEXT' },
  { name: 'otp_attempts', sql: 'ALTER TABLE users ADD COLUMN otp_attempts INTEGER DEFAULT 0' },
  { name: 'last_otp_sent', sql: 'ALTER TABLE users ADD COLUMN last_otp_sent TEXT' },
];

for (const col of otpColumns) {
  try {
    db.exec(col.sql);
    console.log(`  ✓ Added column: users.${col.name}`);
  } catch (e) {
    // Column already exists — ignore
  }
}

// Mark all EXISTING users as verified (one-time migration only)
// Uses a migration_flags table to ensure this only runs once
db.exec('CREATE TABLE IF NOT EXISTS migration_flags (name TEXT PRIMARY KEY)');
const migrated = db.prepare("SELECT 1 FROM migration_flags WHERE name = 'otp_verify_existing_users'").get();
if (!migrated) {
  const result = db.prepare('UPDATE users SET is_verified = 1 WHERE is_verified IS NULL OR is_verified = 0').run();
  db.prepare("INSERT INTO migration_flags (name) VALUES ('otp_verify_existing_users')").run();
  if (result.changes > 0) {
    console.log(`  ✓ Migrated ${result.changes} existing user(s) to verified status`);
  }
}

console.log('✅ Database initialized at', dbPath);

module.exports = db;
