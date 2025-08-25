const { openai, isAIAvailable } = require('./ai-config');
const DailySpendingPDFParser = require('./daily-spending-pdf-parser');
const { getDailySpendingDatabase } = require('../database/daily-spending-init');

class DailySpendingService {
  
  // Process free text input (e.g., "200 tl - coffee, 300tl - dinner")
  static async processTextInput(text, existingCategories = []) {
    try {
      console.log('📝 Processing text input:', text);
      
      // Parse the text input
      const parsedTransactions = await this.parseTextInput(text);
      console.log('✅ Text parsed, transactions found:', parsedTransactions.length);
      
      // Process each transaction with AI
      const processedTransactions = [];
      for (const tx of parsedTransactions) {
        const processed = await this.processTransactionWithAI(tx, existingCategories);
        processedTransactions.push(processed);
      }
      
      // Save to database
      const savedTransactions = await this.saveTransactions(processedTransactions, 'text_input');
      console.log('💾 Transactions saved to database');
      
      return {
        success: true,
        transactions: savedTransactions,
        total: processedTransactions.length
      };
      
    } catch (error) {
      console.error('❌ Text input processing error:', error);
      throw new Error(`Failed to process text input: ${error.message}`);
    }
  }

  // Parse simple text input like "200 tl - coffee, 300tl - dinner"
  static async parseTextInput(text) {
    const transactions = [];
    
    // Split by commas and process each entry
    const entries = text.split(',').map(entry => entry.trim()).filter(entry => entry.length > 0);
    
    for (const entry of entries) {
      // Look for pattern: amount currency - description
      const match = entry.match(/^(\d+(?:[.,]\d+)?)\s*(tl|dollar|euro|sar|usd|eur|try)\s*-\s*(.+)$/i);
      
      if (match) {
        const [, amount, currency, description] = match;
        
        // Normalize currency
        const normalizedCurrency = this.normalizeCurrency(currency);
        
        // Normalize amount
        const normalizedAmount = this.normalizeAmount(amount);
        
        transactions.push({
          amount: -normalizedAmount, // Negative for expenses
          currency: normalizedCurrency,
          description: description.trim(),
          date: new Date().toISOString().split('T')[0], // Today's date
          type: 'expense', // This is an expense
          category: 'Other', // Will be categorized by AI
          confidence: 1.0
        });
      }
    }
    
    return transactions;
  }

  // Process PDF bank statement
  static async processPDFUpload(pdfBuffer, filename) {
    try {
      console.log('📄 Processing PDF upload:', filename);
      
      // Parse PDF using the super parser
      const parsedData = await DailySpendingPDFParser.parseBankStatement(pdfBuffer, filename);
      console.log('✅ PDF parsed successfully');
      
      // Process each transaction with AI
      const processedTransactions = [];
      for (const tx of parsedData.transactions) {
        // Ensure all PDF transactions are treated as expenses
        const expenseTx = {
          ...tx,
          amount: Math.abs(tx.amount), // Make sure amount is positive for processing
          type: 'expense' // All PDF transactions are expenses
        };
        const processed = await this.processTransactionWithAI(expenseTx, []);
        processedTransactions.push(processed);
      }
      
      // Save to database
      const savedTransactions = await this.saveTransactions(processedTransactions, 'pdf_upload', {
        pdf_source: filename,
        bank_name: parsedData.bank_name,
        statement_period: parsedData.statement_period
      });
      
      console.log('💾 PDF transactions saved to database');
      
      return {
        success: true,
        transactions: savedTransactions,
        total: processedTransactions.length,
        bank_name: parsedData.bank_name,
        currency: parsedData.currency,
        statement_period: parsedData.statement_period,
        parsing_metadata: parsedData.parsing_metadata
      };
      
    } catch (error) {
      console.error('❌ PDF processing error:', error);
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
  }

  // Process individual transaction with AI for categorization
  static async processTransactionWithAI(transaction, existingCategories = []) {
    try {
      isAIAvailable();
      
      const prompt = `
You are a smart spending categorizer. Categorize the following transaction and detect the currency.

TRANSACTION: ${transaction.description}
AMOUNT: ${transaction.amount}
CURRENCY: ${transaction.currency}
DATE: ${transaction.date || 'Not specified'}

EXISTING CATEGORIES: ${existingCategories.join(', ')}

INSTRUCTIONS:
1. Categorize this transaction into an appropriate spending category
2. If the currency is not specified, detect it from the context
3. Use existing categories if they match well, otherwise create a new descriptive category
4. Be specific and helpful for tracking spending

CURRENCY DETECTION RULES:
- If currency is already specified, use it
- If not specified, detect from context:
  * Turkish context (locations, businesses) → TRY
  * US context → USD  
  * European context → EUR
  * Saudi context → SAR
  * Default to TRY if unclear

CATEGORIZATION RULES:
- Food & Dining: restaurants, cafes, groceries, food delivery
- Transportation: fuel, public transport, ride-sharing, parking
- Shopping: clothes, electronics, household items
- Entertainment: movies, games, events, subscriptions
- Utilities: electricity, water, internet, phone
- Healthcare: medical, pharmacy, insurance
- Education: courses, books, training
- Travel: flights, hotels, travel expenses
- Other: anything that doesn't fit above categories

Return a JSON object:
{
  "category": "string (category name)",
  "currency": "string (currency code: TRY, USD, EUR, SAR)",
  "confidence": "decimal (0.0-1.0, categorization confidence)"
}
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      const response = completion.choices[0].message.content;
      let parsed;
      
      try {
        // Clean response and parse JSON
        let cleanedResponse = response.trim();
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/```json\n?/, '').replace(/```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/```\n?/, '').replace(/```$/, '');
        }
        cleanedResponse = cleanedResponse.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
        
        parsed = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.warn('Failed to parse AI response, using defaults');
        parsed = {
          category: 'Other',
          currency: transaction.currency || 'TRY',
          confidence: 0.5
        };
      }

      // Update transaction with AI insights
      return {
        ...transaction,
        category: parsed.category || 'Other',
        currency: parsed.currency || transaction.currency || 'TRY',
        confidence: parsed.confidence || 0.8
      };
      
    } catch (error) {
      console.error('❌ AI processing error:', error);
      // Return transaction with defaults if AI fails
      return {
        ...transaction,
        category: 'Other',
        currency: transaction.currency || 'TRY',
        confidence: 0.5
      };
    }
  }

  // Save transactions to database
  static async saveTransactions(transactions, sourceType, metadata = {}) {
    return new Promise((resolve, reject) => {
      const db = getDailySpendingDatabase();
      
      db.serialize(() => {
        const savedTransactions = [];
        
        // Begin transaction
        db.run('BEGIN TRANSACTION');
        
        const insertStmt = db.prepare(`
          INSERT INTO daily_spending_transactions (
            amount, currency, category, description, bank_name, 
            transaction_date, entry_date, source_type, pdf_source,
            confidence_score, raw_text, validation_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        transactions.forEach((tx, index) => {
          // Ensure all amounts are stored as negative (expenses)
          const expenseAmount = tx.amount < 0 ? tx.amount : -Math.abs(tx.amount);
          
          insertStmt.run([
            expenseAmount,
            tx.currency,
            tx.category,
            tx.description,
            metadata.bank_name || 'Not Specified',
            tx.date,
            new Date().toISOString().split('T')[0],
            sourceType,
            metadata.pdf_source || null,
            tx.confidence,
            tx.raw_text || tx.description,
            tx.confidence > 0.7 ? 'valid' : 'needs_review'
          ], function(err) {
            if (err) {
              console.error('❌ Insert error:', err);
              db.run('ROLLBACK');
              reject(err);
              return;
            }
            
            const savedTx = {
              id: this.lastID,
              ...tx,
              source_type: sourceType,
              bank_name: metadata.bank_name || 'Not Specified'
            };
            
            savedTransactions.push(savedTx);
            
            // If this is the last transaction, commit and resolve
            if (index === transactions.length - 1) {
              insertStmt.finalize((err) => {
                if (err) {
                  console.error('❌ Finalize error:', err);
                  db.run('ROLLBACK');
                  reject(err);
                  return;
                }
                
                db.run('COMMIT', (err) => {
                  if (err) {
                    console.error('❌ Commit error:', err);
                    reject(err);
                    return;
                  }
                  
                  db.close();
                  resolve(savedTransactions);
                });
              });
            }
          });
        });
      });
    });
  }

  // Get spending summary by currency
  static async getSpendingSummary() {
    return new Promise((resolve, reject) => {
      const db = getDailySpendingDatabase();
      
      // First, let's debug what's in the database
      const debugQuery = `SELECT currency, amount, description FROM daily_spending_transactions LIMIT 10`;
      
      db.all(debugQuery, [], (err, debugRows) => {
        if (err) {
          console.log('Debug query error:', err);
        } else {
          console.log('Sample transactions for debugging:', debugRows);
        }
        
        // Now the main query - but let's be more careful about currency exchange transactions
        const query = `
          SELECT 
            currency,
            COUNT(*) as transaction_count,
            SUM(ABS(amount)) as total_expenses
          FROM daily_spending_transactions
          WHERE description NOT LIKE '%Döviz%' AND description NOT LIKE '%Currency%' AND description NOT LIKE '%Exchange%'
          GROUP BY currency
          ORDER BY currency
        `;
        
        db.all(query, [], (err, rows) => {
          db.close();
          
          if (err) {
            reject(err);
            return;
          }
          
          console.log('Summary data being sent (excluding currency exchanges):', rows);
          resolve(rows);
        });
      });
    });
  }

  // Get spending summary by currency (including all transactions)
  static async getSpendingSummaryAll() {
    return new Promise((resolve, reject) => {
      const db = getDailySpendingDatabase();
      
      const query = `
        SELECT 
          currency,
          COUNT(*) as transaction_count,
          SUM(ABS(amount)) as total_expenses
        FROM daily_spending_transactions
        GROUP BY currency
        ORDER BY currency
      `;
      
      db.all(query, [], (err, rows) => {
        db.close();
        
        if (err) {
          reject(err);
          return;
        }
        
        console.log('Full summary data (including all transactions):', rows);
        resolve(rows);
      });
    });
  }

  // Get transactions with filters
  static async getTransactions(filters = {}) {
    return new Promise((resolve, reject) => {
      const db = getDailySpendingDatabase();
      
      let query = `
        SELECT * FROM daily_spending_transactions
        WHERE 1=1
      `;
      const params = [];
      
      if (filters.currency) {
        query += ' AND currency = ?';
        params.push(filters.currency);
      }
      
      if (filters.category) {
        query += ' AND category = ?';
        params.push(filters.category);
      }
      
      if (filters.bank_name) {
        query += ' AND bank_name = ?';
        params.push(filters.bank_name);
      }
      
      if (filters.start_date) {
        query += ' AND transaction_date >= ?';
        params.push(filters.start_date);
      }
      
      if (filters.end_date) {
        query += ' AND transaction_date <= ?';
        params.push(filters.end_date);
      }
      
      query += ' ORDER BY transaction_date DESC, created_at DESC';
      
      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }
      
      db.all(query, params, (err, rows) => {
        db.close();
        
        if (err) {
          reject(err);
          return;
        }
        
        resolve(rows);
      });
    });
  }

  // Get categories
  static async getCategories() {
    return new Promise((resolve, reject) => {
      const db = getDailySpendingDatabase();
      
      const query = `
        SELECT name, color, usage_count 
        FROM daily_spending_categories 
        ORDER BY usage_count DESC, name
      `;
      
      db.all(query, [], (err, rows) => {
        db.close();
        
        if (err) {
          reject(err);
          return;
        }
        
        resolve(rows);
      });
    });
  }

  // Update transaction
  static async updateTransaction(id, updateData) {
    return new Promise((resolve, reject) => {
      const db = getDailySpendingDatabase();
      
      const query = `
        UPDATE daily_spending_transactions 
        SET amount = ?, currency = ?, category = ?, description = ?, bank_name = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      db.run(query, [
        updateData.amount,
        updateData.currency,
        updateData.category,
        updateData.description,
        updateData.bank_name,
        id
      ], function(err) {
        if (err) {
          db.close();
          reject(err);
          return;
        }
        
        if (this.changes === 0) {
          db.close();
          reject(new Error('Transaction not found'));
          return;
        }
        
        // Get the updated transaction
        db.get('SELECT * FROM daily_spending_transactions WHERE id = ?', [id], (err, row) => {
          db.close();
          
          if (err) {
            reject(err);
            return;
          }
          
          resolve(row);
        });
      });
    });
  }

  // Delete transaction
  static async deleteTransaction(id) {
    return new Promise((resolve, reject) => {
      const db = getDailySpendingDatabase();
      
      const query = 'DELETE FROM daily_spending_transactions WHERE id = ?';
      
      db.run(query, [id], function(err) {
        db.close();
        
        if (err) {
          reject(err);
          return;
        }
        
        if (this.changes === 0) {
          reject(new Error('Transaction not found'));
          return;
        }
        
        resolve();
      });
    });
  }

  // Get unique bank names
  static async getBankNames() {
    return new Promise((resolve, reject) => {
      const db = getDailySpendingDatabase();
      
      const query = `
        SELECT DISTINCT bank_name 
        FROM daily_spending_transactions 
        WHERE bank_name IS NOT NULL AND bank_name != ''
        ORDER BY bank_name
      `;
      
      db.all(query, [], (err, rows) => {
        db.close();
        
        if (err) {
          reject(err);
          return;
        }
        
        resolve(rows.map(row => row.bank_name));
      });
    });
  }

  // Utility methods
  static normalizeCurrency(currency) {
    const normalized = currency.toLowerCase().trim();
    
    if (['tl', 'try', 'turkish lira'].includes(normalized)) return 'TRY';
    if (['dollar', 'usd', '$'].includes(normalized)) return 'USD';
    if (['euro', 'eur', '€'].includes(normalized)) return 'EUR';
    if (['sar', 'riyal', 'ر.س'].includes(normalized)) return 'SAR';
    
    return 'TRY'; // Default to Turkish Lira
  }

  static normalizeAmount(amount) {
    if (typeof amount === 'number') return amount;
    
    let amountStr = amount.toString().trim();
    amountStr = amountStr.replace(/[₺$€ر.س\s]/g, '');
    
    // Handle different decimal separators
    if (amountStr.includes(',') && amountStr.includes('.')) {
      if (amountStr.indexOf(',') < amountStr.indexOf('.')) {
        amountStr = amountStr.replace(/,/g, '');
      } else {
        amountStr = amountStr.replace(/\./g, '').replace(/,/g, '.');
      }
    } else if (amountStr.includes(',')) {
      amountStr = amountStr.replace(/,/g, '.');
    }
    
    const parsed = parseFloat(amountStr);
    return isNaN(parsed) ? 0 : parsed;
  }
}

module.exports = DailySpendingService; 