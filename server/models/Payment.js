const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentNumber: {
    type: String,
    unique: true
  },
  type: {
    type: String,
    enum: ['farmer_payment', 'vendor_payment', 'commission_payment', 'expense', 'income'],
    required: true
  },
  // Reference based on type
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer'
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  trader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Related documents
  arrival: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Arrival'
  },
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale'
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMode: {
    type: String,
    enum: ['cash', 'upi', 'bank', 'cheque'],
    default: 'cash'
  },
  transactionType: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  balanceBefore: {
    type: Number,
    default: 0
  },
  balanceAfter: {
    type: Number,
    default: 0
  },
  date: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reference: {
    type: String // Cheque number, UPI ID, etc.
  }
}, {
  timestamps: true
});

// Generate payment number before saving
paymentSchema.pre('save', async function(next) {
  if (!this.paymentNumber) {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const count = await mongoose.model('Payment').countDocuments({
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999))
      }
    });
    this.paymentNumber = `PAY-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Indexes
paymentSchema.index({ date: -1 });
paymentSchema.index({ type: 1 });
paymentSchema.index({ farmer: 1 });
paymentSchema.index({ vendor: 1 });
paymentSchema.index({ trader: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
