import React, {useState} from 'react';
import { addStock } from '../api';

export default function StockForm({onAdd}) {
  const [symbol, setSymbol] = useState('');
  const [qty, setQty] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [error, setError] = useState('');
  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await addStock({ symbol: symbol.trim().toUpperCase(), qty: Number(qty), buyPrice: Number(buyPrice) });
      setSymbol(''); setQty(''); setBuyPrice(''); setError('');
      onAdd(); // callback to refresh list
    } catch (err) { setError(err.response?.data?.error || 'Failed to add stock'); }
  };
  return (
    <form onSubmit={handleSubmit} style={{marginBottom:20, display:'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center'}}>
      <input value={symbol} onChange={e=>setSymbol(e.target.value)} placeholder="Symbol (e.g. TCS.NS)" required style={{width: 150, fontSize: '1.08em', padding: '10px 16px'}} />
      <input type="number" value={qty} onChange={e=>setQty(e.target.value)} placeholder="Qty" required min={1} style={{width: 90, fontSize: '1.06em', padding: '10px 12px'}}/>
      <input type="number" value={buyPrice} onChange={e=>setBuyPrice(e.target.value)} placeholder="Buy Price" required min={0} style={{width: 110, fontSize: '1.06em', padding: '10px 12px'}}/>
      <button type="submit">Add Stock</button>
      {error && <span style={{color:'red',marginLeft:10}}>{error}</span>}
    </form>
  );
}
