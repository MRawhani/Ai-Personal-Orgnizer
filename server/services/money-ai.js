const { openai, isAIAvailable } = require('./ai-config');

class MoneyAIService {
  // Process money input
  static async processMoneyInput(text, existingCategories = [], existingAccounts = []) {
    isAIAvailable();

    const prompt = `
You are an intelligent personal finance categorizer. Parse the following text and extract financial information.

IMPORTANT: If there is ANY number in the text, it should be treated as an amount. Be very aggressive about finding amounts.

EXISTING CATEGORIES: ${existingCategories.join(', ')}
EXISTING ACCOUNTS: ${existingAccounts.join(', ')}

User input: "${text}"

INSTRUCTIONS:
1. FIRST: Scan the text for ANY numbers (integers or decimals)
2. SECOND: For each number found, determine if it could be a money amount
3. THIRD: For each amount found, create a transaction with:
   - amount: the number you found
   - currency: detect from text (USD, EUR, GBP, TRY, etc.)
   - type: "income" or "expense" based on context words
   - category: use existing similar category or create new one
   - description: ALWAYS use the original user input text
   - account: detect account from text using fuzzy matching with existing accounts, use "main" if not specified
   - date: today's date

AMOUNT DETECTION RULES:
- CRITICAL: Look for ANY number in the text, regardless of format
- Common patterns: "2100 $", "500$", "50 euros", "100 tl", "2000 dollars", "25.50", "1000", "1100 dollar", etc.
- Numbers can be integers or decimals
- Currency can be before or after the number, or implied from context
- If no currency is specified, assume USD
- Look for standalone numbers that make sense as amounts (e.g., "spent 50 on groceries" = 50 USD)
- Multiple amounts in one text = multiple transactions
- BE VERY AGGRESSIVE - if there's ANY number in the text, treat it as an amount
- Examples of valid amounts: "1100", "1100 dollar", "1100$", "1100 dollars", etc.
- The word "dollar" or "dollars" after a number indicates USD currency

Return a JSON array of transactions. If NO amounts found, return: {"error": "No amount found in the text. Please specify an amount like 'bought groceries for 50$' or 'spent 25 on lunch'"}

CATEGORIZATION RULES:
- Income words: received, got, earned, salary, transfer, refund, gift, etc.
- Expense words: spent, paid, bought, cost, purchase, etc.
- Account detection: Look for account names in text (e.g., "bank account", "savings", "credit card")
- Account matching: Use fuzzy/semantic matching for accounts. If an account name is similar to existing accounts in the EXISTING ACCOUNTS list, use the existing one:
  * Look for similar account names (case-insensitive, ignore "account" word)
  * "bank account" → match with existing "bank" or "bank account"
  * "savings account" → match with existing "savings" or "savings account"
  * Be flexible with variations and similar names
  * If no similar account exists, create a new account name
- Default account: "main" if no account specified
- Amount detection: Look for numbers followed by currency symbols (e.g., "2100 $", "500$", "50 euros", "100 tl") or any other currency and number.
- Be creative with categories based on the actual description
- Don't force into predefined categories unless they truly match

Examples:

EXAMPLES:

Input: "spent 2100 $ for wisam account"
Amounts found: 2100
Output: [{"amount": 2100.00, "currency": "USD", "type": "expense", "category": "wisam", "description": "spent 2100 $ for wisam account", "account": "wisam", "date": "2024-01-15"}]

Input: "spent 500$ for saudi trip"
Amounts found: 500
Output: [{"amount": 500.00, "currency": "USD", "type": "expense", "category": "saudi trip", "description": "spent 500$ for saudi trip", "account": "main", "date": "2024-01-15"}]

Input: "income of 300$ gift account bank account"
Amounts found: 300
Output: [{"amount": 300.00, "currency": "USD", "type": "income", "category": "gift", "description": "income of 300$ gift account bank account", "account": "bank", "date": "2024-01-15"}]

Input: "20000 tl came to me as transfer, spent 400 tl in pharmacy, spent 100$ in passport renewal"
Amounts found: 20000, 400, 100
Output: [
  {"amount": 20000.00, "currency": "TRY", "type": "income", "category": "transfer", "description": "20000 tl came to me as transfer, spent 400 tl in pharmacy, spent 100$ in passport renewal", "account": "main", "date": "2024-01-15"},
  {"amount": 400.00, "currency": "TRY", "type": "expense", "category": "pharmacy", "description": "20000 tl came to me as transfer, spent 400 tl in pharmacy, spent 100$ in passport renewal", "account": "main", "date": "2024-01-15"},
  {"amount": 100.00, "currency": "USD", "type": "expense", "category": "passport renewal", "description": "20000 tl came to me as transfer, spent 400 tl in pharmacy, spent 100$ in passport renewal", "account": "main", "date": "2024-01-15"}
]

Input: "got 500 euros from freelance work and spent 50 on groceries"
Amounts found: 500, 50
Output: [
  {"amount": 500.00, "currency": "EUR", "type": "income", "category": "freelance", "description": "got 500 euros from freelance work and spent 50 on groceries", "account": "main", "date": "2024-01-15"},
  {"amount": 50.00, "currency": "EUR", "type": "expense", "category": "groceries", "description": "got 500 euros from freelance work and spent 50 on groceries", "account": "main", "date": "2024-01-15"}
]

Input: "spent 25.50 on lunch today"
Amounts found: 25.50
Output: [{"amount": 25.50, "currency": "USD", "type": "expense", "category": "lunch", "description": "spent 25.50 on lunch today", "account": "main", "date": "2024-01-15"}]

Input: "received 1000 from salary"
Amounts found: 1000
Output: [{"amount": 1000.00, "currency": "USD", "type": "income", "category": "salary", "description": "received 1000 from salary", "account": "main", "date": "2024-01-15"}]

Input: "spent 1100 dollar as another loan from Wisam account"
Amounts found: 1100
Output: [{"amount": 1100.00, "currency": "USD", "type": "expense", "category": "loan", "description": "spent 1100 dollar as another loan from Wisam account", "account": "wisam", "date": "2024-01-15"}]

Input: "spent 500 from my bank account"
Amounts found: 500
Output: [{"amount": 500.00, "currency": "USD", "type": "expense", "category": "general", "description": "spent 500 from my bank account", "account": "bank", "date": "2024-01-15"}]

Input: "received 2000 in my savings account"
Amounts found: 2000
Output: [{"amount": 2000.00, "currency": "USD", "type": "income", "category": "transfer", "description": "received 2000 in my savings account", "account": "savings", "date": "2024-01-15"}]

Input: "bought groceries"
Amounts found: none
Output: {"error": "No amount found in the text. Please specify an amount like 'bought groceries for 50$' or 'spent 25 on lunch'"}
`;

    try {
      console.log('🔍 AI Processing Input:', text);
      console.log('📊 Existing Categories:', existingCategories);
      console.log('🏦 Existing Accounts:', existingAccounts);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      const response = completion.choices[0].message.content;
      console.log('🤖 AI Response:', response);
      
      const parsed = JSON.parse(response);
      
      // Check if it's an error response
      if (parsed.error) {
        console.log('❌ AI returned error:', parsed.error);
        throw new Error(parsed.error);
      }
      
      console.log('✅ AI processed successfully:', parsed);
      // Ensure we always return an array
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      console.error('AI processing error:', error);
      throw new Error(error.message || 'Failed to process input with AI');
    }
  }
}

module.exports = MoneyAIService; 