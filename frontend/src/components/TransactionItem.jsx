import { Link } from 'react-router-dom';
import { deleteTxn } from '../api';

export default function TransactionItem({txn, onDelete}) {
  const handleDelete = async () => {
    try {
      await deleteTxn(txn.id);
      onDelete(txn.id);
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  return (
    <tr>
      <td>{txn.date}</td>
      <td>{txn.description}</td>
      <td>{txn.category}</td>
      <td className={txn.type}>₹{txn.amount}</td>
      <td>
        <Link to={`/edit/${txn.id}`}>✏️ Edit</Link>
        <button onClick={handleDelete} style={{marginLeft: '10px'}} className="btn-delete">🗑️ Delete</button>
      </td>
    </tr>
  );
}
