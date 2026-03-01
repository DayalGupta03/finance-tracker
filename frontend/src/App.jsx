import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { useScrollProgress } from './hooks/useScrollEffects';
import Sidebar from './components/layout/Sidebar';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import VerifyOTP from './components/auth/VerifyOTP';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import Analytics from './components/Analytics';
import TimeAnalysis from './components/TimeAnalysis';
import Budgets from './components/Budgets';
import StockList from './components/StockList';

function ScrollProgressBar() {
  const progress = useScrollProgress();
  if (progress <= 0) return null;
  return <div className="scroll-progress-bar" style={{ width: `${progress}%` }} />;
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="page"><div className="shimmer" style={{ height: 300 }} /></div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  return (
    <>
      <ScrollProgressBar />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/verify-otp" element={isAuthenticated ? <Navigate to="/" replace /> : <VerifyOTP />} />

        {/* Protected routes */}
        <Route path="/*" element={
          <ProtectedRoute>
            <div className="app-layout">
              <Sidebar />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/transactions" element={<TransactionList />} />
                  <Route path="/add" element={<TransactionForm />} />
                  <Route path="/edit/:id" element={<TransactionForm />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/time-analysis" element={<TimeAnalysis />} />
                  <Route path="/budgets" element={<Budgets />} />
                  <Route path="/stocks" element={<StockList />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
