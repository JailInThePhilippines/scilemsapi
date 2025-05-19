// transactionLogger.js
const Transaction = require('../models/transactionModel');
const Logbook = require('../models/logBookModel');
const mongoose = require('mongoose');

/**
 * Logger utility for recording transaction status changes
 */
const transactionLogger = {
  /**
   * Log a transaction status change to the Logbook collection
   * 
   * @param {Object} transaction - The transaction document before status update
   * @param {Object} updateData - The data being used to update the transaction
   * @param {String} newStatus - The new status being set
   * @returns {Promise<Object>} - The created logbook entry
   */
  async logStatusChange(transaction, updateData, newStatus, actionStatus = null) {
    try {
      // Extract relevant data from the transaction
      const logEntry = {
        transactionID: transaction._id, // Link log to original transaction
        cartID: transaction.cartID,
        borrowedItems: transaction.borrowedItems,
        currentStatus: actionStatus || newStatus,
        lastStatus: transaction.currentStatus,
        dataApplied: transaction.dataApplied,

        // Include all date fields that may exist in the transaction
        dateApproved: updateData.$set?.dateApproved || transaction.dateApproved,
        pickUpDate: updateData.$set?.pickUpDate || transaction.pickUpDate,
        dateBorrowed: updateData.$set?.dateBorrowed || transaction.dateBorrowed,
        returnDate: updateData.$set?.returnDate || transaction.returnDate,
        dateReturned: updateData.$set?.dateReturned || transaction.dateReturned,
        dateArchived: updateData.$set?.dateArchived || transaction.dateArchived,

        // Include remarks if any
        remarks: updateData.$set?.remarks || transaction.remarks
      };

      // Create logbook entry
      const logbookEntry = await Logbook.create(logEntry);
      return logbookEntry;
    } catch (err) {
      console.error('Error logging transaction status change:', err);
      throw err;
    }
  },

  /**
   * Get history of status changes for a transaction
   * 
   * @param {String} cartId - The ID of the cart associated with the transaction
   * @returns {Promise<Array>} - Array of logbook entries for this transaction
   */
  async getTransactionHistory(cartId) {
    try {
      const history = await Logbook.find({ cartID: cartId })
        .populate({
          path: 'cartID',
          populate: {
            path: 'brID',
            model: 'User'
          }
        })
        .populate('borrowedItems.eqID')
        .sort({ createdAt: 1 });

      return history;
    } catch (err) {
      console.error('Error fetching transaction history:', err);
      throw err;
    }
  },

  /**
   * Create a snapshot of the transaction in its current state
   * 
   * @param {Object} transaction - The transaction document to snapshot
   * @returns {Promise<Object>} - The created logbook entry
   */
  async createSnapshot(transaction) {
    try {
      const logEntry = {
        cartID: transaction.cartID,
        borrowedItems: transaction.borrowedItems,
        currentStatus: transaction.currentStatus,
        lastStatus: transaction.lastStatus,
        dataApplied: transaction.dataApplied,
        dateApproved: transaction.dateApproved,
        pickUpDate: transaction.pickUpDate,
        dateBorrowed: transaction.dateBorrowed,
        returnDate: transaction.returnDate,
        dateReturned: transaction.dateReturned,
        dateArchived: transaction.dateArchived,
        remarks: transaction.remarks
      };

      const logbookEntry = await Logbook.create(logEntry);
      return logbookEntry;
    } catch (err) {
      console.error('Error creating transaction snapshot:', err);
      throw err;
    }
  }
};

module.exports = transactionLogger;