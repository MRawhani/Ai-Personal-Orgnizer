# AI Services - Modular Structure

This directory contains the AI services organized into separate, focused modules for better maintainability and organization.

## Structure

```
services/
├── ai-config.js          # Shared OpenAI configuration and utilities
├── money-ai.js           # Money/finance AI processing
├── notes-ai.js           # Notes AI processing
├── bookmarks-ai.js       # Bookmarks AI processing
├── knowledge-ai.js       # Knowledge/summarization AI processing
├── files-ai.js           # File system AI processing
├── references-ai.js      # References AI processing
├── index.js              # Main export file for all services
├── ai.js                 # Legacy compatibility layer
└── README.md             # This file
```

## Usage

### Import Individual Services

```javascript
const { MoneyAIService } = require('./services/money-ai');
const { NotesAIService } = require('./services/notes-ai');

// Use specific services
const transactions = await MoneyAIService.processMoneyInput(text, categories, accounts);
const notes = await NotesAIService.processNoteInput(text, topics);
```

### Import All Services

```javascript
const {
  MoneyAIService,
  NotesAIService,
  BookmarksAIService,
  KnowledgeAIService,
  FilesAIService,
  ReferencesAIService
} = require('./services');
```

### Legacy Compatibility

```javascript
const AIService = require('./services/ai');

// Still works exactly the same
const transactions = await AIService.processMoneyInput(text, categories, accounts);
```

## Benefits of New Structure

1. **Separation of Concerns**: Each service handles one specific domain
2. **Easier Maintenance**: Smaller, focused files are easier to understand and modify
3. **Better Testing**: Individual services can be tested in isolation
4. **Code Reusability**: Services can be imported individually as needed
5. **Backward Compatibility**: Existing code continues to work unchanged
6. **Cleaner Imports**: Only import what you need

## Configuration

All services share the same OpenAI configuration through `ai-config.js`:

- API key validation
- OpenAI client initialization
- Common error handling utilities

## Error Handling

Each service includes proper error handling and logging:
- API key validation
- OpenAI API error handling
- JSON parsing error handling
- Meaningful error messages

## Adding New Services

To add a new AI service:

1. Create a new file (e.g., `new-feature-ai.js`)
2. Import from `ai-config.js`
3. Implement the service class with static methods
4. Add to `index.js` exports
5. Add to legacy `ai.js` for backward compatibility

Example:
```javascript
const { openai, isAIAvailable } = require('./ai-config');

class NewFeatureAIService {
  static async processInput(text) {
    isAIAvailable();
    // Implementation here
  }
}

module.exports = NewFeatureAIService;
``` 