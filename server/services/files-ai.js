const { openai, isAIAvailable } = require('./ai-config');

class FilesAIService {
  // Process file system input
  static async processFileSystemInput(text, existingFolders = []) {
    isAIAvailable();
    
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
}

module.exports = FilesAIService; 