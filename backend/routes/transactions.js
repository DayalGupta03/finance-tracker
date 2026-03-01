/**
 * Transaction Routes — Full CRUD + filters + CSV export + monthly summary
 * All routes are scoped to the authenticated user.
 */
const express = require('express');
const { body, query, validationResult } = require('express-validator');
const db = require('../config/db');

const router = express.Router();

// ── Predefined categories ───────────────────────────────
const CATEGORIES = [
    'Salary', 'Freelance', 'Investment', 'Food', 'Transport',
    'Housing', 'Utilities', 'Entertainment', 'Shopping', 'Health',
    'Education', 'Travel', 'Subscriptions', 'Gifts', 'Other'
];

router.get('/categories', (req, res) => {
    res.json(CATEGORIES);
});

// ── GET /api/transactions — list with optional filters ──
router.get(
    '/',
    [
        query('type').optional().isIn(['income', 'expense']),
        query('category').optional().isString(),
        query('from').optional().isISO8601(),
        query('to').optional().isISO8601(),
        query('search').optional().isString(),
    ],
    (req, res) => {
        let sql = 'SELECT * FROM transactions WHERE user_id = ?';
        const params = [req.userId];

        if (req.query.type) {
            sql += ' AND type = ?';
            params.push(req.query.type);
        }
        if (req.query.category) {
            sql += ' AND category = ?';
            params.push(req.query.category);
        }
        if (req.query.from) {
            sql += ' AND date >= ?';
            params.push(req.query.from);
        }
        if (req.query.to) {
            sql += ' AND date <= ?';
            params.push(req.query.to);
        }
        if (req.query.search) {
            sql += ' AND description LIKE ?';
            params.push(`%${req.query.search}%`);
        }

        sql += ' ORDER BY date DESC, id DESC';

        const rows = db.prepare(sql).all(...params);
        res.json(rows);
    }
);

// ── GET /api/transactions/summary — monthly aggregates ──
router.get('/summary', (req, res) => {
    const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', date) AS month,
      type,
      SUM(amount) AS total,
      COUNT(*) AS count
    FROM transactions
    WHERE user_id = ?
    GROUP BY month, type
    ORDER BY month DESC
  `).all(req.userId);

    // Reshape into { month: { income, expense } }
    const summary = {};
    rows.forEach(r => {
        if (!summary[r.month]) summary[r.month] = { income: 0, expense: 0, count: 0 };
        summary[r.month][r.type] = r.total;
        summary[r.month].count += r.count;
    });

    res.json(summary);
});

// ── GET /api/transactions/export — CSV download ─────────
router.get('/export', (req, res) => {
    const rows = db.prepare(
        'SELECT date, description, category, type, amount FROM transactions WHERE user_id = ? ORDER BY date DESC'
    ).all(req.userId);

    const header = 'Date,Description,Category,Type,Amount\n';
    const csvRows = rows.map(r =>
        `${r.date},"${r.description.replace(/"/g, '""')}",${r.category},${r.type},${r.amount}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
    res.send(header + csvRows);
});

// ── POST /api/transactions ──────────────────────────────
router.post(
    '/',
    [
        body('amount').isFloat({ gt: 0 }).withMessage('Amount must be positive'),
        body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
        body('category').trim().notEmpty().withMessage('Category is required'),
        body('date').isISO8601().withMessage('Valid date is required'),
        body('description').trim().notEmpty().withMessage('Description is required'),
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const { amount, type, category, date, description } = req.body;

        const result = db.prepare(
            'INSERT INTO transactions (user_id, amount, type, category, date, description) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(req.userId, amount, type, category, date, description);

        res.status(201).json({
            id: result.lastInsertRowid,
            message: 'Transaction created successfully',
        });
    }
);

// ── PUT /api/transactions/:id ───────────────────────────
router.put(
    '/:id',
    [
        body('amount').isFloat({ gt: 0 }).withMessage('Amount must be positive'),
        body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
        body('category').trim().notEmpty().withMessage('Category is required'),
        body('date').isISO8601().withMessage('Valid date is required'),
        body('description').trim().notEmpty().withMessage('Description is required'),
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const { amount, type, category, date, description } = req.body;
        const { id } = req.params;

        const existing = db.prepare(
            'SELECT id FROM transactions WHERE id = ? AND user_id = ?'
        ).get(id, req.userId);

        if (!existing) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        db.prepare(
            `UPDATE transactions SET amount = ?, type = ?, category = ?, date = ?, description = ?,
       updated_at = datetime('now') WHERE id = ? AND user_id = ?`
        ).run(amount, type, category, date, description, id, req.userId);

        res.json({ message: 'Transaction updated successfully' });
    }
);

// ── DELETE /api/transactions/:id ────────────────────────
router.delete('/:id', (req, res) => {
    const result = db.prepare(
        'DELETE FROM transactions WHERE id = ? AND user_id = ?'
    ).run(req.params.id, req.userId);

    if (result.changes === 0) {
        return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted successfully' });
});

module.exports = router;
