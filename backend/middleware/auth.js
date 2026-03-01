/**
 * JWT Authentication Middleware
 * Extracts Bearer token, verifies it, and attaches userId to req.
 */
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

function auth(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = header.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

module.exports = auth;
