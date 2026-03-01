/**
 * Finance Tracker API — Server Entry Point
 * Mounts auth, transaction, budget, and stock route modules.
 */
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize database (creates tables on first run)
require('./config/db');

const auth = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const budgetRoutes = require('./routes/budgets');
const stockRoutes = require('./routes/stocks');
const loanRoutes = require('./routes/loans');

const app = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ───────────────────────────────────────────

app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        process.env.FRONTEND_URL
    ],
    credentials: true,
}));
app.use(express.json());

// ── Public routes ───────────────────────────────────────
app.use('/api/auth', authRoutes);

// ── Protected routes (require JWT) ──────────────────────
app.use('/api/transactions', auth, transactionRoutes);
app.use('/api/budgets', auth, budgetRoutes);
app.use('/api/stocks', auth, stockRoutes);
app.use('/api/loans', auth, loanRoutes);

// ── Health check ────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Serve Frontend in Production ────────────────────────
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// ── Global error handler ────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`🚀 Finance Tracker API v2 running on port ${PORT}`);
});
