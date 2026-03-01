import { useEffect, useState } from 'react';
import { fetchStocks, getStockPrices, deleteStock, updateStock, addStock } from '../api';
import { useToast } from '../context/ToastContext';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function StockList() {
  const [stocks, setStocks] = useState([]);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const toast = useToast();

  // Add form
  const [symbol, setSymbol] = useState('');
  const [qty, setQty] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [adding, setAdding] = useState(false);

  const refresh = async () => {
    try {
      const stockArr = (await fetchStocks()).data;
      setStocks(stockArr);
      if (stockArr.length) {
        const live = (await getStockPrices(stockArr.map(s => s.symbol))).data;
        setPrices(live);
      } else {
        setPrices([]);
      }
    } catch {
      toast.error('Failed to load stocks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!symbol || !qty || !buyPrice) return toast.error('Fill all fields');
    setAdding(true);
    try {
      await addStock({ symbol: symbol.toUpperCase(), qty: Number(qty), buyPrice: Number(buyPrice) });
      toast.success('Stock added!');
      setSymbol(''); setQty(''); setBuyPrice('');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add stock');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this stock?')) return;
    try {
      await deleteStock(id);
      toast.success('Stock removed');
      refresh();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleSave = async (id) => {
    try {
      await updateStock(id, { qty: Number(editQty), buyPrice: Number(editPrice) });
      toast.success('Stock updated');
      setEditing(null);
      refresh();
    } catch {
      toast.error('Failed to update');
    }
  };

  const getLivePrice = symbol => (prices.find(p => p.symbol === symbol) || {}).price;

  // Pie chart
  const values = stocks.map(s => {
    const price = getLivePrice(s.symbol);
    return price ? price * s.qty : s.buy_price * s.qty;
  });
  const totalValue = values.reduce((a, b) => a + b, 0);

  const chartColors = [
    '#8b5cf6', '#f43f5e', '#22d3ee', '#f59e0b', '#10b981',
    '#ec4899', '#3b82f6', '#84cc16'
  ];

  if (loading) {
    return (
      <div className="page">
        <h2>📈 Stock Portfolio</h2>
        <div className="shimmer" style={{ height: 300, borderRadius: 12 }} />
      </div>
    );
  }

  return (
    <div className="page">
      <h2>📈 Stock Portfolio</h2>

      {/* Add Stock Form */}
      <form onSubmit={handleAdd} className="budget-form" style={{ marginBottom: '2rem' }}>
        <input
          type="text"
          placeholder="Symbol (e.g. RELIANCE.NS)"
          value={symbol}
          onChange={e => setSymbol(e.target.value)}
          className="filter-input"
          required
        />
        <input
          type="number"
          placeholder="Quantity"
          value={qty}
          onChange={e => setQty(e.target.value)}
          min="1"
          className="filter-input"
          required
        />
        <input
          type="number"
          placeholder="Buy Price (₹)"
          value={buyPrice}
          onChange={e => setBuyPrice(e.target.value)}
          min="0.01"
          step="0.01"
          className="filter-input"
          required
        />
        <button type="submit" className="primary-btn" disabled={adding}>
          {adding ? 'Adding...' : '+ Add Stock'}
        </button>
      </form>

      {stocks.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-icon">📉</div>
          <h3>No stocks in your portfolio</h3>
          <p>Add stocks to track your investments</p>
        </div>
      ) : (
        <>
          <table className="stock-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Qty</th>
                <th>Buy Price</th>
                <th>Invested</th>
                <th>Current</th>
                <th>Value</th>
                <th>P/L</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((s, i) => {
                const live = getLivePrice(s.symbol);
                const currentPrice = live || null;

                if (editing === s.id) {
                  return (
                    <tr key={s.id} className="fade-in-row">
                      <td>{s.symbol}</td>
                      <td>
                        <input type="number" min={1} value={editQty}
                          onChange={e => setEditQty(e.target.value)}
                          style={{ width: 70 }} />
                      </td>
                      <td>
                        <input type="number" min={0} step="0.01" value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                          style={{ width: 90 }} />
                      </td>
                      <td>₹{(editQty * editPrice || 0).toLocaleString('en-IN')}</td>
                      <td>{currentPrice ? `₹${currentPrice}` : '—'}</td>
                      <td>{currentPrice && editQty ? `₹${(currentPrice * editQty).toLocaleString('en-IN')}` : '—'}</td>
                      <td>—</td>
                      <td>
                        <button className="stock-edit-btn" onClick={() => handleSave(s.id)}>Save</button>
                        <button className="stock-delete-btn" onClick={() => setEditing(null)}>Cancel</button>
                      </td>
                    </tr>
                  );
                }

                const invested = s.qty * s.buy_price;
                const value = currentPrice ? currentPrice * s.qty : null;
                const pl = value ? value - invested : null;

                return (
                  <tr key={s.id} className="fade-in-row" style={{ animationDelay: `${i * 0.05}s` }}>
                    <td style={{ fontWeight: 600 }}>{s.symbol}</td>
                    <td>{s.qty}</td>
                    <td>₹{s.buy_price.toLocaleString('en-IN')}</td>
                    <td>₹{invested.toLocaleString('en-IN')}</td>
                    <td>{currentPrice ? `₹${currentPrice.toLocaleString('en-IN')}` : <span style={{ color: 'var(--text-muted)' }}>N/A</span>}</td>
                    <td>{value ? `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
                    <td style={{ color: pl > 0 ? 'var(--accent-green)' : pl < 0 ? 'var(--accent-red)' : 'inherit', fontWeight: 600 }}>
                      {pl !== null ? `${pl >= 0 ? '+' : ''}₹${pl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td>
                      <button className="stock-edit-btn" onClick={() => { setEditing(s.id); setEditQty(s.qty); setEditPrice(s.buy_price); }}>
                        ✏️ Edit
                      </button>
                      <button className="stock-delete-btn" onClick={() => handleDelete(s.id)}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Portfolio Pie */}
          <div style={{ maxWidth: 380, margin: '2rem auto' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Portfolio Allocation</h3>
            <Doughnut
              data={{
                labels: stocks.map(s => s.symbol),
                datasets: [{
                  data: values,
                  backgroundColor: chartColors.slice(0, stocks.length),
                  borderWidth: 0,
                }]
              }}
              options={{
                cutout: '60%',
                plugins: {
                  legend: { position: 'bottom', labels: { color: '#9898b8', boxWidth: 12 } },
                  tooltip: {
                    callbacks: {
                      label: ctx => {
                        const pct = totalValue ? ((ctx.raw / totalValue) * 100).toFixed(1) : 0;
                        return `${ctx.label}: ₹${ctx.raw.toLocaleString('en-IN')} (${pct}%)`;
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
