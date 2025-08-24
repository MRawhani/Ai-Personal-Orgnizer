// Legacy AI service file - now uses modular structure
// This file maintains backward compatibility while using the new organized services

const {
  MoneyAIService,
  NotesAIService,
  BookmarksAIService,
  KnowledgeAIService,
  FilesAIService,
  ReferencesAIService
} = require('./index');

// Legacy AIService class for backward compatibility
class AIService {
  // Process money input
  static async processMoneyInput(text, existingCategories = [], existingAccounts = []) {
    return MoneyAIService.processMoneyInput(text, existingCategories, existingAccounts);
  }

  // Process note input
  static async processNoteInput(text, existingTopics = []) {
    return NotesAIService.processNoteInput(text, existingTopics);
  }

  // Process bookmark input
  static async processBookmarkInput(url, title, existingCategories = null) {
    return BookmarksAIService.processBookmarkInput(url, title, existingCategories);
  }

  // Summarize content from URL
  static async summarizeContent(url, content) {
    return KnowledgeAIService.summarizeContent(url, content);
  }

  // Process file system input
  static async processFileSystemInput(text, existingFolders = []) {
    return FilesAIService.processFileSystemInput(text, existingFolders);
  }

  // Process reference input
  static async processReferenceInput(text, existingProjects = null) {
    return ReferencesAIService.processReferenceInput(text, existingProjects);
  }
}

module.exports = AIService; 