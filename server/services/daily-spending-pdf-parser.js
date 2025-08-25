const pdf = require('pdf-parse');
const { openai, isAIAvailable } = require('./ai-config');
const fs = require('fs');
const path = require('path');

class DailySpendingPDFParser {
  
  // Parse PDF and extract structured data
  static async parseBankStatement(pdfBuffer, filename) {
    try {
      console.log('🔍 Starting PDF parsing for:', filename);
      
      // Step 1: Extract raw text from PDF
      const rawText = await this.extractTextFromPDF(pdfBuffer);
      console.log('📄 Raw text extracted, length:', rawText.length);
      
      // Step 2: AI-powered field recognition and parsing
      const parsedData = await this.aiParseBankStatement(rawText, filename);
      console.log('🤖 AI parsing completed');
      
      // Step 3: Validate and structure the data
      const validatedData = await this.validateParsedData(parsedData);
      console.log('✅ Data validation completed');
      
      return validatedData;
      
    } catch (error) {
      console.error('❌ PDF parsing error:', error);
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
  }

  // Extract text from PDF with layout preservation
  static async extractTextFromPDF(pdfBuffer) {
    try {
      const data = await pdf(pdfBuffer, {
        // Preserve layout and formatting
        normalizeWhitespace: false,
        disableCombineTextItems: false
      });
      
      return data.text;
    } catch (error) {
      throw new Error(`PDF text extraction failed: ${error.message}`);
    }
  }

  // AI-powered parsing of bank statement
  static async aiParseBankStatement(rawText, filename) {
    isAIAvailable();
    
    const prompt = `
You are an expert bank statement parser. Analyze the following bank statement text and extract all financial transactions with high accuracy.

BANK STATEMENT TEXT:
${rawText.substring(0, 8000)}...

INSTRUCTIONS:
1. Identify the bank name from headers, logos, or context
2. Extract statement period (start and end dates)
3. Parse ALL transactions with amounts, dates, descriptions, and types
4. Detect currency automatically (TRY, USD, EUR, SAR)
5. Categorize transactions intelligently
6. Handle different statement formats (tables, lists, etc.)

EXTRACTION RULES:
- Look for transaction patterns in various formats
- Amounts can be in different formats: 1,234.56, 1234,56, 1.234,56
- Dates can be: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
- Currency detection: Look for symbols (₺, $, €, ر.س) or text context
- Transaction types: All transactions are expenses (debits, withdrawals, payments, fees)
- Bank name: Extract from headers, footers, or context clues

RETURN FORMAT (JSON):
{
  "bank_name": "string (extracted bank name or 'Not Specified')",
  "statement_period": {
    "start_date": "YYYY-MM-DD or null",
    "end_date": "YYYY-MM-DD or null"
  },
  "currency": "string (detected currency code)",
  "transactions": [
    {
      "amount": "decimal (always positive - this is a spending amount)",
      "description": "string (transaction description)",
      "date": "YYYY-MM-DD or null",
      "type": "string (debit/credit/transfer/fee)",
      "category": "string (intelligent categorization)",
      "confidence": "decimal (0.0-1.0, parsing confidence)"
    }
  ],
  "parsing_metadata": {
    "total_transactions": "integer",
    "parsing_confidence": "decimal (0.0-1.0)",
    "format_detected": "string (table/list/mixed)",
    "notes": "string (any parsing notes or warnings)"
  }
}

EXAMPLES OF WHAT TO LOOK FOR:
- Table formats with columns: Date | Description | Debit | Credit
- List formats: "15/01/2024 - Coffee Shop - 25.50 TL"
- Mixed formats with headers and footers
- Bank logos, names, and statement periods
- Transaction amounts in various currencies and formats

BE VERY THOROUGH - extract every transaction you can find, even if the format is messy or unclear.
`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      const response = completion.choices[0].message.content;
      console.log('🤖 AI Response received, length:', response.length);
      
      // Clean and parse the response
      let cleanedResponse = response.trim();
      
      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/, '').replace(/```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/, '').replace(/```$/, '');
      }
      
      // Remove control characters
      cleanedResponse = cleanedResponse.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
      
      const parsed = JSON.parse(cleanedResponse);
      console.log('✅ AI parsing successful, transactions found:', parsed.transactions?.length || 0);
      
      return parsed;
      
    } catch (error) {
      console.error('❌ AI parsing error:', error);
      
      // Try to extract JSON from the response if parsing failed
      if (error instanceof SyntaxError) {
        console.log('🔄 Attempting to fix JSON response...');
        try {
          const response = completion?.choices?.[0]?.message?.content || '';
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const cleanedJson = jsonMatch[0].replace(/[\x00-\x1F\x7F-\x9F]/g, '');
            const parsed = JSON.parse(cleanedJson);
            console.log('✅ JSON fixed and parsed successfully');
            return parsed;
          }
        } catch (fixError) {
          console.error('Failed to fix JSON response:', fixError);
        }
      }
      
      throw new Error('AI parsing failed');
    }
  }

  // Validate and structure parsed data
  static async validateParsedData(parsedData) {
    try {
      const validated = {
        bank_name: parsedData.bank_name || 'Not Specified',
        statement_period: {
          start_date: parsedData.statement_period?.start_date || null,
          end_date: parsedData.statement_period?.end_date || null
        },
        currency: parsedData.currency || 'TRY', // Default to Turkish Lira
        transactions: [],
        parsing_metadata: {
          total_transactions: 0,
          parsing_confidence: parsedData.parsing_metadata?.parsing_confidence || 0.8,
          format_detected: parsedData.parsing_metadata?.format_detected || 'unknown',
          notes: parsedData.parsing_metadata?.notes || ''
        }
      };

      // Validate and clean transactions
      if (parsedData.transactions && Array.isArray(parsedData.transactions)) {
        validated.transactions = parsedData.transactions
          .filter(tx => tx && tx.amount && tx.description)
          .map(tx => ({
            amount: this.normalizeAmount(tx.amount),
            description: tx.description.trim(),
            date: this.normalizeDate(tx.date),
            type: this.normalizeTransactionType(tx.type),
            category: this.normalizeCategory(tx.category),
            confidence: Math.min(Math.max(tx.confidence || 0.8, 0.0), 1.0),
            raw_text: tx.description
          }));
      }

      validated.parsing_metadata.total_transactions = validated.transactions.length;
      
      console.log('✅ Data validation completed');
      console.log(`📊 Validated ${validated.transactions.length} transactions`);
      
      return validated;
      
    } catch (error) {
      console.error('❌ Data validation error:', error);
      throw new Error('Data validation failed');
    }
  }

  // Normalize amount to decimal
  static normalizeAmount(amount) {
    if (typeof amount === 'number') return amount;
    
    let amountStr = amount.toString().trim();
    
    // Remove currency symbols and text
    amountStr = amountStr.replace(/[₺$€ر.س\s]/g, '');
    
    // Handle different decimal separators
    if (amountStr.includes(',') && amountStr.includes('.')) {
      // Format: 1,234.56 or 1.234,56
      if (amountStr.indexOf(',') < amountStr.indexOf('.')) {
        // 1,234.56 -> remove comma
        amountStr = amountStr.replace(/,/g, '');
      } else {
        // 1.234,56 -> replace comma with dot, remove dot
        amountStr = amountStr.replace(/\./g, '').replace(/,/g, '.');
      }
    } else if (amountStr.includes(',')) {
      // Format: 1234,56 -> replace with dot
      amountStr = amountStr.replace(/,/g, '.');
    }
    
    const parsed = parseFloat(amountStr);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Normalize date to YYYY-MM-DD format
  static normalizeDate(dateStr) {
    if (!dateStr) return null;
    
    try {
      // Try to parse various date formats
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      
      return date.toISOString().split('T')[0];
    } catch (error) {
      return null;
    }
  }

  // Normalize transaction type - all transactions are expenses
  static normalizeTransactionType(type) {
    // Since this is a spending tracker, all transactions are expenses
    return 'expense';
  }

  // Normalize category
  static normalizeCategory(category) {
    if (!category) return 'Other';
    
    const normalized = category.trim();
    if (normalized.length === 0) return 'Other';
    
    return normalized;
  }
}

module.exports = DailySpendingPDFParser; 