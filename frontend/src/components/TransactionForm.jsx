import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { addTxn, fetchTxns, updateTxn } from '../api';

const blank = { amount:'', type:'expense', category:'Misc', date:'', description:'' };

export default function TransactionForm() {
  const { id } = useParams();
  const [data, setData] = useState(blank);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const nav = useNavigate();

  useEffect(()=>{
    if(id){
      console.log('📝 Loading transaction for edit, ID:', id);
      fetchTxns().then(r=>{
        console.log('📋 All transactions loaded:', r.data);
        const txn = r.data.find(t=>t.id===Number(id));
        if(txn) {
          console.log('✅ Transaction found for editing:', txn);
          setData(txn);
        } else {
          console.error('❌ Transaction not found with ID:', id);
          setError('Transaction not found');
        }
      }).catch(err => {
        console.error('❌ Error loading transaction for edit:', err);
        setError('Failed to load transaction data');
      });
    }
  },[id]);

  const change = e => {
    console.log('📝 Form field changed:', e.target.name, '=', e.target.value);
    setData({...data, [e.target.name]:e.target.value});
    if(error) setError(''); // Clear error when user types
  };

  const submit = async (e) => {
    e.preventDefault();
    console.log('🚀 Form submission started');
    console.log('📋 Current form data:', data);
    
    setLoading(true);
    setError('');
    setSuccess('');

    // Client-side validation
    if (!data.description.trim()) {
      console.error('❌ Validation failed: Description is required');
      setError('Description is required');
      setLoading(false);
      return;
    }
    if (!data.amount || data.amount <= 0) {
      console.error('❌ Validation failed: Valid amount is required');
      setError('Valid amount is required');
      setLoading(false);
      return;
    }
    if (!data.date) {
      console.error('❌ Validation failed: Date is required');
      setError('Date is required');
      setLoading(false);
      return;
    }

    try {
      console.log('📤 Submitting validated data:', data);
      
      if(id) {
        console.log('📝 Updating existing transaction with ID:', id);
        await updateTxn(id, data);
        setSuccess('Transaction updated successfully!');
        console.log('✅ Transaction updated successfully');
      } else {
        console.log('➕ Adding new transaction');
        const response = await addTxn(data);
        setSuccess('Transaction added successfully!');
        console.log('✅ Transaction added successfully:', response.data);
      }
      
      // Navigate after showing success message
      setTimeout(() => {
        console.log('🔄 Navigating to transactions page...');
        nav('/transactions');
      }, 1500);
      
    } catch (err) {
      console.error('❌ Form submission error:', err);
      console.error('❌ Error response:', err.response);
      console.error('❌ Error request:', err.request);
      console.error('❌ Error message:', err.message);
      
      // Handle different types of errors
      if (err.response) {
        // Server responded with error status
        console.error('❌ Server error response:', err.response.status, err.response.data);
        setError(`Server Error (${err.response.status}): ${err.response.data?.error || err.response.data?.message || err.response.statusText}`);
      } else if (err.request) {
        // Request made but no response received
        console.error('❌ No response received:', err.request);
        setError('Cannot connect to server. Please check if backend is running on port 4000.');
      } else {
        // Something else happened
        console.error('❌ Request setup error:', err.message);
        setError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
      console.log('🏁 Form submission completed');
    }
  };

  return (
    <div className="page">
      <h2>{id ? 'Edit' : 'Add'} Transaction</h2>
      
      {/* Error Message Display */}
      {error && (
        <div style={{
          background: '#fee',
          border: '1px solid #e74c3c',
          padding: '10px',
          marginBottom: '15px',
          borderRadius: '4px',
          color: '#e74c3c',
          fontWeight: 'bold'
        }}>
          ❌ {error}
        </div>
      )}
      
      {/* Success Message Display */}
      {success && (
        <div style={{
          background: '#efe',
          border: '1px solid #2ecc71',
          padding: '10px',
          marginBottom: '15px',
          borderRadius: '4px',
          color: '#2ecc71',
          fontWeight: 'bold'
        }}>
          ✅ {success}
        </div>
      )}
      
      <form onSubmit={submit} className="txn-form">
        <input 
          name="description" 
          value={data.description} 
          onChange={change} 
          placeholder="Description (e.g., Salary, Groceries, Fuel)" 
          required 
          disabled={loading}
          style={{opacity: loading ? 0.6 : 1}}
        />
        
        <input 
          name="amount" 
          type="number" 
          step="0.01"
          min="0.01"
          value={data.amount} 
          onChange={change} 
          placeholder="Amount (e.g., 1500.50)" 
          required 
          disabled={loading}
          style={{opacity: loading ? 0.6 : 1}}
          className="big-input"
        />
        
        <select 
          name="type" 
          value={data.type} 
          onChange={change}
          disabled={loading}
          style={{opacity: loading ? 0.6 : 1}}
          className="big-input"
        >
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        
        <input 
          name="category" 
          value={data.category} 
          onChange={change} 
          placeholder="Category (e.g., Food, Transport, Salary)"
          disabled={loading}
          style={{opacity: loading ? 0.6 : 1}}
        />
        
        <input 
          name="date" 
          type="date" 
          value={data.date?.substring(0,10)} 
          onChange={change} 
          required
          disabled={loading}
          style={{opacity: loading ? 0.6 : 1}}
        />
        
        <button 
          type="submit" 
          disabled={loading}
          style={{
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
            backgroundColor: loading ? '#ccc' : '#0366d6'
          }}
        >
          {loading ? (id ? 'Updating...' : 'Saving...') : 'Save'}
        </button>
      </form>
      
      {/* Debug Information (remove in production) */}
      <div style={{
        marginTop: '20px',
        padding: '10px',
        background: '#f8f9fa',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#666'
      }}>
        <strong>Debug Info:</strong><br/>
        Form ID: {id || 'New Transaction'}<br/>
        Loading: {loading ? 'Yes' : 'No'}<br/>
        Current Data: {JSON.stringify(data, null, 2)}
      </div>
    </div>
  );
}
