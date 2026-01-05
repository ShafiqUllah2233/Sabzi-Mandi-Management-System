const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Sale = require('../models/Sale');
const Stock = require('../models/Stock');
const Arrival = require('../models/Arrival');
const User = require('../models/User');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/sales
// @desc    Get all sales
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { vendor, trader, date, startDate, endDate, paymentStatus, page = 1, limit = 20 } = req.query;
    
    const query = {};
    
    if (vendor) query.vendor = vendor;
    if (trader) query.trader = trader;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    
    // For trader role, only show their sales
    if (req.user.role === 'trader') {
      query.trader = req.user._id;
    }
    
    // For vendor role, only show their purchases
    if (req.user.role === 'vendor') {
      query.vendor = req.user._id;
    }
    
    if (date) {
      const dateObj = new Date(date);
      query.date = {
        $gte: new Date(dateObj.setHours(0, 0, 0, 0)),
        $lt: new Date(dateObj.setHours(23, 59, 59, 999))
      };
    } else if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const sales = await Sale.find(query)
      .populate('vendor', 'name phone shopNumber')
      .populate('trader', 'name phone shopNumber')
      .populate('items.vegetable', 'name nameHindi unit')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Sale.countDocuments(query);

    res.json({
      success: true,
      count: sales.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: sales
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/sales/:id
// @desc    Get single sale
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('vendor', 'name phone shopNumber address')
      .populate('trader', 'name phone shopNumber')
      .populate('items.vegetable', 'name nameHindi unit currentPrice');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/sales
// @desc    Create a new sale
// @access  Private/Admin, Trader
router.post('/', [
  protect,
  authorize('admin', 'trader'),
  body('vendor').notEmpty().withMessage('Vendor is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required')
], validate, async (req, res) => {
  try {
    const { vendor, items, date, discount, paymentMode, paidAmount, notes } = req.body;

    // Check stock availability and get purchase rates
    const processedItems = [];
    for (const item of items) {
      const stock = await Stock.findOne({ vegetable: item.vegetable });
      
      if (!stock || stock.quantity < item.quantity) {
        const Vegetable = require('../models/Vegetable');
        const veg = await Vegetable.findById(item.vegetable);
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${veg ? veg.name : 'vegetable'}. Available: ${stock ? stock.quantity : 0} ${item.unit || 'kg'}`
        });
      }

      processedItems.push({
        vegetable: item.vegetable,
        quantity: item.quantity,
        unit: item.unit || 'kg',
        purchaseRate: stock.avgPurchaseRate,
        saleRate: item.saleRate
      });
    }

    // Create sale
    const sale = await Sale.create({
      vendor,
      trader: req.user._id,
      items: processedItems,
      date: date || Date.now(),
      discount: discount || 0,
      paymentMode: paymentMode || 'cash',
      paidAmount: paidAmount || 0,
      notes
    });

    // Update payment status
    if (sale.paidAmount >= sale.totalAmount) {
      sale.paymentStatus = 'paid';
    } else if (sale.paidAmount > 0) {
      sale.paymentStatus = 'partial';
    }
    await sale.save();

    // Update stock
    for (const item of sale.items) {
      await Stock.findOneAndUpdate(
        { vegetable: item.vegetable },
        { $inc: { quantity: -item.quantity } }
      );
    }

    // Update vendor balance if credit sale
    if (sale.paymentStatus !== 'paid') {
      await User.findByIdAndUpdate(vendor, {
        $inc: { balance: sale.totalAmount - sale.paidAmount }
      });
    }

    await sale.populate('vendor', 'name phone shopNumber');
    await sale.populate('trader', 'name phone shopNumber');
    await sale.populate('items.vegetable', 'name nameHindi unit');

    res.status(201).json({
      success: true,
      message: 'Sale recorded successfully',
      data: sale
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/sales/:id/payment
// @desc    Record payment for a sale
// @access  Private/Admin, Trader
router.put('/:id/payment', [
  protect,
  authorize('admin', 'trader'),
  body('amount').isNumeric().withMessage('Amount is required')
], validate, async (req, res) => {
  try {
    const { amount, paymentMode } = req.body;

    let sale = await Sale.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    const previousPaid = sale.paidAmount;
    sale.paidAmount += amount;
    sale.paymentMode = paymentMode || sale.paymentMode;

    // Update payment status
    if (sale.paidAmount >= sale.totalAmount) {
      sale.paidAmount = sale.totalAmount;
      sale.paymentStatus = 'paid';
    } else if (sale.paidAmount > 0) {
      sale.paymentStatus = 'partial';
    }

    await sale.save();

    // Update vendor balance
    await User.findByIdAndUpdate(sale.vendor, {
      $inc: { balance: -(sale.paidAmount - previousPaid) }
    });

    // Create payment record
    const Payment = require('../models/Payment');
    await Payment.create({
      type: 'vendor_payment',
      vendor: sale.vendor,
      sale: sale._id,
      amount: amount,
      paymentMode: paymentMode || 'cash',
      transactionType: 'credit',
      receivedBy: req.user._id,
      description: `Payment received for sale ${sale.saleNumber}`
    });

    await sale.populate('vendor', 'name phone shopNumber');
    await sale.populate('trader', 'name phone shopNumber');

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: sale
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/sales/today/summary
// @desc    Get today's sales summary
// @access  Private
router.get('/today/summary', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const query = {
      date: { $gte: today, $lt: tomorrow }
    };

    if (req.user.role === 'trader') {
      query.trader = req.user._id;
    }

    const sales = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalQuantity: { $sum: '$totalQuantity' },
          totalAmount: { $sum: '$totalAmount' },
          totalProfit: { $sum: '$totalProfit' },
          totalPaid: { $sum: '$paidAmount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: sales[0] || {
        totalSales: 0,
        totalQuantity: 0,
        totalAmount: 0,
        totalProfit: 0,
        totalPaid: 0
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
