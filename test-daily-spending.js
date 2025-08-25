// Test script for Daily Spending Organizer
const DailySpendingService = require('./server/services/daily-spending-service');

async function testDailySpending() {
  try {
    console.log('🧪 Testing Daily Spending Organizer...\n');

    // Test 1: Text input processing
    console.log('📝 Test 1: Processing text input...');
    const textResult = await DailySpendingService.processTextInput(
      '200 tl - coffee, 300tl - dinner, 50 usd - lunch'
    );
    console.log('✅ Text processing result:', textResult);
    console.log('');

    // Test 2: Get spending summary
    console.log('📊 Test 2: Getting spending summary...');
    const summary = await DailySpendingService.getSpendingSummary();
    console.log('✅ Spending summary:', summary);
    console.log('');

    // Test 3: Get categories
    console.log('🏷️ Test 3: Getting categories...');
    const categories = await DailySpendingService.getCategories();
    console.log('✅ Categories:', categories);
    console.log('');

    // Test 4: Get recent transactions
    console.log('📋 Test 4: Getting recent transactions...');
    const transactions = await DailySpendingService.getTransactions({ limit: 5 });
    console.log('✅ Recent transactions:', transactions.length, 'found');
    console.log('');

    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDailySpending(); 