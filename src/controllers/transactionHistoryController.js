const transactionLogger = require('../utils/transactionLogger');
const Transaction = require('../models/transactionModel');
const Logbook = require('../models/logBookModel');
const mongoose = require('mongoose');

/**
 * Controller for transaction history and logs
 */
const transactionHistoryController = {
  /**
   * Get the complete history of status changes for a transaction
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTransactionHistory(req, res) {
    try {
      const { transactionId } = req.params;

      const transaction = await Transaction.findById(transactionId);

      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }

      const history = await transactionLogger.getTransactionHistory(transaction.cartID);

      res.status(200).json({
        message: 'Transaction history retrieved successfully',
        history
      });
    } catch (err) {
      console.error('Error fetching transaction history:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * Get history for all transactions of a specific user
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserTransactionHistory(req, res) {
    try {
      const { userId } = req.params;

      const transactions = await Transaction.find({ 'cartID.brID': userId });

      if (!transactions.length) {
        return res.status(404).json({ message: 'No transactions found for this user' });
      }

      const cartIds = transactions.map(transaction => transaction.cartID);

      const historyPromises = cartIds.map(cartId =>
        transactionLogger.getTransactionHistory(cartId)
      );

      const allHistory = await Promise.all(historyPromises);

      res.status(200).json({
        message: 'User transaction history retrieved successfully',
        history: allHistory.flat()
      });
    } catch (err) {
      console.error('Error fetching user transaction history:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * Get a snapshot of the current state of all transactions
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createSystemSnapshot(req, res) {
    try {
      const transactions = await Transaction.find({
        currentStatus: { $nin: ['archive', 'deleted'] }
      }).populate({
        path: 'cartID',
        populate: {
          path: 'brID',
          model: 'User'
        }
      }).populate('borrowedItems.eqID');

      const snapshotPromises = transactions.map(transaction =>
        transactionLogger.createSnapshot(transaction)
      );

      await Promise.all(snapshotPromises);

      res.status(200).json({
        message: 'System snapshot created successfully',
        transactionsSnapshotted: transactions.length
      });
    } catch (err) {
      console.error('Error creating system snapshot:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
 * Get the complete transaction history for all transactions
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
  async getAllTransactionHistories(req, res) {
    try {
      const transactions = await Transaction.find()
        .select('_id cartID currentStatus dataApplied dateApproved pickUpDate returnDate dateReturned remarks createdAt updatedAt')
        .populate({
          path: 'cartID',
          select: '_id brID borrowedItems',
          populate: {
            path: 'brID',
            select: 'username firstname lastname'
          }
        });

      const logbooks = await Logbook.find()
        .select('_id transactionID cartID currentStatus dataApplied dateApproved pickUpDate returnDate dateReturned remarks createdAt updatedAt')
        .populate([
          {
            path: 'transactionID',
            select: '_id'
          },
          {
            path: 'cartID',
            select: '_id brID borrowedItems',
            populate: {
              path: 'brID',
              select: 'username firstname lastname'
            }
          }
        ]);

      const allStatusEntries = [];

      for (const tx of transactions) {
        allStatusEntries.push({
          transactionId: tx._id,
          borrowerName: tx.cartID?.brID
            ? `${tx.cartID.brID.firstname} ${tx.cartID.brID.lastname}`
            : 'Unknown',
          date: tx.dataApplied,
          status: tx.currentStatus,
          createdAt: tx.createdAt
        });
      }

      for (const log of logbooks) {
        allStatusEntries.push({
          transactionId: log.transactionID?._id,
          borrowerName: log.cartID?.brID
            ? `${log.cartID.brID.firstname} ${log.cartID.brID.lastname}`
            : 'Unknown',
          date: log.dataApplied,
          status: log.currentStatus,
          createdAt: log.createdAt
        });
      }

      const seen = new Set();
      const uniqueStatuses = allStatusEntries.filter(entry => {
        const key = `${entry.transactionId}_${entry.status}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      uniqueStatuses.sort((a, b) => {
        if (a.transactionId.toString() === b.transactionId.toString()) {
          return new Date(a.createdAt) - new Date(b.createdAt);
        }
        return a.transactionId.toString().localeCompare(b.transactionId.toString());
      });

      res.status(200).json({
        message: 'All transaction histories retrieved successfully',
        transactions: uniqueStatuses,
        fullData: [...transactions, ...logbooks]
      });

    } catch (err) {
      console.error('Error fetching all transaction histories:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getTransactionDetails(req, res) {
    try {
      const { transactionId } = req.params;

      let transaction = await Transaction.findById(transactionId)
        .populate({
          path: 'cartID',
          populate: {
            path: 'brID',
            select: 'username firstname lastname'
          }
        })
        .populate({
          path: 'borrowedItems.eqID',
          select: 'name description image'
        });

      if (!transaction) {
        const Logbook = mongoose.model('Logbook');
        transaction = await Logbook.findById(transactionId)
          .populate({
            path: 'cartID',
            populate: {
              path: 'brID',
              select: 'username firstname lastname'
            }
          })
          .populate({
            path: 'borrowedItems.eqID',
            select: 'name description image'
          });
      }

      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }

      const detailedTransaction = {
        transactionId: transaction._id,
        borrowerId: transaction.cartID?.brID?._id || 'Unknown',
        borrowerName: transaction.cartID?.brID ?
          `${transaction.cartID.brID.firstname} ${transaction.cartID.brID.lastname}` :
          'Unknown',
        currentStatus: transaction.currentStatus,
        appliedOn: transaction.dataApplied,
        approvedOn: transaction.dateApproved,
        pickUpDate: transaction.pickUpDate,
        borrowedOn: transaction.dateBorrowed,
        returnedOn: transaction.dateReturned,
        remarks: transaction.remarks,
        items: Array.isArray(transaction.borrowedItems) ?
          transaction.borrowedItems.map(item => ({
            equipmentId: item.eqID?._id || 'Unknown',
            name: item.eqID?.name || 'Unknown',
            quantity: item.quantity,
            dateOrdered: item.dateOrdered
          })) : []
      };

      res.status(200).json({
        message: 'Transaction details retrieved successfully',
        transaction: detailedTransaction
      });
    } catch (err) {
      console.error('Error fetching transaction details:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }

};

module.exports = transactionHistoryController;