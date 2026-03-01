import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { addTxn, fetchTxns, updateTxn, fetchCategories } from '../api';
import { useToast } from '../context/ToastContext';

const CATEGORY_ICONS = {
  Salary: '💼', Freelance: '💻', Investment: '📈', Food: '🍕',
  Transport: '🚗', Housing: '🏠', Utilities: '💡', Entertainment: '🎬',
  Shopping: '🛍️', Health: '🏥', Education: '📚', Travel: '✈️',
  Subscriptions: '📱', Gifts: '🎁', Other: '📦'
};

const blank = { amount: '', type: 'expense', category: 'Food', date: '', description: '' };

// Today in local YYYY-MM-DD (not UTC, so picker max works correctly in IST)
function localToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function TransactionForm() {
  const { id } = useParams();
  const [data, setData] = useState(blank);
  const [categories, setCategories] = useState(Object.keys(CATEGORY_ICONS));
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const toast = useToast();
  const today = localToday();

  useEffect(() => {
    fetchCategories().then(r => setCategories(r.data)).catch(() => { });
    if (id) {
      fetchTxns().then(r => {
        const txn = r.data.find(t => t.id === Number(id));
        if (txn) setData(txn);
        else toast.error('Transaction not found');
      }).catch(() => toast.error('Failed to load transaction'));
    }
  }, [id]);

  const change = e => setData({ ...data, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();

    // --- Validations ---
    if (!data.description.trim())
      return toast.error('Description is required');
    if (data.description.trim().length < 2)
      return toast.error('Description is too short');
    if (!data.amount || Number(data.amount) <= 0)
      return toast.error('Enter a valid amount greater than 0');
    if (!data.date)
      return toast.error('Date is required');
    if (data.date > today)
      return toast.error('Date cannot be in the future');

    setLoading(true);
    try {
      if (id) {
        await updateTxn(id, data);
        toast.success('Transaction updated!');
      } else {
        await addTxn(data);
        toast.success('Transaction added!');
      }
      nav('/transactions');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h2>{id ? 'Edit' : 'New'} Transaction</h2>

      <form onSubmit={submit} className="txn-form">
        {/* Type toggle */}
        <div className="type-toggle">
          <button
            type="button"
            className={`toggle-btn ${data.type === 'expense' ? 'active expense' : ''}`}
            onClick={() => setData({ ...data, type: 'expense' })}
          >
            ↘ Expense
          </button>
          <button
            type="button"
            className={`toggle-btn ${data.type === 'income' ? 'active income' : ''}`}
            onClick={() => setData({ ...data, type: 'income' })}
          >
            ↗ Income
          </button>
        </div>

        <div className="form-group">
          <label htmlFor="amount">Amount (₹)</label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={data.amount}
            onChange={change}
            placeholder="0.00"
            required
            disabled={loading}
            className="amount-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <input
            id="description"
            name="description"
            value={data.description}
            onChange={change}
            placeholder="What was this for?"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Category</label>
          <div className="category-grid">
            {categories.map(cat => (
              <button
                type="button"
                key={cat}
                className={`cat-chip ${data.category === cat ? 'selected' : ''}`}
                onClick={() => setData({ ...data, category: cat })}
              >
                <span className="cat-icon">{CATEGORY_ICONS[cat] || '📦'}</span>
                <span className="cat-name">{cat}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input
            id="date"
            name="date"
            type="date"
            value={data.date?.substring(0, 10)}
            onChange={change}
            max={today}
            required
            disabled={loading}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Cannot be a future date
          </span>
        </div>

        <button type="submit" className="auth-btn" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? 'Saving…' : (id ? 'Update Transaction' : 'Add Transaction')}
        </button>
      </form>
    </div>
  );
}
