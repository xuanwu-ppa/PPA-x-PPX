import net from 'net';
const client = net.createConnection({
  host: '2406:da1a:6b0:f623:e82:ddeb:fc22:1722',
  port: 5432,
  family: 6
}, () => {
  console.log('connected!');
  client.end();
});
client.on('error', (err) => {
  console.log('error:', err);
});
