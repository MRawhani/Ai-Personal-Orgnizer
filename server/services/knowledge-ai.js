const { openai, isAIAvailable } = require('./ai-config');

class KnowledgeAIService {
  // Summarize content from URL
  static async summarizeContent(url, content) {
    isAIAvailable();
    
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
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      const response = completion.choices[0].message.content;
      return JSON.parse(response);
    } catch (error) {
      console.error('AI summarization error:', error);
      throw new Error('Failed to summarize content with AI');
    }
  }
}

module.exports = KnowledgeAIService; 