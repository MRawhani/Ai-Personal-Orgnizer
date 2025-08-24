const express = require('express');
const { getDatabase } = require('../database/init');
const AIService = require('../services/ai');

const router = express.Router();

// Get all transactions
router.get('/transactions', (req, res) => {
  const db = getDatabase('money');
  const { category, currency, type, account, startDate, endDate } = req.query;
  
  let query = 'SELECT * FROM transactions ORDER BY date DESC, created_at DESC';
  let params = [];
  
  if (category || currency || type || account || startDate || endDate) {
    query = 'SELECT * FROM transactions WHERE 1=1';
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (currency) {
      query += ' AND currency = ?';
      params.push(currency);
    }
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    if (account) {
      query += ' AND account = ?';
      params.push(account);
    }
    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }
    query += ' ORDER BY date DESC, created_at DESC';
  }
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get all categories from transactions
router.get('/categories', (req, res) => {
  const db = getDatabase('money');
  db.all('SELECT DISTINCT category, COUNT(*) as count FROM transactions GROUP BY category ORDER BY count DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get currencies
router.get('/currencies', (req, res) => {
  const db = getDatabase('money');
  db.all('SELECT currency, COUNT(*) as count FROM transactions GROUP BY currency ORDER BY count DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get accounts
router.get('/accounts', (req, res) => {
  const db = getDatabase('money');
  db.all('SELECT account, COUNT(*) as count FROM transactions GROUP BY account ORDER BY count DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add transaction with AI processing
router.post('/add', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text input is required' });
    }
    
    // Get existing categories and accounts for smart matching
    const db = getDatabase('money');
    const existingCategories = await new Promise((resolve, reject) => {
      db.all('SELECT DISTINCT category FROM transactions ORDER BY category', (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => row.category));
      });
    });
    
    const existingAccounts = await new Promise((resolve, reject) => {
      db.all('SELECT DISTINCT account FROM transactions WHERE account IS NOT NULL AND account != "" ORDER BY account', (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => row.account));
      });
    });
    
    // Process with AI
    const processedTransactions = await AIService.processMoneyInput(text, existingCategories, existingAccounts);
    
    const addedTransactions = [];
    
    // Insert all transactions
    for (const transaction of processedTransactions) {
      const result = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO transactions (amount, currency, type, category, description, account, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            transaction.amount, 
            transaction.currency || 'USD', 
            transaction.type || 'expense',
            transaction.category, 
            transaction.description, 
            transaction.account || 'main',
            transaction.date
          ],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      // Get the inserted transaction
      const addedTransaction = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM transactions WHERE id = ?', [result], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      addedTransactions.push(addedTransaction);
    }
    
    res.json({ 
      success: true, 
      message: `${addedTransactions.length} transaction(s) added successfully`,
      transactions: addedTransactions
    });
    
  } catch (error) {
    console.error('Error adding transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get spending summary by currency
router.get('/summary', (req, res) => {
  const db = getDatabase('money');
  const { startDate, endDate } = req.query;
  
  let query = `
    SELECT 
      category,
      type,
      currency,
      SUM(amount) as total,
      COUNT(*) as count
    FROM transactions
  `;
  let params = [];
  
  if (startDate || endDate) {
    query += ' WHERE 1=1';
    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }
  }
  
  query += ' GROUP BY category, type, currency ORDER BY total DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get financial overview by currency
router.get('/overview', (req, res) => {
  const db = getDatabase('money');
  const { startDate, endDate } = req.query;
  
  let whereClause = '';
  let params = [];
  
  if (startDate || endDate) {
    whereClause = 'WHERE 1=1';
    if (startDate) {
      whereClause += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND date <= ?';
      params.push(endDate);
    }
  }
  
  const query = `
    SELECT 
      currency,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as totalIncome,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as totalExpenses,
      SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as netAmount,
      COUNT(*) as totalTransactions
    FROM transactions
    ${whereClause}
    GROUP BY currency
    ORDER BY totalTransactions DESC
  `;
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Update transaction
router.put('/transactions/:id', (req, res) => {
  const { amount, currency, type, category, description, account, date } = req.body;
  const db = getDatabase('money');
  
  db.run(
    'UPDATE transactions SET amount = ?, currency = ?, type = ?, category = ?, description = ?, account = ?, date = ? WHERE id = ?',
    [amount, currency, type, category, description, account, date, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // Get the updated transaction
      db.get('SELECT * FROM transactions WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ success: true, transaction: row });
      });
    }
  );
});

// Delete transaction
router.delete('/transactions/:id', (req, res) => {
  const db = getDatabase('money');
  db.run('DELETE FROM transactions WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true, deleted: this.changes });
  });
});

module.exports = { moneyRoutes: router }; 