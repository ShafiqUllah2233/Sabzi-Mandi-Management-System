import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiCalendar, FiDownload, FiFileText, FiTrendingUp, FiTrendingDown, FiDollarSign, FiPieChart } from 'react-icons/fi';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const Reports = () => {
  const [activeReport, setActiveReport] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchReport();
  }, [activeReport, dateRange]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let endpoint = '/reports/';
      const params = new URLSearchParams();

      switch (activeReport) {
        case 'daily':
          endpoint += 'daily';
          params.append('date', dateRange.startDate);
          break;
        case 'weekly':
          endpoint += 'weekly';
          break;
        case 'monthly':
          endpoint += 'monthly';
          break;
        case 'profit-loss':
          endpoint += 'profit-loss';
          params.append('startDate', dateRange.startDate);
          params.append('endDate', dateRange.endDate);
          break;
        case 'pending':
          endpoint += 'pending-payments';
          break;
        default:
          endpoint += 'daily';
      }

      const response = await api.get(`${endpoint}?${params.toString()}`);
      setReportData(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (format) => {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);

      const response = await api.get(`/reports/${activeReport}?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activeReport}-report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to download report');
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
    return new Date(date).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const renderDailyReport = () => {
    if (!reportData) return null;

    return (
      <div className="report-content">
        <div className="report-header">
          <h2>Daily Report - {formatDate(dateRange.startDate)}</h2>
        </div>

        <div className="stats-grid">
          <div className="stat-card arrivals">
            <div className="stat-content">
              <p className="stat-label">Total Arrivals</p>
              <p className="stat-value">{reportData.arrivals?.count || 0}</p>
              <p className="stat-amount">{formatCurrency(reportData.arrivals?.amount)}</p>
            </div>
          </div>
          <div className="stat-card sales">
            <div className="stat-content">
              <p className="stat-label">Total Sales</p>
              <p className="stat-value">{reportData.sales?.count || 0}</p>
              <p className="stat-amount">{formatCurrency(reportData.sales?.amount)}</p>
            </div>
          </div>
          <div className="stat-card commission">
            <div className="stat-content">
              <p className="stat-label">Commission Earned</p>
              <p className="stat-value">{formatCurrency(reportData.commission)}</p>
            </div>
          </div>
          <div className="stat-card profit">
            <div className="stat-content">
              <p className="stat-label">Net Profit</p>
              <p className="stat-value">{formatCurrency(reportData.profit)}</p>
            </div>
          </div>
        </div>

        {reportData.topVegetables && reportData.topVegetables.length > 0 && (
          <div className="card">
            <h3>Top Selling Vegetables</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Vegetable</th>
                  <th>Quantity Sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {reportData.topVegetables.map((item, index) => (
                  <tr key={index}>
                    <td>{item.name}</td>
                    <td>{item.quantity} kg</td>
                    <td>{formatCurrency(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderProfitLossReport = () => {
    if (!reportData) return null;

    const chartData = {
      labels: ['Revenue', 'Costs', 'Profit'],
      datasets: [{
        data: [
          reportData.totalRevenue || 0,
          reportData.totalCosts || 0,
          reportData.netProfit || 0
        ],
        backgroundColor: ['#10b981', '#f59e0b', '#3b82f6'],
      }]
    };

    return (
      <div className="report-content">
        <div className="report-header">
          <h2>Profit & Loss Report</h2>
          <p>{formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}</p>
        </div>

        <div className="pnl-grid">
          <div className="pnl-section income">
            <h3><FiTrendingUp /> Income</h3>
            <div className="pnl-items">
              <div className="pnl-item">
                <span>Sales Revenue</span>
                <span>{formatCurrency(reportData.salesRevenue)}</span>
              </div>
              <div className="pnl-item">
                <span>Commission Earned</span>
                <span>{formatCurrency(reportData.commissionEarned)}</span>
              </div>
              <div className="pnl-item total">
                <span>Total Income</span>
                <span>{formatCurrency(reportData.totalRevenue)}</span>
              </div>
            </div>
          </div>

          <div className="pnl-section expenses">
            <h3><FiTrendingDown /> Expenses</h3>
            <div className="pnl-items">
              <div className="pnl-item">
                <span>Purchase Cost</span>
                <span>{formatCurrency(reportData.purchaseCost)}</span>
              </div>
              <div className="pnl-item">
                <span>Wastage Loss</span>
                <span>{formatCurrency(reportData.wastageLoss)}</span>
              </div>
              <div className="pnl-item total">
                <span>Total Expenses</span>
                <span>{formatCurrency(reportData.totalCosts)}</span>
              </div>
            </div>
          </div>

          <div className="pnl-section profit">
            <h3><FiDollarSign /> Net Profit</h3>
            <p className={`profit-value ${reportData.netProfit >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(reportData.netProfit)}
            </p>
            <p className="profit-margin">
              Margin: {((reportData.netProfit / reportData.totalRevenue) * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="chart-container">
          <div className="chart-card">
            <h3><FiPieChart /> Revenue Breakdown</h3>
            <Pie data={chartData} options={{ maintainAspectRatio: true }} />
          </div>
        </div>
      </div>
    );
  };

  const renderPendingReport = () => {
    if (!reportData) return null;

    return (
      <div className="report-content">
        <div className="report-header">
          <h2>Pending Payments Report</h2>
        </div>

        <div className="stats-grid two-col">
          <div className="stat-card farmer-pending">
            <div className="stat-content">
              <p className="stat-label">Pending to Farmers</p>
              <p className="stat-value">{formatCurrency(reportData.farmerPending?.total)}</p>
              <p className="stat-count">{reportData.farmerPending?.count || 0} farmers</p>
            </div>
          </div>
          <div className="stat-card vendor-pending">
            <div className="stat-content">
              <p className="stat-label">Receivable from Vendors</p>
              <p className="stat-value">{formatCurrency(reportData.vendorPending?.total)}</p>
              <p className="stat-count">{reportData.vendorPending?.count || 0} vendors</p>
            </div>
          </div>
        </div>

        {reportData.farmerPending?.details && reportData.farmerPending.details.length > 0 && (
          <div className="card">
            <h3>Farmer Dues</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Farmer</th>
                  <th>Village</th>
                  <th>Phone</th>
                  <th>Pending Amount</th>
                </tr>
              </thead>
              <tbody>
                {reportData.farmerPending.details.map((farmer, index) => (
                  <tr key={index}>
                    <td>{farmer.name}</td>
                    <td>{farmer.village}</td>
                    <td>{farmer.phone}</td>
                    <td className="pending-amount">{formatCurrency(farmer.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportData.vendorPending?.details && reportData.vendorPending.details.length > 0 && (
          <div className="card">
            <h3>Vendor Receivables</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Shop No.</th>
                  <th>Phone</th>
                  <th>Receivable</th>
                </tr>
              </thead>
              <tbody>
                {reportData.vendorPending.details.map((vendor, index) => (
                  <tr key={index}>
                    <td>{vendor.name}</td>
                    <td>{vendor.shopNumber}</td>
                    <td>{vendor.phone}</td>
                    <td className="pending-amount">{formatCurrency(vendor.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderWeeklyMonthlyReport = () => {
    if (!reportData) return null;

    const chartData = {
      labels: reportData.labels || [],
      datasets: [
        {
          label: 'Sales',
          data: reportData.salesData || [],
          backgroundColor: '#10b981',
        },
        {
          label: 'Arrivals',
          data: reportData.arrivalData || [],
          backgroundColor: '#3b82f6',
        }
      ]
    };

    return (
      <div className="report-content">
        <div className="report-header">
          <h2>{activeReport === 'weekly' ? 'Weekly' : 'Monthly'} Report</h2>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-content">
              <p className="stat-label">Total Arrivals</p>
              <p className="stat-value">{formatCurrency(reportData.totalArrivals)}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <p className="stat-label">Total Sales</p>
              <p className="stat-value">{formatCurrency(reportData.totalSales)}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <p className="stat-label">Total Commission</p>
              <p className="stat-value">{formatCurrency(reportData.totalCommission)}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <p className="stat-label">Total Profit</p>
              <p className="stat-value">{formatCurrency(reportData.totalProfit)}</p>
            </div>
          </div>
        </div>

        <div className="chart-card wide">
          <h3>Sales vs Arrivals Trend</h3>
          <Bar 
            data={chartData} 
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }} 
          />
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Reports (रिपोर्ट)</h1>
          <p className="page-subtitle">View and download business reports</p>
        </div>
        <div className="download-buttons">
          <button className="btn btn-outline" onClick={() => downloadReport('pdf')}>
            <FiDownload /> PDF
          </button>
          <button className="btn btn-outline" onClick={() => downloadReport('excel')}>
            <FiDownload /> Excel
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="report-tabs">
        <button 
          className={`report-tab ${activeReport === 'daily' ? 'active' : ''}`}
          onClick={() => setActiveReport('daily')}
        >
          <FiFileText /> Daily
        </button>
        <button 
          className={`report-tab ${activeReport === 'weekly' ? 'active' : ''}`}
          onClick={() => setActiveReport('weekly')}
        >
          <FiFileText /> Weekly
        </button>
        <button 
          className={`report-tab ${activeReport === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveReport('monthly')}
        >
          <FiFileText /> Monthly
        </button>
        <button 
          className={`report-tab ${activeReport === 'profit-loss' ? 'active' : ''}`}
          onClick={() => setActiveReport('profit-loss')}
        >
          <FiTrendingUp /> Profit/Loss
        </button>
        <button 
          className={`report-tab ${activeReport === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveReport('pending')}
        >
          <FiDollarSign /> Pending
        </button>
      </div>

      {/* Date Filters */}
      <div className="card date-filters">
        <div className="filter-row">
          <div className="filter-item">
            <FiCalendar />
            <label>From:</label>
            <input
              type="date"
              className="form-input"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            />
          </div>
          {(activeReport === 'profit-loss') && (
            <div className="filter-item">
              <label>To:</label>
              <input
                type="date"
                className="form-input"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              />
            </div>
          )}
          <button className="btn btn-primary" onClick={fetchReport}>
            Generate Report
          </button>
        </div>
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Generating report...</p>
        </div>
      ) : (
        <>
          {activeReport === 'daily' && renderDailyReport()}
          {activeReport === 'profit-loss' && renderProfitLossReport()}
          {activeReport === 'pending' && renderPendingReport()}
          {(activeReport === 'weekly' || activeReport === 'monthly') && renderWeeklyMonthlyReport()}
        </>
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
        .download-buttons {
          display: flex;
          gap: 0.5rem;
        }
        .report-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .report-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        }
        .report-tab:hover {
          background: var(--light-gray);
        }
        .report-tab.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
        .date-filters {
          margin-bottom: 1.5rem;
        }
        .filter-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .filter-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .report-content {
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .report-header {
          margin-bottom: 1.5rem;
        }
        .report-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
        }
        .report-header p {
          color: var(--gray);
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .stats-grid.two-col {
          grid-template-columns: repeat(2, 1fr);
        }
        .stat-card {
          background: white;
          border-radius: 0.75rem;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .stat-card.arrivals {
          border-left: 4px solid #3b82f6;
        }
        .stat-card.sales {
          border-left: 4px solid #10b981;
        }
        .stat-card.commission {
          border-left: 4px solid #8b5cf6;
        }
        .stat-card.profit {
          border-left: 4px solid #f59e0b;
        }
        .stat-card.farmer-pending {
          border-left: 4px solid #ef4444;
        }
        .stat-card.vendor-pending {
          border-left: 4px solid #3b82f6;
        }
        .stat-label {
          font-size: 0.75rem;
          color: var(--gray);
          text-transform: uppercase;
          margin-bottom: 0.5rem;
        }
        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
        }
        .stat-amount {
          font-size: 0.875rem;
          color: var(--gray);
          margin-top: 0.25rem;
        }
        .stat-count {
          font-size: 0.875rem;
          color: var(--gray);
        }
        .pnl-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .pnl-section {
          background: white;
          border-radius: 0.75rem;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .pnl-section h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          font-size: 1rem;
        }
        .pnl-section.income h3 {
          color: #10b981;
        }
        .pnl-section.expenses h3 {
          color: #ef4444;
        }
        .pnl-section.profit h3 {
          color: #3b82f6;
        }
        .pnl-items {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .pnl-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .pnl-item:last-child {
          border-bottom: none;
        }
        .pnl-item.total {
          font-weight: 700;
          padding-top: 0.75rem;
          margin-top: 0.5rem;
          border-top: 2px solid #e5e7eb;
          border-bottom: none;
        }
        .profit-value {
          font-size: 2.5rem;
          font-weight: 700;
          text-align: center;
          margin: 1rem 0;
        }
        .profit-value.positive {
          color: #10b981;
        }
        .profit-value.negative {
          color: #ef4444;
        }
        .profit-margin {
          text-align: center;
          color: var(--gray);
        }
        .chart-container {
          display: grid;
          gap: 1.5rem;
        }
        .chart-card {
          background: white;
          border-radius: 0.75rem;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .chart-card h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .chart-card.wide {
          height: 400px;
        }
        .pending-amount {
          font-weight: 600;
          color: #ef4444;
        }
        @media (max-width: 768px) {
          .pnl-grid {
            grid-template-columns: 1fr;
          }
          .stats-grid.two-col {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Reports;
