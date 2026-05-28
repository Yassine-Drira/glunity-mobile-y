#!/usr/bin/env node
'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 1) {
    console.error('Usage: node mark-user-verified.js <email> [--undo]');
    process.exit(2);
  }

  const email = argv[0];
  const undo = argv.includes('--undo');

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set in api/.env');
    process.exit(2);
  }

  await mongoose.connect(uri);
  console.log('[db] connected');

  const users = mongoose.connection.collection('users');

  if (undo) {
    const res = await users.updateOne({ email }, { $set: { emailVerified: false } });
    console.log('[db] update result:', res.result || res);
    console.log(`User ${email} marked as UNVERIFIED`);
  } else {
    const res = await users.updateOne(
      { email },
      {
        $set: { emailVerified: true },
        $unset: { emailVerificationToken: '', emailVerificationExpires: '' },
      },
    );
    console.log('[db] update result:', res.result || res);
    console.log(`User ${email} marked as VERIFIED`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
