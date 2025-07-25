import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { fetchTxns } from '../api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function TimeAnalysis() {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('weekly');

  useEffect(() => {
    fetchTxns().then(res => {
      setTxns(res.data.filter(t => t.type === 'expense'));
      setLoading(false);
    }).catch(err => {
      console.error('Error loading transactions:', err);
      setLoading(false);
    });
  }, []);

  // Group expenses by time period
  const groupExpensesByPeriod = (period) => {
    const grouped = {};
    const now = new Date();
    
    txns.forEach(txn => {
      const txnDate = new Date(txn.date);
      let key;
      
      if (period === 'weekly') {
        const weekStart = new Date(txnDate);
        weekStart.setDate(txnDate.getDate() - txnDate.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else if (period === 'monthly') {
        key = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}`;
      } else if (period === 'yearly') {
        key = txnDate.getFullYear().toString();
      }
      
      grouped[key] = (grouped[key] || 0) + Number(txn.amount);
    });
    
    return grouped;
  };

  // Generate chart data
  const getChartData = (period) => {
    const groupedData = groupExpensesByPeriod(period);
    const sortedKeys = Object.keys(groupedData).sort();
    
    let labels, displayLabels;
    
    if (period === 'weekly') {
      labels = sortedKeys;
      displayLabels = sortedKeys.map(date => {
        const d = new Date(date);
        return `Week ${d.toLocaleDateString()}`;
      });
    } else if (period === 'monthly') {
      labels = sortedKeys;
      displayLabels = sortedKeys.map(month => {
        const [year, monthNum] = month.split('-');
        const monthName = new Date(year, monthNum - 1).toLocaleDateString('default', { month: 'long', year: 'numeric' });
        return monthName;
      });
    } else {
      labels = sortedKeys;
      displayLabels = labels;
    }

    return {
      labels: displayLabels,
      datasets: [
        {
          label: `${period.charAt(0).toUpperCase() + period.slice(1)} Expenses`,
          data: labels.map(key => groupedData[key] || 0),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1,
          fill: true,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Expense Analysis`,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Expenses: ₹${context.parsed.y.toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '₹' + value;
          }
        }
      }
    },
  };

  // Get summary statistics
  const getSummaryStats = (period) => {
    const groupedData = groupExpensesByPeriod(period);
    const values = Object.values(groupedData);
    
    if (values.length === 0) return { total: 0, average: 0, highest: 0, periods: 0 };
    
    const total = values.reduce((sum, val) => sum + val, 0);
    const average = total / values.length;
    const highest = Math.max(...values);
    
    return {
      total: total.toFixed(2),
      average: average.toFixed(2),
      highest: highest.toFixed(2),
      periods: values.length
    };
  };

  if (loading) return <div className="page">Loading time analysis...</div>;

  const currentStats = getSummaryStats(activeTab);
  const chartData = getChartData(activeTab);

  return (
    <div className="page">
      <h2>Time-Based Expense Analysis</h2>
      
      {/* Tab Navigation */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid #eee' }}>
          {['weekly', 'monthly', 'yearly'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #0366d6' : '2px solid transparent',
                background: activeTab === tab ? '#f8f9fa' : 'transparent',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? 'bold' : 'normal',
                color: activeTab === tab ? '#0366d6' : '#666',
                textTransform: 'capitalize'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Statistics */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: '200px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>Total Expenses</h4>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#e74c3c' }}>
            ₹{currentStats.total}
          </div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: '200px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>Average Per {activeTab.slice(0, -2)}</h4>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f39c12' }}>
            ₹{currentStats.average}
          </div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: '200px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>Highest {activeTab.slice(0, -2)}</h4>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#e67e22' }}>
            ₹{currentStats.highest}
          </div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: '200px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>Total Periods</h4>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3498db' }}>
            {currentStats.periods}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
        {chartData.labels.length > 0 ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            <p>No expense data available for {activeTab} analysis.</p>
            <p>Add some expenses to see trends over time.</p>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div style={{ marginTop: '2rem', backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
        <h3>Detailed Breakdown</h3>
        {chartData.labels.length > 0 ? (
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Period</th>
                <th>Total Expenses</th>
                <th>% of Total</th>
              </tr>
            </thead>
            <tbody>
              {chartData.labels.map((label, index) => {
                const amount = chartData.datasets[0].data[index];
                const percentage = ((amount / currentStats.total) * 100).toFixed(1);
                return (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>₹{amount.toFixed(2)}</td>
                    <td>{percentage}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>No data to display.</p>
        )}
      </div>
    </div>
  );
}
