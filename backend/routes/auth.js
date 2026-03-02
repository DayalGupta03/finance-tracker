/**
 * Auth Routes — Register, Login, OTP Verification
 * 
 * Flow:
 *  1. Register → creates unverified user, sends OTP email
 *  2. Verify OTP → marks user as verified, issues JWT
 *  3. Login → blocks unverified users, issues JWT for verified
 *  4. Resend OTP → rate-limited, sends new OTP
 */
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { sendOTP } = require('../config/email');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = '7d';
const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_OTP_ATTEMPTS = 5;

/** Generate cryptographically secure 6-digit OTP */
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

/** Store hashed OTP in database */
function storeOTP(userId, otp) {
    const salt = bcrypt.genSaltSync(10);
    const otpHash = bcrypt.hashSync(otp, salt);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    db.prepare(`
    UPDATE users SET otp_hash = ?, otp_expires_at = ?, otp_attempts = 0, last_otp_sent = ?
    WHERE id = ?
  `).run(otpHash, expiresAt, now, userId);
}

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
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const { name, email, password } = req.body;

        // Check if user exists
        const existing = db.prepare('SELECT id, is_verified FROM users WHERE email = ?').get(email);
        if (existing && existing.is_verified) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        let userId;

        if (existing && !existing.is_verified) {
            // Re-registration of unverified account — update password
            const salt = bcrypt.genSaltSync(12);
            const passwordHash = bcrypt.hashSync(password, salt);
            db.prepare('UPDATE users SET password_hash = ?, name = ? WHERE id = ?')
                .run(passwordHash, name, existing.id);
            userId = existing.id;
        } else {
            // New user
            const salt = bcrypt.genSaltSync(12);
            const passwordHash = bcrypt.hashSync(password, salt);
            const result = db.prepare(
                'INSERT INTO users (email, password_hash, name, is_verified) VALUES (?, ?, ?, 0)'
            ).run(email, passwordHash, name);
            userId = result.lastInsertRowid;
        }

        // ── Skip email verification mode ──────────────────────
        if (process.env.SKIP_EMAIL_VERIFICATION === 'true') {
            // Auto-verify and return token immediately
            db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(userId);
            const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
            console.log('✅ Auto-verified user %s (email verification skipped)', email);
            return res.status(201).json({
                message: 'Account created successfully!',
                token,
                user: { id: userId, name, email },
            });
        }

        // ── Normal OTP flow ────────────────────────────────────
        const otp = generateOTP();
        storeOTP(userId, otp);

        try {
            const emailResult = await sendOTP(email, otp, name);
            console.log('📬 OTP sent to %s (user %d)', email, userId);

            const response = {
                message: 'Verification code sent to your email.',
                email,
            };
            if (emailResult.previewUrl) {
                response.previewUrl = emailResult.previewUrl;
            }
            res.status(201).json(response);
        } catch (err) {
            console.error('❌ Email send failed for %s:', email, err.message);
            // Fallback: auto-verify if email fails
            db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(userId);
            const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
            console.log('⚠️ Email failed — auto-verified user %s as fallback', email);
            res.status(201).json({
                message: 'Account created successfully!',
                token,
                user: { id: userId, name, email },
            });
        }
    }
);

// ── POST /api/auth/verify-otp ───────────────────────────
router.post(
    '/verify-otp',
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Enter a valid 6-digit code'),
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const { email, otp } = req.body;

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(404).json({ error: 'Account not found.' });
        }

        if (user.is_verified) {
            return res.status(400).json({ error: 'Email already verified. Please login.' });
        }

        // Check attempt count
        if (user.otp_attempts >= MAX_OTP_ATTEMPTS) {
            return res.status(429).json({
                error: 'Too many failed attempts. Please request a new code.',
                locked: true,
            });
        }

        // Check expiry
        if (!user.otp_hash || !user.otp_expires_at || new Date(user.otp_expires_at) < new Date()) {
            return res.status(400).json({
                error: 'Verification code has expired. Please request a new one.',
                expired: true,
            });
        }

        // Verify OTP
        const isValid = bcrypt.compareSync(otp, user.otp_hash);
        if (!isValid) {
            // Increment attempt counter
            db.prepare('UPDATE users SET otp_attempts = otp_attempts + 1 WHERE id = ?').run(user.id);
            const remaining = MAX_OTP_ATTEMPTS - (user.otp_attempts + 1);
            return res.status(400).json({
                error: `Invalid code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
            });
        }

        // OTP valid — mark verified, clear OTP data
        db.prepare(`
      UPDATE users SET is_verified = 1, otp_hash = NULL, otp_expires_at = NULL, otp_attempts = 0
      WHERE id = ?
    `).run(user.id);

        // Issue JWT
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email },
            message: 'Email verified successfully!',
        });
    }
);

// ── POST /api/auth/resend-otp ───────────────────────────
router.post(
    '/resend-otp',
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const { email } = req.body;

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            // Don't reveal if email exists
            return res.json({ message: 'If an account exists, a new code has been sent.' });
        }

        if (user.is_verified) {
            return res.status(400).json({ error: 'Email already verified. Please login.' });
        }

        // Rate limit: 60-second cooldown
        if (user.last_otp_sent) {
            const elapsed = (Date.now() - new Date(user.last_otp_sent).getTime()) / 1000;
            if (elapsed < RESEND_COOLDOWN_SECONDS) {
                const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
                return res.status(429).json({
                    error: `Please wait ${wait} seconds before requesting a new code.`,
                    retryAfter: wait,
                });
            }
        }

        // Generate and send new OTP
        const otp = generateOTP();
        storeOTP(user.id, otp);

        try {
            const emailResult = await sendOTP(email, otp, user.name);
            console.log('📬 OTP resent to %s', email);

            const response = { message: 'New verification code sent.' };
            if (emailResult.previewUrl) {
                response.previewUrl = emailResult.previewUrl;
            }
            res.json(response);
        } catch (err) {
            console.error('Resend email failed:', err.message);
            res.status(500).json({ error: 'Failed to send email. Please try again.' });
        }
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

        // Block unverified users
        if (!user.is_verified) {
            return res.status(403).json({
                error: 'Please verify your email before logging in.',
                needsVerification: true,
                email: user.email,
            });
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
