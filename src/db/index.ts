import pg from 'pg';
import Database from 'better-sqlite3';
import dns from 'dns';

// Supabase direct connections (db.[ref].supabase.co) are IPv6 only.
// This ensures Node.js resolves the IPv6 address first.
dns.setDefaultResultOrder('ipv6first');

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

let pool: any = null;
let sqliteDb: any = null;
let isSqlite = false;

if (connectionString) {
  console.log('Using PostgreSQL database');
  pool = new Pool({
    connectionString: connectionString,
    connectionTimeoutMillis: 5000,
    ssl: connectionString.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });
  (pool as any).isSqlite = false;
} else {
  console.log('DATABASE_URL not found, falling back to SQLite');
  sqliteDb = new Database('database.sqlite');
  isSqlite = true;
  
  // Mock pool-like interface for SQLite
  pool = {
    isSqlite: true,
    query: async (text: string, params: any[]) => {
      // Convert PostgreSQL $1, $2 syntax to SQLite ? syntax
      const sqliteQuery = text.replace(/\$(\d+)/g, '?');
      if (text.trim().toUpperCase().startsWith('SELECT')) {
        const rows = sqliteDb.prepare(sqliteQuery).all(...(params || []));
        return { rows };
      } else {
        const info = sqliteDb.prepare(sqliteQuery).run(...(params || []));
        return { rows: [], rowCount: info.changes };
      }
    },
    connect: async () => {
      return {
        query: pool.query,
        release: () => {}
      };
    }
  };
}

// Initialize database
const initDb = async (retries = 20) => {
  try {
    const baseQuery = `
      CREATE TABLE IF NOT EXISTS invitations (
        {ID_DEF},
        curator TEXT NOT NULL,
        course_id TEXT NOT NULL,
        course_name TEXT NOT NULL,
        campaign_name TEXT NOT NULL,
        campaign_start TEXT,
        campaign_end TEXT,
        status TEXT DEFAULT 'Pending',
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    if (isSqlite) {
      sqliteDb.exec(baseQuery.replace('{ID_DEF}', 'id INTEGER PRIMARY KEY AUTOINCREMENT'));
    } else {
      await pool.query(baseQuery.replace('{ID_DEF}', 'id SERIAL PRIMARY KEY'));
    }
    console.log('Database initialized');
  } catch (err: any) {
    console.error('Error initializing database:', err.message);
    if (retries > 0) {
      console.log(`Retrying database initialization in 3 seconds... (${retries} retries left)`);
      setTimeout(() => initDb(retries - 1), 3000);
    }
  }
};

initDb();

export default pool;
