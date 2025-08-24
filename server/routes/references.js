const express = require('express');
const { getDatabase } = require('../database/init');
const AIService = require('../services/ai');

const router = express.Router();

// Get all projects
router.get('/projects', (req, res) => {
  const db = getDatabase('references');
  db.all('SELECT * FROM projects ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get references by project
router.get('/project/:projectId', (req, res) => {
  const db = getDatabase('references');
  db.all(
    'SELECT * FROM project_references WHERE project_id = ? ORDER BY created_at DESC',
    [req.params.projectId],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// Add reference with AI processing
router.post('/add', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text input is required' });
    }
    
    // Get existing projects for context
    const db = getDatabase('references');
    const existingProjects = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM projects', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    // Process with AI
    const processed = await AIService.processReferenceInput(text, existingProjects);
    
    // Check if project exists, create if not
    let projectId;
    const existingProject = existingProjects.find(p => p.name.toLowerCase() === processed.project.toLowerCase());
    
    if (existingProject) {
      projectId = existingProject.id;
    } else {
      const newProject = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO projects (name, description) VALUES (?, ?)',
          [processed.project, `Project for ${processed.project}`],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
      projectId = newProject;
    }
    
    // Insert reference
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO project_references (project_id, name, url, description) VALUES (?, ?, ?, ?)',
        [projectId, processed.name, processed.url || null, processed.description],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
    
    // Get the inserted reference
    db.get('SELECT * FROM project_references WHERE id = ?', [result], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true, reference: row });
    });
    
  } catch (error) {
    console.error('Error adding reference:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete reference
router.delete('/:id', (req, res) => {
  const db = getDatabase('references');
  db.run('DELETE FROM project_references WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true, deleted: this.changes });
  });
});

module.exports = { referencesRoutes: router }; 