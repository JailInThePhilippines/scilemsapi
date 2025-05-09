const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const userTransactionRoutes = require('./routes/userTransactionRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const transactionHistoryRoutes = require('./routes/transactionHistoryRoutes');
const { scheduleOverdueItemsCheck } = require('./utils/scheduleJobs');
require('dotenv').config();

const app = express();
scheduleOverdueItemsCheck();
console.log('Scheduled job for checking overdue items has been set up');

app.use(cors({
    origin: ['http://localhost:4200', 'http://localhost:50352'],
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/user/transactions', userTransactionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/transactions/history', transactionHistoryRoutes);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

module.exports = app;