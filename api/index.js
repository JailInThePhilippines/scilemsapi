const serverless = require('serverless-http');
const app = require('../src/app');
const connectDB = require('../src/config/db');

const handler = serverless(app);

let dbReady = false;

module.exports = async (req, res) => {
    // Set timeout to prevent infinite hanging
    const timeout = setTimeout(() => {
        res.status(503).json({ error: 'Request timeout' });
    }, 25000); // Vercel timeout is 26s

    try {
        if (!dbReady) {
            await connectDB();
            dbReady = true;
        }
        clearTimeout(timeout);
        return handler(req, res);
    } catch (error) {
        clearTimeout(timeout);
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};