const { openai, isAIAvailable } = require('./ai-config');

class NotesAIService {
  // Process note input
  static async processNoteInput(text, existingTopics = []) {
    isAIAvailable();
    
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
}

module.exports = NotesAIService; 