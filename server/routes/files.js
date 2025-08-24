const express = require('express');
const { getDatabase } = require('../database/init');
const AIService = require('../services/ai');

const router = express.Router();

// Get all files organized by folder structure
router.get('/', (req, res) => {
  const db = getDatabase('files');
  
  db.all('SELECT * FROM files ORDER BY path, name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Organize files by folder structure
    const fileTree = {};
    rows.forEach(file => {
      const pathParts = file.path ? file.path.split('/') : [''];
      let currentLevel = fileTree;
      
      // Create folder structure
      pathParts.forEach((part, index) => {
        if (!currentLevel[part]) {
          currentLevel[part] = {
            type: 'folder',
            name: part || 'root',
            path: pathParts.slice(0, index + 1).join('/'),
            children: {},
            files: []
          };
        }
        currentLevel = currentLevel[part].children;
      });
      
      // Add file to the appropriate folder
      const parentPath = pathParts.slice(0, -1).join('/');
      const parentFolder = parentPath ? 
        rows.find(f => f.path === parentPath) : 
        { id: 'root', name: 'root' };
      
      if (parentFolder) {
        const folderKey = parentPath || '';
        if (!fileTree[folderKey]) {
          fileTree[folderKey] = {
            type: 'folder',
            name: folderKey || 'root',
            path: folderKey,
            children: {},
            files: []
          };
        }
        fileTree[folderKey].files.push(file);
      }
    });
    
    res.json(fileTree);
  });
});

// Get file tree structure
router.get('/tree', (req, res) => {
  const db = getDatabase('files');
  
  db.all('SELECT * FROM files ORDER BY path, name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Build tree structure
    const buildTree = (files, parentPath = '') => {
      const tree = [];
      const folders = new Set();
      
      // First, collect all unique folder paths
      files.forEach(file => {
        if (file.path && file.path !== '') {
          const pathParts = file.path.split('/');
          let currentPath = '';
          pathParts.forEach(part => {
            if (currentPath === '') {
              currentPath = part;
            } else {
              currentPath = currentPath + '/' + part;
            }
            folders.add(currentPath);
          });
        }
      });
      
      // Add files at current level
      files.forEach(file => {
        if (file.path === parentPath) {
          tree.push({
            id: file.id,
            name: file.name,
            type: 'file',
            path: file.path,
            content: file.content,
            created_at: file.created_at,
            updated_at: file.updated_at
          });
        }
      });
      
      // Add folders at current level
      folders.forEach(folderPath => {
        if (folderPath.startsWith(parentPath + '/') || (parentPath === '' && !folderPath.includes('/'))) {
          const nextLevel = parentPath === '' ? folderPath : folderPath.substring(parentPath.length + 1).split('/')[0];
          const fullPath = parentPath === '' ? nextLevel : parentPath + '/' + nextLevel;
          
          // Only add if this is the immediate child of parentPath
          if (fullPath === folderPath && !tree.some(item => item.type === 'folder' && item.path === fullPath)) {
            tree.push({
              id: `folder-${fullPath}`,
              name: nextLevel,
              type: 'folder',
              path: fullPath,
              children: buildTree(files, fullPath)
            });
          }
        }
      });
      
      return tree;
    };
    
    const tree = buildTree(rows);
    res.json(tree);
  });
});

// Get all folders
router.get('/folders', (req, res) => {
  const db = getDatabase('files');
  
  db.all('SELECT DISTINCT path FROM files WHERE path IS NOT NULL AND path != "" ORDER BY path', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const folders = rows.map(row => row.path);
    res.json(folders);
  });
});

// Add file with AI processing
router.post('/add', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text input is required' });
    }
    
    // Get existing folders for context
    const db = getDatabase('files');
    const existingFolders = await new Promise((resolve, reject) => {
      db.all('SELECT DISTINCT path FROM files WHERE path IS NOT NULL AND path != "" ORDER BY path', (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => row.path));
      });
    });
    
    // Process with AI
    const processed = await AIService.processFileSystemInput(text, existingFolders);
    
    // Insert file
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO files (name, path, content, type) VALUES (?, ?, ?, ?)',
        [processed.fileName, processed.path, processed.content, processed.type],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
    
    // Get the inserted file
    const addedFile = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM files WHERE id = ?', [result], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    res.json({ 
      success: true, 
      message: `File "${processed.fileName}" added to "${processed.path || 'root'}"`,
      file: addedFile
    });
    
  } catch (error) {
    console.error('Error adding file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add file directly (no AI)
router.post('/add-file', (req, res) => {
  try {
    const { name, path, content } = req.body;
    
    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content are required' });
    }
    
    const db = getDatabase('files');
    db.run(
      'INSERT INTO files (name, path, content, type) VALUES (?, ?, ?, ?)',
      [name, path || '', content, 'file'],
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        // Get the inserted file
        db.get('SELECT * FROM files WHERE id = ?', [this.lastID], (err, row) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json({ success: true, file: row });
        });
      }
    );
  } catch (error) {
    console.error('Error adding file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single file
router.get('/:id', (req, res) => {
  const db = getDatabase('files');
  db.get('SELECT * FROM files WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    res.json(row);
  });
});

// Update file
router.put('/:id', (req, res) => {
  const db = getDatabase('files');
  const { name, content } = req.body;
  
  db.run(
    'UPDATE files SET name = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, content, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'File not found' });
        return;
      }
      res.json({ success: true, updated: this.changes });
    }
  );
});

// Delete file
router.delete('/:id', (req, res) => {
  const db = getDatabase('files');
  db.run('DELETE FROM files WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true, deleted: this.changes });
  });
});

// Create folder
router.post('/create-folder', (req, res) => {
  try {
    const { name, path } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }
    
    const db = getDatabase('files');
    const fullPath = path ? `${path}/${name}` : name;
    
    // Check if folder already exists
    db.get('SELECT * FROM files WHERE path = ? AND type = "folder"', [fullPath], (err, existingFolder) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (existingFolder) {
        return res.status(400).json({ error: 'Folder already exists' });
      }
      
      // Create folder entry
      db.run(
        'INSERT INTO files (name, path, content, type) VALUES (?, ?, ?, ?)',
        [name, path || '', 'Folder created', 'folder'],
        function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          // Get the created folder
          db.get('SELECT * FROM files WHERE id = ?', [this.lastID], (err, row) => {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }
            res.json({ 
              success: true, 
              message: `Folder "${name}" created successfully`,
              folder: row 
            });
          });
        }
      );
    });
    
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search files
router.get('/search', (req, res) => {
  const db = getDatabase('files');
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  
  db.all(
    'SELECT * FROM files WHERE name LIKE ? OR content LIKE ? ORDER BY created_at DESC',
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

module.exports = { filesRoutes: router }; 