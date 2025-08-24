const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Your MongoDB connection string
const connectionString = "mongodb+srv://moather-test-admin:F5u9v3j2780xZ6Se@moather-db-mongodb-sgp1-44816-cd77f88f.mongo.ondigitalocean.com/moather-test?tls=true&authSource=admin&replicaSet=moather-db-mongodb-sgp1-44816";

// Database name
const dbName = 'moather-test';

// Export directory
const exportDir = './database_export';

async function exportDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB with Mongoose...');
    
    // Connect to MongoDB
    await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected successfully with Mongoose!');

    // Get the database instance
    const db = mongoose.connection.db;
    console.log(`📊 Exporting database: ${dbName}`);

    // Create export directory
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`📁 Found ${collections.length} collections`);

    // Export each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`📤 Exporting collection: ${collectionName}`);
      
      const data = await db.collection(collectionName).find({}).toArray();
      
      // Save as JSON
      const jsonPath = path.join(exportDir, `${collectionName}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
      
      console.log(`✅ Exported ${data.length} documents to ${jsonPath}`);
    }

    // Create a summary file
    const summary = {
      database: dbName,
      exportedAt: new Date().toISOString(),
      collections: collections.map(c => c.name),
      totalCollections: collections.length,
      note: "Exported using Mongoose - each collection is saved as a separate JSON file"
    };
    
    const summaryPath = path.join(exportDir, 'export-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log('\n🎉 Database export completed successfully!');
    console.log(`📁 Export location: ${path.resolve(exportDir)}`);
    console.log(`📋 Summary: ${summaryPath}`);
    
  } catch (error) {
    console.error('❌ Error exporting database:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the export
exportDatabase(); 