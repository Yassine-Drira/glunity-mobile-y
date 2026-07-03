const fs = require('fs');
const path = require('path');

const lines = [
  "'use strict';",
  "",
  "require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });",
  "const mongoose = require('mongoose');",
  "const Reel = require('../src/database/models/reel.model');",
  "const { computeTrendingScore } = require('../src/app/modules/reels/reels.scoring');",
  "",
  "async function main() {",
  "  const uri = process.env.MONGO_URI;",
  "  if (!uri) throw new Error('MONGO_URI not set in .env');",
  "  console.log('[Backfill] Connecting...');",
  "  await mongoose.connect(uri);",
  "  const reels = await Reel.find({}).lean();",
  "  console.log('[Backfill] Found', reels.length, 'reels');",
  "  let n = 0;",
  "  for (const reel of reels) {",
  "    const score = computeTrendingScore(reel);",
  "    await Reel.findByIdAndUpdate(reel._id, { " + "$" + "set: { trendingScore: score } });",
  "    console.log('[' + (++n) + '/' + reels.length + '] ' + reel._id + ' score=' + score.toFixed(4));",
  "  }",
  "  console.log('[Backfill] Done. Updated', n, 'reels.');",
  "  await mongoose.disconnect();",
  "}",
  "",
  "main().catch(e => { console.error(e); process.exit(1); });",
];

const dir = path.join(__dirname, '..', '..', '..', '..', 'bureau', 'Optima', 'Project Optima 2', 'glunity-mobile', 'api', 'scripts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
const outPath = path.join(dir, 'backfill-trending-scores.js');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('Written to:', outPath);
