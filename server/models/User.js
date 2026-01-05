const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  role: {
    type: String,
    enum: ['admin', 'trader', 'vendor', 'accountant'],
    default: 'vendor'
  },
  address: {
    type: String
  },
  shopNumber: {
    type: String
  },
  commissionRate: {
    type: Number,
    default: 5, // Default 5% commission for traders
    min: 0,
    max: 100
  },
  balance: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  avatar: {
    type: String
  }
}, {
  timestamps: true
});

// Index for faster queries
userSchema.index({ role: 1 });
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
