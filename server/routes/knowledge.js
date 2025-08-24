const express = require('express');
const { getDatabase } = require('../database/init');
const AIService = require('../services/ai');

const router = express.Router();

// Get all knowledge items
router.get('/', (req, res) => {
  const db = getDatabase('knowledge');
  const { category } = req.query;
  
  let query = 'SELECT * FROM knowledge ORDER BY created_at DESC';
  let params = [];
  
  if (category) {
    query = 'SELECT * FROM knowledge WHERE category = ? ORDER BY created_at DESC';
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
  const db = getDatabase('knowledge');
  db.all('SELECT category, COUNT(*) as count FROM knowledge GROUP BY category ORDER BY count DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add knowledge with AI processing
router.post('/add', async (req, res) => {
  try {
    const { title, content, source } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    // Process with AI for summarization and categorization
    const processed = await AIService.summarizeContent(source || 'Manual input', content);
    
    // Insert knowledge
    const db = getDatabase('knowledge');
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO knowledge (title, content, source, category, tags) VALUES (?, ?, ?, ?, ?)',
        [title, content, source || null, processed.category, processed.tags],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
    
    // Get the inserted knowledge
    db.get('SELECT * FROM knowledge WHERE id = ?', [result], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true, knowledge: row });
    });
    
  } catch (error) {
    console.error('Error adding knowledge:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete knowledge
router.delete('/:id', (req, res) => {
  const db = getDatabase('knowledge');
  db.run('DELETE FROM knowledge WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true, deleted: this.changes });
  });
});

// Search knowledge
router.get('/search', (req, res) => {
  const db = getDatabase('knowledge');
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  
  db.all(
    'SELECT * FROM knowledge WHERE title LIKE ? OR content LIKE ? OR tags LIKE ? ORDER BY created_at DESC',
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

module.exports = { knowledgeRoutes: router }; 