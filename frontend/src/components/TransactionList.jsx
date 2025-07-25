import { useEffect, useState } from 'react';
import { fetchTxns } from '../api';
import TransactionItem from './TransactionItem';

export default function TransactionList() {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const response = await fetchTxns();
      setTxns(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load transactions');
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const removeLocal = id => setTxns(txns.filter(t => t.id !== id));

  if (loading) return <div className="page">Loading transactions...</div>;
  if (error) return <div className="page">Error: {error}</div>;

  return (
    <div className="page">
      <h2>All Transactions</h2>
      {txns.length === 0 ? (
        <p>No transactions yet. <a href="/add">Add your first transaction</a></p>
      ) : (
        <table className="transaction-table">
          <thead>
            <tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {txns.map(t => <TransactionItem key={t.id} txn={t} onDelete={removeLocal}/>)}
          </tbody>
        </table>
      )}
    </div>
  );
}
