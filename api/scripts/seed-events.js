'use strict';

require('dotenv').config({ override: true });
const mongoose = require('mongoose');

const Event = require('../src/database/models/event.model');

const SAMPLES = [
  {
    title: 'Gluten-Free Cooking Workshop',
    type: 'class',
    description: 'Hands-on workshop to learn gluten-free baking techniques.',
    startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // in 7 days
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 11 * 24),
    location: { name: 'Culinary Lab', address: '12 Baker St', city: 'Tunis' },
    organizer: { name: 'GF Community' },
    maxCapacity: 40,
    price: 20,
    currency: 'USD',
    images: [{ url: 'https://images.unsplash.com/photo-1556911220-bff31c812dba' }],
    isPublished: true,
  },
  {
    title: 'Celiac Community Meetup',
    type: 'meetup',
    description: 'Monthly meetup to share resources and experiences.',
    startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14), // in 14 days
    location: { name: 'Brooklyn Hub', address: '45 Community Rd', city: 'Tunis' },
    organizer: { name: 'Local Chapter' },
    maxCapacity: 120,
    price: 0,
    currency: 'USD',
    images: [{ url: 'https://images.unsplash.com/photo-1511578314322-379afb476865' }],
    isPublished: true,
  },
  {
    title: 'Online Webinar: Gluten-Free Diet 101',
    type: 'webinar',
    description: 'An introduction to managing a gluten-free diet.',
    startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // in 3 days
    location: { name: 'Online' },
    organizer: { name: 'HealthOrg' },
    maxCapacity: 0,
    price: 0,
    currency: 'USD',
    images: [{ url: 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d' }],
    isPublished: true,
  },
];

async function run() {
  const mongoUri = String(process.env.MONGO_URI || '').trim().replace(/^['"]|['"]$/g, '');
  if (!mongoUri) throw new Error('MONGO_URI is missing.');

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000 });

  console.log('[seed-events] clearing existing events…');
  await Event.deleteMany({});

  const inserted = await Event.insertMany(SAMPLES);
  console.log(`[seed-events] inserted ${inserted.length} events`);

  await mongoose.connection.close();
}

run().catch((err) => {
  console.error('[seed-events] failed:', err.message || err);
  process.exitCode = 1;
}).finally(async () => {
  try { await mongoose.connection.close(); } catch (_) { }
});
