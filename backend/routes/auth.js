/**
 * Auth Routes — Register & Login
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = '7d';

// ── POST /api/auth/register ─────────────────────────────
router.post(
    '/register',
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters'),
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const { name, email, password } = req.body;

        // Check if user exists
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        // Hash password & insert
        const salt = bcrypt.genSaltSync(12);
        const passwordHash = bcrypt.hashSync(password, salt);

        const result = db.prepare(
            'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
        ).run(email, passwordHash, name);

        const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET, {
            expiresIn: TOKEN_EXPIRY,
        });

        res.status(201).json({
            token,
            user: { id: result.lastInsertRowid, name, email },
        });
    }
);

// ── POST /api/auth/login ────────────────────────────────
router.post(
    '/login',
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required'),
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const { email, password } = req.body;

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const validPassword = bcrypt.compareSync(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
            expiresIn: TOKEN_EXPIRY,
        });

        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email },
        });
    }
);

module.exports = router;
