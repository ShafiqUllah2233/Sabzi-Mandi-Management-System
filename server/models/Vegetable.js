const mongoose = require('mongoose');

const vegetableSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vegetable name is required'],
    trim: true
  },
  nameHindi: {
    type: String,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  unit: {
    type: String,
    enum: ['kg', 'gram', 'dozen', 'piece', 'crate', 'sack', 'bundle'],
    default: 'kg'
  },
  currentPrice: {
    type: Number,
    default: 0
  },
  minPrice: {
    type: Number,
    default: 0
  },
  maxPrice: {
    type: Number,
    default: 0
  },
  image: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSeasonal: {
    type: Boolean,
    default: false
  },
  season: {
    type: String,
    enum: ['summer', 'winter', 'monsoon', 'all'],
    default: 'all'
  }
}, {
  timestamps: true
});

// Index for faster queries
vegetableSchema.index({ name: 'text', nameHindi: 'text' });
vegetableSchema.index({ category: 1 });

module.exports = mongoose.model('Vegetable', vegetableSchema);
