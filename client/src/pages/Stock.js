import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiPackage, FiAlertTriangle, FiTrash2, FiRefreshCw, FiSearch } from 'react-icons/fi';

const Stock = () => {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWastageModal, setShowWastageModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [wastageData, setWastageData] = useState({
    quantity: '',
    reason: 'spoiled',
    notes: ''
  });

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      const response = await api.get('/stock');
      setStock(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch stock');
    } finally {
      setLoading(false);
    }
  };

  const openWastageModal = (stockItem) => {
    setSelectedStock(stockItem);
    setWastageData({
      quantity: '',
      reason: 'spoiled',
      notes: ''
    });
    setShowWastageModal(true);
  };

  const handleWastage = async (e) => {
    e.preventDefault();
    
    if (parseFloat(wastageData.quantity) > selectedStock.quantity) {
      toast.error('Wastage quantity cannot exceed available stock');
      return;
    }

    try {
      await api.post('/stock/wastage', {
        vegetable: selectedStock.vegetable._id,
        quantity: parseFloat(wastageData.quantity),
        reason: wastageData.reason,
        notes: wastageData.notes
      });
      toast.success('Wastage recorded successfully');
      setShowWastageModal(false);
      fetchStock();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record wastage');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredStock = stock.filter(item => {
    const matchesSearch = item.vegetable?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.vegetable?.nameHindi?.includes(searchTerm);
    
    if (filter === 'low') return matchesSearch && item.quantity <= item.lowStockThreshold;
    if (filter === 'out') return matchesSearch && item.quantity === 0;
    if (filter === 'available') return matchesSearch && item.quantity > 0;
    return matchesSearch;
  });

  const totalStockValue = stock.reduce((sum, item) => sum + (item.quantity * item.avgCostPrice), 0);
  const lowStockCount = stock.filter(item => item.quantity <= item.lowStockThreshold && item.quantity > 0).length;
  const outOfStockCount = stock.filter(item => item.quantity === 0).length;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading stock...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Stock Management (स्टॉक)</h1>
          <p className="page-subtitle">View current inventory and manage wastage</p>
        </div>
        <button className="btn btn-outline" onClick={fetchStock}>
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon bg-primary">
            <FiPackage />
          </div>
          <div className="stat-info">
            <p className="stat-label">Total Items</p>
            <p className="stat-value">{stock.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-success">
            <FiPackage />
          </div>
          <div className="stat-info">
            <p className="stat-label">Stock Value</p>
            <p className="stat-value">{formatCurrency(totalStockValue)}</p>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon bg-warning">
            <FiAlertTriangle />
          </div>
          <div className="stat-info">
            <p className="stat-label">Low Stock</p>
            <p className="stat-value">{lowStockCount}</p>
          </div>
        </div>
        <div className="stat-card danger">
          <div className="stat-icon bg-danger">
            <FiAlertTriangle />
          </div>
          <div className="stat-info">
            <p className="stat-label">Out of Stock</p>
            <p className="stat-value">{outOfStockCount}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters card">
        <div className="filter-group">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search vegetable..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-tabs">
            <button 
              className={`tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button 
              className={`tab ${filter === 'available' ? 'active' : ''}`}
              onClick={() => setFilter('available')}
            >
              Available
            </button>
            <button 
              className={`tab ${filter === 'low' ? 'active' : ''}`}
              onClick={() => setFilter('low')}
            >
              Low Stock ({lowStockCount})
            </button>
            <button 
              className={`tab ${filter === 'out' ? 'active' : ''}`}
              onClick={() => setFilter('out')}
            >
              Out of Stock ({outOfStockCount})
            </button>
          </div>
        </div>
      </div>

      {/* Stock Grid */}
      <div className="stock-grid">
        {filteredStock.length > 0 ? (
          filteredStock.map((item) => (
            <div 
              key={item._id} 
              className={`stock-card ${
                item.quantity === 0 ? 'out-of-stock' : 
                item.quantity <= item.lowStockThreshold ? 'low-stock' : ''
              }`}
            >
              <div className="stock-header">
                <div>
                  <h3>{item.vegetable?.name}</h3>
                  {item.vegetable?.nameHindi && (
                    <p className="name-urdu">{item.vegetable?.nameHindi}</p>
                  )}
                </div>
                {item.quantity <= item.lowStockThreshold && (
                  <span className={`alert-badge ${item.quantity === 0 ? 'out' : 'low'}`}>
                    {item.quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                  </span>
                )}
              </div>
              
              <div className="stock-quantity">
                <span className="quantity">{item.quantity}</span>
                <span className="unit">{item.unit}</span>
              </div>

              <div className="stock-details">
                <div className="detail-row">
                  <span>Avg. Cost:</span>
                  <span>{formatCurrency(item.avgCostPrice)}/{item.unit}</span>
                </div>
                <div className="detail-row">
                  <span>Stock Value:</span>
                  <span>{formatCurrency(item.quantity * item.avgCostPrice)}</span>
                </div>
                <div className="detail-row">
                  <span>Last Updated:</span>
                  <span>{formatDate(item.lastUpdated)}</span>
                </div>
              </div>

              {item.quantity > 0 && (
                <button 
                  className="btn btn-sm btn-danger wastage-btn"
                  onClick={() => openWastageModal(item)}
                >
                  <FiTrash2 /> Record Wastage
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="empty-state-full">
            <FiPackage className="empty-icon" />
            <p>No stock items found</p>
          </div>
        )}
      </div>

      {/* Wastage Modal */}
      {showWastageModal && selectedStock && (
        <div className="modal-overlay" onClick={() => setShowWastageModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <FiTrash2 /> Record Wastage
              </h3>
              <button className="modal-close" onClick={() => setShowWastageModal(false)}>×</button>
            </div>
            <form onSubmit={handleWastage}>
              <div className="modal-body">
                <div className="wastage-info">
                  <p><strong>Vegetable:</strong> {selectedStock.vegetable?.name}</p>
                  <p><strong>Available Stock:</strong> {selectedStock.quantity} {selectedStock.unit}</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Wastage Quantity *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={wastageData.quantity}
                    onChange={(e) => setWastageData({ ...wastageData, quantity: e.target.value })}
                    max={selectedStock.quantity}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reason *</label>
                  <select
                    className="form-select"
                    value={wastageData.reason}
                    onChange={(e) => setWastageData({ ...wastageData, reason: e.target.value })}
                    required
                  >
                    <option value="spoiled">Spoiled (खराब)</option>
                    <option value="damaged">Damaged (टूटा-फूटा)</option>
                    <option value="expired">Expired (समाप्त)</option>
                    <option value="theft">Theft (चोरी)</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-textarea"
                    value={wastageData.notes}
                    onChange={(e) => setWastageData({ ...wastageData, notes: e.target.value })}
                    placeholder="Additional notes about the wastage..."
                    rows="2"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowWastageModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger">
                  Record Wastage
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
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: white;
          border-radius: 0.75rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .stat-card.warning {
          border-left: 4px solid var(--warning);
        }
        .stat-card.danger {
          border-left: 4px solid var(--danger);
        }
        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          color: white;
        }
        .bg-primary { background: var(--primary); }
        .bg-success { background: var(--success); }
        .bg-warning { background: var(--warning); }
        .bg-danger { background: var(--danger); }
        .stat-label {
          font-size: 0.75rem;
          color: var(--gray);
          text-transform: uppercase;
        }
        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
        }
        .filters {
          margin-bottom: 1.5rem;
        }
        .filter-group {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          align-items: center;
        }
        .search-box {
          position: relative;
          flex: 1;
          min-width: 200px;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--gray);
        }
        .search-box .form-input {
          padding-left: 2.5rem;
        }
        .filter-tabs {
          display: flex;
          gap: 0.5rem;
        }
        .tab {
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
        }
        .tab:hover {
          background: var(--light-gray);
        }
        .tab.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
        .stock-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }
        .stock-card {
          background: white;
          border-radius: 0.75rem;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: all 0.2s;
        }
        .stock-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .stock-card.low-stock {
          border-left: 4px solid var(--warning);
        }
        .stock-card.out-of-stock {
          border-left: 4px solid var(--danger);
          opacity: 0.7;
        }
        .stock-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }
        .stock-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0;
        }
        .name-urdu {
          font-size: 0.875rem;
          color: var(--gray);
        }
        .alert-badge {
          font-size: 0.625rem;
          padding: 0.25rem 0.5rem;
          border-radius: 1rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .alert-badge.low {
          background: #fef3c7;
          color: #b45309;
        }
        .alert-badge.out {
          background: #fee2e2;
          color: #dc2626;
        }
        .stock-quantity {
          text-align: center;
          padding: 1rem 0;
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 1rem;
        }
        .quantity {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--primary);
        }
        .unit {
          font-size: 1rem;
          color: var(--gray);
          margin-left: 0.25rem;
        }
        .stock-details {
          margin-bottom: 1rem;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 0.375rem 0;
          font-size: 0.875rem;
        }
        .detail-row span:first-child {
          color: var(--gray);
        }
        .wastage-btn {
          width: 100%;
        }
        .empty-state-full {
          grid-column: 1 / -1;
          text-align: center;
          padding: 3rem;
          color: var(--gray);
        }
        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .wastage-info {
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

export default Stock;
