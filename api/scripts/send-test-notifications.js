'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const User = require('../src/database/models/user.model');
const Notification = require('../src/database/models/notification.model');
const Event = require('../src/database/models/event.model');
const Product = require('../src/database/models/product.model');

async function run() {
  const email = 'pqlee63027@minitts.net';
  
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not defined in environment variables.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.error(`User with email "${email}" not found.`);
      process.exit(1);
    }

    console.log(`Found user: ${user.fullName} (${user._id})`);

    // Fetch actual Event and Product IDs to prevent 404/not found errors when tapping notifications
    const activeEvent = await Event.findOne();
    const activeProduct = await Product.findOne();
    const eventId = activeEvent ? String(activeEvent._id) : 'mock-event-id-123';
    const productId = activeProduct ? String(activeProduct._id) : 'mock-product-id-456';

    console.log(`Creating test notifications with EventID: ${eventId}, ProductID: ${productId}`);

    const notificationsToCreate = [
      {
        userId: user._id,
        title: 'New Badge Unlocked: Gold Champion! 🏆',
        body: 'Congratulations! You reached 100 points and unlocked the Gold Champion badge.',
        type: 'achievement',
        isRead: false,
      },
      {
        userId: user._id,
        title: 'Daily Check-In Completed! 🔥',
        body: 'You checked in today and earned +15 XP! Current streak: 5 days.',
        type: 'achievement',
        isRead: false,
      },
      {
        userId: user._id,
        title: 'Gluten-Free Expo Tomorrow! 🌾',
        body: 'Join the gluten-free tasting event happening in Paris tomorrow at 10 AM.',
        type: 'event',
        isRead: false,
        metadata: { eventId }
      },
      {
        userId: user._id,
        title: 'Special Discount: GF Pizza Base 🍕',
        body: 'Local Baker Pro has launched a new gluten-free pizza base. Grab it now!',
        type: 'product',
        isRead: false,
        metadata: { productId }
      },
      {
        userId: user._id,
        title: 'Welcome to Glunity Community! 🌿',
        body: 'Connect with other celiac disease warriors and share recipes.',
        type: 'community',
        isRead: false,
      }
    ];

    for (const notif of notificationsToCreate) {
      const created = await Notification.create(notif);
      console.log(`Created notification: "${created.title}" [Type: ${created.type}]`);
    }

    console.log('Test notifications pushed successfully.');
  } catch (err) {
    console.error('Error occurred:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

run();
