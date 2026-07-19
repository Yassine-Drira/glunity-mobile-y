'use strict';
/**
 * Prep script to set user 'islemhammami435@gmail.com' to 140 XP and reset check-in
 * so they can check in from the app and cross the 150 XP threshold to unlock the Bronze badge.
 * Run with: node api/scripts/prep-test-checkin.js
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

  const email = 'islemhammami435@gmail.com';
  const user = await User.findOne({ email });
  
  if (!user) {
    console.error(`User with email "${email}" not found.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Current user state:
  - Name: ${user.fullName}
  - Points: ${user.points}
  - Badges count: ${user.badges.length}
  - Last check-in: ${user.lastCheckInAt}
  `);

  console.log('Resetting points to 140, clearing badges, and resetting check-in date...');
  user.points = 140;
  user.badges = [];
  user.lastCheckInAt = new Date(Date.now() - 48 * 60 * 60 * 1000); // 2 days ago
  
  await user.save();
  
  console.log('Success! Database updated successfully.');
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
