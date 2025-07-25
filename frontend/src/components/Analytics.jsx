import { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { fetchTxns } from '../api';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Analytics() {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTxns().then(res => {
      setTxns(res.data);
      setLoading(false);
    }).catch(err => {
      console.error('Error loading transactions:', err);
      setLoading(false);
    });
  }, []);

  // Group expenses by category
  const groupByCategory = () => {
    const expenses = txns.filter(t => t.type === 'expense');
    const categoryTotals = {};
    
    expenses.forEach(expense => {
      const category = expense.category || 'Other';
      categoryTotals[category] = (categoryTotals[category] || 0) + Number(expense.amount);
    });
    
    return categoryTotals;
  };

  const categoryData = groupByCategory();
  const categories = Object.keys(categoryData);
  const amounts = Object.values(categoryData);
  const total = amounts.reduce((sum, amount) => sum + amount, 0);

  // Chart colors
  const backgroundColors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
    '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
  ];

  const chartData = {
    labels: categories,
    datasets: [
      {
        data: amounts,
        backgroundColor: backgroundColors.slice(0, categories.length),
        borderColor: backgroundColors.slice(0, categories.length),
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ₹${context.parsed} (${percentage}%)`;
          }
        }
      }
    },
  };

  if (loading) return <div className="page">Loading analytics...</div>;

  return (
    <div className="page">
      <h2>Expense Analytics</h2>
      
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {/* Pie Chart */}
        <div style={{ flex: 1, minWidth: '300px', maxWidth: '500px' }}>
          <h3>Spending by Category</h3>
          {categories.length > 0 ? (
            <Pie data={chartData} options={chartOptions} />
          ) : (
            <p>No expense data available for chart.</p>
          )}
        </div>

        {/* Category Breakdown Table */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h3>Category Breakdown</h3>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Category</th>
                <th>Amount</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category, index) => {
                const amount = categoryData[category];
                const percentage = ((amount / total) * 100).toFixed(1);
                return (
                  <tr key={category}>
                    <td>
                      <span 
                        style={{
                          display: 'inline-block',
                          width: '12px',
                          height: '12px',
                          backgroundColor: backgroundColors[index],
                          marginRight: '8px',
                          borderRadius: '2px'
                        }}
                      ></span>
                      {category}
                    </td>
                    <td>₹{amount}</td>
                    <td>{percentage}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '4px' 
          }}>
            <strong>Total Expenses: ₹{total}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
