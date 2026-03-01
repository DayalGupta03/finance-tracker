/**
 * Budget Routes — CRUD per-category monthly spending limits
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');

const router = express.Router();

// ── GET /api/budgets — list all budgets with current month spending ──
router.get('/', (req, res) => {
    const budgets = db.prepare('SELECT * FROM budgets WHERE user_id = ?').all(req.userId);

    // Calculate current month spending per category
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const spending = db.prepare(`
    SELECT category, SUM(amount) AS spent
    FROM transactions
    WHERE user_id = ? AND type = 'expense' AND strftime('%Y-%m', date) = ?
    GROUP BY category
  `).all(req.userId, currentMonth);

    const spendingMap = {};
    spending.forEach(s => { spendingMap[s.category] = s.spent; });

    const enriched = budgets.map(b => ({
        ...b,
        spent: spendingMap[b.category] || 0,
        remaining: b.monthly_limit - (spendingMap[b.category] || 0),
        percentage: Math.min(100, Math.round(((spendingMap[b.category] || 0) / b.monthly_limit) * 100)),
    }));

    res.json(enriched);
});

// ── POST /api/budgets ───────────────────────────────────
router.post(
    '/',
    [
        body('category').trim().notEmpty().withMessage('Category is required'),
        body('monthly_limit').isFloat({ gt: 0 }).withMessage('Budget limit must be positive'),
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const { category, monthly_limit } = req.body;

        try {
            const result = db.prepare(
                'INSERT INTO budgets (user_id, category, monthly_limit) VALUES (?, ?, ?)'
            ).run(req.userId, category, monthly_limit);

            res.status(201).json({ id: result.lastInsertRowid, message: 'Budget created' });
        } catch (err) {
            if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return res.status(409).json({ error: 'Budget for this category already exists' });
            }
            throw err;
        }
    }
);

// ── PUT /api/budgets/:id ────────────────────────────────
router.put(
    '/:id',
    [
        body('monthly_limit').isFloat({ gt: 0 }).withMessage('Budget limit must be positive'),
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const result = db.prepare(
            'UPDATE budgets SET monthly_limit = ? WHERE id = ? AND user_id = ?'
        ).run(req.body.monthly_limit, req.params.id, req.userId);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Budget not found' });
        }

        res.json({ message: 'Budget updated' });
    }
);

// ── DELETE /api/budgets/:id ─────────────────────────────
router.delete('/:id', (req, res) => {
    const result = db.prepare(
        'DELETE FROM budgets WHERE id = ? AND user_id = ?'
    ).run(req.params.id, req.userId);

    if (result.changes === 0) {
        return res.status(404).json({ error: 'Budget not found' });
    }

    res.json({ message: 'Budget deleted' });
});

module.exports = router;
