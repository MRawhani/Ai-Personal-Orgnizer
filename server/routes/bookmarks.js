const express = require('express');
const { getDatabase } = require('../database/init');
const AIService = require('../services/ai');

const router = express.Router();

// Get all bookmarks
router.get('/', (req, res) => {
  const db = getDatabase('bookmarks');
  const { category } = req.query;
  
  let query = 'SELECT * FROM bookmarks ORDER BY created_at DESC';
  let params = [];
  
  if (category) {
    query = 'SELECT * FROM bookmarks WHERE category = ? ORDER BY created_at DESC';
    params.push(category);
  }
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get categories
router.get('/categories', (req, res) => {
  const db = getDatabase('bookmarks');
  db.all('SELECT category, COUNT(*) as count FROM bookmarks GROUP BY category ORDER BY count DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add bookmark with AI processing
router.post('/add', async (req, res) => {
  try {
    const { url, title } = req.body;
    
    if (!url || !title) {
      return res.status(400).json({ error: 'URL and title are required' });
    }
    
    // Get existing categories for context
    const db = getDatabase('bookmarks');
    const existingCategories = await new Promise((resolve, reject) => {
      db.all('SELECT category FROM bookmarks GROUP BY category', (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(r => r.category));
      });
    });
    
    // Process with AI
    const processed = await AIService.processBookmarkInput(url, title, existingCategories);
    
    // Insert bookmark
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO bookmarks (title, url, category, tags, description) VALUES (?, ?, ?, ?, ?)',
        [title, url, processed.category, processed.tags, processed.description],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
    
    // Get the inserted bookmark
    db.get('SELECT * FROM bookmarks WHERE id = ?', [result], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true, bookmark: row });
    });
    
  } catch (error) {
    console.error('Error adding bookmark:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete bookmark
router.delete('/:id', (req, res) => {
  const db = getDatabase('bookmarks');
  db.run('DELETE FROM bookmarks WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true, deleted: this.changes });
  });
});

// Search bookmarks
router.get('/search', (req, res) => {
  const db = getDatabase('bookmarks');
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  
  db.all(
    'SELECT * FROM bookmarks WHERE title LIKE ? OR description LIKE ? OR tags LIKE ? ORDER BY created_at DESC',
    [`%${q}%`, `%${q}%`, `%${q}%`],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

module.exports = { bookmarksRoutes: router }; 