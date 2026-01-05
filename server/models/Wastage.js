const mongoose = require('mongoose');

const wastageSchema = new mongoose.Schema({
  vegetable: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vegetable',
    required: true
  },
  arrival: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Arrival'
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    enum: ['kg', 'gram', 'dozen', 'piece', 'crate', 'sack', 'bundle'],
    default: 'kg'
  },
  reason: {
    type: String,
    enum: ['spoiled', 'damaged', 'expired', 'pest', 'other'],
    default: 'spoiled'
  },
  estimatedLoss: {
    type: Number,
    default: 0
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
wastageSchema.index({ date: -1 });
wastageSchema.index({ vegetable: 1 });

module.exports = mongoose.model('Wastage', wastageSchema);
