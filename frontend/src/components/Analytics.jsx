import { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { fetchTxns } from '../api';
import { useTheme } from '../context/ThemeContext';
import { useScrollReveal } from '../hooks/useScrollEffects';

ChartJS.register(ArcElement, Tooltip, Legend);

const expenseColors = ['#6366f1', '#ef4444', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#a855f7'];
const incomeColors = ['#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#f59e0b'];

export default function Analytics() {
  const { theme } = useTheme();
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const expReveal = useScrollReveal();
  const incReveal = useScrollReveal();

  const legendColor = theme === 'dark' ? '#94a3b8' : '#64748b';

  useEffect(() => {
    fetchTxns().then(res => {
      setTxns(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const categoryTotals = {};
  txns.filter(t => t.type === 'expense').forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });
  const categories = Object.keys(categoryTotals);
  const amounts = Object.values(categoryTotals);
  const total = amounts.reduce((s, a) => s + a, 0);

  const incomeTotals = {};
  txns.filter(t => t.type === 'income').forEach(t => {
    incomeTotals[t.category] = (incomeTotals[t.category] || 0) + t.amount;
  });
  const incomeCategories = Object.keys(incomeTotals);
  const incomeAmounts = Object.values(incomeTotals);
  const incomeTotal = incomeAmounts.reduce((s, a) => s + a, 0);

  if (loading) {
    return (
      <div className="page">
        <h2>Analytics</h2>
        <div className="shimmer" style={{ height: 400, borderRadius: 12 }} />
      </div>
    );
  }

  return (
    <div className="page">
      <h2>Analytics</h2>

      {txns.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-icon">📊</div>
          <h3>No data to analyze</h3>
          <p>Add some transactions to see your analytics</p>
        </div>
      ) : (
        <div className="charts-row">
          <div ref={expReveal.ref} className={`chart-card scroll-reveal ${expReveal.isVisible ? 'visible' : ''}`}>
            <h3>Expense Breakdown</h3>
            {categories.length > 0 ? (
              <>
                <div style={{ maxWidth: 300, margin: '0 auto 1.25rem' }}>
                  <Doughnut
                    data={{
                      labels: categories,
                      datasets: [{ data: amounts, backgroundColor: expenseColors.slice(0, categories.length), borderWidth: 0 }]
                    }}
                    options={{
                      cutout: '65%',
                      animation: { duration: 700 },
                      plugins: {
                        legend: { position: 'bottom', labels: { color: legendColor, boxWidth: 10, padding: 12 } },
                        tooltip: { callbacks: { label: ctx => `${ctx.label}: ₹${ctx.parsed.toLocaleString('en-IN')} (${((ctx.parsed / total) * 100).toFixed(1)}%)` } }
                      }
                    }}
                  />
                </div>
                <table>
                  <thead><tr><th>Category</th><th>Amount</th><th>%</th></tr></thead>
                  <tbody>
                    {categories.map((cat, i) => (
                      <tr key={cat}>
                        <td>
                          <span style={{ display: 'inline-block', width: 8, height: 8, background: expenseColors[i], borderRadius: 2, marginRight: 8 }} />
                          {cat}
                        </td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>₹{categoryTotals[cat].toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{((categoryTotals[cat] / total) * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: '0.85rem', padding: '0.6rem 0.85rem', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.88rem' }}>
                  Total Expenses: ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </>
            ) : (
              <div className="empty-state"><p>No expenses recorded.</p></div>
            )}
          </div>

          <div ref={incReveal.ref} className={`chart-card scroll-reveal ${incReveal.isVisible ? 'visible' : ''}`}>
            <h3>Income Breakdown</h3>
            {incomeCategories.length > 0 ? (
              <>
                <div style={{ maxWidth: 300, margin: '0 auto 1.25rem' }}>
                  <Doughnut
                    data={{
                      labels: incomeCategories,
                      datasets: [{ data: incomeAmounts, backgroundColor: incomeColors.slice(0, incomeCategories.length), borderWidth: 0 }]
                    }}
                    options={{
                      cutout: '65%',
                      animation: { duration: 700 },
                      plugins: { legend: { position: 'bottom', labels: { color: legendColor, boxWidth: 10, padding: 12 } } }
                    }}
                  />
                </div>
                <div style={{ padding: '0.6rem 0.85rem', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.88rem' }}>
                  Total Income: ₹{incomeTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </>
            ) : (
              <div className="empty-state"><p>No income recorded.</p></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
