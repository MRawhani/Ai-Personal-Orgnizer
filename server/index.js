const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5008;

// Middleware
app.use(cors());
app.use(express.json());
// Only serve static files if build directory exists
const buildPath = path.join(__dirname, '../client/build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
}

// Database initialization
const { initDatabases } = require('./database/init');
const { moneyRoutes } = require('./routes/money');
const { notesRoutes } = require('./routes/notes');
const { referencesRoutes } = require('./routes/references');
const { bookmarksRoutes } = require('./routes/bookmarks');
const { knowledgeRoutes } = require('./routes/knowledge');
const { filesRoutes } = require('./routes/files');

// Initialize databases
initDatabases();

// Routes
app.use('/api/money', moneyRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/references', referencesRoutes);
app.use('/api/bookmarks', bookmarksRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/files', filesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Personal AI Organizer is running' });
});

// Serve React app
app.get('*', (req, res) => {
  const buildPath = path.join(__dirname, '../client/build/index.html');
  if (fs.existsSync(buildPath)) {
    res.sendFile(buildPath);
  } else {
    res.json({ 
      error: 'React app not built. Please run "cd client && npm run build" or access the API directly.',
      message: 'Server is running but frontend needs to be built.',
      apiEndpoints: [
        '/api/money',
        '/api/notes', 
        '/api/files',
        '/api/references',
        '/api/bookmarks',
        '/api/knowledge'
      ]
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 