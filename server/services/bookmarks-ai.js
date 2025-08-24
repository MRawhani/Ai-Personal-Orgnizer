const { openai, isAIAvailable } = require('./ai-config');

class BookmarksAIService {
  // Process bookmark input
  static async processBookmarkInput(url, title, existingCategories = null) {
    isAIAvailable();
    
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
}

module.exports = BookmarksAIService; 