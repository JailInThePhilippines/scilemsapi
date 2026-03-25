const serverless = require('serverless-http');
const app = require('../src/app');
const connectDB = require('../src/config/db');

const handler = serverless(app);

let dbReady = false;

module.exports = async (req, res) => {
    if (!dbReady) {
        await connectDB();
        dbReady = true;
    }

    return handler(req, res);
};
