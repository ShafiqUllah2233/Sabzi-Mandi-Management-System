import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiPhone, FiMapPin } from 'react-icons/fi';
import { GiFarmer } from 'react-icons/gi';

const Farmers = () => {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    village: '',
    address: '',
    aadharNumber: ''
  });

  useEffect(() => {
    fetchFarmers();
  }, [search]);

  const fetchFarmers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      
      const response = await api.get(`/farmers?${params.toString()}`);
      setFarmers(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch farmers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingFarmer) {
        await api.put(`/farmers/${editingFarmer._id}`, formData);
        toast.success('Farmer updated successfully');
      } else {
        await api.post('/farmers', formData);
        toast.success('Farmer added successfully');
      }
      setShowModal(false);
      resetForm();
      fetchFarmers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (farmer) => {
    setEditingFarmer(farmer);
    setFormData({
      name: farmer.name,
      phone: farmer.phone || '',
      village: farmer.village || '',
      address: farmer.address || '',
      aadharNumber: farmer.aadharNumber || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this farmer?')) return;
    
    try {
      await api.delete(`/farmers/${id}`);
      toast.success('Farmer deactivated');
      fetchFarmers();
    } catch (error) {
      toast.error('Failed to delete farmer');
    }
  };

  const resetForm = () => {
    setEditingFarmer(null);
    setFormData({
      name: '',
      phone: '',
      village: '',
      address: '',
      aadharNumber: ''
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading farmers...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Farmers (किसान)</h1>
          <p className="page-subtitle">Manage farmers who supply vegetables</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <FiPlus /> Add Farmer
        </button>
      </div>

      {/* Search */}
      <div className="filters card">
        <div className="search-input">
          <FiSearch className="search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Search by name, phone, or village..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Farmers Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Farmer</th>
                <th>Contact</th>
                <th>Village</th>
                <th>Total Business</th>
                <th>Pending Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {farmers.length > 0 ? (
                farmers.map((farmer) => (
                  <tr key={farmer._id}>
                    <td>
                      <div className="farmer-info">
                        <div className="farmer-avatar">
                          <GiFarmer />
                        </div>
                        <div>
                          <p className="farmer-name">{farmer.name}</p>
                          {farmer.aadharNumber && (
                            <p className="farmer-aadhar">Aadhar: {farmer.aadharNumber}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {farmer.phone && (
                        <div className="contact-info">
                          <FiPhone size={14} />
                          <span>{farmer.phone}</span>
                        </div>
                      )}
                    </td>
                    <td>
                      {farmer.village && (
                        <div className="contact-info">
                          <FiMapPin size={14} />
                          <span>{farmer.village}</span>
                        </div>
                      )}
                    </td>
                    <td>{formatCurrency(farmer.totalBusiness)}</td>
                    <td>
                      <span className={farmer.balance > 0 ? 'text-warning' : ''}>
                        {formatCurrency(farmer.balance)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${farmer.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {farmer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-sm btn-outline" onClick={() => handleEdit(farmer)}>
                          <FiEdit2 />
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(farmer._id)}>
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="empty-state">No farmers found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingFarmer ? 'Edit Farmer' : 'Add New Farmer'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Farmer's name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="10-digit mobile number"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Village</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.village}
                    onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                    placeholder="Village name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Full Address</label>
                  <textarea
                    className="form-textarea"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Complete address"
                    rows="2"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Aadhar Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.aadharNumber}
                    onChange={(e) => setFormData({ ...formData, aadharNumber: e.target.value })}
                    placeholder="12-digit Aadhar number"
                    maxLength="12"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingFarmer ? 'Update' : 'Add'} Farmer
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
        .search-input {
          position: relative;
          max-width: 400px;
        }
        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--gray);
        }
        .search-input .form-input {
          padding-left: 2.5rem;
        }
        .farmer-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .farmer-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #dcfce7;
          color: #22c55e;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }
        .farmer-name {
          font-weight: 500;
        }
        .farmer-aadhar {
          font-size: 0.75rem;
          color: var(--gray);
        }
        .contact-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--gray);
        }
        .text-warning {
          color: var(--warning);
          font-weight: 600;
        }
        .action-btns {
          display: flex;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  );
};

export default Farmers;
