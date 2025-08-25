const express = require('express');
const multer = require('multer');
const DailySpendingService = require('../services/daily-spending-service');
const { initDailySpendingDatabase } = require('../database/daily-spending-init');

const router = express.Router();

// Database will be initialized by the main init process

// Configure multer for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Daily Spending service is running',
    timestamp: new Date().toISOString()
  });
});

// Process text input (e.g., "200 tl - coffee, 300tl - dinner")
router.post('/process-text', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Text input is required and must be a string'
      });
    }

    console.log('📝 Processing text input:', text);
    
    const result = await DailySpendingService.processTextInput(text);
    
    res.json({
      success: true,
      message: `Successfully processed ${result.total} transactions`,
      data: result
    });
    
  } catch (error) {
    console.error('❌ Text processing error:', error);
    res.status(500).json({
      error: 'Failed to process text input',
      message: error.message
    });
  }
});

// Upload and process PDF bank statement
router.post('/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'PDF file is required'
      });
    }

    const { filename, buffer } = req.file;
    console.log('📄 PDF upload received:', filename, 'Size:', buffer.length);
    
    const result = await DailySpendingService.processPDFUpload(buffer, filename);
    
    res.json({
      success: true,
      message: `Successfully processed PDF with ${result.total} transactions`,
      data: result
    });
    
  } catch (error) {
    console.error('❌ PDF processing error:', error);
    res.status(500).json({
      error: 'Failed to process PDF',
      message: error.message
    });
  }
});

// Get spending summary by currency
router.get('/summary', async (req, res) => {
  try {
    const summary = await DailySpendingService.getSpendingSummary();
    
    res.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    console.error('❌ Summary retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve spending summary',
      message: error.message
    });
  }
});

// Get full spending summary (including all transactions) - for debugging
router.get('/summary-all', async (req, res) => {
  try {
    const summary = await DailySpendingService.getSpendingSummaryAll();
    
    res.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    console.error('❌ Full summary retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve full spending summary',
      message: error.message
    });
  }
});

// Get transactions with optional filters
router.get('/transactions', async (req, res) => {
  try {
    const {
      currency,
      category,
      bank_name,
      start_date,
      end_date,
      limit = 100,
      page = 1
    } = req.query;
    
    const filters = {
      currency,
      category,
      bank_name,
      start_date,
      end_date,
      limit: parseInt(limit)
    };
    
    const transactions = await DailySpendingService.getTransactions(filters);
    
    res.json({
      success: true,
      data: {
        transactions,
        total: transactions.length,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('❌ Transactions retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve transactions',
      message: error.message
    });
  }
});

// Get spending categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await DailySpendingService.getCategories();
    
    res.json({
      success: true,
      data: categories
    });
    
  } catch (error) {
    console.error('❌ Categories retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve categories',
      message: error.message
    });
  }
});

// Get unique bank names
router.get('/bank-names', async (req, res) => {
  try {
    const bankNames = await DailySpendingService.getBankNames();
    
    res.json({
      success: true,
      data: bankNames
    });
    
  } catch (error) {
    console.error('❌ Bank names retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve bank names',
      message: error.message
    });
  }
});

// Get transactions by currency
router.get('/transactions/:currency', async (req, res) => {
  try {
    const { currency } = req.params;
    const { limit = 50, page = 1 } = req.query;
    
    const filters = {
      currency: currency.toUpperCase(),
      limit: parseInt(limit)
    };
    
    const transactions = await DailySpendingService.getTransactions(filters);
    
    res.json({
      success: true,
      data: {
        currency: currency.toUpperCase(),
        transactions,
        total: transactions.length,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('❌ Currency transactions retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve transactions for currency',
      message: error.message
    });
  }
});

// Get recent transactions
router.get('/recent', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const filters = {
      limit: parseInt(limit)
    };
    
    const transactions = await DailySpendingService.getTransactions(filters);
    
    res.json({
      success: true,
      data: {
        transactions,
        total: transactions.length,
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('❌ Recent transactions retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve recent transactions',
      message: error.message
    });
  }
});

// Update transaction
router.put('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const result = await DailySpendingService.updateTransaction(parseInt(id), updateData);
    
    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Transaction update error:', error);
    res.status(500).json({
      error: 'Failed to update transaction',
      message: error.message
    });
  }
});

// Delete transaction
router.delete('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await DailySpendingService.deleteTransaction(parseInt(id));
    
    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Transaction deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete transaction',
      message: error.message
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'PDF file size must be less than 10MB'
      });
    }
  }
  
  if (error.message === 'Only PDF files are allowed') {
    return res.status(400).json({
      error: 'Invalid file type',
      message: 'Only PDF files are allowed'
    });
  }
  
  console.error('❌ Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

module.exports = {dailySpendingRoutes: router}; 