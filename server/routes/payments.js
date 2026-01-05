const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Payment = require('../models/Payment');
const Farmer = require('../models/Farmer');
const User = require('../models/User');
const Arrival = require('../models/Arrival');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/payments
// @desc    Get all payments
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { type, farmer, vendor, trader, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    const query = {};
    
    if (type) query.type = type;
    if (farmer) query.farmer = farmer;
    if (vendor) query.vendor = vendor;
    if (trader) query.trader = trader;
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const payments = await Payment.find(query)
      .populate('farmer', 'name phone')
      .populate('vendor', 'name phone shopNumber')
      .populate('trader', 'name phone shopNumber')
      .populate('receivedBy', 'name')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      count: payments.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: payments
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

// @route   GET /api/payments/:id
// @desc    Get single payment
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('farmer', 'name phone village')
      .populate('vendor', 'name phone shopNumber')
      .populate('trader', 'name phone shopNumber')
      .populate('arrival')
      .populate('sale')
      .populate('receivedBy', 'name');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
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

// @route   POST /api/payments/farmer
// @desc    Make payment to farmer
// @access  Private/Admin, Trader
router.post('/farmer', [
  protect,
  authorize('admin', 'trader'),
  body('farmer').notEmpty().withMessage('Farmer is required'),
  body('amount').isNumeric().withMessage('Amount is required')
], validate, async (req, res) => {
  try {
    const { farmer, amount, paymentMode, reference, description, arrival } = req.body;

    // Get farmer
    const farmerDoc = await Farmer.findById(farmer);
    if (!farmerDoc) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    const balanceBefore = farmerDoc.balance;

    // Create payment
    const payment = await Payment.create({
      type: 'farmer_payment',
      farmer,
      arrival,
      amount,
      paymentMode: paymentMode || 'cash',
      transactionType: 'debit',
      balanceBefore,
      balanceAfter: balanceBefore - amount,
      description: description || `Payment to farmer`,
      receivedBy: req.user._id,
      reference
    });

    // Update farmer balance
    farmerDoc.balance -= amount;
    await farmerDoc.save();

    // Update arrival payment status if provided
    if (arrival) {
      const arrivalDoc = await Arrival.findById(arrival);
      if (arrivalDoc) {
        arrivalDoc.paidAmount += amount;
        if (arrivalDoc.paidAmount >= arrivalDoc.netAmount) {
          arrivalDoc.paymentStatus = 'paid';
        } else if (arrivalDoc.paidAmount > 0) {
          arrivalDoc.paymentStatus = 'partial';
        }
        await arrivalDoc.save();
      }
    }

    await payment.populate('farmer', 'name phone');
    await payment.populate('receivedBy', 'name');

    res.status(201).json({
      success: true,
      message: 'Payment to farmer recorded successfully',
      data: payment
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

// @route   POST /api/payments/vendor
// @desc    Receive payment from vendor
// @access  Private/Admin, Trader
router.post('/vendor', [
  protect,
  authorize('admin', 'trader'),
  body('vendor').notEmpty().withMessage('Vendor is required'),
  body('amount').isNumeric().withMessage('Amount is required')
], validate, async (req, res) => {
  try {
    const { vendor, amount, paymentMode, reference, description, sale } = req.body;

    // Get vendor
    const vendorDoc = await User.findById(vendor);
    if (!vendorDoc) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const balanceBefore = vendorDoc.balance;

    // Create payment
    const payment = await Payment.create({
      type: 'vendor_payment',
      vendor,
      sale,
      amount,
      paymentMode: paymentMode || 'cash',
      transactionType: 'credit',
      balanceBefore,
      balanceAfter: balanceBefore - amount,
      description: description || `Payment received from vendor`,
      receivedBy: req.user._id,
      reference
    });

    // Update vendor balance
    vendorDoc.balance -= amount;
    await vendorDoc.save();

    await payment.populate('vendor', 'name phone shopNumber');
    await payment.populate('receivedBy', 'name');

    res.status(201).json({
      success: true,
      message: 'Payment from vendor recorded successfully',
      data: payment
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

// @route   GET /api/payments/farmer/:farmerId/ledger
// @desc    Get farmer ledger
// @access  Private
router.get('/farmer/:farmerId/ledger', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = { farmer: req.params.farmerId };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const payments = await Payment.find(query)
      .sort({ date: -1 });

    const farmer = await Farmer.findById(req.params.farmerId);

    // Get all arrivals for this farmer
    const arrivals = await Arrival.find({ farmer: req.params.farmerId })
      .select('arrivalNumber totalAmount netAmount commissionAmount paidAmount paymentStatus date')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: {
        farmer,
        currentBalance: farmer?.balance || 0,
        payments,
        arrivals
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

// @route   GET /api/payments/vendor/:vendorId/ledger
// @desc    Get vendor ledger
// @access  Private
router.get('/vendor/:vendorId/ledger', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = { vendor: req.params.vendorId };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const payments = await Payment.find(query)
      .sort({ date: -1 });

    const vendor = await User.findById(req.params.vendorId);

    // Get all sales for this vendor
    const Sale = require('../models/Sale');
    const sales = await Sale.find({ vendor: req.params.vendorId })
      .select('saleNumber totalAmount paidAmount paymentStatus date')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: {
        vendor,
        currentBalance: vendor?.balance || 0,
        payments,
        sales
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

// @route   GET /api/payments/summary
// @desc    Get payment summary
// @access  Private
router.get('/today/summary', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const summary = await Payment.aggregate([
      {
        $match: {
          date: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: summary
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
