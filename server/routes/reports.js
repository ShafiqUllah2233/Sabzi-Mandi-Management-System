const express = require('express');
const router = express.Router();
const Arrival = require('../models/Arrival');
const Sale = require('../models/Sale');
const Stock = require('../models/Stock');
const Payment = require('../models/Payment');
const Wastage = require('../models/Wastage');
const User = require('../models/User');
const Farmer = require('../models/Farmer');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/reports/daily
// @desc    Get daily report
// @access  Private
router.get('/daily', protect, async (req, res) => {
  try {
    const { date } = req.query;
    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(reportDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const dateQuery = { $gte: reportDate, $lt: nextDay };

    // Arrivals
    const arrivalStats = await Arrival.aggregate([
      { $match: { date: dateQuery } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalQuantity: { $sum: '$totalQuantity' },
          totalAmount: { $sum: '$totalAmount' },
          totalCommission: { $sum: '$commissionAmount' }
        }
      }
    ]);

    // Sales
    const saleStats = await Sale.aggregate([
      { $match: { date: dateQuery } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalQuantity: { $sum: '$totalQuantity' },
          totalAmount: { $sum: '$totalAmount' },
          totalProfit: { $sum: '$totalProfit' },
          cashReceived: { $sum: '$paidAmount' }
        }
      }
    ]);

    // Payments
    const paymentStats = await Payment.aggregate([
      { $match: { date: dateQuery } },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Wastage
    const wastageStats = await Wastage.aggregate([
      { $match: { date: dateQuery } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalLoss: { $sum: '$estimatedLoss' }
        }
      }
    ]);

    // Top selling vegetables
    const topVegetables = await Sale.aggregate([
      { $match: { date: dateQuery } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.vegetable',
          totalQuantity: { $sum: '$items.quantity' },
          totalAmount: { $sum: '$items.totalAmount' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
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
          nameHindi: '$vegetable.nameHindi',
          totalQuantity: 1,
          totalAmount: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        date: reportDate,
        arrivals: arrivalStats[0] || { count: 0, totalQuantity: 0, totalAmount: 0, totalCommission: 0 },
        sales: saleStats[0] || { count: 0, totalQuantity: 0, totalAmount: 0, totalProfit: 0, cashReceived: 0 },
        payments: paymentStats,
        wastage: wastageStats[0] || { count: 0, totalQuantity: 0, totalLoss: 0 },
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

// @route   GET /api/reports/weekly
// @desc    Get weekly report
// @access  Private
router.get('/weekly', protect, async (req, res) => {
  try {
    const { startDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)
    
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const dateQuery = { $gte: start, $lt: end };

    // Daily breakdown
    const dailyArrivals = await Arrival.aggregate([
      { $match: { date: dateQuery } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalCommission: { $sum: '$commissionAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const dailySales = await Sale.aggregate([
      { $match: { date: dateQuery } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalProfit: { $sum: '$totalProfit' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Totals
    const totalArrivals = await Arrival.aggregate([
      { $match: { date: dateQuery } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalCommission: { $sum: '$commissionAmount' }
        }
      }
    ]);

    const totalSales = await Sale.aggregate([
      { $match: { date: dateQuery } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalProfit: { $sum: '$totalProfit' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        startDate: start,
        endDate: end,
        dailyArrivals,
        dailySales,
        totals: {
          arrivals: totalArrivals[0] || { count: 0, totalAmount: 0, totalCommission: 0 },
          sales: totalSales[0] || { count: 0, totalAmount: 0, totalProfit: 0 }
        }
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

// @route   GET /api/reports/monthly
// @desc    Get monthly report
// @access  Private
router.get('/monthly', protect, async (req, res) => {
  try {
    const { month, year } = req.query;
    const reportMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    const reportYear = year ? parseInt(year) : new Date().getFullYear();
    
    const start = new Date(reportYear, reportMonth, 1);
    const end = new Date(reportYear, reportMonth + 1, 1);

    const dateQuery = { $gte: start, $lt: end };

    // Arrivals by farmer
    const arrivalsByFarmer = await Arrival.aggregate([
      { $match: { date: dateQuery } },
      {
        $group: {
          _id: '$farmer',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalCommission: { $sum: '$commissionAmount' }
        }
      },
      {
        $lookup: {
          from: 'farmers',
          localField: '_id',
          foreignField: '_id',
          as: 'farmer'
        }
      },
      { $unwind: '$farmer' },
      {
        $project: {
          farmerName: '$farmer.name',
          count: 1,
          totalAmount: 1,
          totalCommission: 1
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 20 }
    ]);

    // Sales by vendor
    const salesByVendor = await Sale.aggregate([
      { $match: { date: dateQuery } },
      {
        $group: {
          _id: '$vendor',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalProfit: { $sum: '$totalProfit' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      { $unwind: '$vendor' },
      {
        $project: {
          vendorName: '$vendor.name',
          shopNumber: '$vendor.shopNumber',
          count: 1,
          totalAmount: 1,
          totalProfit: 1
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 20 }
    ]);

    // Daily breakdown
    const dailyStats = await Sale.aggregate([
      { $match: { date: dateQuery } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          sales: { $sum: '$totalAmount' },
          profit: { $sum: '$totalProfit' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Totals
    const totals = {
      arrivals: await Arrival.aggregate([
        { $match: { date: dateQuery } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
            totalCommission: { $sum: '$commissionAmount' }
          }
        }
      ]),
      sales: await Sale.aggregate([
        { $match: { date: dateQuery } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
            totalProfit: { $sum: '$totalProfit' }
          }
        }
      ]),
      wastage: await Wastage.aggregate([
        { $match: { date: dateQuery } },
        {
          $group: {
            _id: null,
            totalLoss: { $sum: '$estimatedLoss' }
          }
        }
      ])
    };

    res.json({
      success: true,
      data: {
        month: reportMonth + 1,
        year: reportYear,
        arrivalsByFarmer,
        salesByVendor,
        dailyStats,
        totals: {
          arrivals: totals.arrivals[0] || { count: 0, totalAmount: 0, totalCommission: 0 },
          sales: totals.sales[0] || { count: 0, totalAmount: 0, totalProfit: 0 },
          wastage: totals.wastage[0]?.totalLoss || 0
        }
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

// @route   GET /api/reports/profit-loss
// @desc    Get profit & loss report
// @access  Private/Admin
router.get('/profit-loss', protect, authorize('admin', 'accountant'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const dateQuery = { $gte: start, $lte: end };

    // Revenue (Sales)
    const sales = await Sale.aggregate([
      { $match: { date: dateQuery } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          totalProfit: { $sum: '$totalProfit' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Commission earned
    const commission = await Arrival.aggregate([
      { $match: { date: dateQuery } },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: '$commissionAmount' }
        }
      }
    ]);

    // Wastage/Losses
    const wastage = await Wastage.aggregate([
      { $match: { date: dateQuery } },
      {
        $group: {
          _id: null,
          totalLoss: { $sum: '$estimatedLoss' }
        }
      }
    ]);

    const salesData = sales[0] || { totalSales: 0, totalProfit: 0, count: 0 };
    const commissionData = commission[0] || { totalCommission: 0 };
    const wastageData = wastage[0] || { totalLoss: 0 };

    const totalRevenue = salesData.totalSales;
    const totalIncome = salesData.totalProfit + commissionData.totalCommission;
    const totalExpenses = wastageData.totalLoss;
    const netProfit = totalIncome - totalExpenses;

    res.json({
      success: true,
      data: {
        period: { start, end },
        revenue: {
          totalSales: salesData.totalSales,
          salesCount: salesData.count
        },
        income: {
          salesProfit: salesData.totalProfit,
          commission: commissionData.totalCommission,
          total: totalIncome
        },
        expenses: {
          wastage: wastageData.totalLoss,
          total: totalExpenses
        },
        summary: {
          totalRevenue,
          totalIncome,
          totalExpenses,
          netProfit,
          profitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0
        }
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

// @route   GET /api/reports/pending-payments
// @desc    Get pending payments report
// @access  Private
router.get('/pending-payments', protect, async (req, res) => {
  try {
    // Pending farmer payments
    const pendingFarmerPayments = await Farmer.find({ balance: { $gt: 0 } })
      .select('name phone village balance')
      .sort({ balance: -1 });

    // Pending vendor payments
    const pendingVendorPayments = await User.find({ 
      role: 'vendor', 
      balance: { $gt: 0 } 
    })
      .select('name phone shopNumber balance')
      .sort({ balance: -1 });

    const totalFarmerPending = pendingFarmerPayments.reduce((sum, f) => sum + f.balance, 0);
    const totalVendorPending = pendingVendorPayments.reduce((sum, v) => sum + v.balance, 0);

    res.json({
      success: true,
      data: {
        farmers: {
          list: pendingFarmerPayments,
          count: pendingFarmerPayments.length,
          totalPending: totalFarmerPending
        },
        vendors: {
          list: pendingVendorPayments,
          count: pendingVendorPayments.length,
          totalPending: totalVendorPending
        },
        summary: {
          totalPayable: totalFarmerPending,
          totalReceivable: totalVendorPending,
          netPosition: totalVendorPending - totalFarmerPending
        }
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
