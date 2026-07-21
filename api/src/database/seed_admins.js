'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user.model');

const adminsToCreate = [
  {
    fullName: 'Super Admin Alpha',
    email: 'admin1@glu10.com',
    passwordRaw: 'AdminPassword123!',
    profileType: 'admin',
    emailVerified: true,
    isActive: true,
  },
  {
    fullName: 'Super Admin Beta',
    email: 'admin2@glu10.com',
    passwordRaw: 'AdminPassword123!',
    profileType: 'admin',
    emailVerified: true,
    isActive: true,
  },
  {
    fullName: 'Super Admin Gamma',
    email: 'admin3@glu10.com',
    passwordRaw: 'AdminPassword123!',
    profileType: 'admin',
    emailVerified: true,
    isActive: true,
  },
];

async function seedAdmins() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/glu10';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);

    console.log('Connected to MongoDB successfully.');

    for (const adminData of adminsToCreate) {
      const existingUser = await User.findOne({ email: adminData.email });
      const passwordHash = await bcrypt.hash(adminData.passwordRaw, 10);

      if (existingUser) {
        existingUser.fullName = adminData.fullName;
        existingUser.passwordHash = passwordHash;
        existingUser.profileType = adminData.profileType;
        existingUser.emailVerified = true;
        existingUser.isActive = true;
        await existingUser.save();
        console.log(`[UPDATED & VERIFIED] Admin account: ${adminData.email}`);
      } else {
        await User.create({
          fullName: adminData.fullName,
          email: adminData.email,
          passwordHash: passwordHash,
          profileType: adminData.profileType,
          emailVerified: true,
          isActive: true,
        });
        console.log(`[CREATED & VERIFIED] Admin account: ${adminData.email}`);
      }
    }

    console.log('All admin accounts are now fully verified.');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin accounts:', err);
    process.exit(1);
  }
}

seedAdmins();
