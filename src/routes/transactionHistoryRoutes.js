const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const transactionHistoryController = require('../controllers/transactionHistoryController');

router.get('/transaction/:transactionId/history', authMiddleware, transactionHistoryController.getTransactionHistory);
router.get('/user/:userId/transaction-history', authMiddleware, transactionHistoryController.getUserTransactionHistory);
router.get('/overall', authMiddleware, transactionHistoryController.getAllTransactionHistories);
router.get('/overall/:transactionId', authMiddleware, transactionHistoryController.getTransactionDetails);
router.post('/system/snapshot', authMiddleware, transactionHistoryController.createSystemSnapshot);

module.exports = router;