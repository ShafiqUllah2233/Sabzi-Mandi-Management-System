import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import { GiCarrot } from 'react-icons/gi';

const Vegetables = () => {
  const [vegetables, setVegetables] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVegetable, setEditingVegetable] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    nameHindi: '',
    category: '',
    unit: 'kg',
    currentPrice: '',
    isSeasonal: false,
    season: 'all'
  });

  useEffect(() => {
    fetchVegetables();
    fetchCategories();
  }, [search, filterCategory]);

  const fetchVegetables = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterCategory) params.append('category', filterCategory);
      
      const response = await api.get(`/vegetables?${params.toString()}`);
      setVegetables(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch vegetables');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories?isActive=true');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingVegetable) {
        await api.put(`/vegetables/${editingVegetable._id}`, formData);
        toast.success('Vegetable updated successfully');
      } else {
        await api.post('/vegetables', formData);
        toast.success('Vegetable added successfully');
      }
      setShowModal(false);
      resetForm();
      fetchVegetables();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (vegetable) => {
    setEditingVegetable(vegetable);
    setFormData({
      name: vegetable.name,
      nameHindi: vegetable.nameHindi || '',
      category: vegetable.category?._id || '',
      unit: vegetable.unit,
      currentPrice: vegetable.currentPrice,
      isSeasonal: vegetable.isSeasonal,
      season: vegetable.season
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this vegetable?')) return;
    
    try {
      await api.delete(`/vegetables/${id}`);
      toast.success('Vegetable deactivated');
      fetchVegetables();
    } catch (error) {
      toast.error('Failed to delete vegetable');
    }
  };

  const resetForm = () => {
    setEditingVegetable(null);
    setFormData({
      name: '',
      nameHindi: '',
      category: '',
      unit: 'kg',
      currentPrice: '',
      isSeasonal: false,
      season: 'all'
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
        <p>Loading vegetables...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Vegetables</h1>
          <p className="page-subtitle">Manage vegetables in your mandi</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <FiPlus /> Add Vegetable
        </button>
      </div>

      {/* Filters */}
      <div className="filters card">
        <div className="filter-group">
          <div className="search-input">
            <FiSearch className="search-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search vegetables..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Vegetables Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Vegetable</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Current Price</th>
                <th>Price Range</th>
                <th>Seasonal</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vegetables.length > 0 ? (
                vegetables.map((veg) => (
                  <tr key={veg._id}>
                    <td>
                      <div className="veg-info">
                        <GiCarrot className="veg-icon" />
                        <div>
                          <p className="veg-name">{veg.name}</p>
                          {veg.nameHindi && <p className="veg-urdu">{veg.nameHindi}</p>}
                        </div>
                      </div>
                    </td>
                    <td>{veg.category?.name || '-'}</td>
                    <td>{veg.unit}</td>
                    <td>{formatCurrency(veg.currentPrice)}</td>
                    <td>
                      <small>
                        {formatCurrency(veg.minPrice)} - {formatCurrency(veg.maxPrice)}
                      </small>
                    </td>
                    <td>
                      {veg.isSeasonal ? (
                        <span className="badge badge-info">{veg.season}</span>
                      ) : (
                        <span className="badge badge-success">All Season</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${veg.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {veg.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-sm btn-outline" onClick={() => handleEdit(veg)}>
                          <FiEdit2 />
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(veg._id)}>
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="empty-state">No vegetables found</td>
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
                {editingVegetable ? 'Edit Vegetable' : 'Add New Vegetable'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name (English) *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Name (Urdu)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nameHindi}
                    onChange={(e) => setFormData({ ...formData, nameHindi: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Unit *</label>
                    <select
                      className="form-select"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    >
                      <option value="kg">Kilogram (kg)</option>
                      <option value="gram">Gram</option>
                      <option value="dozen">Dozen</option>
                      <option value="piece">Piece</option>
                      <option value="crate">Crate</option>
                      <option value="sack">Sack</option>
                      <option value="bundle">Bundle</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Current Price ($)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.currentPrice}
                      onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                      min="0"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.isSeasonal}
                      onChange={(e) => setFormData({ ...formData, isSeasonal: e.target.checked })}
                    />
                    <span>Seasonal Vegetable</span>
                  </label>
                </div>
                {formData.isSeasonal && (
                  <div className="form-group">
                    <label className="form-label">Season</label>
                    <select
                      className="form-select"
                      value={formData.season}
                      onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                    >
                      <option value="summer">Summer</option>
                      <option value="winter">Winter</option>
                      <option value="monsoon">Monsoon</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingVegetable ? 'Update' : 'Add'} Vegetable
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
        .search-input {
          position: relative;
          flex: 1;
          min-width: 250px;
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
        .filter-group .form-select {
          width: 200px;
        }
        .veg-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .veg-icon {
          font-size: 1.5rem;
          color: var(--primary);
        }
        .veg-name {
          font-weight: 500;
        }
        .veg-urdu {
          font-size: 0.75rem;
          color: var(--gray);
        }
        .action-btns {
          display: flex;
          gap: 0.5rem;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .form-checkbox {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }
        .form-checkbox input {
          width: 1rem;
          height: 1rem;
        }
      `}</style>
    </div>
  );
};

export default Vegetables;
