const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  cartID: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart', required: true },
  borrowedItems: [{
    eqID: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
    quantity: { type: Number, required: true },
    dateOrdered: { type: Date },
    // number of items actually returned for this borrowed item
    returnedQuantity: { type: Number, default: 0 }
  }],
  currentStatus: {
    type: String,
    enum: ['applying', 'approved', 'borrowed', 'returned', 'archive', 'declined', 'deleted', 'pending', 'restored'],
    required: true
  },
  displayId: { type: String, unique: true, sparse: true },
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

// Pre-save hook to generate displayId on first save (when applying)
TransactionSchema.pre('save', async function (next) {
  if (this.displayId) return next(); // already has a displayId

  const Transaction = this.constructor;
  const refDate = this.dataApplied || new Date();
  const yy = String(refDate.getFullYear()).slice(-2);
  const mm = String(refDate.getMonth() + 1).padStart(2, '0');
  const dd = String(refDate.getDate()).padStart(2, '0');
  const prefix = `GH${yy}-${mm}${dd}`;

  // Count how many transactions already have a displayId with this date prefix
  const count = await Transaction.countDocuments({
    displayId: { $regex: `^${prefix}` }
  });
  const seq = String(count + 1).padStart(2, '0');
  this.displayId = `${prefix}${seq}`;

  next();
});

module.exports = mongoose.model('Transaction', TransactionSchema);