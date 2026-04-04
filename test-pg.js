import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  user: 'postgres',
  password: 'Leosuper6014@',
  host: '2406:da1a:6b0:f623:e82:ddeb:fc22:1722',
  port: 5432,
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});
pool.query('SELECT NOW()', (err, res) => {
  console.log('error:', err);
  console.log('res:', res?.rows);
  pool.end();
});
