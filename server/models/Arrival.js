const mongoose = require('mongoose');

const arrivalSchema = new mongoose.Schema({
  arrivalNumber: {
    type: String,
    unique: true
  },
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
    required: [true, 'Farmer is required']
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
    ratePerUnit: {
      type: Number,
      required: true,
      min: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    soldQuantity: {
      type: Number,
      default: 0
    },
    wastedQuantity: {
      type: Number,
      default: 0
    },
    remainingQuantity: {
      type: Number,
      default: 0
    }
  }],
  totalQuantity: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  commissionRate: {
    type: Number,
    default: 5
  },
  commissionAmount: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number,
    default: 0 // Amount payable to farmer after commission
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending'
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
  },
  vehicleNumber: {
    type: String
  }
}, {
  timestamps: true
});

// Generate arrival number before saving
arrivalSchema.pre('save', async function(next) {
  if (!this.arrivalNumber) {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const count = await mongoose.model('Arrival').countDocuments({
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999))
      }
    });
    this.arrivalNumber = `ARR-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
  
  // Calculate totals
  this.totalQuantity = this.items.reduce((sum, item) => sum + item.quantity, 0);
  this.items.forEach(item => {
    item.totalAmount = item.quantity * item.ratePerUnit;
    item.remainingQuantity = item.quantity - item.soldQuantity - item.wastedQuantity;
  });
  this.totalAmount = this.items.reduce((sum, item) => sum + item.totalAmount, 0);
  this.commissionAmount = (this.totalAmount * this.commissionRate) / 100;
  this.netAmount = this.totalAmount - this.commissionAmount;
  
  next();
});

// Indexes
arrivalSchema.index({ date: -1 });
arrivalSchema.index({ farmer: 1 });
arrivalSchema.index({ trader: 1 });
arrivalSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Arrival', arrivalSchema);
