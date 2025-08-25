const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database path for daily spending
const dailySpendingDbPath = path.join(dataDir, 'daily-spending.db');

// Database schema for daily spending
const dailySpendingSchema = `
  -- Daily spending transactions table
  CREATE TABLE IF NOT EXISTS daily_spending_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'TRY',
    category TEXT NOT NULL,
    description TEXT,
    bank_name TEXT DEFAULT 'Not Specified',
    transaction_date DATE,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    source_type TEXT NOT NULL CHECK(source_type IN ('text_input', 'pdf_upload')),
    pdf_source TEXT,
    page_number INTEGER,
    row_position INTEGER,
    confidence_score DECIMAL(3,2) DEFAULT 1.00,
    raw_text TEXT,
    parsed_fields TEXT,
    validation_status TEXT DEFAULT 'valid' CHECK(validation_status IN ('valid', 'needs_review', 'error')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Daily spending categories table
  CREATE TABLE IF NOT EXISTS daily_spending_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Daily spending currency accounts table
  CREATE TABLE IF NOT EXISTS daily_spending_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    currency_code TEXT UNIQUE NOT NULL,
    currency_name TEXT NOT NULL,
    total_balance DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- PDF processing sessions table
  CREATE TABLE IF NOT EXISTS pdf_processing_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    bank_name TEXT,
    statement_period_start DATE,
    statement_period_end DATE,
    total_transactions INTEGER DEFAULT 0,
    processing_status TEXT DEFAULT 'processing' CHECK(processing_status IN ('processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
  );

  -- Create indexes for better performance
  CREATE INDEX IF NOT EXISTS idx_daily_spending_transactions_currency ON daily_spending_transactions(currency);
  CREATE INDEX IF NOT EXISTS idx_daily_spending_transactions_date ON daily_spending_transactions(transaction_date);
  CREATE INDEX IF NOT EXISTS idx_daily_spending_transactions_category ON daily_spending_transactions(category);
  CREATE INDEX IF NOT EXISTS idx_daily_spending_transactions_bank ON daily_spending_transactions(bank_name);
  CREATE INDEX IF NOT EXISTS idx_daily_spending_transactions_source ON daily_spending_transactions(source_type);
  CREATE INDEX IF NOT EXISTS idx_daily_spending_categories_name ON daily_spending_categories(name);
  CREATE INDEX IF NOT EXISTS idx_daily_spending_accounts_currency ON daily_spending_accounts(currency_code);
`;

// Initialize daily spending database
function initDailySpendingDatabase() {
  return new Promise((resolve, reject) => {
    try {
      const db = new sqlite3.Database(dailySpendingDbPath, (err) => {
        if (err) {
          console.error('❌ Database connection error:', err);
          reject(err);
          return;
        }
        
        db.exec(dailySpendingSchema, (err) => {
          if (err) {
            console.error('❌ Schema execution error:', err);
            reject(err);
            return;
          }
          
          // Insert default categories
          const defaultCategories = [
            { name: 'Food & Dining', color: '#10B981' },
            { name: 'Transportation', color: '#3B82F6' },
            { name: 'Shopping', color: '#8B5CF6' },
            { name: 'Entertainment', color: '#F59E0B' },
            { name: 'Utilities', color: '#EF4444' },
            { name: 'Healthcare', color: '#EC4899' },
            { name: 'Education', color: '#06B6D4' },
            { name: 'Travel', color: '#84CC16' },
            { name: 'Other', color: '#6B7280' }
          ];

          const insertCategory = db.prepare(`
            INSERT OR IGNORE INTO daily_spending_categories (name, color) 
            VALUES (?, ?)
          `);

          defaultCategories.forEach(category => {
            insertCategory.run(category.name, category.color);
          });

          insertCategory.finalize((err) => {
            if (err) {
              console.error('❌ Category insertion error:', err);
              reject(err);
              return;
            }

            // Insert default currency accounts
            const defaultAccounts = [
              { code: 'TRY', name: 'Turkish Lira' },
              { code: 'USD', name: 'US Dollar' },
              { code: 'EUR', name: 'Euro' },
              { code: 'SAR', name: 'Saudi Riyal' }
            ];

            const insertAccount = db.prepare(`
              INSERT OR IGNORE INTO daily_spending_accounts (currency_code, currency_name) 
              VALUES (?, ?)
            `);

            defaultAccounts.forEach(account => {
              insertAccount.run(account.code, account.name);
            });

            insertAccount.finalize((err) => {
              if (err) {
                console.error('❌ Account insertion error:', err);
                reject(err);
                return;
              }

              db.close((err) => {
                if (err) {
                  console.error('❌ Database close error:', err);
                  reject(err);
                  return;
                }
                resolve();
              });
            });
          });
        });
      });
    } catch (error) {
      console.error('❌ Unexpected error in database initialization:', error);
      reject(error);
    }
  });
}

// Get database connection
function getDailySpendingDatabase() {
  return new sqlite3.Database(dailySpendingDbPath);
}

module.exports = {
  initDailySpendingDatabase,
  getDailySpendingDatabase,
  dailySpendingDbPath
}; 