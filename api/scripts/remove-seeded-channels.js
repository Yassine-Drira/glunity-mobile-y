#!/usr/bin/env node
'use strict';

// Small one-off script to remove previously-created demo channels from the database.
// Usage: from the `api` folder run `node scripts/remove-seeded-channels.js`

require('../src/app/bootstrap/env.bootstrap');
const mongoose = require('mongoose');
const env = require('../src/app/config/env');
const Channel = require('../src/database/models/channel.model');

async function run() {
  try {
    await mongoose.connect(env.mongo.uri);
    console.log('Connected to MongoDB:', env.mongo.uri);

    const seededNames = [
      'General Chat 💬',
      'Recipe Sharing 🥞',
      'Tunisian GF Food 🌾',
    ];

    const res = await Channel.deleteMany({ name: { $in: seededNames } });
    console.log('deleteMany result:', res);

    // For safety, list remaining channels matching 'General' or 'Recipe' to confirm
    const remaining = await Channel.find({ name: { $in: seededNames } }).lean();
    console.log('Remaining matching channels (should be 0):', remaining.length);

    await mongoose.disconnect();
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Error removing seeded channels:', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
}

run();
