import pg from 'pg';
const { Pool } = pg;
import dns from 'dns';
import { promisify } from 'util';
const resolve6 = promisify(dns.resolve6);

async function test() {
  const connectionString = 'postgresql://postgres:Leosuper6014%40@db.ikgrpmpqvegdiisdzwal.supabase.co:5432/postgres';
  const url = new URL(connectionString);
  
  let host = url.hostname;
  if (host.endsWith('.supabase.co')) {
    try {
      const addresses = await resolve6(host);
      if (addresses.length > 0) {
        host = addresses[0];
      }
    } catch (err) {
      console.error('DNS resolve6 failed:', err);
    }
  }

  const pool = new Pool({
    user: url.username,
    password: decodeURIComponent(url.password),
    host: host,
    port: parseInt(url.port || '5432', 10),
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false }
  });

  pool.query('SELECT COUNT(*) FROM invitations', (err, res) => {
    console.log('error:', err);
    console.log('res:', res?.rows);
    pool.end();
  });
}
test();
