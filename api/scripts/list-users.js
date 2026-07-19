'use strict';

require('../src/app/bootstrap/env.bootstrap');
const mongoose = require('mongoose');
const connectDB = require('../src/app/bootstrap/db.bootstrap');
const User = require('../src/database/models/user.model');

async function run() {
  await connectDB();
  try {
    const users = await User.find({}).lean();
    console.log('--- ALL USERS IN DB ---');
    users.forEach((u, i) => {
      console.log(`${i+1}. [${u.email}] - Name: ${u.fullName} - Active: ${u.isActive} - Verified: ${u.emailVerified}`);
    });
    console.log('----------------------');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.connection.close();
  }
}

run();
