'use strict';

require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const path = require('path');

async function main() {
  const mongoUri = String(process.env.MONGO_URI || '')
    .trim()
    .replace(/^['\"]|['\"]$/g, '');
  if (!mongoUri) throw new Error('MONGO_URI missing in .env');

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected');

  // Load model
  const Reel = require(path.join(__dirname, '../src/database/models/reel.model'));

  const reels = await Reel.find({}).lean();
  console.log(`\n--- ALL REELS IN DB (${reels.length}) ---`);
  console.log(JSON.stringify(reels, null, 2));

  await mongoose.connection.close();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
