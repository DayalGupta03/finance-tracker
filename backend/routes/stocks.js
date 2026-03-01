/**
 * Stock Routes — CRUD + Yahoo Finance price fetch
 * All scoped to authenticated user.
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');

const router = express.Router();

let yf;
try {
    yf = require('yahoo-finance2').default;
} catch (e) {
    console.warn('⚠️ yahoo-finance2 not available, stock prices will return null');
}

// ── GET /api/stocks ─────────────────────────────────────
router.get('/', (req, res) => {
    const stocks = db.prepare('SELECT * FROM stocks WHERE user_id = ?').all(req.userId);
    res.json(stocks);
});

// ── POST /api/stocks ────────────────────────────────────
router.post(
    '/',
    [
        body('symbol').trim().notEmpty().withMessage('Symbol is required'),
        body('qty').isFloat({ gt: 0 }).withMessage('Quantity must be positive'),
        body('buyPrice').isFloat({ gt: 0 }).withMessage('Buy price must be positive'),
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const { symbol, qty, buyPrice } = req.body;

        try {
            const result = db.prepare(
                'INSERT INTO stocks (user_id, symbol, qty, buy_price) VALUES (?, ?, ?, ?)'
            ).run(req.userId, symbol.toUpperCase(), qty, buyPrice);

            res.status(201).json({ id: result.lastInsertRowid, message: 'Stock added' });
        } catch (err) {
            if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return res.status(409).json({ error: 'Stock already exists in your portfolio' });
            }
            throw err;
        }
    }
);

// ── PUT /api/stocks/:id ─────────────────────────────────
router.put(
    '/:id',
    [
        body('qty').isFloat({ gt: 0 }).withMessage('Quantity must be positive'),
        body('buyPrice').isFloat({ gt: 0 }).withMessage('Buy price must be positive'),
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const result = db.prepare(
            'UPDATE stocks SET qty = ?, buy_price = ? WHERE id = ? AND user_id = ?'
        ).run(req.body.qty, req.body.buyPrice, req.params.id, req.userId);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Stock not found' });
        }

        res.json({ message: 'Stock updated' });
    }
);

// ── DELETE /api/stocks/:id ──────────────────────────────
router.delete('/:id', (req, res) => {
    const result = db.prepare(
        'DELETE FROM stocks WHERE id = ? AND user_id = ?'
    ).run(req.params.id, req.userId);

    if (result.changes === 0) {
        return res.status(404).json({ error: 'Stock not found' });
    }

    res.json({ message: 'Stock deleted' });
});

// ── POST /api/stocks/prices — Yahoo Finance bulk fetch ──
router.post('/prices', async (req, res) => {
    const { symbols } = req.body;

    if (!yf || !symbols || !Array.isArray(symbols)) {
        return res.json(symbols ? symbols.map(s => ({ symbol: s, price: null })) : []);
    }

    try {
        const results = await Promise.all(
            symbols.map(async symbol => {
                try {
                    const quote = await yf.quote(symbol);
                    return { symbol, price: quote?.regularMarketPrice ?? null };
                } catch {
                    return { symbol, price: null };
                }
            })
        );
        res.json(results);
    } catch {
        res.status(500).json({ error: 'Failed to fetch stock prices' });
    }
});

module.exports = router;
