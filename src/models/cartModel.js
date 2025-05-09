const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
  brID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    eqID: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
    quantity: { type: Number, required: true },
    dateOrdered: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.model('Cart', CartSchema);