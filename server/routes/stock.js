const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Stock = require('../models/Stock');
const Wastage = require('../models/Wastage');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/stock
// @desc    Get all stock items
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { lowStock, vegetable } = req.query;
    
    const query = {};
    
    if (lowStock === 'true') query.isLowStock = true;
    if (vegetable) query.vegetable = vegetable;

    const stocks = await Stock.find(query)
      .populate('vegetable', 'name nameHindi unit category currentPrice')
      .sort({ quantity: 1 });

    res.json({
      success: true,
      count: stocks.length,
      data: stocks
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

// @route   GET /api/stock/low
// @desc    Get low stock alerts
// @access  Private
router.get('/low', protect, async (req, res) => {
  try {
    const lowStocks = await Stock.find({ isLowStock: true })
      .populate('vegetable', 'name nameHindi unit')
      .sort({ quantity: 1 });

    res.json({
      success: true,
      count: lowStocks.length,
      data: lowStocks
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

// @route   GET /api/stock/summary
// @desc    Get stock summary
// @access  Private
router.get('/summary', protect, async (req, res) => {
  try {
    const summary = await Stock.aggregate([
      {
        $lookup: {
          from: 'vegetables',
          localField: 'vegetable',
          foreignField: '_id',
          as: 'vegetableInfo'
        }
      },
      { $unwind: '$vegetableInfo' },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$avgPurchaseRate'] } },
          lowStockCount: {
            $sum: { $cond: ['$isLowStock', 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: summary[0] || {
        totalItems: 0,
        totalQuantity: 0,
        totalValue: 0,
        lowStockCount: 0
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

// @route   PUT /api/stock/:vegetableId
// @desc    Update stock manually (adjustment)
// @access  Private/Admin
router.put('/:vegetableId', [
  protect,
  authorize('admin'),
  body('quantity').isNumeric().withMessage('Quantity is required')
], validate, async (req, res) => {
  try {
    const { quantity, reason } = req.body;

    let stock = await Stock.findOne({ vegetable: req.params.vegetableId });

    if (!stock) {
      stock = await Stock.create({
        vegetable: req.params.vegetableId,
        quantity: quantity
      });
    } else {
      stock.quantity = quantity;
      await stock.save();
    }

    await stock.populate('vegetable', 'name nameHindi unit');

    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: stock
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

// @route   PUT /api/stock/:vegetableId/min-level
// @desc    Update minimum stock level
// @access  Private/Admin
router.put('/:vegetableId/min-level', [
  protect,
  authorize('admin'),
  body('minStockLevel').isNumeric().withMessage('Minimum stock level is required')
], validate, async (req, res) => {
  try {
    const { minStockLevel } = req.body;

    let stock = await Stock.findOne({ vegetable: req.params.vegetableId });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stock record not found'
      });
    }

    stock.minStockLevel = minStockLevel;
    stock.isLowStock = stock.quantity <= minStockLevel;
    await stock.save();

    await stock.populate('vegetable', 'name nameHindi unit');

    res.json({
      success: true,
      message: 'Minimum stock level updated',
      data: stock
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

// @route   POST /api/stock/wastage
// @desc    Record wastage
// @access  Private/Admin, Trader
router.post('/wastage', [
  protect,
  authorize('admin', 'trader'),
  body('vegetable').notEmpty().withMessage('Vegetable is required'),
  body('quantity').isNumeric().withMessage('Quantity is required'),
  body('reason').notEmpty().withMessage('Reason is required')
], validate, async (req, res) => {
  try {
    const { vegetable, quantity, reason, notes, arrival } = req.body;

    // Check stock
    const stock = await Stock.findOne({ vegetable });
    if (!stock || stock.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${stock ? stock.quantity : 0}`
      });
    }

    // Create wastage record
    const wastage = await Wastage.create({
      vegetable,
      quantity,
      reason,
      notes,
      arrival,
      reportedBy: req.user._id,
      estimatedLoss: quantity * stock.avgPurchaseRate
    });

    // Update stock
    stock.quantity -= quantity;
    await stock.save();

    // Update arrival if provided
    if (arrival) {
      const Arrival = require('../models/Arrival');
      await Arrival.findOneAndUpdate(
        { _id: arrival, 'items.vegetable': vegetable },
        { $inc: { 'items.$.wastedQuantity': quantity } }
      );
    }

    await wastage.populate('vegetable', 'name nameHindi unit');
    await wastage.populate('reportedBy', 'name');

    res.status(201).json({
      success: true,
      message: 'Wastage recorded successfully',
      data: wastage
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

// @route   GET /api/stock/wastage
// @desc    Get wastage records
// @access  Private
router.get('/wastage', protect, async (req, res) => {
  try {
    const { startDate, endDate, vegetable, page = 1, limit = 20 } = req.query;
    
    const query = {};
    
    if (vegetable) query.vegetable = vegetable;
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const wastages = await Wastage.find(query)
      .populate('vegetable', 'name nameHindi unit')
      .populate('reportedBy', 'name')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Wastage.countDocuments(query);

    // Get total loss
    const totalLoss = await Wastage.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$estimatedLoss' } } }
    ]);

    res.json({
      success: true,
      count: wastages.length,
      total,
      totalLoss: totalLoss[0]?.total || 0,
      data: wastages
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
