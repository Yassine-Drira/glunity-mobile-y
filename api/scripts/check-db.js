'use strict';

require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function main() {
  const mongoUri = String(process.env.MONGO_URI || '')
    .trim()
    .replace(/^['\"]|['\"]$/g, '');
  if (!mongoUri) {
    throw new Error('MONGO_URI is missing in .env file.');
  }

  // Load all models in the models directory to register them with mongoose
  const modelsDir = path.join(__dirname, '../src/database/models');
  const files = fs.readdirSync(modelsDir);
  
  const expectedCollections = [];
  
  for (const file of files) {
    if (file.endsWith('.model.js')) {
      const model = require(path.join(modelsDir, file));
      if (model && model.collection) {
        expectedCollections.push({
          modelName: model.modelName,
          collectionName: model.collection.name,
          fileName: file
        });
      }
    }
  }

  console.log('Connecting to database...');
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  console.log('Connected to:', mongoose.connection.host);

  // Get collections actually in the db
  const collectionsInDb = await mongoose.connection.db.listCollections().toArray();
  const actualCollectionNames = collectionsInDb.map(c => c.name);

  console.log('\n--- COLLECTION COMPARISON ---');
  console.log('Existing collections in MongoDB:', actualCollectionNames);
  console.log('\nExpected collections from models:');
  
  const missing = [];
  for (const col of expectedCollections) {
    const exists = actualCollectionNames.includes(col.collectionName);
    console.log(`- Model: ${col.modelName} (File: ${col.fileName}) -> Collection: "${col.collectionName}" [${exists ? 'EXISTS' : 'MISSING'}]`);
    if (!exists) {
      missing.push(col);
    }
  }

  console.log('\n--- SUMMARY ---');
  if (missing.length === 0) {
    console.log('No missing collections/tables. All model collections exist in the database.');
  } else {
    console.log(`Found ${missing.length} missing collection(s)/table(s):`);
    for (const item of missing) {
      console.log(`- ${item.collectionName} (associated with model "${item.modelName}")`);
    }
  }
}

main()
  .catch((err) => {
    console.error('Error:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
