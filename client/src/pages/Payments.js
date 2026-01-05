import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiPlus, FiSearch, FiCalendar, FiDollarSign, FiUser, FiTruck, FiEye } from 'react-icons/fi';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [ledgerData, setLedgerData] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    type: ''
  });
  const [formData, setFormData] = useState({
    paymentType: 'farmer',
    farmer: '',
    vendor: '',
    amount: '',
    paymentMode: 'cash',
    reference: '',
    notes: ''
  });

  useEffect(() => {
    fetchPayments();
    fetchFarmers();
    fetchVendors();
  }, [filters]);

  const fetchPayments = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.type) params.append('type', filters.type);
      
      const response = await api.get(`/payments?${params.toString()}`);
      setPayments(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchFarmers = async () => {
    try {
      const response = await api.get('/farmers?isActive=true');
      setFarmers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch farmers');
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

  const fetchLedger = async (type, id, name) => {
    try {
      const response = await api.get(`/payments/${type}/${id}/ledger`);
      setLedgerData({
        name,
        type,
        ...response.data.data
      });
      setShowLedgerModal(true);
    } catch (error) {
      toast.error('Failed to fetch ledger');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        amount: parseFloat(formData.amount),
        paymentMode: formData.paymentMode,
        reference: formData.reference,
        notes: formData.notes
      };

      if (formData.paymentType === 'farmer') {
        payload.type = 'farmer_payment';
        payload.farmer = formData.farmer;
      } else {
        payload.type = 'vendor_received';
        payload.vendor = formData.vendor;
      }

      await api.post('/payments', payload);
      toast.success('Payment recorded successfully');
      setShowModal(false);
      resetForm();
      fetchPayments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const resetForm = () => {
    setFormData({
      paymentType: 'farmer',
      farmer: '',
      vendor: '',
      amount: '',
      paymentMode: 'cash',
      reference: '',
      notes: ''
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

  const getPaymentTypeLabel = (type) => {
    const types = {
      farmer_payment: 'Farmer Payment',
      vendor_received: 'Vendor Payment',
      commission: 'Commission',
      expense: 'Expense'
    };
    return types[type] || type;
  };

  const filteredPayments = payments.filter(p => {
    if (activeTab === 'farmer') return p.type.includes('farmer');
    if (activeTab === 'vendor') return p.type.includes('vendor');
    return true;
  });

  // Calculate summary
  const summary = {
    totalFarmerPayments: payments
      .filter(p => p.type === 'farmer_payment')
      .reduce((sum, p) => sum + p.amount, 0),
    totalVendorReceipts: payments
      .filter(p => p.type === 'vendor_received')
      .reduce((sum, p) => sum + p.amount, 0),
    totalCommission: payments
      .filter(p => p.type === 'commission')
      .reduce((sum, p) => sum + p.amount, 0)
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading payments...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Payments (भुगतान)</h1>
          <p className="page-subtitle">Manage farmer and vendor payments</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <FiPlus /> New Payment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card farmer">
          <div className="summary-icon">
            <FiTruck />
          </div>
          <div>
            <p className="summary-label">Paid to Farmers</p>
            <p className="summary-value">{formatCurrency(summary.totalFarmerPayments)}</p>
          </div>
        </div>
        <div className="summary-card vendor">
          <div className="summary-icon">
            <FiUser />
          </div>
          <div>
            <p className="summary-label">Received from Vendors</p>
            <p className="summary-value">{formatCurrency(summary.totalVendorReceipts)}</p>
          </div>
        </div>
        <div className="summary-card commission">
          <div className="summary-icon">
            <FiDollarSign />
          </div>
          <div>
            <p className="summary-label">Commission Earned</p>
            <p className="summary-value">{formatCurrency(summary.totalCommission)}</p>
          </div>
        </div>
      </div>

      {/* Quick Ledger Access */}
      <div className="card ledger-section">
        <h3>Quick Ledger View</h3>
        <div className="ledger-grid">
          <div className="ledger-group">
            <h4><FiTruck /> Farmers</h4>
            <div className="ledger-list">
              {farmers.slice(0, 5).map(farmer => (
                <div 
                  key={farmer._id} 
                  className="ledger-item"
                  onClick={() => fetchLedger('farmer', farmer._id, farmer.name)}
                >
                  <span>{farmer.name}</span>
                  <span className={`balance ${farmer.balance >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(Math.abs(farmer.balance))}
                    {farmer.balance >= 0 ? ' Due' : ' Adv'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="ledger-group">
            <h4><FiUser /> Vendors</h4>
            <div className="ledger-list">
              {vendors.slice(0, 5).map(vendor => (
                <div 
                  key={vendor._id} 
                  className="ledger-item"
                  onClick={() => fetchLedger('vendor', vendor._id, vendor.name)}
                >
                  <span>{vendor.name}</span>
                  <span className={`balance ${vendor.balance >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(Math.abs(vendor.balance || 0))}
                    {(vendor.balance || 0) >= 0 ? ' Receivable' : ' Adv'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="card filters-card">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Payments
          </button>
          <button 
            className={`tab ${activeTab === 'farmer' ? 'active' : ''}`}
            onClick={() => setActiveTab('farmer')}
          >
            Farmer Payments
          </button>
          <button 
            className={`tab ${activeTab === 'vendor' ? 'active' : ''}`}
            onClick={() => setActiveTab('vendor')}
          >
            Vendor Receipts
          </button>
        </div>
        <div className="filter-row">
          <div className="filter-item">
            <FiCalendar />
            <input
              type="date"
              className="form-input"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
            <span>to</span>
            <input
              type="date"
              className="form-input"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Party</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>Reference</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <tr key={payment._id}>
                    <td>{formatDate(payment.date)}</td>
                    <td>
                      <span className={`type-badge ${payment.type}`}>
                        {getPaymentTypeLabel(payment.type)}
                      </span>
                    </td>
                    <td>
                      <div className="party-info">
                        <p className="party-name">
                          {payment.farmer?.name || payment.vendor?.name || '-'}
                        </p>
                        {payment.farmer?.village && (
                          <p className="party-sub">{payment.farmer.village}</p>
                        )}
                        {payment.vendor?.shopNumber && (
                          <p className="party-sub">Shop: {payment.vendor.shopNumber}</p>
                        )}
                      </div>
                    </td>
                    <td className="amount">{formatCurrency(payment.amount)}</td>
                    <td>
                      <span className="mode-badge">{payment.paymentMode}</span>
                    </td>
                    <td>{payment.reference || '-'}</td>
                    <td>{payment.notes || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="empty-state">No payments found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Payment Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <FiDollarSign /> New Payment
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Payment Type *</label>
                  <div className="radio-group">
                    <label className={`radio-label ${formData.paymentType === 'farmer' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="paymentType"
                        value="farmer"
                        checked={formData.paymentType === 'farmer'}
                        onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                      />
                      <FiTruck /> Pay to Farmer
                    </label>
                    <label className={`radio-label ${formData.paymentType === 'vendor' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="paymentType"
                        value="vendor"
                        checked={formData.paymentType === 'vendor'}
                        onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                      />
                      <FiUser /> Receive from Vendor
                    </label>
                  </div>
                </div>

                {formData.paymentType === 'farmer' ? (
                  <div className="form-group">
                    <label className="form-label">Farmer *</label>
                    <select
                      className="form-select"
                      value={formData.farmer}
                      onChange={(e) => setFormData({ ...formData, farmer: e.target.value })}
                      required
                    >
                      <option value="">Select Farmer</option>
                      {farmers.map((farmer) => (
                        <option key={farmer._id} value={farmer._id}>
                          {farmer.name} - {farmer.village} (Balance: {formatCurrency(farmer.balance)})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
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
                )}

                <div className="form-group">
                  <label className="form-label">Amount ($) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    min="1"
                    required
                  />
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
                    <option value="bank">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Reference / Transaction ID</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="e.g., UPI ref, Cheque no."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-textarea"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows="2"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
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

      {/* Ledger Modal */}
      {showLedgerModal && ledgerData && (
        <div className="modal-overlay" onClick={() => setShowLedgerModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                Ledger - {ledgerData.name}
              </h3>
              <button className="modal-close" onClick={() => setShowLedgerModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="ledger-summary">
                <div className="ledger-stat">
                  <label>Total {ledgerData.type === 'farmer' ? 'Arrivals' : 'Sales'}</label>
                  <p>{formatCurrency(ledgerData.totalAmount || 0)}</p>
                </div>
                <div className="ledger-stat">
                  <label>Total Paid</label>
                  <p>{formatCurrency(ledgerData.totalPaid || 0)}</p>
                </div>
                <div className="ledger-stat highlight">
                  <label>Balance</label>
                  <p>{formatCurrency(ledgerData.balance || 0)}</p>
                </div>
              </div>

              <h4>Transaction History</h4>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Debit</th>
                      <th>Credit</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerData.transactions?.length > 0 ? (
                      ledgerData.transactions.map((txn, index) => (
                        <tr key={index}>
                          <td>{formatDate(txn.date)}</td>
                          <td>{txn.description}</td>
                          <td>{txn.debit > 0 ? formatCurrency(txn.debit) : '-'}</td>
                          <td>{txn.credit > 0 ? formatCurrency(txn.credit) : '-'}</td>
                          <td>{formatCurrency(txn.balance)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="empty-state">No transactions found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .summary-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: white;
          border-radius: 0.75rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .summary-card.farmer {
          border-left: 4px solid #f59e0b;
        }
        .summary-card.vendor {
          border-left: 4px solid #10b981;
        }
        .summary-card.commission {
          border-left: 4px solid #6366f1;
        }
        .summary-icon {
          width: 48px;
          height: 48px;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          background: var(--light-gray);
          color: var(--primary);
        }
        .summary-label {
          font-size: 0.75rem;
          color: var(--gray);
          text-transform: uppercase;
        }
        .summary-value {
          font-size: 1.5rem;
          font-weight: 700;
        }
        .ledger-section h3 {
          margin-bottom: 1rem;
        }
        .ledger-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        .ledger-group h4 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          color: var(--gray);
          font-size: 0.875rem;
        }
        .ledger-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .ledger-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: var(--light-gray);
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ledger-item:hover {
          background: #e5e7eb;
        }
        .balance {
          font-weight: 600;
          font-size: 0.875rem;
        }
        .balance.positive {
          color: var(--danger);
        }
        .balance.negative {
          color: var(--success);
        }
        .filters-card {
          margin-bottom: 1rem;
        }
        .tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.5rem;
        }
        .tab {
          padding: 0.5rem 1rem;
          border: none;
          background: none;
          cursor: pointer;
          color: var(--gray);
          border-radius: 0.25rem;
          transition: all 0.2s;
        }
        .tab:hover {
          background: var(--light-gray);
        }
        .tab.active {
          background: var(--primary);
          color: white;
        }
        .filter-row {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .filter-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .type-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .type-badge.farmer_payment {
          background: #fef3c7;
          color: #b45309;
        }
        .type-badge.vendor_received {
          background: #d1fae5;
          color: #047857;
        }
        .type-badge.commission {
          background: #e0e7ff;
          color: #4338ca;
        }
        .party-name {
          font-weight: 500;
        }
        .party-sub {
          font-size: 0.75rem;
          color: var(--gray);
        }
        .amount {
          font-weight: 600;
          color: var(--primary);
        }
        .mode-badge {
          padding: 0.25rem 0.5rem;
          background: var(--light-gray);
          border-radius: 0.25rem;
          font-size: 0.75rem;
          text-transform: capitalize;
        }
        .modal-lg {
          max-width: 800px;
        }
        .radio-group {
          display: flex;
          gap: 1rem;
        }
        .radio-label {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .radio-label input {
          display: none;
        }
        .radio-label.selected {
          border-color: var(--primary);
          background: #f0fdf4;
        }
        .ledger-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .ledger-stat {
          padding: 1rem;
          background: var(--light-gray);
          border-radius: 0.5rem;
          text-align: center;
        }
        .ledger-stat label {
          font-size: 0.75rem;
          color: var(--gray);
          text-transform: uppercase;
        }
        .ledger-stat p {
          font-size: 1.25rem;
          font-weight: 700;
          margin-top: 0.25rem;
        }
        .ledger-stat.highlight {
          background: var(--primary);
          color: white;
        }
        .ledger-stat.highlight label {
          color: rgba(255,255,255,0.8);
        }
      `}</style>
    </div>
  );
};

export default Payments;
