const { openai, isAIAvailable } = require('./ai-config');

class ReferencesAIService {
  // Process reference input
  static async processReferenceInput(text, existingProjects = null) {
    isAIAvailable();
    
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

module.exports = ReferencesAIService; 