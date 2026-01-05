const express = require('express');
const router = express.Router();
const Arrival = require('../models/Arrival');
const Sale = require('../models/Sale');
const Stock = require('../models/Stock');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Farmer = require('../models/Farmer');
const Vegetable = require('../models/Vegetable');
const { protect } = require('../middleware/auth');

// @route   GET /api/dashboard
// @desc    Get dashboard summary
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's date query
    const todayQuery = { $gte: today, $lt: tomorrow };

    // Today's stats
    const todayArrivals = await Arrival.aggregate([
      { $match: { date: todayQuery } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalCommission: { $sum: '$commissionAmount' }
        }
      }
    ]);

    const todaySales = await Sale.aggregate([
      { $match: { date: todayQuery } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalProfit: { $sum: '$totalProfit' },
          cashReceived: { $sum: '$paidAmount' }
        }
      }
    ]);

    // Stock summary
    const stockSummary = await Stock.aggregate([
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalValue: { $sum: { $multiply: ['$quantity', '$avgPurchaseRate'] } },
          lowStockCount: { $sum: { $cond: ['$isLowStock', 1, 0] } }
        }
      }
    ]);

    // Pending payments
    const pendingFarmerPayments = await Farmer.aggregate([
      { $match: { balance: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$balance' } } }
    ]);

    const pendingVendorPayments = await User.aggregate([
      { $match: { role: 'vendor', balance: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$balance' } } }
    ]);

    // Counts
    const counts = {
      farmers: await Farmer.countDocuments({ isActive: true }),
      vendors: await User.countDocuments({ role: 'vendor', isActive: true }),
      traders: await User.countDocuments({ role: 'trader', isActive: true }),
      vegetables: await Vegetable.countDocuments({ isActive: true })
    };

    // Recent arrivals
    const recentArrivals = await Arrival.find()
      .populate('farmer', 'name')
      .populate('trader', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('arrivalNumber farmer trader totalAmount date paymentStatus');

    // Recent sales
    const recentSales = await Sale.find()
      .populate('vendor', 'name shopNumber')
      .populate('trader', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('saleNumber vendor trader totalAmount date paymentStatus');

    // Low stock alerts
    const lowStockAlerts = await Stock.find({ isLowStock: true })
      .populate('vegetable', 'name nameHindi unit')
      .limit(5)
      .select('vegetable quantity minStockLevel');

    res.json({
      success: true,
      data: {
        today: {
          arrivals: todayArrivals[0] || { count: 0, totalAmount: 0, totalCommission: 0 },
          sales: todaySales[0] || { count: 0, totalAmount: 0, totalProfit: 0, cashReceived: 0 }
        },
        stock: stockSummary[0] || { totalItems: 0, totalValue: 0, lowStockCount: 0 },
        payments: {
          farmerPending: pendingFarmerPayments[0]?.total || 0,
          vendorPending: pendingVendorPayments[0]?.total || 0
        },
        counts,
        recentArrivals,
        recentSales,
        lowStockAlerts
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

// @route   GET /api/dashboard/chart-data
// @desc    Get chart data for dashboard
// @access  Private
router.get('/chart-data', protect, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);

    // Daily sales for chart
    const dailySales = await Sale.aggregate([
      { $match: { date: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          sales: { $sum: '$totalAmount' },
          profit: { $sum: '$totalProfit' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Daily arrivals for chart
    const dailyArrivals = await Arrival.aggregate([
      { $match: { date: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          arrivals: { $sum: '$totalAmount' },
          commission: { $sum: '$commissionAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top selling vegetables (last 7 days)
    const topVegetables = await Sale.aggregate([
      { $match: { date: { $gte: startDate } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.vegetable',
          totalQuantity: { $sum: '$items.quantity' },
          totalAmount: { $sum: '$items.totalAmount' }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'vegetables',
          localField: '_id',
          foreignField: '_id',
          as: 'vegetable'
        }
      },
      { $unwind: '$vegetable' },
      {
        $project: {
          name: '$vegetable.name',
          totalQuantity: 1,
          totalAmount: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        dailySales,
        dailyArrivals,
        topVegetables
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
