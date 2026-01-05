const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Farmer = require('../models/Farmer');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/farmers
// @desc    Get all farmers
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { search, isActive, page = 1, limit = 50 } = req.query;
    
    const query = {};
    
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { village: { $regex: search, $options: 'i' } }
      ];
    }

    const farmers = await Farmer.find(query)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Farmer.countDocuments(query);

    res.json({
      success: true,
      count: farmers.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: farmers
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

// @route   GET /api/farmers/:id
// @desc    Get single farmer
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const farmer = await Farmer.findById(req.params.id);

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    res.json({
      success: true,
      data: farmer
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

// @route   POST /api/farmers
// @desc    Create a new farmer
// @access  Private/Admin, Trader
router.post('/', [
  protect,
  authorize('admin', 'trader'),
  body('name').notEmpty().withMessage('Farmer name is required')
], validate, async (req, res) => {
  try {
    const { name, phone, village, address, aadharNumber, bankAccount } = req.body;

    const farmer = await Farmer.create({
      name,
      phone,
      village,
      address,
      aadharNumber,
      bankAccount
    });

    res.status(201).json({
      success: true,
      message: 'Farmer created successfully',
      data: farmer
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

// @route   PUT /api/farmers/:id
// @desc    Update farmer
// @access  Private/Admin, Trader
router.put('/:id', [
  protect,
  authorize('admin', 'trader')
], async (req, res) => {
  try {
    const { name, phone, village, address, aadharNumber, bankAccount, isActive } = req.body;

    let farmer = await Farmer.findById(req.params.id);

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    farmer = await Farmer.findByIdAndUpdate(
      req.params.id,
      { name, phone, village, address, aadharNumber, bankAccount, isActive },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Farmer updated successfully',
      data: farmer
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

// @route   DELETE /api/farmers/:id
// @desc    Delete farmer (soft delete)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const farmer = await Farmer.findById(req.params.id);

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    // Soft delete
    farmer.isActive = false;
    await farmer.save();

    res.json({
      success: true,
      message: 'Farmer deactivated successfully'
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
