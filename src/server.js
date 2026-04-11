const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const connectDB = require('./config/db');
const dns = require('node:dns');

const PORT = process.env.PORT || 5000;
// const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  // Set custom DNS resolvers first (before DB connection)
  dns.setServers(['1.1.1.1', '1.0.0.1']);
  console.log('Using DNS servers:', dns.getServers());

  await connectDB();

  app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
  });
}

startServer().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});