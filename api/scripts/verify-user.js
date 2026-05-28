'use strict';

require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const User = require('../src/database/models/user.model');

(async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is missing.');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Set all existing users to verified and pro_commerce for developer testing
    const res = await User.updateMany(
      {},
      { $set: { emailVerified: true, profileType: 'pro_commerce' } }
    );
    console.log(`Successfully updated ${res.modifiedCount} user accounts.`);
  } catch (err) {
    console.error('Database update failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
