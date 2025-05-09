const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  cartID: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart', required: true },
  borrowedItems: [{
    eqID: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
    quantity: { type: Number, required: true },
    dateOrdered: { type: Date }
  }],
  currentStatus: {
    type: String,
    enum: ['applying', 'approved', 'borrowed', 'returned', 'archive', 'declined', 'deleted', 'pending'],
    required: true
  },
  dataApplied: { type: Date },
  dateApproved: { type: Date },
  pickUpDate: { type: Date },
  dateBorrowed: { type: Date },
  returnDate: { type: Date },
  dateReturned: { type: Date },
  dateArchived: { type: Date },
  lastStatus: { type: String },
  remarks: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', TransactionSchema);