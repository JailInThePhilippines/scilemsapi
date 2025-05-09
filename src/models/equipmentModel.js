const mongoose = require('mongoose');

const EquipmentSchema = new mongoose.Schema({
  catID: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  name: { type: String, required: true },
  stock: { type: Number, required: true },
  description: String,
  image: String,
  ytLink: String
}, {
  timestamps: {
    createdAt: 'dateAdded',
    updatedAt: 'dateUpdated'
  }
});

module.exports = mongoose.model('Equipment', EquipmentSchema);