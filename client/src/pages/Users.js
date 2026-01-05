import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiUser, FiShield, FiPhone, FiMail } from 'react-icons/fi';

const Users = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'vendor',
    shopNumber: '',
    address: '',
    commissionRate: 5,
    isActive: true
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        await api.put(`/users/${editingUser._id}`, updateData);
        toast.success('User updated successfully');
      } else {
        await api.post('/users', formData);
        toast.success('User created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save user');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      phone: user.phone,
      email: user.email || '',
      password: '',
      role: user.role,
      shopNumber: user.shopNumber || '',
      address: user.address || '',
      commissionRate: user.commissionRate || 5,
      isActive: user.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await api.delete(`/users/${userId}`);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const toggleStatus = async (user) => {
    try {
      await api.put(`/users/${user._id}`, { isActive: !user.isActive });
      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      password: '',
      role: 'vendor',
      shopNumber: '',
      address: '',
      commissionRate: 5,
      isActive: true
    });
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'danger',
      trader: 'primary',
      vendor: 'success',
      accountant: 'warning'
    };
    return colors[role] || 'secondary';
  };

  const getRoleIcon = (role) => {
    return role === 'admin' ? <FiShield /> : <FiUser />;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.phone.includes(searchTerm);
    const matchesRole = filterRole ? user.role === filterRole : true;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Users Management (उपयोगकर्ता)</h1>
          <p className="page-subtitle">Manage system users and their roles</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <FiPlus /> Add User
        </button>
      </div>

      {/* Filters */}
      <div className="filters card">
        <div className="filter-group">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="trader">Trader (व्यापारी)</option>
            <option value="vendor">Vendor (दुकानदार)</option>
            <option value="accountant">Accountant (लेखाकार)</option>
          </select>
        </div>
      </div>

      {/* Users Grid */}
      <div className="users-grid">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <div key={user._id} className={`user-card ${!user.isActive ? 'inactive' : ''}`}>
              <div className="user-header">
                <div className="user-avatar">
                  {getRoleIcon(user.role)}
                </div>
                <div className="user-info">
                  <h3>{user.name}</h3>
                  <span className={`role-badge badge-${getRoleColor(user.role)}`}>
                    {user.role}
                  </span>
                </div>
                {!user.isActive && (
                  <span className="status-inactive">Inactive</span>
                )}
              </div>

              <div className="user-details">
                <div className="detail-item">
                  <FiPhone />
                  <span>{user.phone}</span>
                </div>
                {user.email && (
                  <div className="detail-item">
                    <FiMail />
                    <span>{user.email}</span>
                  </div>
                )}
                {user.shopNumber && (
                  <div className="detail-item">
                    <span className="label">Shop:</span>
                    <span>{user.shopNumber}</span>
                  </div>
                )}
                {user.role === 'trader' && (
                  <div className="detail-item">
                    <span className="label">Commission:</span>
                    <span>{user.commissionRate}%</span>
                  </div>
                )}
              </div>

              {currentUser?.role === 'admin' && user._id !== currentUser._id && (
                <div className="user-actions">
                  <button 
                    className={`btn btn-sm ${user.isActive ? 'btn-outline' : 'btn-success'}`}
                    onClick={() => toggleStatus(user)}
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => handleEdit(user)}
                  >
                    <FiEdit2 />
                  </button>
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(user._id)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="empty-state-full">
            <FiUser className="empty-icon" />
            <p>No users found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <FiUser /> {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone *</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      pattern="[0-9]{10}"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Password {editingUser ? '(leave blank to keep current)' : '*'}
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    minLength="6"
                    required={!editingUser}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select
                    className="form-select"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    required
                  >
                    <option value="vendor">Vendor (दुकानदार)</option>
                    <option value="trader">Trader (व्यापारी)</option>
                    <option value="accountant">Accountant (लेखाकार)</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {formData.role === 'vendor' && (
                  <div className="form-group">
                    <label className="form-label">Shop Number</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.shopNumber}
                      onChange={(e) => setFormData({ ...formData, shopNumber: e.target.value })}
                      placeholder="e.g., Shop 12, Block A"
                    />
                  </div>
                )}

                {formData.role === 'trader' && (
                  <div className="form-group">
                    <label className="form-label">Commission Rate (%)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.commissionRate}
                      onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                      min="0"
                      max="100"
                      step="0.5"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-textarea"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Full address..."
                    rows="2"
                  />
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    Active User
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? 'Update User' : 'Create User'}
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
        .users-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1rem;
        }
        .user-card {
          background: white;
          border-radius: 0.75rem;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: all 0.2s;
        }
        .user-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .user-card.inactive {
          opacity: 0.6;
          background: #f9fafb;
        }
        .user-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
          position: relative;
        }
        .user-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }
        .user-info h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        .role-badge {
          padding: 0.125rem 0.5rem;
          border-radius: 1rem;
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .badge-danger {
          background: #fee2e2;
          color: #dc2626;
        }
        .badge-primary {
          background: #dbeafe;
          color: #2563eb;
        }
        .badge-success {
          background: #d1fae5;
          color: #047857;
        }
        .badge-warning {
          background: #fef3c7;
          color: #b45309;
        }
        .status-inactive {
          position: absolute;
          right: 0;
          top: 0;
          font-size: 0.625rem;
          padding: 0.125rem 0.5rem;
          background: #e5e7eb;
          color: #6b7280;
          border-radius: 1rem;
          text-transform: uppercase;
        }
        .user-details {
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .detail-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0;
          font-size: 0.875rem;
          color: var(--gray);
        }
        .detail-item .label {
          font-weight: 500;
          color: #374151;
        }
        .user-actions {
          display: flex;
          gap: 0.5rem;
        }
        .user-actions .btn {
          flex: 1;
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
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }
        .checkbox-label input {
          width: 18px;
          height: 18px;
        }
      `}</style>
    </div>
  );
};

export default Users;
