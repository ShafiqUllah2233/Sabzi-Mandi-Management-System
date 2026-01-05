const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  saleNumber: {
    type: String,
    unique: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Vendor is required']
  },
  trader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Trader is required']
  },
  items: [{
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
    purchaseRate: {
      type: Number,
      default: 0
    },
    saleRate: {
      type: Number,
      required: true,
      min: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    profit: {
      type: Number,
      default: 0
    }
  }],
  totalQuantity: {
    type: Number,
    default: 0
  },
  subtotal: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  totalProfit: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending'
  },
  paymentMode: {
    type: String,
    enum: ['cash', 'upi', 'credit', 'bank'],
    default: 'cash'
  },
  paidAmount: {
    type: Number,
    default: 0
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

// Generate sale number before saving
saleSchema.pre('save', async function(next) {
  if (!this.saleNumber) {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const count = await mongoose.model('Sale').countDocuments({
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999))
      }
    });
    this.saleNumber = `SALE-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
  
  // Calculate totals
  this.totalQuantity = this.items.reduce((sum, item) => sum + item.quantity, 0);
  this.items.forEach(item => {
    item.totalAmount = item.quantity * item.saleRate;
    item.profit = (item.saleRate - item.purchaseRate) * item.quantity;
  });
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalAmount, 0);
  this.totalAmount = this.subtotal - this.discount;
  this.totalProfit = this.items.reduce((sum, item) => sum + item.profit, 0);
  
  next();
});

// Indexes
saleSchema.index({ date: -1 });
saleSchema.index({ vendor: 1 });
saleSchema.index({ trader: 1 });
saleSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Sale', saleSchema);
