import './styles/vibrant-theme.css';

import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import Analytics from './components/Analytics';
import TimeAnalysis from './components/TimeAnalysis';
import StockList from './components/StockList';

export default function App() {
  return (
    <BrowserRouter>
      <nav className="top-nav">
        <Link to="/">Dashboard</Link>
        <Link to="/transactions">Transactions</Link>
        <Link to="/add">Add</Link>
        <Link to="/analytics">Analytics</Link>
        <Link to="/time-analysis">Time Analysis</Link>
        <Link to="/stocks">Stocks</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<TransactionList />} />
        <Route path="/add" element={<TransactionForm />} />
        <Route path="/edit/:id" element={<TransactionForm />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/time-analysis" element={<TimeAnalysis />} />
        <Route path="/stocks" element={<StockList />} />
      </Routes>
    </BrowserRouter>
  );
}
