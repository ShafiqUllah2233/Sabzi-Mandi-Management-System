const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Vegetable = require('../models/Vegetable');
const Stock = require('../models/Stock');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/vegetables
// @desc    Get all vegetables
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { category, isActive, search, page = 1, limit = 50 } = req.query;
    
    const query = {};
    
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nameHindi: { $regex: search, $options: 'i' } }
      ];
    }

    const vegetables = await Vegetable.find(query)
      .populate('category', 'name nameHindi')
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Vegetable.countDocuments(query);

    res.json({
      success: true,
      count: vegetables.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: vegetables
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

// @route   GET /api/vegetables/:id
// @desc    Get single vegetable
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const vegetable = await Vegetable.findById(req.params.id)
      .populate('category', 'name nameHindi');

    if (!vegetable) {
      return res.status(404).json({
        success: false,
        message: 'Vegetable not found'
      });
    }

    // Get stock info
    const stock = await Stock.findOne({ vegetable: req.params.id });

    res.json({
      success: true,
      data: {
        ...vegetable.toObject(),
        stock: stock ? stock.quantity : 0,
        isLowStock: stock ? stock.isLowStock : false
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

// @route   POST /api/vegetables
// @desc    Create a new vegetable
// @access  Private/Admin
router.post('/', [
  protect,
  authorize('admin'),
  body('name').notEmpty().withMessage('Vegetable name is required'),
  body('category').notEmpty().withMessage('Category is required')
], validate, async (req, res) => {
  try {
    const { name, nameHindi, category, unit, currentPrice, minPrice, maxPrice, isSeasonal, season } = req.body;

    // Check if vegetable exists
    let vegetable = await Vegetable.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (vegetable) {
      return res.status(400).json({
        success: false,
        message: 'Vegetable already exists'
      });
    }

    vegetable = await Vegetable.create({
      name,
      nameHindi,
      category,
      unit: unit || 'kg',
      currentPrice: currentPrice || 0,
      minPrice: minPrice || 0,
      maxPrice: maxPrice || 0,
      isSeasonal: isSeasonal || false,
      season: season || 'all'
    });

    // Initialize stock for this vegetable
    await Stock.create({
      vegetable: vegetable._id,
      quantity: 0,
      unit: vegetable.unit
    });

    await vegetable.populate('category', 'name nameHindi');

    res.status(201).json({
      success: true,
      message: 'Vegetable created successfully',
      data: vegetable
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

// @route   PUT /api/vegetables/:id
// @desc    Update vegetable
// @access  Private/Admin
router.put('/:id', [
  protect,
  authorize('admin')
], async (req, res) => {
  try {
    const { name, nameHindi, category, unit, currentPrice, minPrice, maxPrice, isSeasonal, season, isActive } = req.body;

    let vegetable = await Vegetable.findById(req.params.id);

    if (!vegetable) {
      return res.status(404).json({
        success: false,
        message: 'Vegetable not found'
      });
    }

    vegetable = await Vegetable.findByIdAndUpdate(
      req.params.id,
      { name, nameHindi, category, unit, currentPrice, minPrice, maxPrice, isSeasonal, season, isActive },
      { new: true, runValidators: true }
    ).populate('category', 'name nameHindi');

    res.json({
      success: true,
      message: 'Vegetable updated successfully',
      data: vegetable
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

// @route   DELETE /api/vegetables/:id
// @desc    Delete vegetable (soft delete)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const vegetable = await Vegetable.findById(req.params.id);

    if (!vegetable) {
      return res.status(404).json({
        success: false,
        message: 'Vegetable not found'
      });
    }

    // Soft delete
    vegetable.isActive = false;
    await vegetable.save();

    res.json({
      success: true,
      message: 'Vegetable deactivated successfully'
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

// @route   PUT /api/vegetables/:id/price
// @desc    Update vegetable price
// @access  Private/Admin, Trader
router.put('/:id/price', [
  protect,
  authorize('admin', 'trader'),
  body('currentPrice').isNumeric().withMessage('Price must be a number')
], validate, async (req, res) => {
  try {
    const { currentPrice } = req.body;

    let vegetable = await Vegetable.findById(req.params.id);

    if (!vegetable) {
      return res.status(404).json({
        success: false,
        message: 'Vegetable not found'
      });
    }

    // Update price and track min/max
    vegetable.currentPrice = currentPrice;
    if (currentPrice < vegetable.minPrice || vegetable.minPrice === 0) {
      vegetable.minPrice = currentPrice;
    }
    if (currentPrice > vegetable.maxPrice) {
      vegetable.maxPrice = currentPrice;
    }

    await vegetable.save();

    res.json({
      success: true,
      message: 'Price updated successfully',
      data: vegetable
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
