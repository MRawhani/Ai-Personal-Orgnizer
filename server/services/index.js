// Export all AI services
const MoneyAIService = require('./money-ai');
const NotesAIService = require('./notes-ai');
const BookmarksAIService = require('./bookmarks-ai');
const KnowledgeAIService = require('./knowledge-ai');
const FilesAIService = require('./files-ai');
const ReferencesAIService = require('./references-ai');

module.exports = {
  MoneyAIService,
  NotesAIService,
  BookmarksAIService,
  KnowledgeAIService,
  FilesAIService,
  ReferencesAIService
}; 