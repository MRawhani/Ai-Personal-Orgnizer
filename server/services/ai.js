const OpenAI = require('openai');

// Check if API key is available
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️  OPENAI_API_KEY not found. AI features will be disabled.');
  console.warn('   Please create a .env file with your OpenAI API key:');
  console.warn('   OPENAI_API_KEY=your_api_key_here');
}

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// AI processing functions
class AIService {
  // Process money input
  static async processMoneyInput(text, existingCategories = [], existingAccounts = []) {
    if (!openai) {
      throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.');
    }

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
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
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

  // Process note input
  static async processNoteInput(text, existingTopics = []) {
    if (!openai) {
      throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.');
    }
    
    console.log('📝 AI Processing Note Input:', text);
    console.log('📊 Existing Topics:', existingTopics);
    
    const prompt = `
You are an intelligent note-taking assistant. Analyze the following text and process it according to these rules:

EXISTING TOPICS: ${existingTopics.join(', ')}

User input: "${text}"

INSTRUCTIONS:
1. Look for @topic patterns in the text (e.g., "@meeting", "@project", "@todo")
2. Fix any typos in the text content
3. Match topics with existing topics (ignore case and typos)
4. If multiple notes are in the text, separate them intelligently
5. For each note, create a card with proper formatting

PROCESSING RULES:
- @topic: Extract the topic name after @ symbol
- Topic matching: Use fuzzy matching with existing topics (case-insensitive, ignore typos)
- If topic doesn't exist, create a new one
- Fix typos in the content
- Split multiple notes intelligently (look for natural breaks, bullet points, etc.)
- Each note should be a separate card

MODERN COLORS (choose one per note):
- #3B82F6 (Blue)
- #10B981 (Emerald)
- #F59E0B (Amber)
- #EF4444 (Red)
- #8B5CF6 (Violet)
- #EC4899 (Pink)
- #06B6D4 (Cyan)
- #84CC16 (Lime)

Return a JSON array of note cards. Each card should have:
- topic: string (matched or new topic name)
- content: string (fixed and formatted content)
- color: string (hex color code)

EXAMPLES:

Input: "@meeting call with john tomorrow at 3pm"
Output: [{"topic": "meeting", "content": "Call with John tomorrow at 3pm", "color": "#3B82F6"}]

Input: "@todo buy groceries\n@project finish react app"
Output: [
  {"topic": "todo", "content": "Buy groceries", "color": "#10B981"},
  {"topic": "project", "content": "Finish React app", "color": "#8B5CF6"}
]

Input: "@meeting discuss budget\n- review expenses\n- plan next quarter"
Output: [{"topic": "meeting", "content": "Discuss budget\n- Review expenses\n- Plan next quarter", "color": "#3B82F6"}]

Input: "buy milk and bread"
Output: [{"topic": "general", "content": "Buy milk and bread", "color": "#10B981"}]
`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      const response = completion.choices[0].message.content;
      console.log('🤖 AI Note Response:', response);
      
      const parsed = JSON.parse(response);
      console.log('✅ AI Note processed successfully:', parsed);
      
      // Ensure we always return an array
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      console.error('AI note processing error:', error);
      throw new Error('Failed to process note with AI');
    }
  }

  // Process bookmark input
  static async processBookmarkInput(url, title, existingCategories = null) {
    if (!openai) {
      throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.');
    }
    const prompt = `
You are a bookmark organizer. Analyze the following URL and title to categorize it.

${existingCategories ? `Existing categories: ${existingCategories.join(', ')}` : ''}

URL: ${url}
Title: ${title}

Extract and return a JSON object with:
- category: string (appropriate category)
- tags: string (comma-separated relevant tags)
- description: string (brief description)

Example output:
{
  "category": "development",
  "tags": "react, tutorial, frontend",
  "description": "React hooks tutorial for beginners"
}
`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      const response = completion.choices[0].message.content;
      return JSON.parse(response);
    } catch (error) {
      console.error('AI processing error:', error);
      throw new Error('Failed to process bookmark with AI');
    }
  }

  // Summarize content from URL
  static async summarizeContent(url, content) {
    if (!openai) {
      throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.');
    }
    const prompt = `
Summarize the following content from ${url}:

${content.substring(0, 3000)}...

Provide a concise summary in 2-3 sentences and suggest appropriate categories and tags.
Return as JSON:
{
  "summary": "brief summary",
  "category": "main category",
  "tags": "tag1, tag2, tag3"
}
`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      const response = completion.choices[0].message.content;
      return JSON.parse(response);
    } catch (error) {
      console.error('AI summarization error:', error);
      throw new Error('Failed to summarize content with AI');
    }
  }

  // Process file system input
  static async processFileSystemInput(text, existingFolders = []) {
    if (!openai) {
      throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.');
    }
    
    console.log('📁 AI Processing File System Input:', text);
    console.log('📂 Existing Folders:', existingFolders);
    
    const prompt = `
You are an intelligent file system organizer that can handle both Arabic and English text. Parse the following text and extract file/folder information.

EXISTING FOLDERS: ${existingFolders.join(', ')}

User input: "${text}"

INSTRUCTIONS:
1. Analyze the text for file/folder paths (e.g., "yemen/sanaa", "projects/docs", "اليمن/صنعاء")
2. Extract any URLs, links, or content to be stored
3. Create a structured file system entry
4. Generate clean, professional content for the file
5. Handle Arabic text appropriately and extract meaningful information

PROCESSING RULES:
- Path detection: Look for folder structures like "folder/subfolder" or Arabic equivalents
- URL extraction: Find and extract any links or URLs
- Content generation: Create professional, concise content in the same language as input
- File naming: Use descriptive names based on context (English for system compatibility)
- Folder creation: Create necessary folder structure
- Arabic support: Understand Arabic folder paths and content descriptions

Return a JSON object with:
- path: string (folder path, e.g., "yemen/sanaa")
- fileName: string (file name in English for system compatibility)
- content: string (professional content with extracted info, in the same language as input)
- type: string ("file" or "folder")

EXAMPLES:

Input: "add this link [https://drive.google.com/file] in yemen/sanaa, write it is for the local projects we are working on"
Output: {
  "path": "yemen/sanaa",
  "fileName": "local-projects",
  "content": "This is the drive link for the projects we are working on:\n\nhttps://drive.google.com/file",
  "type": "file"
}

Input: "أضف هذا الرابط [https://drive.google.com/file] في مجلد اليمن/صنعاء، اكتب أنه للمشاريع المحلية التي نعمل عليها"
Output: {
  "path": "yemen/sanaa",
  "fileName": "local-projects",
  "content": "هذا هو رابط الدريف للمشاريع المحلية التي نعمل عليها:\n\nhttps://drive.google.com/file",
  "type": "file"
}

Input: "create folder projects/2024 and add this document [https://docs.google.com/document] about React development"
Output: {
  "path": "projects/2024",
  "fileName": "react-development",
  "content": "React Development Documentation:\n\nhttps://docs.google.com/document",
  "type": "file"
}

Input: "أنشئ مجلد المشاريع/2024 وأضف هذا المستند [https://docs.google.com/document] عن تطوير React"
Output: {
  "path": "projects/2024",
  "fileName": "react-development",
  "content": "مستند تطوير React:\n\nhttps://docs.google.com/document",
  "type": "file"
}

Input: "add this link [https://example.com] to the root folder"
Output: {
  "path": "",
  "fileName": "reference-link",
  "content": "Reference Link:\n\nhttps://example.com",
  "type": "file"
}
`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      const response = completion.choices[0].message.content;
      console.log('🤖 AI File System Response:', response);
      
      // Clean the response to remove control characters and fix JSON formatting
      let cleanedResponse = response.trim();
      
      // Remove any markdown code blocks if present
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/, '').replace(/```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/, '').replace(/```$/, '');
      }
      
      // Remove any leading/trailing whitespace and control characters
      cleanedResponse = cleanedResponse.trim().replace(/[\x00-\x1F\x7F-\x9F]/g, '');
      
      console.log('🧹 Cleaned response:', cleanedResponse);
      
      const parsed = JSON.parse(cleanedResponse);
      console.log('✅ AI File System processed successfully:', parsed);
      
      return parsed;
    } catch (error) {
      console.error('AI file system processing error:', error);
      
      // Try to extract JSON from the response if parsing failed
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        console.log('🔄 Attempting to fix JSON response...');
        try {
          // Look for JSON-like content in the response
          const response = completion?.choices?.[0]?.message?.content || '';
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const cleanedJson = jsonMatch[0].replace(/[\x00-\x1F\x7F-\x9F]/g, '');
            const parsed = JSON.parse(cleanedJson);
            console.log('✅ JSON fixed and parsed successfully:', parsed);
            return parsed;
          }
        } catch (fixError) {
          console.error('Failed to fix JSON response:', fixError);
        }
      }
      
      throw new Error('Failed to process file system input with AI');
    }
  }

  // Process reference input
  static async processReferenceInput(text, existingProjects = null) {
    if (!openai) {
      throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.');
    }
    const prompt = `
You are a reference organizer. Parse the following text to extract project and reference information.

${existingProjects ? `Existing projects: ${existingProjects.map(p => p.name).join(', ')}` : ''}

User input: "${text}"

Extract and return a JSON object with:
- project: string (project name, use existing if mentioned)
- name: string (reference name/title)
- url: string (if provided)
- description: string (brief description)

Example output:
{
  "project": "React App",
  "name": "React Router Tutorial",
  "url": "https://example.com",
  "description": "Tutorial for implementing routing in React"
}
`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      const response = completion.choices[0].message.content;
      return JSON.parse(response);
    } catch (error) {
      console.error('AI processing error:', error);
      throw new Error('Failed to process reference with AI');
    }
  }
}

module.exports = AIService; 