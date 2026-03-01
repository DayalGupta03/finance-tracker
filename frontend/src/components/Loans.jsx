import { useEffect, useState } from 'react';
import { fetchLoans, addLoan, updateLoan, deleteLoan, markLoanRepaid, fetchLoanSummary } from '../api';
import { useToast } from '../context/ToastContext';

export default function Loans() {
    const [loans, setLoans] = useState([]);
    const [summary, setSummary] = useState({ outstanding: 0, repaid: 0, activeLoans: 0 });
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const toast = useToast();

    // Form state
    const [borrowerName, setBorrowerName] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [note, setNote] = useState('');
    const [adding, setAdding] = useState(false);

    // Edit state
    const [editName, setEditName] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editNote, setEditNote] = useState('');

    // Filter
    const [filter, setFilter] = useState('all'); // all, pending, repaid

    const today = new Date().toISOString().split('T')[0];

    const refresh = async () => {
        try {
            const [loansRes, summaryRes] = await Promise.all([
                fetchLoans(),
                fetchLoanSummary(),
            ]);
            setLoans(loansRes.data);
            setSummary(summaryRes.data);
        } catch {
            toast.error('Failed to load loans');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!borrowerName.trim()) return toast.error('Enter the borrower\'s name');
        if (!amount || Number(amount) <= 0) return toast.error('Enter a valid amount');
        if (!date) return toast.error('Select a date');

        setAdding(true);
        try {
            await addLoan({ borrowerName: borrowerName.trim(), amount: Number(amount), date, note: note.trim() });
            toast.success('Loan recorded!');
            setBorrowerName('');
            setAmount('');
            setDate(today);
            setNote('');
            refresh();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to add loan');
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this loan record?')) return;
        try {
            await deleteLoan(id);
            toast.success('Loan deleted');
            refresh();
        } catch {
            toast.error('Failed to delete');
        }
    };

    const handleToggleRepaid = async (loan) => {
        try {
            await markLoanRepaid(loan.id, { isRepaid: !loan.is_repaid });
            toast.success(loan.is_repaid ? 'Marked as pending' : 'Marked as repaid ✓');
            refresh();
        } catch {
            toast.error('Failed to update');
        }
    };

    const startEdit = (loan) => {
        setEditing(loan.id);
        setEditName(loan.borrower_name);
        setEditAmount(loan.amount);
        setEditDate(loan.date);
        setEditNote(loan.note || '');
    };

    const handleSave = async (id) => {
        if (!editName.trim()) return toast.error('Name is required');
        if (!editAmount || Number(editAmount) <= 0) return toast.error('Enter valid amount');
        try {
            await updateLoan(id, {
                borrowerName: editName.trim(),
                amount: Number(editAmount),
                date: editDate,
                note: editNote.trim(),
            });
            toast.success('Loan updated');
            setEditing(null);
            refresh();
        } catch {
            toast.error('Failed to update');
        }
    };

    const filtered = loans.filter(l => {
        if (filter === 'pending') return !l.is_repaid;
        if (filter === 'repaid') return l.is_repaid;
        return true;
    });

    const formatDate = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="page">
                <h2>🤝 Loans</h2>
                <div className="shimmer" style={{ height: 300, borderRadius: 12 }} />
            </div>
        );
    }

    return (
        <div className="page">
            <h2>🤝 Loans Given</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: -8, marginBottom: 20, fontSize: '0.88rem' }}>
                Track money you've lent to people
            </p>

            {/* Summary Cards */}
            <div className="summary-cards" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card stat-expense">
                    <div className="stat-label">Outstanding</div>
                    <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                        ₹{summary.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                </div>
                <div className="stat-card stat-income">
                    <div className="stat-label">Repaid</div>
                    <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                        ₹{summary.repaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                </div>
                <div className="stat-card stat-txns">
                    <div className="stat-label">Active Loans</div>
                    <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                        {summary.activeLoans}
                    </div>
                </div>
            </div>

            {/* Add Loan Form */}
            <form onSubmit={handleAdd} className="budget-form" style={{ marginBottom: '1.5rem', alignItems: 'flex-end' }}>
                <input
                    type="text"
                    placeholder="Borrower's Name"
                    value={borrowerName}
                    onChange={e => setBorrowerName(e.target.value)}
                    className="filter-input"
                    style={{ minWidth: 160 }}
                    disabled={adding}
                    required
                />
                <input
                    type="number"
                    placeholder="Amount (₹)"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    min="1"
                    step="any"
                    className="filter-input"
                    disabled={adding}
                    required
                />
                <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    max={today}
                    className="filter-input"
                    disabled={adding}
                    required
                />
                <input
                    type="text"
                    placeholder="Note (optional)"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="filter-input"
                    style={{ minWidth: 140 }}
                    disabled={adding}
                />
                <button type="submit" className="primary-btn" disabled={adding}>
                    {adding ? 'Adding...' : '+ Add Loan'}
                </button>
            </form>

            {/* Filter tabs */}
            {loans.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    {[
                        { key: 'all', label: `All (${loans.length})` },
                        { key: 'pending', label: `Pending (${loans.filter(l => !l.is_repaid).length})` },
                        { key: 'repaid', label: `Repaid (${loans.filter(l => l.is_repaid).length})` },
                    ].map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`stock-refresh-btn ${filter === f.key ? '' : ''}`}
                            style={{
                                background: filter === f.key ? 'var(--accent-primary)' : undefined,
                                color: filter === f.key ? 'var(--text-inverse)' : undefined,
                                borderColor: filter === f.key ? 'var(--accent-primary)' : undefined,
                            }}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Loans List */}
            {loans.length === 0 ? (
                <div className="empty-state-card">
                    <div className="empty-icon">🤝</div>
                    <h3>No loans recorded</h3>
                    <p>Add a loan above to start tracking money you've lent out</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="empty-state-card">
                    <div className="empty-icon">📭</div>
                    <h3>No {filter} loans</h3>
                </div>
            ) : (
                <table className="transaction-table">
                    <thead>
                        <tr>
                            <th>Borrower</th>
                            <th>Amount</th>
                            <th>Date</th>
                            <th>Note</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(loan => {
                            if (editing === loan.id) {
                                return (
                                    <tr key={loan.id}>
                                        <td>
                                            <input type="text" value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                style={{ width: 120 }} />
                                        </td>
                                        <td>
                                            <input type="number" value={editAmount} min={1} step="any"
                                                onChange={e => setEditAmount(e.target.value)}
                                                style={{ width: 90 }} />
                                        </td>
                                        <td>
                                            <input type="date" value={editDate} max={today}
                                                onChange={e => setEditDate(e.target.value)}
                                                style={{ width: 130 }} />
                                        </td>
                                        <td>
                                            <input type="text" value={editNote}
                                                onChange={e => setEditNote(e.target.value)}
                                                style={{ width: 120 }} placeholder="Note" />
                                        </td>
                                        <td>—</td>
                                        <td>
                                            <button className="stock-edit-btn" onClick={() => handleSave(loan.id)}>Save</button>
                                            <button className="stock-delete-btn" onClick={() => setEditing(null)}>Cancel</button>
                                        </td>
                                    </tr>
                                );
                            }

                            return (
                                <tr key={loan.id} style={{ opacity: loan.is_repaid ? 0.6 : 1 }}>
                                    <td style={{ fontWeight: 600 }}>{loan.borrower_name}</td>
                                    <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                        ₹{loan.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ fontSize: '0.85rem' }}>{formatDate(loan.date)}</td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {loan.note || '—'}
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => handleToggleRepaid(loan)}
                                            style={{
                                                border: 'none',
                                                borderRadius: 'var(--radius-sm)',
                                                padding: '0.3rem 0.65rem',
                                                fontSize: '0.78rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                fontFamily: 'Inter, system-ui, sans-serif',
                                                background: loan.is_repaid ? 'var(--color-success-soft)' : 'var(--color-warning-soft)',
                                                color: loan.is_repaid ? 'var(--color-success)' : 'var(--color-warning)',
                                            }}
                                            title={loan.is_repaid ? 'Click to mark as pending' : 'Click to mark as repaid'}
                                        >
                                            {loan.is_repaid ? '✓ Repaid' : '⏳ Pending'}
                                        </button>
                                    </td>
                                    <td>
                                        <button className="stock-edit-btn" onClick={() => startEdit(loan)} title="Edit">✏️</button>
                                        <button className="stock-delete-btn" onClick={() => handleDelete(loan.id)} title="Delete">🗑️</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}
