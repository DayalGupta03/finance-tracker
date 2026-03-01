import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchTxns, exportCSV, fetchCategories } from '../api';
import TransactionItem from './TransactionItem';
import { useToast } from '../context/ToastContext';

function getMonthLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function getMonthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function TransactionList() {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const toast = useToast();

  // View mode: 'all' | 'monthly' | 'custom'
  const [viewMode, setViewMode] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('');

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterType) params.type = filterType;
      if (filterCategory) params.category = filterCategory;
      if (search) params.search = search;

      // Apply date filters based on view mode
      if (viewMode === 'monthly' && selectedMonth) {
        const [y, m] = selectedMonth.split('-');
        const startDate = `${y}-${m}-01`;
        const lastDay = new Date(y, m, 0).getDate();
        const endDate = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
        params.from = startDate;
        params.to = endDate;
      } else if (viewMode === 'custom') {
        if (filterFrom) params.from = filterFrom;
        if (filterTo) params.to = filterTo;
      }

      const res = await fetchTxns(params);
      setTxns(res.data);
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    fetchCategories().then(r => setCategories(r.data)).catch(() => { });
  }, []);

  // Reload when filters or view mode changes
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [filterType, filterCategory, filterFrom, filterTo, search, viewMode, selectedMonth]);

  // Get available months from transactions
  const availableMonths = useMemo(() => {
    const monthSet = new Set();
    txns.forEach(t => monthSet.add(getMonthKey(t.date)));
    return [...monthSet].sort().reverse();
  }, [txns]);

  // Auto-select current month when switching to monthly view
  useEffect(() => {
    if (viewMode === 'monthly' && !selectedMonth) {
      const now = new Date();
      setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    }
  }, [viewMode]);

  const navigateMonth = (dir) => {
    if (!selectedMonth) return;
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const removeLocal = id => setTxns(txns.filter(t => t.id !== id));

  const handleExport = async () => {
    try {
      const res = await exportCSV();
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'transactions.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported!');
    } catch {
      toast.error('Export failed');
    }
  };

  const clearFilters = () => {
    setFilterType('');
    setFilterCategory('');
    setFilterFrom('');
    setFilterTo('');
    setSearch('');
  };

  const hasFilters = filterType || filterCategory || filterFrom || filterTo || search;

  // Running balance
  const runningTxns = [...txns].reverse();
  let runningBalance = 0;
  const balances = {};
  runningTxns.forEach(t => {
    runningBalance += t.type === 'income' ? t.amount : -t.amount;
    balances[t.id] = runningBalance;
  });

  // Monthly totals
  const monthlyIncome = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Transactions</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExport} className="secondary-btn">📥 Export CSV</button>
          <Link to="/add" className="primary-btn">+ Add New</Link>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="view-mode-tabs">
        <button
          className={`view-tab ${viewMode === 'all' ? 'active' : ''}`}
          onClick={() => { setViewMode('all'); clearFilters(); }}
        >
          All
        </button>
        <button
          className={`view-tab ${viewMode === 'monthly' ? 'active' : ''}`}
          onClick={() => setViewMode('monthly')}
        >
          📅 Monthly
        </button>
        <button
          className={`view-tab ${viewMode === 'custom' ? 'active' : ''}`}
          onClick={() => setViewMode('custom')}
        >
          📆 Custom Range
        </button>
      </div>

      {/* Month Navigator */}
      {viewMode === 'monthly' && (
        <div className="month-nav">
          <button onClick={() => navigateMonth(-1)} className="month-nav-btn">← Prev</button>
          <div className="month-nav-current">
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="month-picker"
            />
          </div>
          <button onClick={() => navigateMonth(1)} className="month-nav-btn">Next →</button>
        </div>
      )}

      {/* Custom Date Range */}
      {viewMode === 'custom' && (
        <div className="date-range-row">
          <div className="date-range-field">
            <label>From</label>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
          </div>
          <span className="date-range-arrow">→</span>
          <div className="date-range-field">
            <label>To</label>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
          </div>
        </div>
      )}

      {/* Monthly Summary Bar */}
      {(viewMode === 'monthly' || viewMode === 'custom') && txns.length > 0 && (
        <div className="summary-cards" style={{ marginBottom: '1.25rem' }}>
          <div className="stat-card stat-income">
            <div className="stat-label">Income</div>
            <div className="stat-value" style={{ fontSize: '1.15rem' }}>
              ₹{monthlyIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="stat-card stat-expense">
            <div className="stat-label">Expenses</div>
            <div className="stat-value" style={{ fontSize: '1.15rem' }}>
              ₹{monthlyExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="stat-card stat-balance">
            <div className="stat-label">Net</div>
            <div className="stat-value" style={{ fontSize: '1.15rem', color: monthlyIncome - monthlyExpense >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
              ₹{(monthlyIncome - monthlyExpense).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="filter-bar">
        <input
          type="text"
          placeholder="🔍 Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="filter-input"
        />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="filter-select">
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="filter-select">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="clear-btn">✕ Clear</button>
        )}
      </div>

      {/* Transaction Table */}
      {loading ? (
        <div className="shimmer" style={{ height: 300, borderRadius: 12 }} />
      ) : txns.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-icon">📭</div>
          <h3>{hasFilters || viewMode !== 'all' ? 'No matching transactions' : 'No transactions yet'}</h3>
          <p>{hasFilters ? 'Try adjusting your filters' : viewMode === 'monthly' ? 'No transactions this month' : 'Start tracking your income and expenses'}</p>
          {!hasFilters && viewMode === 'all' && <Link to="/add" className="primary-btn">Add Your First Transaction</Link>}
        </div>
      ) : (
        <>
          <div className="txn-count">{txns.length} transaction{txns.length !== 1 ? 's' : ''}</div>
          <table className="transaction-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Balance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {txns.map(t => (
                <TransactionItem
                  key={t.id}
                  txn={t}
                  balance={balances[t.id]}
                  onDelete={removeLocal}
                />
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
