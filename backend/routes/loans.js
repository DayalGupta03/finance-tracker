/**
 * Loan Routes — Track money lent to people
 * CRUD + mark as repaid. All scoped to authenticated user.
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');

const router = express.Router();

// ── GET /api/loans ──────────────────────────────────────
router.get('/', (req, res) => {
    const loans = db.prepare(
        'SELECT * FROM loans WHERE user_id = ? ORDER BY is_repaid ASC, date DESC'
    ).all(req.userId);
    res.json(loans);
});

// ── GET /api/loans/summary ──────────────────────────────
router.get('/summary', (req, res) => {
    const total = db.prepare(
        'SELECT COALESCE(SUM(amount), 0) as total FROM loans WHERE user_id = ? AND is_repaid = 0'
    ).get(req.userId);
    const repaid = db.prepare(
        'SELECT COALESCE(SUM(amount), 0) as total FROM loans WHERE user_id = ? AND is_repaid = 1'
    ).get(req.userId);
    const count = db.prepare(
        'SELECT COUNT(*) as count FROM loans WHERE user_id = ? AND is_repaid = 0'
    ).get(req.userId);

    res.json({
        outstanding: total.total,
        repaid: repaid.total,
        activeLoans: count.count,
    });
});

// ── POST /api/loans ─────────────────────────────────────
router.post(
    '/',
    [
        body('borrowerName').trim().notEmpty().withMessage('Borrower name is required'),
        body('amount').isFloat({ gt: 0 }).withMessage('Amount must be positive'),
        body('date').notEmpty().withMessage('Date is required'),
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const { borrowerName, amount, date, note } = req.body;
        const result = db.prepare(
            'INSERT INTO loans (user_id, borrower_name, amount, date, note) VALUES (?, ?, ?, ?, ?)'
        ).run(req.userId, borrowerName, amount, date, note || '');

        res.status(201).json({
            id: result.lastInsertRowid,
            message: 'Loan recorded',
        });
    }
);

// ── PUT /api/loans/:id ──────────────────────────────────
router.put(
    '/:id',
    [
        body('borrowerName').trim().notEmpty().withMessage('Borrower name is required'),
        body('amount').isFloat({ gt: 0 }).withMessage('Amount must be positive'),
        body('date').notEmpty().withMessage('Date is required'),
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const { borrowerName, amount, date, note } = req.body;
        const result = db.prepare(
            'UPDATE loans SET borrower_name = ?, amount = ?, date = ?, note = ? WHERE id = ? AND user_id = ?'
        ).run(borrowerName, amount, date, note || '', req.params.id, req.userId);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Loan not found' });
        }

        res.json({ message: 'Loan updated' });
    }
);

// ── PATCH /api/loans/:id/repaid ─────────────────────────
router.patch('/:id/repaid', (req, res) => {
    const isRepaid = req.body.isRepaid ? 1 : 0;
    const repaidDate = isRepaid ? new Date().toISOString().split('T')[0] : null;

    const result = db.prepare(
        'UPDATE loans SET is_repaid = ?, repaid_date = ? WHERE id = ? AND user_id = ?'
    ).run(isRepaid, repaidDate, req.params.id, req.userId);

    if (result.changes === 0) {
        return res.status(404).json({ error: 'Loan not found' });
    }

    res.json({ message: isRepaid ? 'Marked as repaid' : 'Marked as pending' });
});

// ── DELETE /api/loans/:id ───────────────────────────────
router.delete('/:id', (req, res) => {
    const result = db.prepare(
        'DELETE FROM loans WHERE id = ? AND user_id = ?'
    ).run(req.params.id, req.userId);

    if (result.changes === 0) {
        return res.status(404).json({ error: 'Loan not found' });
    }

    res.json({ message: 'Loan deleted' });
});

module.exports = router;
