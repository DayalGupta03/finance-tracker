const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

const DB_FILE = path.join(__dirname, 'transactions.json');
const stocksFile = path.join(__dirname, 'stocks.json');
const yf = require('yahoo-finance2').default;

app.use(cors());
app.use(express.json());

// ------- Helper functions for transactions -------
async function readData() {
  try {
    const data = await fs.readFile(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeData(data) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

// ------- Helper functions for stocks -------
async function readStocks() {
  try { return JSON.parse(await fs.readFile(stocksFile, 'utf8')); }
  catch { return []; }
}
async function writeStocks(data) {
  await fs.writeFile(stocksFile, JSON.stringify(data, null, 2));
}

// ------- Transaction Endpoints -------
app.get('/transactions', async (req, res) => {
  try {
    const transactions = await readData();
    //console.log('📋 Retrieved transactions:', transactions);
    res.json(transactions);
  } catch (error) {
    console.error('❌ Error reading transactions:', error);
    res.status(500).json({ error: 'Failed to read transactions' });
  }
});

app.post('/transactions', async (req, res) => {
  try {
    const { amount, type, category, date, description } = req.body;
    const transactions = await readData();
    const id = Date.now();
    const newTransaction = {
      id,
      amount: parseFloat(amount),
      type,
      category,
      date,
      description,
      created_at: new Date().toISOString()
    };
    transactions.push(newTransaction);
    await writeData(transactions);
    res.status(201).json({ id, message: 'Transaction created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save transaction' });
  }
});

app.put('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type, category, date, description } = req.body;
    const transactions = await readData();
    const index = transactions.findIndex(t => t.id == id);
    if (index === -1) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    transactions[index] = {
      ...transactions[index],
      amount: parseFloat(amount),
      type,
      category,
      date,
      description,
      updated_at: new Date().toISOString()
    };
    await writeData(transactions);
    res.json({ message: 'Transaction updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

app.delete('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const transactions = await readData();
    const filteredTransactions = transactions.filter(t => t.id != id);
    if (transactions.length === filteredTransactions.length) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    await writeData(filteredTransactions);
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// ------- Stocks Endpoints -------
app.get('/stocks', async (req, res) => {
  res.json(await readStocks());
});

app.post('/stocks', async (req, res) => {
  const { symbol, qty, buyPrice } = req.body;
  const stocks = await readStocks();
  if (!symbol || !qty || !buyPrice) {
    return res.status(400).json({ error: 'All fields required' });
  }
  if (stocks.find(s => s.symbol === symbol)) {
    return res.status(400).json({ error: 'Stock already exists' });
  }
  stocks.push({ symbol, qty, buyPrice });
  await writeStocks(stocks);
  res.status(201).json({ message: 'Stock added' });
});

app.put('/stocks/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const { qty, buyPrice } = req.body;
  const stocks = await readStocks();
  const idx = stocks.findIndex(s => s.symbol === symbol);
  if (idx === -1) return res.status(404).json({ error: 'Stock not found' });
  stocks[idx] = { ...stocks[idx], qty, buyPrice };
  await writeStocks(stocks);
  res.json({ message: 'Stock updated' });
});

app.delete('/stocks/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const stocks = await readStocks();
  const newStocks = stocks.filter(s => s.symbol !== symbol);
  await writeStocks(newStocks);
  res.json({ message: 'Stock deleted' });
});

// ------- Robust Yahoo Finance Price Fetch -------
app.post('/stocks/prices', async (req, res) => {
  const { symbols } = req.body; // array of string symbols
  try {
    const results = await Promise.all(symbols.map(async symbol => {
      try {
        const quote = await yf.quote(symbol);
        // If the API returns no price, still return the symbol with price: null
        return { symbol, price: quote?.regularMarketPrice ?? null };
      } catch (err) {
        console.error(`Price fetch error for ${symbol}:`, err.message);
        return { symbol, price: null };
      }
    }));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stock prices' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Finance Tracker API listening on port ${PORT}`);
  console.log(`📄 Using JSON file: ${DB_FILE}`);
});
