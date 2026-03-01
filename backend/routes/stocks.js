/**
 * Stock Routes — CRUD + Yahoo Finance search and prices
 * Uses direct HTTP calls to Yahoo Finance API:
 *  - v1/finance/search for autocomplete (no auth needed)
 *  - v8/finance/chart for price data (no auth/crumb needed)
 * All routes scoped to authenticated user.
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');

const router = express.Router();

// ── Yahoo Finance direct HTTP helpers ───────────────────
const YF_SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search';
const YF_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YF_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'application/json',
};

// ── In-memory price cache (5-minute TTL) ────────────────
const priceCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCachedPrice(symbol) {
    const entry = priceCache.get(symbol);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
        return entry;
    }
    return null;
}

function setCachedPrice(symbol, data) {
    priceCache.set(symbol, { ...data, timestamp: Date.now() });
}

/**
 * Search Yahoo Finance for stock symbols
 */
async function searchYahoo(query) {
    const url = `${YF_SEARCH_URL}?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&listsCount=0`;
    const res = await fetch(url, { headers: YF_HEADERS });
    if (!res.ok) throw new Error(`Yahoo search HTTP ${res.status}`);
    const data = await res.json();
    return (data.quotes || [])
        .filter(q => q.quoteType === 'EQUITY' && q.symbol && q.isYahooFinance)
        .map(q => ({
            symbol: q.symbol,
            name: q.shortname || q.longname || q.symbol,
            exchange: q.exchDisp || q.exchange || '',
        }));
}

/**
 * Fetch price for a single symbol using v8/finance/chart API
 * This endpoint does NOT require a crumb/cookie — always works
 */
async function fetchPrice(symbol) {
    const url = `${YF_CHART_URL}/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const res = await fetch(url, { headers: YF_HEADERS });
    if (!res.ok) throw new Error(`Yahoo chart HTTP ${res.status}`);
    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return {
        price: meta.regularMarketPrice ?? null,
        name: meta.shortName || meta.longName || symbol,
        previousClose: meta.previousClose ?? null,
        currency: meta.currency || 'INR',
    };
}

// ── GET /api/stocks/search?q= ───────────────────────────
router.get('/search', async (req, res) => {
    const query = req.query.q?.trim();
    if (!query || query.length < 1) {
        return res.json([]);
    }

    try {
        const results = await searchYahoo(query);
        res.json(results);
    } catch (err) {
        console.error('Stock search error:', err.message);
        res.json([]);
    }
});

// ── GET /api/stocks/quote/:symbol ───────────────────────
router.get('/quote/:symbol', async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();

    // Check cache first
    const cached = getCachedPrice(symbol);
    if (cached) {
        return res.json({ symbol, price: cached.price, name: cached.name, cached: true });
    }

    try {
        const data = await fetchPrice(symbol);
        if (data && data.price !== null) {
            setCachedPrice(symbol, data);
            return res.json({ symbol, price: data.price, name: data.name });
        }
        res.json({ symbol, price: null, error: 'Price not available' });
    } catch (err) {
        console.error('Quote fetch error for %s:', symbol, err.message);
        res.json({ symbol, price: null, error: 'Failed to fetch price' });
    }
});

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

// ── POST /api/stocks/prices — Bulk fetch with cache ─────
router.post('/prices', async (req, res) => {
    const { symbols } = req.body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
        return res.json([]);
    }

    const results = [];
    const uncached = [];

    for (const sym of symbols) {
        const cached = getCachedPrice(sym);
        if (cached) {
            results.push({ symbol: sym, price: cached.price });
        } else {
            uncached.push(sym);
        }
    }

    // Fetch uncached prices (one at a time using chart API)
    if (uncached.length > 0) {
        const fetches = uncached.map(async (sym) => {
            try {
                const data = await fetchPrice(sym);
                if (data && data.price !== null) {
                    setCachedPrice(sym, data);
                    return { symbol: sym, price: data.price };
                }
                return { symbol: sym, price: null };
            } catch {
                return { symbol: sym, price: null };
            }
        });

        const fetched = await Promise.all(fetches);
        results.push(...fetched);
    }

    res.json(results);
});

module.exports = router;
