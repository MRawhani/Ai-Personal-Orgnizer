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

// Helper function to check if AI is available
function isAIAvailable() {
  if (!openai) {
    throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.');
  }
  return true;
}

module.exports = {
  openai,
  isAIAvailable
}; 