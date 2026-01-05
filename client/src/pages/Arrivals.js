import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiPlus, FiEye, FiSearch, FiCalendar, FiTruck, FiX } from 'react-icons/fi';

const Arrivals = () => {
  const [arrivals, setArrivals] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [vegetables, setVegetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingArrival, setViewingArrival] = useState(null);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    paymentStatus: ''
  });
  const [formData, setFormData] = useState({
    farmer: '',
    vehicleNumber: '',
    notes: '',
    items: [{ vegetable: '', quantity: '', unit: 'kg', ratePerUnit: '' }]
  });

  useEffect(() => {
    fetchArrivals();
    fetchFarmers();
    fetchVegetables();
  }, [filters]);

  const fetchArrivals = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
      
      const response = await api.get(`/arrivals?${params.toString()}`);
      setArrivals(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch arrivals');
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

  const fetchVegetables = async () => {
    try {
      const response = await api.get('/vegetables?isActive=true');
      setVegetables(response.data.data);
    } catch (error) {
      console.error('Failed to fetch vegetables');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate items
    const validItems = formData.items.filter(
      item => item.vegetable && item.quantity && item.ratePerUnit
    );
    
    if (validItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      await api.post('/arrivals', {
        ...formData,
        items: validItems.map(item => ({
          vegetable: item.vegetable,
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          ratePerUnit: parseFloat(item.ratePerUnit)
        }))
      });
      toast.success('Arrival recorded successfully');
      setShowModal(false);
      resetForm();
      fetchArrivals();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record arrival');
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { vegetable: '', quantity: '', unit: 'kg', ratePerUnit: '' }]
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
    
    // Auto-fill unit from vegetable
    if (field === 'vegetable') {
      const veg = vegetables.find(v => v._id === value);
      if (veg) {
        newItems[index].unit = veg.unit;
      }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const viewArrival = (arrival) => {
    setViewingArrival(arrival);
    setShowViewModal(true);
  };

  const resetForm = () => {
    setFormData({
      farmer: '',
      vehicleNumber: '',
      notes: '',
      items: [{ vegetable: '', quantity: '', unit: 'kg', ratePerUnit: '' }]
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
        <p>Loading arrivals...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Arrivals (आमद)</h1>
          <p className="page-subtitle">Record daily vegetable arrivals from farmers</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <FiPlus /> New Arrival
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

      {/* Arrivals Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Arrival No.</th>
                <th>Date & Time</th>
                <th>Farmer</th>
                <th>Items</th>
                <th>Total Qty</th>
                <th>Total Amount</th>
                <th>Commission</th>
                <th>Net Payable</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {arrivals.length > 0 ? (
                arrivals.map((arrival) => (
                  <tr key={arrival._id}>
                    <td>
                      <span className="arrival-number">{arrival.arrivalNumber}</span>
                    </td>
                    <td>{formatDate(arrival.date)}</td>
                    <td>
                      <div>
                        <p className="font-medium">{arrival.farmer?.name}</p>
                        <p className="text-small">{arrival.farmer?.village}</p>
                      </div>
                    </td>
                    <td>{arrival.items?.length || 0} items</td>
                    <td>{arrival.totalQuantity} kg</td>
                    <td>{formatCurrency(arrival.totalAmount)}</td>
                    <td>
                      <span className="commission">
                        {formatCurrency(arrival.commissionAmount)} ({arrival.commissionRate}%)
                      </span>
                    </td>
                    <td className="font-medium">{formatCurrency(arrival.netAmount)}</td>
                    <td>
                      <span className={`badge badge-${
                        arrival.paymentStatus === 'paid' ? 'success' : 
                        arrival.paymentStatus === 'partial' ? 'warning' : 'danger'
                      }`}>
                        {arrival.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline" onClick={() => viewArrival(arrival)}>
                        <FiEye />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="empty-state">No arrivals found for this date</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Arrival Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <FiTruck /> New Arrival Entry
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
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
                          {farmer.name} - {farmer.village}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vehicle Number</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.vehicleNumber}
                      onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                      placeholder="e.g., UP32XX1234"
                    />
                  </div>
                </div>

                <div className="items-section">
                  <div className="items-header">
                    <h4>Vegetables</h4>
                    <button type="button" className="btn btn-sm btn-outline" onClick={addItem}>
                      <FiPlus /> Add Item
                    </button>
                  </div>
                  
                  {formData.items.map((item, index) => (
                    <div key={index} className="item-row">
                      <select
                        className="form-select"
                        value={item.vegetable}
                        onChange={(e) => updateItem(index, 'vegetable', e.target.value)}
                        required
                      >
                        <option value="">Select Vegetable</option>
                        {vegetables.map((veg) => (
                          <option key={veg._id} value={veg._id}>
                            {veg.name} {veg.nameHindi ? `(${veg.nameHindi})` : ''}
                          </option>
                        ))}
                      </select>
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
                      <select
                        className="form-select unit-select"
                        value={item.unit}
                        onChange={(e) => updateItem(index, 'unit', e.target.value)}
                      >
                        <option value="kg">kg</option>
                        <option value="gram">gram</option>
                        <option value="dozen">dozen</option>
                        <option value="piece">piece</option>
                        <option value="crate">crate</option>
                        <option value="sack">sack</option>
                        <option value="bundle">bundle</option>
                      </select>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="Rate/unit"
                        value={item.ratePerUnit}
                        onChange={(e) => updateItem(index, 'ratePerUnit', e.target.value)}
                        min="0"
                        step="0.01"
                        required
                      />
                      <span className="item-total">
                        = {formatCurrency((item.quantity || 0) * (item.ratePerUnit || 0))}
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
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Record Arrival
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Arrival Modal */}
      {showViewModal && viewingArrival && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Arrival Details - {viewingArrival.arrivalNumber}</h3>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Farmer</label>
                  <p>{viewingArrival.farmer?.name}</p>
                </div>
                <div className="detail-item">
                  <label>Village</label>
                  <p>{viewingArrival.farmer?.village || '-'}</p>
                </div>
                <div className="detail-item">
                  <label>Date</label>
                  <p>{formatDate(viewingArrival.date)}</p>
                </div>
                <div className="detail-item">
                  <label>Trader</label>
                  <p>{viewingArrival.trader?.name}</p>
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
                  {viewingArrival.items?.map((item, index) => (
                    <tr key={index}>
                      <td>{item.vegetable?.name}</td>
                      <td>{item.quantity} {item.unit}</td>
                      <td>{formatCurrency(item.ratePerUnit)}/{item.unit}</td>
                      <td>{formatCurrency(item.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="summary-box">
                <div className="summary-row">
                  <span>Total Amount</span>
                  <span>{formatCurrency(viewingArrival.totalAmount)}</span>
                </div>
                <div className="summary-row">
                  <span>Commission ({viewingArrival.commissionRate}%)</span>
                  <span>- {formatCurrency(viewingArrival.commissionAmount)}</span>
                </div>
                <div className="summary-row total">
                  <span>Net Payable to Farmer</span>
                  <span>{formatCurrency(viewingArrival.netAmount)}</span>
                </div>
                <div className="summary-row">
                  <span>Paid</span>
                  <span>{formatCurrency(viewingArrival.paidAmount)}</span>
                </div>
                <div className="summary-row pending">
                  <span>Pending</span>
                  <span>{formatCurrency(viewingArrival.netAmount - viewingArrival.paidAmount)}</span>
                </div>
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
        .arrival-number {
          font-weight: 600;
          color: var(--primary);
        }
        .font-medium {
          font-weight: 500;
        }
        .text-small {
          font-size: 0.75rem;
          color: var(--gray);
        }
        .commission {
          font-size: 0.875rem;
          color: var(--gray);
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
        .item-row .form-select:first-child {
          flex: 2;
        }
        .item-row .form-input {
          width: 100px;
        }
        .unit-select {
          width: 90px;
        }
        .item-total {
          min-width: 100px;
          font-weight: 500;
          text-align: right;
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
      `}</style>
    </div>
  );
};

export default Arrivals;
