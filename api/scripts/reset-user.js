#!/usr/bin/env node
'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { hashPassword } = require('../src/app/common/utils/password');

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 1) {
    console.error('Usage: node reset-user.js <email> [newPassword]');
    process.exit(2);
  }

  const email = argv[0].toLowerCase().trim();
  const newPassword = argv[1] || 'password123';

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set in api/.env');
    process.exit(2);
  }

  try {
    await mongoose.connect(uri);
    console.log('[db] connected');

    const users = mongoose.connection.collection('users');
    const user = await users.findOne({ email });

    if (!user) {
      console.error(`User with email ${email} not found!`);
      process.exit(1);
    }

    const passwordHash = await hashPassword(newPassword);

    const res = await users.updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerified: true,
          passwordHash,
          isActive: true,
        },
        $unset: {
          emailVerificationToken: '',
          emailVerificationExpires: '',
          twoFactorCode: '',
          twoFactorCodeExpires: '',
        },
      }
    );

    console.log('[db] update result:', res);
    console.log(`User ${email} has been reset:`);
    console.log('- Status: verified and active');
    console.log(`- Password set to: "${newPassword}"`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();