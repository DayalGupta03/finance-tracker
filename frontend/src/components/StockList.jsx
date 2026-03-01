import { useEffect, useState, useRef, useCallback } from 'react';
import { fetchStocks, getStockPrices, deleteStock, updateStock, addStock, searchStocks, getStockQuote } from '../api';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

// ── Debounced Stock Search Hook ─────────────────────────
function useStockSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef(null);

  const search = useCallback((q) => {
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!q || q.length < 1) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await searchStocks(q);
        setResults(res.data || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setSearching(false);
  }, []);

  return { query, results, searching, search, clear };
}

export default function StockList() {
  const [stocks, setStocks] = useState([]);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const toast = useToast();
  const { theme } = useTheme();

  // Add form
  const [qty, setQty] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [adding, setAdding] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [previewPrice, setPreviewPrice] = useState(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);

  // Search
  const { query, results, searching, search, clear } = useStockSearch();
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const legendColor = theme === 'dark' ? '#94a3b8' : '#64748b';

  const refresh = async () => {
    try {
      const stockArr = (await fetchStocks()).data;
      setStocks(stockArr);
      if (stockArr.length) {
        setRefreshing(true);
        const live = (await getStockPrices(stockArr.map(s => s.symbol))).data;
        setPrices(live);
      } else {
        setPrices([]);
      }
    } catch {
      toast.error('Failed to load stocks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelectSymbol = async (item) => {
    setSelectedSymbol(item.symbol);
    search('');
    setShowDropdown(false);
    setHighlightIndex(-1);

    // Fetch live price preview
    setFetchingPreview(true);
    try {
      const res = await getStockQuote(item.symbol);
      setPreviewPrice(res.data?.price || null);
    } catch {
      setPreviewPrice(null);
    } finally {
      setFetchingPreview(false);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (!showDropdown || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelectSymbol(results[highlightIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!selectedSymbol) return toast.error('Search and select a stock symbol');
    if (!qty || Number(qty) <= 0) return toast.error('Enter a valid quantity');
    if (!buyPrice || Number(buyPrice) <= 0) return toast.error('Enter a valid buy price');

    setAdding(true);
    try {
      await addStock({ symbol: selectedSymbol, qty: Number(qty), buyPrice: Number(buyPrice) });
      toast.success('Stock added!');
      setSelectedSymbol('');
      setQty('');
      setBuyPrice('');
      setPreviewPrice(null);
      clear();
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
    if (!editQty || Number(editQty) <= 0) return toast.error('Enter valid quantity');
    if (!editPrice || Number(editPrice) <= 0) return toast.error('Enter valid price');
    try {
      await updateStock(id, { qty: Number(editQty), buyPrice: Number(editPrice) });
      toast.success('Stock updated');
      setEditing(null);
      refresh();
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleRefreshPrices = async () => {
    if (stocks.length === 0) return;
    setRefreshing(true);
    try {
      const live = (await getStockPrices(stocks.map(s => s.symbol))).data;
      setPrices(live);
      toast.success('Prices refreshed');
    } catch {
      toast.error('Failed to refresh prices');
    } finally {
      setRefreshing(false);
    }
  };

  const getLivePrice = symbol => (prices.find(p => p.symbol === symbol) || {}).price;

  // Pie chart
  const values = stocks.map(s => {
    const price = getLivePrice(s.symbol);
    return price ? price * s.qty : s.buy_price * s.qty;
  });
  const totalValue = values.reduce((a, b) => a + b, 0);
  const totalInvested = stocks.reduce((a, s) => a + s.buy_price * s.qty, 0);
  const totalPL = stocks.reduce((a, s) => {
    const price = getLivePrice(s.symbol);
    if (!price || !s.qty) return a;
    return a + (price - s.buy_price) * s.qty;
  }, 0);

  const chartColors = ['#6366f1', '#ef4444', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#14b8a6'];

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
      <div className="page-header">
        <h2>📈 Stock Portfolio</h2>
        {stocks.length > 0 && (
          <button onClick={handleRefreshPrices} className="stock-refresh-btn" disabled={refreshing}>
            {refreshing ? '⏳ Refreshing...' : '🔄 Refresh Prices'}
          </button>
        )}
      </div>

      {/* Portfolio Summary */}
      {stocks.length > 0 && (
        <div className="summary-cards" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card stat-balance">
            <div className="stat-label">Total Value</div>
            <div className="stat-value" style={{ fontSize: '1.15rem' }}>
              ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="stat-card stat-txns">
            <div className="stat-label">Invested</div>
            <div className="stat-value" style={{ fontSize: '1.15rem' }}>
              ₹{totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className={`stat-card ${totalPL >= 0 ? 'stat-income' : 'stat-expense'}`}>
            <div className="stat-label">Total P/L</div>
            <div className="stat-value" style={{ fontSize: '1.15rem' }}>
              {totalPL >= 0 ? '+' : ''}₹{totalPL.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* Add Stock Form with Search */}
      <form onSubmit={handleAdd} className="budget-form" style={{ marginBottom: '2rem', alignItems: 'flex-end' }}>
        <div className="stock-search-wrapper" ref={dropdownRef}>
          {selectedSymbol ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="text"
                value={selectedSymbol}
                readOnly
                className="stock-search-input"
                style={{ fontWeight: 600 }}
              />
              <button
                type="button"
                onClick={() => { setSelectedSymbol(''); setPreviewPrice(null); searchInputRef.current?.focus(); }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-muted)' }}
              >✕</button>
              {fetchingPreview && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Loading price...</span>}
              {previewPrice !== null && !fetchingPreview && (
                <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600 }}>
                  ₹{previewPrice.toLocaleString('en-IN')}
                </span>
              )}
            </div>
          ) : (
            <>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="🔍 Search stock (e.g. Reliance, TCS)"
                value={query}
                onChange={e => { search(e.target.value); setShowDropdown(true); setHighlightIndex(-1); }}
                onFocus={() => results.length > 0 && setShowDropdown(true)}
                onKeyDown={handleSearchKeyDown}
                className="stock-search-input"
              />
              {showDropdown && (
                <div className="stock-search-dropdown">
                  {searching && <div className="stock-search-loading">Searching...</div>}
                  {!searching && results.length === 0 && query.length >= 1 && (
                    <div className="stock-search-empty">No stocks found for "{query}"</div>
                  )}
                  {!searching && results.map((item, i) => (
                    <div
                      key={item.symbol}
                      className={`stock-search-item ${i === highlightIndex ? 'highlighted' : ''}`}
                      onClick={() => handleSelectSymbol(item)}
                      onMouseEnter={() => setHighlightIndex(i)}
                    >
                      <div>
                        <div className="stock-symbol">{item.symbol}</div>
                        <div className="stock-name">{item.name}</div>
                      </div>
                      <div className="stock-exchange">{item.exchange}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <input
          type="number"
          placeholder="Quantity"
          value={qty}
          onChange={e => setQty(e.target.value)}
          min="1"
          step="any"
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
        <button type="submit" className="primary-btn" disabled={adding || !selectedSymbol}>
          {adding ? 'Adding...' : '+ Add Stock'}
        </button>
      </form>

      {stocks.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-icon">📉</div>
          <h3>No stocks in your portfolio</h3>
          <p>Search for a stock above to start tracking your investments</p>
        </div>
      ) : (
        <>
          <table className="transaction-table">
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
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.symbol}</td>
                      <td>
                        <input type="number" min={1} step="any" value={editQty}
                          onChange={e => setEditQty(e.target.value)}
                          style={{ width: 70 }} />
                      </td>
                      <td>
                        <input type="number" min={0} step="0.01" value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                          style={{ width: 90 }} />
                      </td>
                      <td>₹{(editQty * editPrice || 0).toLocaleString('en-IN')}</td>
                      <td>{currentPrice ? `₹${currentPrice.toLocaleString('en-IN')}` : '—'}</td>
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
                const value = currentPrice && s.qty ? currentPrice * s.qty : null;
                // P/L = (current_price − buy_price) × quantity
                const pl = (currentPrice && s.qty) ? (currentPrice - s.buy_price) * s.qty : null;
                const plPct = (pl !== null && invested > 0) ? (pl / invested) * 100 : null;

                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.symbol}</td>
                    <td>{s.qty}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>₹{s.buy_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>₹{invested.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {currentPrice
                        ? `₹${currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        : <span style={{ color: 'var(--text-muted)' }}>N/A</span>}
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {value ? `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td style={{
                      color: pl > 0 ? 'var(--color-success)' : pl < 0 ? 'var(--color-danger)' : 'inherit',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {pl !== null
                        ? `${pl >= 0 ? '+' : ''}₹${pl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}${plPct !== null ? ` (${plPct >= 0 ? '+' : ''}${plPct.toFixed(1)}%)` : ''}`
                        : '—'}
                    </td>
                    <td>
                      <button className="stock-edit-btn" onClick={() => { setEditing(s.id); setEditQty(s.qty); setEditPrice(s.buy_price); }}>
                        ✏️
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
                  legend: { position: 'bottom', labels: { color: legendColor, boxWidth: 12, padding: 12 } },
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
