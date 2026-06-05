'use strict';

require('../src/app/bootstrap/env.bootstrap');
const mongoose = require('mongoose');
const connectDB = require('../src/app/bootstrap/db.bootstrap');
const User = require('../src/database/models/user.model');
const { signAccessToken } = require('../src/app/common/utils/token');

async function run() {
  await connectDB();
  try {
    const user = await User.findOne({ emailVerified: true, status: 'active' });
    if (!user) {
      console.log('No verified active user found!');
      process.exit(1);
    }
    const token = signAccessToken({ id: user._id.toString(), profileType: user.profileType });
    console.log('--- TEST USER INFO ---');
    console.log('ID:', user._id.toString());
    console.log('Name:', user.fullName);
    console.log('Email:', user.email);
    console.log('JWT:', token);
    console.log('----------------------');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.connection.close();
  }
}

run();
