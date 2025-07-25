import React, { useEffect, useState } from 'react';
import { fetchStocks, getStockPrices, deleteStock, updateStock } from '../api';
import StockForm from './StockForm';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import './stocks-animated.css'; // see below—make this file

ChartJS.register(ArcElement, Tooltip, Legend);

export default function StockList() {
  const [stocks, setStocks] = useState([]);
  const [prices, setPrices] = useState([]);
  const [manualPrices, setManualPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [manualInput, setManualInput] = useState({});

  const refresh = async () => {
    setLoading(true);
    try {
      const stockArr = (await fetchStocks()).data;
      setStocks(stockArr);
      if (stockArr.length) {
        const live = (await getStockPrices(stockArr.map(s => s.symbol))).data;
        setPrices(live);
      } else {
        setPrices([]);
      }
    } catch (err) {
      console.error('Error fetching stocks:', err);
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const handleDelete = async symbol => {
    await deleteStock(symbol);
    setEditing(null);
    refresh();
  };

  const getLivePrice = symbol =>
    (prices.find(p => p.symbol === symbol) || {}).price;

  const handleSave = async symbol => {
    await updateStock(symbol, {
      qty: Number(editQty),
      buyPrice: Number(editPrice)
    });
    setEditing(null);
    refresh();
  };

  const saveManualPrice = (symbol) => {
    setManualPrices(prev => ({ ...prev, [symbol]: Number(manualInput[symbol]) }));
    setManualInput(prev => ({ ...prev, [symbol]: '' }));
  };

  const getCurrentPrice = (symbol) => {
    const live = getLivePrice(symbol);
    if (live === null || live === undefined) {
      return manualPrices[symbol] !== undefined ? manualPrices[symbol] : null;
    }
    return live;
  };

  // Pie chart calculations
  const values = stocks.map(s => {
    const price = getCurrentPrice(s.symbol);
    return price !== null && price !== undefined ? price * s.qty : 0;
  });
  const totalValue = values.reduce((a, b) => a + b, 0);

  const chartData = {
    labels: stocks.map(s => s.symbol),
    datasets: [{
      data: values,
      backgroundColor: [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
        '#9966FF', '#FF9F40', '#C9CBCF', '#2ecc71',
      ],
      borderWidth: 2,
    }]
  };

  return (
    <div className="stock-page-bg">
      <div className="stock-card-outer">
        <h2 className="fade-in">📈 My Stocks</h2>
        <StockForm onAdd={refresh} />
        {loading ? (
          <div className="shimmer shimmer-table" style={{height: 200, marginTop:20}} />
        ) : (
          <table className="stock-table fade-in-up">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Qty</th>
                <th>Buy Price</th>
                <th>Total Invested</th>
                <th>Current Price</th>
                <th>Value</th>
                <th>P/L</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((s,i) => {
                const live = getLivePrice(s.symbol);
                const manual = manualPrices[s.symbol];
                if (editing === s.symbol) {
                  const effectiveLive = live === null ? manual : live;
                  const totalInvested = editQty && editPrice ? (editQty * editPrice).toLocaleString() : "-";
                  const value = effectiveLive && editQty ? (effectiveLive * editQty).toFixed(2) : '-';
                  const pl = effectiveLive && editQty && editPrice ?
                    ((effectiveLive - editPrice) * editQty).toFixed(2) : '-';
                  return (
                    <tr key={s.symbol} className="fade-in-row">
                      <td>{s.symbol}</td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          value={editQty}
                          onChange={e => setEditQty(e.target.value)}
                          style={{width: 70, maxWidth: '100%', padding: '4px 8px', fontSize: '1em'}}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                          style={{width: 70, maxWidth: '100%', padding: '4px 8px', fontSize: '1em'}}
                        />
                      </td>
                      <td>₹{totalInvested}</td>
                      <td>
                        {effectiveLive === null || effectiveLive === undefined ?
                          <span style={{ color: '#999' }}>N/A</span> :
                          `₹${effectiveLive}`
                        }
                      </td>
                      <td>{effectiveLive && editQty ? `₹${value}` : '-'}</td>
                      <td style={{ color: pl > 0 ? 'var(--plgreen)' : pl < 0 ? 'var(--plred)' : 'inherit' }}>
                        {pl !== '-' && !isNaN(pl) ? `₹${pl}` : '-'}
                      </td>
                      <td style={{minWidth: 120}}>
                        <div style={{display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center'}}>
                          <button className="btn-anim" style={{padding: '4px 10px', fontSize: '0.97em'}} onClick={() => handleSave(s.symbol)}>Save</button>
                          <button className="btn-anim" style={{padding: '4px 10px', fontSize: '0.97em'}} onClick={() => setEditing(null)}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                // Normal Row
                const effectiveLive = (live === null || live === undefined) && manual ? manual : live;
                const totalInvested = (s.qty * s.buyPrice).toLocaleString();
                const value = effectiveLive && s.qty ? (effectiveLive * s.qty).toFixed(2) : '-';
                const pl = effectiveLive && s.qty && s.buyPrice ?
                  ((effectiveLive - s.buyPrice) * s.qty).toFixed(2) : '-';
                return (
                  <tr key={s.symbol} className="fade-in-row" style={{animationDelay: `${i*0.08}s`}}>
                    <td>{s.symbol}</td>
                    <td>{s.qty}</td>
                    <td>₹{s.buyPrice}</td>
                    <td>₹{totalInvested}</td>
                    <td>
                      {(live === null || live === undefined) && !manual ? (
                        <>
                          <input
                            type="number"
                            placeholder="Manual price"
                            value={manualInput[s.symbol] || ''}
                            onChange={e => setManualInput({ ...manualInput, [s.symbol]: e.target.value })}
                          />
                          <button
                            className="btn-anim"
                            onClick={() => saveManualPrice(s.symbol)}
                            style={{ marginLeft: 6 }}
                          >Save</button>
                        </>
                      ) : (
                        `₹${effectiveLive}`
                      )}
                    </td>
                    <td>{effectiveLive && s.qty ? `₹${value}` : '-'}</td>
                    <td style={{ color: pl > 0 ? 'var(--plgreen)' : pl < 0 ? 'var(--plred)' : 'inherit' }}>
                      {pl !== '-' && !isNaN(pl) ? `₹${pl}` : '-'}
                    </td>
                    <td>
                      <button
                        className="stock-edit-btn"
                        style={{marginRight: 6, padding: '4px 13px', display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0}}
                        onClick={() => {
                          setEditing(s.symbol);
                          setEditQty(s.qty);
                          setEditPrice(s.buyPrice);
                        }}
                      ><span role="img" aria-label="edit">✏️</span> Edit</button>
                      <button
                        className="stock-delete-btn"
                        style={{padding: '4px 13px', display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0}}
                        onClick={() => handleDelete(s.symbol)}
                      ><span role="img" aria-label="delete">🗑️</span> Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="piechart-wrap fade-in-up">
          <h3>Portfolio Allocation</h3>
          <Pie
            data={chartData}
            options={{
              plugins: {
                legend: { position: "bottom" },
                tooltip: {
                  callbacks: {
                    label: ctx => {
                      const pval = ctx.raw;
                      const pct = totalValue ? ((pval / totalValue) * 100).toFixed(1) : 0;
                      return `${ctx.label}: ₹${pval.toLocaleString()} (${pct}%)`;
                    }
                  }
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
