import dns from 'dns';
dns.setDefaultResultOrder('ipv6first');

import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres:Leosuper6014%40@db.ikgrpmpqvegdiisdzwal.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
pool.query('SELECT NOW()', (err, res) => {
  console.log('error:', err);
  console.log('res:', res?.rows);
  pool.end();
});
