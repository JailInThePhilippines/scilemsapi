const mongoose = require('mongoose');

const LabRequestSchema = new mongoose.Schema({
  brID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Allow any lab name string so admin-managed labs (or existing misspellings) remain valid.
  lab: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'approved', 'declined', 'cancelled'], default: 'pending' },
  remarks: { type: String },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  dateApproved: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('LabRequest', LabRequestSchema);
