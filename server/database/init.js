const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database paths
const dbPaths = {
  money: path.join(dataDir, 'money.db'),
  notes: path.join(dataDir, 'notes.db'),
  references: path.join(dataDir, 'references.db'),
  bookmarks: path.join(dataDir, 'bookmarks.db'),
  knowledge: path.join(dataDir, 'knowledge.db'),
  files: path.join(dataDir, 'files.db')
};

// Database schemas
const schemas = {
  money: `
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount DECIMAL(10,2) NOT NULL,
      currency TEXT DEFAULT 'USD',
      type TEXT DEFAULT 'expense',
      category TEXT NOT NULL,
      description TEXT,
      account TEXT DEFAULT 'main',
      date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#3B82F6'
    );
    
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
    CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency);
  `,
  
  notes: `
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT NOT NULL,
      content TEXT NOT NULL,
      color TEXT DEFAULT '#10B981',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_notes_topic ON notes(topic);
    CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at);
  `,
  
  references: `
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS project_references (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      url TEXT,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects (id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_project_references_project ON project_references(project_id);
  `,
  
  bookmarks: `
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      category TEXT,
      tags TEXT,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON bookmarks(created_at);
  `,
  
  knowledge: `
    CREATE TABLE IF NOT EXISTS knowledge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      source TEXT,
      category TEXT,
      tags TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge(category);
    CREATE INDEX IF NOT EXISTS idx_knowledge_created ON knowledge(created_at);
  `,
  
  files: `
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'file',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
    CREATE INDEX IF NOT EXISTS idx_files_created ON files(created_at);
  `
};

// Initialize a single database
function initDatabase(dbPath, schema) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      db.exec(schema, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        db.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    });
  });
}

// Initialize all databases
async function initDatabases() {
  try {
    console.log('Initializing databases...');
    
    for (const [name, dbPath] of Object.entries(dbPaths)) {
      await initDatabase(dbPath, schemas[name]);
      console.log(`✅ ${name}.db initialized`);
    }
    
    console.log('All databases initialized successfully!');
  } catch (error) {
    console.error('Error initializing databases:', error);
    process.exit(1);
  }
}

// Get database connection
function getDatabase(dbName) {
  const dbPath = dbPaths[dbName];
  if (!dbPath) {
    throw new Error(`Unknown database: ${dbName}`);
  }
  return new sqlite3.Database(dbPath);
}

module.exports = {
  initDatabases,
  getDatabase,
  dbPaths
}; 