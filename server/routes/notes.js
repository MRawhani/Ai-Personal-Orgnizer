const express = require('express');
const { getDatabase } = require('../database/init');
const AIService = require('../services/ai');

const router = express.Router();

// Get all notes
router.get('/', (req, res) => {
  const db = getDatabase('notes');
  const { topic } = req.query;
  
  let query = 'SELECT * FROM notes ORDER BY created_at DESC';
  let params = [];
  
  if (topic) {
    query = 'SELECT * FROM notes WHERE topic = ? ORDER BY created_at DESC';
    params.push(topic);
  }
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get topics
router.get('/topics', (req, res) => {
  const db = getDatabase('notes');
  db.all('SELECT topic, COUNT(*) as count FROM notes GROUP BY topic ORDER BY count DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get all available topics for autocomplete
router.get('/topics/list', (req, res) => {
  const db = getDatabase('notes');
  db.all('SELECT DISTINCT topic FROM notes ORDER BY topic', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows.map(row => row.topic));
  });
});

// Add note with AI processing
router.post('/add', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text input is required' });
    }
    
    // Get existing topics for context
    const db = getDatabase('notes');
    const existingTopics = await new Promise((resolve, reject) => {
      db.all('SELECT DISTINCT topic FROM notes ORDER BY topic', (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => row.topic));
      });
    });
    
    // Process with AI (returns array of cards)
    const processedCards = await AIService.processNoteInput(text, existingTopics);
    
    const addedNotes = [];
    
    // Insert all cards
    for (const card of processedCards) {
      const result = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO notes (topic, content, color) VALUES (?, ?, ?)',
          [card.topic, card.content, card.color],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      // Get the inserted note
      const addedNote = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM notes WHERE id = ?', [result], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      addedNotes.push(addedNote);
    }
    
    res.json({ 
      success: true, 
      message: `${addedNotes.length} note card(s) added successfully`,
      notes: addedNotes
    });
    
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add note card directly (no AI)
router.post('/add-card', (req, res) => {
  try {
    const { topic, content, color } = req.body;
    
    if (!topic || !content) {
      return res.status(400).json({ error: 'Topic and content are required' });
    }
    
    const db = getDatabase('notes');
    db.run(
      'INSERT INTO notes (topic, content, color) VALUES (?, ?, ?)',
      [topic, content, color || '#3B82F6'],
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        // Get the inserted note
        db.get('SELECT * FROM notes WHERE id = ?', [this.lastID], (err, row) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json({ success: true, note: row });
        });
      }
    );
  } catch (error) {
    console.error('Error adding note card:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update note
router.put('/:id', (req, res) => {
  const db = getDatabase('notes');
  const { topic, content, color } = req.body;
  
  db.run(
    'UPDATE notes SET topic = ?, content = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [topic, content, color, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Note not found' });
        return;
      }
      res.json({ success: true, updated: this.changes });
    }
  );
});

// Delete note
router.delete('/:id', (req, res) => {
  const db = getDatabase('notes');
  db.run('DELETE FROM notes WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true, deleted: this.changes });
  });
});

// Search notes
router.get('/search', (req, res) => {
  const db = getDatabase('notes');
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  
  db.all(
    'SELECT * FROM notes WHERE topic LIKE ? OR content LIKE ? ORDER BY created_at DESC',
    [`%${q}%`, `%${q}%`],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

module.exports = { notesRoutes: router }; 