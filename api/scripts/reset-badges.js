'use strict';
/**
 * One-time migration script — run with:
 *   node api/scripts/reset-badges.js
 *
 * What it does:
 *  1. Deletes all Badge documents from MongoDB (old wrong seeds: 10/50/100/200 XP)
 *  2. Re-inserts the correct badges aligned with the frontend thresholds
 *  3. Removes all badge references from every user's badges[] array
 *     so no one is wrongly shown as having unlocked a badge
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const BADGE_SEED = [
  { name: 'Bronze Initiator',        icon: 'bronze',    pointsRequired: 150,  description: 'Awarded for starting your gluten-free journey.' },
  { name: 'Active Contributor',      icon: 'silver',    pointsRequired: 500,  description: 'Recognizes high awareness of cross-contamination.' },
  { name: 'Gluten-Free Champion',    icon: 'gold',      pointsRequired: 2500, description: 'Mastering the gluten-free lifestyle.' },
  { name: 'Silver Advocate',         icon: 'pro_silver',pointsRequired: 300,  description: 'Pro members showing high advocacy.' },
  { name: 'Gold Guardian',           icon: 'pro_gold',  pointsRequired: 2500, description: 'The highest pro honour.' },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const Badge = require('../src/database/models/badge.model');
  const User  = require('../src/database/models/user.model');

  // 1. Wipe all badges
  const del = await Badge.deleteMany({});
  console.log(`Deleted ${del.deletedCount} old badge document(s).`);

  // 2. Re-seed correct badges
  const inserted = await Badge.insertMany(BADGE_SEED);
  console.log(`Inserted ${inserted.length} badge(s):`, inserted.map(b => `${b.name} (${b.pointsRequired} XP)`));

  // 3. Clear badges array for all users (so no one has wrongly-awarded badges)
  const upd = await User.updateMany({}, { $set: { badges: [] } });
  console.log(`Cleared badges from ${upd.modifiedCount} user(s).`);

  // 4. Re-award badges for users who actually qualify
  const allBadges = await Badge.find();
  const users = await User.find({ points: { $gt: 0 } });
  let reawarded = 0;
  for (const user of users) {
    const eligible = allBadges.filter(b => user.points >= b.pointsRequired);
    if (eligible.length > 0) {
      user.badges = eligible.map(b => b._id);
      await user.save();
      reawarded++;
      console.log(`  Re-awarded ${eligible.length} badge(s) to ${user.fullName} (${user.points} XP)`);
    }
  }
  console.log(`\nDone. Re-awarded badges to ${reawarded} user(s).`);

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
