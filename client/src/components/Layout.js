import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FiHome, 
  FiPackage, 
  FiGrid, 
  FiUsers, 
  FiTruck, 
  FiShoppingCart, 
  FiBox, 
  FiCreditCard, 
  FiBarChart2,
  FiLogOut,
  FiMenu,
  FiX,
  FiUser
} from 'react-icons/fi';
import { GiCarrot, GiFarmer } from 'react-icons/gi';
import './Layout.css';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/', icon: <FiHome />, label: 'Dashboard', roles: ['admin', 'trader', 'vendor', 'accountant'] },
    { path: '/vegetables', icon: <GiCarrot />, label: 'Vegetables', roles: ['admin', 'trader'] },
    { path: '/categories', icon: <FiGrid />, label: 'Categories', roles: ['admin'] },
    { path: '/farmers', icon: <GiFarmer />, label: 'Farmers', roles: ['admin', 'trader'] },
    { path: '/arrivals', icon: <FiTruck />, label: 'Arrivals (Aamad)', roles: ['admin', 'trader'] },
    { path: '/sales', icon: <FiShoppingCart />, label: 'Sales', roles: ['admin', 'trader', 'vendor'] },
    { path: '/stock', icon: <FiBox />, label: 'Stock', roles: ['admin', 'trader'] },
    { path: '/payments', icon: <FiCreditCard />, label: 'Payments', roles: ['admin', 'trader', 'accountant'] },
    { path: '/reports', icon: <FiBarChart2 />, label: 'Reports', roles: ['admin', 'accountant'] },
    { path: '/users', icon: <FiUsers />, label: 'Users', roles: ['admin'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user?.role));

  return (
    <div className="layout">
      {/* Mobile Header */}
      <header className="mobile-header">
        <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <FiX /> : <FiMenu />}
        </button>
        <h1 className="logo-text">🥬 Sabzi Mandi</h1>
      </header>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="logo">
            <span className="logo-icon">🥬</span>
            <span className="logo-text">Sabzi Mandi</span>
          </h1>
          <p className="logo-subtitle">Sabzi Mandi</p>
        </div>

        <nav className="sidebar-nav">
          {filteredMenu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
              end={item.path === '/'}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              <FiUser />
            </div>
            <div className="user-details">
              <p className="user-name">{user?.name}</p>
              <p className="user-role">{user?.role}</p>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
};

export default Layout;
