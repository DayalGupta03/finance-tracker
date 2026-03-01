import { useEffect, useState } from 'react';
import { fetchBudgets, addBudget, deleteBudget, fetchCategories } from '../api';
import { useToast } from '../context/ToastContext';

export default function Budgets() {
    const [budgets, setBudgets] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newCat, setNewCat] = useState('');
    const [newLimit, setNewLimit] = useState('');
    const [adding, setAdding] = useState(false);
    const toast = useToast();

    const load = async () => {
        try {
            const [budgetRes, catRes] = await Promise.all([fetchBudgets(), fetchCategories()]);
            setBudgets(budgetRes.data);
            setCategories(catRes.data);
        } catch {
            toast.error('Failed to load budgets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newCat || !newLimit || newLimit <= 0) {
            return toast.error('Select a category and enter a valid limit');
        }
        setAdding(true);
        try {
            await addBudget({ category: newCat, monthly_limit: Number(newLimit) });
            toast.success('Budget created!');
            setNewCat('');
            setNewLimit('');
            load();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create budget');
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Remove this budget?')) return;
        try {
            await deleteBudget(id);
            toast.success('Budget removed');
            load();
        } catch {
            toast.error('Failed to delete');
        }
    };

    // Categories without existing budgets
    const usedCats = budgets.map(b => b.category);
    const availableCats = categories.filter(c => !usedCats.includes(c));

    if (loading) {
        return (
            <div className="page">
                <h2>Budgets</h2>
                <div className="shimmer" style={{ height: 200, borderRadius: 12 }} />
            </div>
        );
    }

    return (
        <div className="page">
            <h2>Monthly Budgets</h2>

            {/* Add Budget Form */}
            <form onSubmit={handleAdd} className="budget-form">
                <select value={newCat} onChange={e => setNewCat(e.target.value)} className="filter-select" required>
                    <option value="">Select Category</option>
                    {availableCats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                    type="number"
                    placeholder="Monthly limit (₹)"
                    value={newLimit}
                    onChange={e => setNewLimit(e.target.value)}
                    min="1"
                    step="any"
                    className="filter-input"
                    required
                />
                <button type="submit" className="primary-btn" disabled={adding}>
                    {adding ? 'Adding...' : '+ Add Budget'}
                </button>
            </form>

            {/* Budget List */}
            {budgets.length === 0 ? (
                <div className="empty-state-card">
                    <div className="empty-icon">🎯</div>
                    <h3>No budgets set</h3>
                    <p>Set spending limits per category to stay on track</p>
                </div>
            ) : (
                <div className="budget-grid">
                    {budgets.map(b => {
                        const isOver = b.percentage >= 100;
                        const isWarning = b.percentage >= 75 && !isOver;
                        return (
                            <div key={b.id} className={`budget-card ${isOver ? 'over' : isWarning ? 'warning' : ''}`}>
                                <div className="budget-header">
                                    <span className="budget-category">{b.category}</span>
                                    <button onClick={() => handleDelete(b.id)} className="budget-del" title="Remove">✕</button>
                                </div>
                                <div className="budget-amounts">
                                    <span className="budget-spent">₹{b.spent.toLocaleString('en-IN')}</span>
                                    <span className="budget-separator">/</span>
                                    <span className="budget-limit">₹{b.monthly_limit.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="budget-bar-bg">
                                    <div
                                        className={`budget-bar-fill ${isOver ? 'over' : isWarning ? 'warning' : ''}`}
                                        style={{ width: `${Math.min(b.percentage, 100)}%` }}
                                    />
                                </div>
                                <div className="budget-footer">
                                    <span className={isOver ? 'budget-over-text' : ''}>
                                        {isOver
                                            ? `Over by ₹${Math.abs(b.remaining).toLocaleString('en-IN')}`
                                            : `₹${b.remaining.toLocaleString('en-IN')} remaining`}
                                    </span>
                                    <span className="budget-pct">{b.percentage}%</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
