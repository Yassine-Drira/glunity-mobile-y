'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Reel = require('../src/database/models/reel.model');
const { computeTrendingScore } = require('../src/app/modules/reels/reels.scoring');

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not set in .env');

  console.log('[Backfill] Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('[Backfill] Connected.');

  const reels = await Reel.find({}).lean();
  console.log('[Backfill] Found', reels.length, 'reels. Computing scores...');

  let n = 0;
  for (const reel of reels) {
    const score = computeTrendingScore(reel);
    await Reel.findByIdAndUpdate(reel._id, { $set: { trendingScore: score } });
    console.log('[' + (++n) + '/' + reels.length + '] ' + reel._id + '  score=' + score.toFixed(4));
  }

  console.log('[Backfill] Done. Updated', n, 'reels.');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('[Backfill] Error:', err);
  process.exit(1);
});
