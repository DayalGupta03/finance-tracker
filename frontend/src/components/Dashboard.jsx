import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend, Title
} from 'chart.js';
import { fetchTxns, fetchSummary } from '../api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useScrollReveal, useAnimatedCounter } from '../hooks/useScrollEffects';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title);

function AnimatedStat({ value, prefix = '₹', suffix = '' }) {
  const animated = useAnimatedCounter(value, 1000, true);
  return (
    <span>
      {prefix}{animated.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{suffix}
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [txns, setTxns] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  // Scroll reveal refs
  const cardsReveal = useScrollReveal();
  const chartsReveal = useScrollReveal({ threshold: 0.05 });
  const recentReveal = useScrollReveal({ threshold: 0.05 });

  useEffect(() => {
    Promise.all([fetchTxns(), fetchSummary()])
      .then(([txnRes, sumRes]) => {
        setTxns(txnRes.data);
        setSummary(sumRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const recentTxns = txns.slice(0, 5);

  // Category breakdown for doughnut
  const catMap = {};
  txns.filter(t => t.type === 'expense').forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
  });
  const catLabels = Object.keys(catMap);
  const catValues = Object.values(catMap);

  // Professional muted chart colors
  const chartColors = ['#6366f1', '#ef4444', '#06b6d4', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6'];
  const isDark = theme === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? '#64748b' : '#94a3b8';
  const legendColor = isDark ? '#94a3b8' : '#64748b';

  // Monthly bar chart
  const months = Object.keys(summary).sort().slice(-6);
  const barData = {
    labels: months.map(m => {
      const [y, mo] = m.split('-');
      return new Date(y, mo - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }),
    datasets: [
      {
        label: 'Income',
        data: months.map(m => summary[m]?.income || 0),
        backgroundColor: isDark ? 'rgba(52, 211, 153, 0.7)' : 'rgba(5, 150, 105, 0.7)',
        borderRadius: 4,
        barPercentage: 0.7,
      },
      {
        label: 'Expense',
        data: months.map(m => summary[m]?.expense || 0),
        backgroundColor: isDark ? 'rgba(248, 113, 113, 0.7)' : 'rgba(220, 38, 38, 0.7)',
        borderRadius: 4,
        barPercentage: 0.7,
      },
    ],
  };

  if (loading) {
    return (
      <div className="page">
        <div className="shimmer" style={{ height: 80, marginBottom: 16, borderRadius: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="shimmer" style={{ height: 90, borderRadius: 12 }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div className="shimmer" style={{ height: 280, borderRadius: 12 }} />
          <div className="shimmer" style={{ height: 280, borderRadius: 12 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Welcome, {user?.name?.split(' ')[0] || 'there'} 👋</h1>
        <Link to="/add" className="primary-btn">+ Add Transaction</Link>
      </div>

      {/* Summary Cards — animated counters + stagger */}
      <div
        ref={cardsReveal.ref}
        className={`summary-cards stagger-children ${cardsReveal.isVisible ? '' : ''}`}
      >
        <div className="stat-card stat-income">
          <div className="stat-label">Income</div>
          <div className="stat-value">
            <AnimatedStat value={income} />
          </div>
          <div className="stat-icon">↗</div>
        </div>
        <div className="stat-card stat-expense">
          <div className="stat-label">Expenses</div>
          <div className="stat-value">
            <AnimatedStat value={expense} />
          </div>
          <div className="stat-icon">↘</div>
        </div>
        <div className="stat-card stat-balance">
          <div className="stat-label">Balance</div>
          <div className="stat-value">
            <AnimatedStat value={balance} />
          </div>
          <div className="stat-icon">≡</div>
        </div>
        <div className="stat-card stat-txns">
          <div className="stat-label">Transactions</div>
          <div className="stat-value">{txns.length}</div>
          <div className="stat-icon">📋</div>
        </div>
      </div>

      {/* Charts Row — scroll reveal */}
      <div
        ref={chartsReveal.ref}
        className={`charts-row scroll-reveal ${chartsReveal.isVisible ? 'visible' : ''}`}
      >
        <div className="chart-card">
          <h3>Monthly Overview</h3>
          {months.length > 0 ? (
            <Bar data={barData} options={{
              responsive: true,
              animation: { duration: 800 },
              plugins: {
                legend: { position: 'bottom', labels: { color: legendColor, boxWidth: 12, padding: 16 } }
              },
              scales: {
                x: { ticks: { color: tickColor }, grid: { display: false } },
                y: {
                  beginAtZero: true,
                  ticks: { color: tickColor, callback: v => '₹' + v.toLocaleString('en-IN') },
                  grid: { color: gridColor }
                }
              }
            }} />
          ) : (
            <div className="empty-state"><p>No data yet. Add transactions to see trends.</p></div>
          )}
        </div>

        <div className="chart-card">
          <h3>Spending Categories</h3>
          {catLabels.length > 0 ? (
            <Doughnut
              data={{
                labels: catLabels,
                datasets: [{
                  data: catValues,
                  backgroundColor: chartColors.slice(0, catLabels.length),
                  borderWidth: 0,
                }]
              }}
              options={{
                responsive: true,
                cutout: '65%',
                animation: { duration: 800 },
                plugins: {
                  legend: { position: 'bottom', labels: { color: legendColor, boxWidth: 12, padding: 12 } },
                }
              }}
            />
          ) : (
            <div className="empty-state"><p>No expenses recorded yet.</p></div>
          )}
        </div>
      </div>

      {/* Recent Transactions — scroll reveal */}
      <div
        ref={recentReveal.ref}
        className={`recent-section scroll-reveal ${recentReveal.isVisible ? 'visible' : ''}`}
      >
        <div className="section-header">
          <h3>Recent Transactions</h3>
          <Link to="/transactions" className="link-btn">View All →</Link>
        </div>
        {recentTxns.length > 0 ? (
          <div className="recent-list">
            {recentTxns.map(t => (
              <div key={t.id} className="recent-item">
                <div className="recent-left">
                  <div className={`recent-type-badge ${t.type}`}>
                    {t.type === 'income' ? '↗' : '↘'}
                  </div>
                  <div>
                    <div className="recent-desc">{t.description}</div>
                    <div className="recent-meta">{t.category} · {t.date}</div>
                  </div>
                </div>
                <div className={`recent-amount ${t.type}`}>
                  {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>🚀 No transactions yet. <Link to="/add">Add your first one!</Link></p>
          </div>
        )}
      </div>
    </div>
  );
}
