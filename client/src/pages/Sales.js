import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiPlus, FiEye, FiCalendar, FiShoppingCart, FiX, FiDollarSign } from 'react-icons/fi';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vegetables, setVegetables] = useState([]);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [viewingSale, setViewingSale] = useState(null);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    paymentStatus: ''
  });
  const [formData, setFormData] = useState({
    vendor: '',
    discount: 0,
    paymentMode: 'cash',
    paidAmount: '',
    notes: '',
    items: [{ vegetable: '', quantity: '', saleRate: '' }]
  });
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMode: 'cash'
  });

  useEffect(() => {
    fetchSales();
    fetchVendors();
    fetchVegetables();
    fetchStock();
  }, [filters]);

  const fetchSales = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
      
      const response = await api.get(`/sales?${params.toString()}`);
      setSales(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch sales');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await api.get('/users/vendors');
      setVendors(response.data.data);
    } catch (error) {
      console.error('Failed to fetch vendors');
    }
  };

  const fetchVegetables = async () => {
    try {
      const response = await api.get('/vegetables?isActive=true');
      setVegetables(response.data.data);
    } catch (error) {
      console.error('Failed to fetch vegetables');
    }
  };

  const fetchStock = async () => {
    try {
      const response = await api.get('/stock');
      setStock(response.data.data);
    } catch (error) {
      console.error('Failed to fetch stock');
    }
  };

  const getStockForVegetable = (vegId) => {
    const stockItem = stock.find(s => s.vegetable?._id === vegId);
    return stockItem?.quantity || 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validItems = formData.items.filter(
      item => item.vegetable && item.quantity && item.saleRate
    );
    
    if (validItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      await api.post('/sales', {
        ...formData,
        items: validItems.map(item => ({
          vegetable: item.vegetable,
          quantity: parseFloat(item.quantity),
          saleRate: parseFloat(item.saleRate)
        })),
        paidAmount: parseFloat(formData.paidAmount) || 0,
        discount: parseFloat(formData.discount) || 0
      });
      toast.success('Sale recorded successfully');
      setShowModal(false);
      resetForm();
      fetchSales();
      fetchStock();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record sale');
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    try {
      await api.put(`/sales/${viewingSale._id}/payment`, {
        amount: parseFloat(paymentData.amount),
        paymentMode: paymentData.paymentMode
      });
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setPaymentData({ amount: '', paymentMode: 'cash' });
      fetchSales();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { vegetable: '', quantity: '', saleRate: '' }]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length === 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotal = () => {
    const subtotal = formData.items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.saleRate) || 0);
    }, 0);
    return subtotal - (parseFloat(formData.discount) || 0);
  };

  const viewSale = (sale) => {
    setViewingSale(sale);
    setShowViewModal(true);
  };

  const openPaymentModal = (sale) => {
    setViewingSale(sale);
    setPaymentData({
      amount: sale.totalAmount - sale.paidAmount,
      paymentMode: 'cash'
    });
    setShowPaymentModal(true);
  };

  const resetForm = () => {
    setFormData({
      vendor: '',
      discount: 0,
      paymentMode: 'cash',
      paidAmount: '',
      notes: '',
      items: [{ vegetable: '', quantity: '', saleRate: '' }]
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading sales...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Sales (बिक्री)</h1>
          <p className="page-subtitle">Record and manage vegetable sales to vendors</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <FiPlus /> New Sale
        </button>
      </div>

      {/* Filters */}
      <div className="filters card">
        <div className="filter-group">
          <div className="filter-item">
            <FiCalendar className="filter-icon" />
            <input
              type="date"
              className="form-input"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            />
          </div>
          <select
            className="form-select"
            value={filters.paymentStatus}
            onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Sale No.</th>
                <th>Date & Time</th>
                <th>Vendor</th>
                <th>Items</th>
                <th>Total Amount</th>
                <th>Paid</th>
                <th>Pending</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.length > 0 ? (
                sales.map((sale) => (
                  <tr key={sale._id}>
                    <td>
                      <span className="sale-number">{sale.saleNumber}</span>
                    </td>
                    <td>{formatDate(sale.date)}</td>
                    <td>
                      <div>
                        <p className="font-medium">{sale.vendor?.name}</p>
                        <p className="text-small">{sale.vendor?.shopNumber}</p>
                      </div>
                    </td>
                    <td>{sale.items?.length || 0} items</td>
                    <td className="font-medium">{formatCurrency(sale.totalAmount)}</td>
                    <td className="text-success">{formatCurrency(sale.paidAmount)}</td>
                    <td className="text-warning">
                      {formatCurrency(sale.totalAmount - sale.paidAmount)}
                    </td>
                    <td>
                      <span className={`badge badge-${
                        sale.paymentStatus === 'paid' ? 'success' : 
                        sale.paymentStatus === 'partial' ? 'warning' : 'danger'
                      }`}>
                        {sale.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-sm btn-outline" onClick={() => viewSale(sale)}>
                          <FiEye />
                        </button>
                        {sale.paymentStatus !== 'paid' && (
                          <button 
                            className="btn btn-sm btn-primary" 
                            onClick={() => openPaymentModal(sale)}
                          >
                            <FiDollarSign />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="empty-state">No sales found for this date</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Sale Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <FiShoppingCart /> New Sale Entry
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Vendor *</label>
                    <select
                      className="form-select"
                      value={formData.vendor}
                      onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                      required
                    >
                      <option value="">Select Vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor._id} value={vendor._id}>
                          {vendor.name} - {vendor.shopNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select
                      className="form-select"
                      value={formData.paymentMode}
                      onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="credit">Credit</option>
                      <option value="bank">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div className="items-section">
                  <div className="items-header">
                    <h4>Items</h4>
                    <button type="button" className="btn btn-sm btn-outline" onClick={addItem}>
                      <FiPlus /> Add Item
                    </button>
                  </div>
                  
                  {formData.items.map((item, index) => (
                    <div key={index} className="item-row">
                      <div className="item-veg-select">
                        <select
                          className="form-select"
                          value={item.vegetable}
                          onChange={(e) => updateItem(index, 'vegetable', e.target.value)}
                          required
                        >
                          <option value="">Select Vegetable</option>
                          {vegetables.map((veg) => (
                            <option key={veg._id} value={veg._id}>
                              {veg.name} (Stock: {getStockForVegetable(veg._id)} {veg.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        min="0"
                        step="0.01"
                        required
                      />
                      <input
                        type="number"
                        className="form-input"
                        placeholder="Rate"
                        value={item.saleRate}
                        onChange={(e) => updateItem(index, 'saleRate', e.target.value)}
                        min="0"
                        step="0.01"
                        required
                      />
                      <span className="item-total">
                        = {formatCurrency((item.quantity || 0) * (item.saleRate || 0))}
                      </span>
                      {formData.items.length > 1 && (
                        <button 
                          type="button" 
                          className="btn btn-sm btn-danger"
                          onClick={() => removeItem(index)}
                        >
                          <FiX />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Discount ($)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount Paid ($)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.paidAmount}
                      onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                      min="0"
                      placeholder={`Total: ${formatCurrency(calculateTotal())}`}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-textarea"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional notes..."
                    rows="2"
                  />
                </div>

                <div className="sale-total">
                  <span>Total Amount:</span>
                  <span className="total-value">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Record Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Sale Modal */}
      {showViewModal && viewingSale && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Sale Details - {viewingSale.saleNumber}</h3>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Vendor</label>
                  <p>{viewingSale.vendor?.name}</p>
                </div>
                <div className="detail-item">
                  <label>Shop No.</label>
                  <p>{viewingSale.vendor?.shopNumber || '-'}</p>
                </div>
                <div className="detail-item">
                  <label>Date</label>
                  <p>{formatDate(viewingSale.date)}</p>
                </div>
                <div className="detail-item">
                  <label>Payment Mode</label>
                  <p>{viewingSale.paymentMode}</p>
                </div>
              </div>

              <h4 className="section-title">Items</h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>Vegetable</th>
                    <th>Quantity</th>
                    <th>Rate</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingSale.items?.map((item, index) => (
                    <tr key={index}>
                      <td>{item.vegetable?.name}</td>
                      <td>{item.quantity} {item.unit}</td>
                      <td>{formatCurrency(item.saleRate)}/{item.unit}</td>
                      <td>{formatCurrency(item.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="summary-box">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>{formatCurrency(viewingSale.subtotal)}</span>
                </div>
                {viewingSale.discount > 0 && (
                  <div className="summary-row">
                    <span>Discount</span>
                    <span>- {formatCurrency(viewingSale.discount)}</span>
                  </div>
                )}
                <div className="summary-row total">
                  <span>Total Amount</span>
                  <span>{formatCurrency(viewingSale.totalAmount)}</span>
                </div>
                <div className="summary-row">
                  <span>Paid</span>
                  <span className="text-success">{formatCurrency(viewingSale.paidAmount)}</span>
                </div>
                <div className="summary-row pending">
                  <span>Pending</span>
                  <span>{formatCurrency(viewingSale.totalAmount - viewingSale.paidAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && viewingSale && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Record Payment</h3>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            <form onSubmit={handlePayment}>
              <div className="modal-body">
                <p className="payment-info">
                  <strong>Sale:</strong> {viewingSale.saleNumber}<br />
                  <strong>Vendor:</strong> {viewingSale.vendor?.name}<br />
                  <strong>Pending:</strong> {formatCurrency(viewingSale.totalAmount - viewingSale.paidAmount)}
                </p>
                <div className="form-group">
                  <label className="form-label">Amount ($) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    max={viewingSale.totalAmount - viewingSale.paidAmount}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Mode</label>
                  <select
                    className="form-select"
                    value={paymentData.paymentMode}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentMode: e.target.value })}
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowPaymentModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .page {
          max-width: 1400px;
          margin: 0 auto;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .page-header h1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }
        .page-subtitle {
          color: var(--gray);
        }
        .filters {
          margin-bottom: 1.5rem;
        }
        .filter-group {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .filter-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .filter-icon {
          color: var(--gray);
        }
        .sale-number {
          font-weight: 600;
          color: var(--secondary);
        }
        .font-medium {
          font-weight: 500;
        }
        .text-small {
          font-size: 0.75rem;
          color: var(--gray);
        }
        .text-success {
          color: var(--success);
        }
        .text-warning {
          color: var(--warning);
        }
        .action-btns {
          display: flex;
          gap: 0.5rem;
        }
        .modal-lg {
          max-width: 800px;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .items-section {
          margin: 1.5rem 0;
          padding: 1rem;
          background: var(--light-gray);
          border-radius: 0.5rem;
        }
        .items-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .items-header h4 {
          margin: 0;
        }
        .item-row {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        .item-veg-select {
          flex: 2;
        }
        .item-row .form-input {
          width: 100px;
        }
        .item-total {
          min-width: 100px;
          font-weight: 500;
          text-align: right;
        }
        .sale-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: var(--primary);
          color: white;
          border-radius: 0.5rem;
          font-size: 1.125rem;
        }
        .total-value {
          font-weight: 700;
          font-size: 1.5rem;
        }
        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .detail-item label {
          font-size: 0.75rem;
          color: var(--gray);
          text-transform: uppercase;
        }
        .detail-item p {
          font-weight: 500;
          margin-top: 0.25rem;
        }
        .section-title {
          margin: 1.5rem 0 1rem;
          font-size: 1rem;
        }
        .summary-box {
          margin-top: 1.5rem;
          padding: 1rem;
          background: var(--light-gray);
          border-radius: 0.5rem;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .summary-row:last-child {
          border-bottom: none;
        }
        .summary-row.total {
          font-weight: 700;
          font-size: 1.125rem;
          color: var(--primary);
        }
        .summary-row.pending {
          color: var(--warning);
          font-weight: 600;
        }
        .payment-info {
          padding: 1rem;
          background: var(--light-gray);
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          line-height: 1.8;
        }
      `}</style>
    </div>
  );
};

export default Sales;
