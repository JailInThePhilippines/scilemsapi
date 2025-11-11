const mongoose = require('mongoose');

const LabSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
}, { timestamps: true });

module.exports = mongoose.model('Lab', LabSchema);
