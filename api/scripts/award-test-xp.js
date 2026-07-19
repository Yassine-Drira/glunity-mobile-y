'use strict';
/**
 * Test script to award 150 XP to the user account 'islemhammami435@gmail.com'.
 * This will trigger the first badge ('Bronze Initiator') and fire the real-time Socket.io event.
 * Run with: node api/scripts/award-test-xp.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function run() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('No MongoDB URI found in environment.');
    process.exit(1);
  }
  
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  const User = require('../src/database/models/user.model');
  const badgesService = require('../src/app/modules/badges/badges.service');

  const email = 'islemhammami435@gmail.com';
  const user = await User.findOne({ email });
  
  if (!user) {
    console.error(`User with email "${email}" not found.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Found user: ${user.fullName} (${user._id}), current points: ${user.points || 0}`);
  
  // Award 150 XP to trigger the first badge (Bronze Initiator, threshold 150)
  console.log('Awarding 150 XP and checking badges...');
  const updatedUser = await badgesService.awardPointsAndCheckBadges(user._id, 150);
  
  console.log(`Success! Updated points: ${updatedUser.points}, badges count: ${updatedUser.badges.length}`);
  
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
