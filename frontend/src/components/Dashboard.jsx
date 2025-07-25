import { useEffect, useState } from 'react';
import { fetchTxns } from '../api';

export default function Dashboard() {
  const [txns, setTxns] = useState([]);
  const income  = txns.filter(t => t.type === 'income')
                      .reduce((s,t)=>s+Number(t.amount),0);
  const expense = txns.filter(t => t.type === 'expense')
                      .reduce((s,t)=>s+Number(t.amount),0);

  useEffect(()=> {
    fetchTxns().then(res => setTxns(res.data));
  }, []);

  return (
    <div className="page">
      <h1>Finance Dashboard</h1>
      <div className="summary-cards">
        <div className="card income">Income<br />₹{income.toFixed(2)}</div>
        <div className="card expense">Expense<br />₹{expense.toFixed(2)}</div>
        <div className="card balance">Balance<br />₹{(income-expense).toFixed(2)}</div>
      </div>
    </div>
  );
}
