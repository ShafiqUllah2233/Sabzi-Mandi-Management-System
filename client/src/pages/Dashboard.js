import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  FiTruck, 
  FiShoppingCart, 
  FiDollarSign, 
  FiAlertCircle,
  FiTrendingUp,
  FiPackage,
  FiUsers
} from 'react-icons/fi';
import { GiFarmer, GiCarrot } from 'react-icons/gi';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import './Dashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dashboardRes, chartRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/dashboard/chart-data?days=7')
      ]);
      setDashboardData(dashboardRes.data.data);
      setChartData(chartRes.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
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
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const salesChartData = {
    labels: chartData?.dailySales?.map(d => {
      const date = new Date(d._id);
      return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    }) || [],
    datasets: [
      {
        label: 'Sales',
        data: chartData?.dailySales?.map(d => d.sales) || [],
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Profit',
        data: chartData?.dailySales?.map(d => d.profit) || [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const topVegetablesData = {
    labels: chartData?.topVegetables?.map(v => v.name) || [],
    datasets: [{
      data: chartData?.topVegetables?.map(v => v.totalAmount) || [],
      backgroundColor: [
        '#22c55e',
        '#3b82f6',
        '#f59e0b',
        '#ef4444',
        '#8b5cf6'
      ]
    }]
  };

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="page-subtitle">Welcome to Sabzi Mandi Management System</p>
      </div>

      {/* Today's Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ backgroundColor: '#dcfce7', color: '#22c55e' }}>
            <FiTruck />
          </div>
          <div className="stat-card-content">
            <p className="stat-card-label">Today's Arrivals</p>
            <p className="stat-card-value">{dashboardData?.today?.arrivals?.count || 0}</p>
            <p className="stat-card-sub">{formatCurrency(dashboardData?.today?.arrivals?.totalAmount)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ backgroundColor: '#dbeafe', color: '#3b82f6' }}>
            <FiShoppingCart />
          </div>
          <div className="stat-card-content">
            <p className="stat-card-label">Today's Sales</p>
            <p className="stat-card-value">{dashboardData?.today?.sales?.count || 0}</p>
            <p className="stat-card-sub">{formatCurrency(dashboardData?.today?.sales?.totalAmount)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ backgroundColor: '#fef3c7', color: '#f59e0b' }}>
            <FiTrendingUp />
          </div>
          <div className="stat-card-content">
            <p className="stat-card-label">Today's Profit</p>
            <p className="stat-card-value">{formatCurrency(dashboardData?.today?.sales?.totalProfit)}</p>
            <p className="stat-card-sub">Commission: {formatCurrency(dashboardData?.today?.arrivals?.totalCommission)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}>
            <FiAlertCircle />
          </div>
          <div className="stat-card-content">
            <p className="stat-card-label">Low Stock Items</p>
            <p className="stat-card-value">{dashboardData?.stock?.lowStockCount || 0}</p>
            <p className="stat-card-sub">Total Stock Value: {formatCurrency(dashboardData?.stock?.totalValue)}</p>
          </div>
        </div>
      </div>

      {/* Pending Payments */}
      <div className="stats-grid stats-grid-2">
        <div className="stat-card stat-card-horizontal">
          <div className="stat-card-icon" style={{ backgroundColor: '#fef3c7', color: '#f59e0b' }}>
            <GiFarmer />
          </div>
          <div className="stat-card-content">
            <p className="stat-card-label">Pending Farmer Payments</p>
            <p className="stat-card-value text-warning">{formatCurrency(dashboardData?.payments?.farmerPending)}</p>
          </div>
        </div>

        <div className="stat-card stat-card-horizontal">
          <div className="stat-card-icon" style={{ backgroundColor: '#dcfce7', color: '#22c55e' }}>
            <FiDollarSign />
          </div>
          <div className="stat-card-content">
            <p className="stat-card-label">Pending from Vendors</p>
            <p className="stat-card-value text-success">{formatCurrency(dashboardData?.payments?.vendorPending)}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="quick-stat-item">
          <GiFarmer className="quick-stat-icon" />
          <span className="quick-stat-value">{dashboardData?.counts?.farmers || 0}</span>
          <span className="quick-stat-label">Farmers</span>
        </div>
        <div className="quick-stat-item">
          <FiUsers className="quick-stat-icon" />
          <span className="quick-stat-value">{dashboardData?.counts?.vendors || 0}</span>
          <span className="quick-stat-label">Vendors</span>
        </div>
        <div className="quick-stat-item">
          <FiUsers className="quick-stat-icon" />
          <span className="quick-stat-value">{dashboardData?.counts?.traders || 0}</span>
          <span className="quick-stat-label">Traders</span>
        </div>
        <div className="quick-stat-item">
          <GiCarrot className="quick-stat-icon" />
          <span className="quick-stat-value">{dashboardData?.counts?.vegetables || 0}</span>
          <span className="quick-stat-label">Vegetables</span>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card chart-card">
          <div className="card-header">
            <h3 className="card-title">Sales & Profit (Last 7 Days)</h3>
          </div>
          <div className="chart-container">
            <Line 
              data={salesChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top'
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="card chart-card">
          <div className="card-header">
            <h3 className="card-title">Top Selling Vegetables</h3>
          </div>
          <div className="chart-container chart-container-small">
            <Doughnut 
              data={topVegetablesData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right'
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Arrivals</h3>
          </div>
          <div className="activity-list">
            {dashboardData?.recentArrivals?.length > 0 ? (
              dashboardData.recentArrivals.map((arrival) => (
                <div key={arrival._id} className="activity-item">
                  <div className="activity-icon arrival-icon">
                    <FiTruck />
                  </div>
                  <div className="activity-content">
                    <p className="activity-title">{arrival.arrivalNumber}</p>
                    <p className="activity-subtitle">{arrival.farmer?.name}</p>
                  </div>
                  <div className="activity-meta">
                    <p className="activity-amount">{formatCurrency(arrival.totalAmount)}</p>
                    <span className={`badge badge-${arrival.paymentStatus === 'paid' ? 'success' : arrival.paymentStatus === 'partial' ? 'warning' : 'danger'}`}>
                      {arrival.paymentStatus}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">No recent arrivals</p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Sales</h3>
          </div>
          <div className="activity-list">
            {dashboardData?.recentSales?.length > 0 ? (
              dashboardData.recentSales.map((sale) => (
                <div key={sale._id} className="activity-item">
                  <div className="activity-icon sale-icon">
                    <FiShoppingCart />
                  </div>
                  <div className="activity-content">
                    <p className="activity-title">{sale.saleNumber}</p>
                    <p className="activity-subtitle">{sale.vendor?.name} ({sale.vendor?.shopNumber})</p>
                  </div>
                  <div className="activity-meta">
                    <p className="activity-amount">{formatCurrency(sale.totalAmount)}</p>
                    <span className={`badge badge-${sale.paymentStatus === 'paid' ? 'success' : sale.paymentStatus === 'partial' ? 'warning' : 'danger'}`}>
                      {sale.paymentStatus}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">No recent sales</p>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {dashboardData?.lowStockAlerts?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">⚠️ Low Stock Alerts</h3>
          </div>
          <div className="alert-list">
            {dashboardData.lowStockAlerts.map((stock) => (
              <div key={stock._id} className="alert-item">
                <FiPackage className="alert-icon" />
                <span className="alert-name">{stock.vegetable?.name}</span>
                <span className="alert-qty">{stock.quantity} {stock.vegetable?.unit} remaining</span>
                <span className="badge badge-danger">Low Stock</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
