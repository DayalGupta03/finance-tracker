import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { fetchTxns } from '../api';
import { useTheme } from '../context/ThemeContext';
import { useScrollReveal } from '../hooks/useScrollEffects';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function TimeAnalysis() {
  const { theme } = useTheme();
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('monthly');
  const chartReveal = useScrollReveal({ threshold: 0.05 });

  const isDark = theme === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? '#64748b' : '#94a3b8';
  const legendColor = isDark ? '#94a3b8' : '#64748b';

  useEffect(() => {
    fetchTxns().then(res => { setTxns(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const groupByPeriod = (period) => {
    const incomeMap = {}, expenseMap = {};
    txns.forEach(txn => {
      const d = new Date(txn.date);
      let key;
      if (period === 'weekly') {
        const ws = new Date(d); ws.setDate(d.getDate() - d.getDay());
        key = ws.toISOString().split('T')[0];
      } else if (period === 'monthly') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else { key = d.getFullYear().toString(); }
      if (txn.type === 'income') incomeMap[key] = (incomeMap[key] || 0) + txn.amount;
      else expenseMap[key] = (expenseMap[key] || 0) + txn.amount;
    });
    const allKeys = [...new Set([...Object.keys(incomeMap), ...Object.keys(expenseMap)])].sort();
    return { allKeys, incomeMap, expenseMap };
  };

  const formatLabel = (key, period) => {
    if (period === 'monthly') { const [y, m] = key.split('-'); return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }); }
    if (period === 'weekly') return `W/o ${new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    return key;
  };

  const { allKeys, incomeMap, expenseMap } = groupByPeriod(activeTab);

  const chartData = {
    labels: allKeys.map(k => formatLabel(k, activeTab)),
    datasets: [
      {
        label: 'Income',
        data: allKeys.map(k => incomeMap[k] || 0),
        borderColor: isDark ? '#34d399' : '#059669',
        backgroundColor: isDark ? 'rgba(52, 211, 153, 0.08)' : 'rgba(5, 150, 105, 0.06)',
        tension: 0.35, fill: true, pointRadius: 3, pointHoverRadius: 5, borderWidth: 2,
      },
      {
        label: 'Expenses',
        data: allKeys.map(k => expenseMap[k] || 0),
        borderColor: isDark ? '#f87171' : '#dc2626',
        backgroundColor: isDark ? 'rgba(248, 113, 113, 0.08)' : 'rgba(220, 38, 38, 0.06)',
        tension: 0.35, fill: true, pointRadius: 3, pointHoverRadius: 5, borderWidth: 2,
      },
    ],
  };

  const totalIncome = Object.values(incomeMap).reduce((s, v) => s + v, 0);
  const totalExpense = Object.values(expenseMap).reduce((s, v) => s + v, 0);
  const avgExpense = allKeys.length ? totalExpense / allKeys.length : 0;

  if (loading) {
    return (
      <div className="page">
        <h2>Time Analysis</h2>
        <div className="shimmer" style={{ height: 400, borderRadius: 12 }} />
      </div>
    );
  }

  return (
    <div className="page">
      <h2>Time Analysis</h2>

      <div className="filter-bar" style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: '0.65rem' }}>
        {['weekly', 'monthly', 'yearly'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={tab === activeTab ? 'primary-btn' : 'secondary-btn'}
            style={{ textTransform: 'capitalize' }}
          >{tab}</button>
        ))}
      </div>

      <div className="summary-cards stagger-children" style={{ marginTop: '1.25rem' }}>
        <div className="stat-card stat-income">
          <div className="stat-label">Total Income</div>
          <div className="stat-value">₹{totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card stat-expense">
          <div className="stat-label">Total Expenses</div>
          <div className="stat-value">₹{totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card stat-balance">
          <div className="stat-label">Avg / Period</div>
          <div className="stat-value">₹{avgExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card stat-txns">
          <div className="stat-label">Periods</div>
          <div className="stat-value">{allKeys.length}</div>
        </div>
      </div>

      <div
        ref={chartReveal.ref}
        className={`chart-card scroll-reveal ${chartReveal.isVisible ? 'visible' : ''}`}
        style={{ marginTop: '1.25rem' }}
      >
        {allKeys.length > 0 ? (
          <Line data={chartData} options={{
            responsive: true,
            animation: { duration: 700 },
            plugins: {
              legend: { position: 'bottom', labels: { color: legendColor, boxWidth: 10, padding: 14 } },
              tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` } }
            },
            scales: {
              x: { ticks: { color: tickColor }, grid: { display: false } },
              y: { beginAtZero: true, ticks: { color: tickColor, callback: v => '₹' + v.toLocaleString('en-IN') }, grid: { color: gridColor } }
            }
          }} />
        ) : (
          <div className="empty-state"><p>No data for {activeTab} analysis.</p></div>
        )}
      </div>
    </div>
  );
}
