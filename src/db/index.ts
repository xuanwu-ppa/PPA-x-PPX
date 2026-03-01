import Database from 'better-sqlite3';

const db = new Database('curation.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    curator TEXT NOT NULL,
    course_id TEXT NOT NULL,
    course_name TEXT NOT NULL,
    campaign_name TEXT NOT NULL,
    campaign_start TEXT,
    campaign_end TEXT,
    status TEXT DEFAULT 'Pending', -- Pending, Approved, Rejected
    rejection_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration for existing databases (idempotent)
try {
  db.exec(`ALTER TABLE invitations ADD COLUMN campaign_start TEXT;`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE invitations ADD COLUMN campaign_end TEXT;`);
} catch (e) {}

export default db;
