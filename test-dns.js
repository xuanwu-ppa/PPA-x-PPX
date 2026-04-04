import dns from 'dns';
dns.resolve6('db.ikgrpmpqvegdiisdzwal.supabase.co', (err, addresses) => {
  console.log('error:', err);
  console.log('addresses:', addresses);
});
