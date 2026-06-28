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

  const reels = await Reel.find({});
  console.log(`Found ${reels.length} reels in database. Checking thumbnails...`);

  let updatedCount = 0;
  for (const reel of reels) {
    if (reel.thumbnailUrl && reel.thumbnailUrl.endsWith('.mp4')) {
      const original = reel.thumbnailUrl;
      const updated = original.replace(/\.mp4$/, '.jpg');
      reel.thumbnailUrl = updated;
      await reel.save();
      console.log(`Updated Reel ID: ${reel._id}`);
      console.log(`  From: ${original}`);
      console.log(`  To:   ${updated}`);
      updatedCount++;
    }
  }

  console.log(`\nMigration completed. Updated ${updatedCount} reels.`);
  await mongoose.connection.close();
}

main().catch((err) => {
  console.error('Error during migration:', err);
  process.exit(1);
});
