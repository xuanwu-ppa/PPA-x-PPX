import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres:Leosuper6014%40@[2406:da1a:6b0:f623:e82:ddeb:fc22:1722]:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
pool.query('SELECT NOW()', (err, res) => {
  console.log('error:', err);
  console.log('res:', res?.rows);
  pool.end();
});
