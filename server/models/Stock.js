const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  vegetable: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vegetable',
    required: true
  },
  quantity: {
    type: Number,
    default: 0,
    min: 0
  },
  unit: {
    type: String,
    enum: ['kg', 'gram', 'dozen', 'piece', 'crate', 'sack', 'bundle'],
    default: 'kg'
  },
  avgPurchaseRate: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  minStockLevel: {
    type: Number,
    default: 10
  },
  isLowStock: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Update low stock status
stockSchema.pre('save', function(next) {
  this.isLowStock = this.quantity <= this.minStockLevel;
  this.lastUpdated = Date.now();
  next();
});

// Index for faster queries
stockSchema.index({ vegetable: 1 }, { unique: true });
stockSchema.index({ isLowStock: 1 });

module.exports = mongoose.model('Stock', stockSchema);
