'use strict';

require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const User = require('../src/database/models/user.model');

async function main() {
  const mongoUri = String(process.env.MONGO_URI || '')
    .trim()
    .replace(/^['\"]|['\"]$/g, '');
  
  await mongoose.connect(mongoUri);
  console.log('Connected to DB.');
  
  const users = await User.find({}, '_id fullName email profileType points streakDays');
  console.log('--- USERS IN DB ---');
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch((err) => console.error(err))
  .finally(() => mongoose.connection.close());
