import { Link } from 'react-router-dom';
import { deleteTxn } from '../api';
import { useToast } from '../context/ToastContext';

export default function TransactionItem({ txn, balance, onDelete }) {
  const toast = useToast();

  const handleDelete = async () => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await deleteTxn(txn.id);
      onDelete(txn.id);
      toast.success('Transaction deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <tr className="fade-in-row">
      <td>{txn.date}</td>
      <td className="desc-cell">{txn.description}</td>
      <td><span className="cat-badge">{txn.category}</span></td>
      <td className={`amount-cell ${txn.type}`}>
        {txn.type === 'income' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </td>
      <td className={`balance-cell ${balance >= 0 ? 'positive' : 'negative'}`}>
        ₹{balance?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '—'}
      </td>
      <td className="actions-cell">
        <Link to={`/edit/${txn.id}`} className="action-btn edit-btn" title="Edit">✏️</Link>
        <button onClick={handleDelete} className="action-btn del-btn" title="Delete">🗑️</button>
      </td>
    </tr>
  );
}
