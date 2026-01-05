const mongoose = require('mongoose');

const farmerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Farmer name is required'],
    trim: true
  },
  phone: {
    type: String
  },
  village: {
    type: String
  },
  address: {
    type: String
  },
  aadharNumber: {
    type: String
  },
  bankAccount: {
    accountNumber: String,
    bankName: String,
    ifscCode: String
  },
  balance: {
    type: Number,
    default: 0 // Amount pending to pay
  },
  totalBusiness: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
farmerSchema.index({ name: 'text', village: 'text' });

module.exports = mongoose.model('Farmer', farmerSchema);
