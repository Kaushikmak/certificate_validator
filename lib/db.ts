// lib/db.ts
import Database from 'better-sqlite3';

// 1. Connect to the local SQLite file
const db = new Database('dev.db');

// 2. Performance optimization for SQLite
db.pragma('journal_mode = WAL');

// 3. Create the table using raw SQL if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    issuer TEXT NOT NULL,
    description TEXT,
    fileHash TEXT UNIQUE NOT NULL,
    hederaSequence TEXT NOT NULL,
    registeredAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export default db;