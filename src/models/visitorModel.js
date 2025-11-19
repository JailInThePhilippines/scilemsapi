const mongoose = require('mongoose');

const VisitorSchema = new mongoose.Schema({
  sessionToken: { type: String, required: true, index: true },
  latitude: { type: Number },
  longitude: { type: Number },
  accuracy: { type: Number },
  ip: { type: String },
  userAgent: { type: String },
  country: { type: String },
  region: { type: String },
  city: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Visitor', VisitorSchema);
