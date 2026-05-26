'use strict';

/**
 * Seed a handful of demo gluten-free locations around Tunis so the
 * collaborative map has visible pins on first launch.
 *
 *   node scripts/seed-locations.js
 */

require('../src/app/bootstrap/env.bootstrap');
const mongoose = require('mongoose');
const env      = require('../src/app/config/env');
const Location = require('../src/database/models/location.model');

const SAMPLES = [
  {
    name: 'Ben Yaghlane Shops',
    description:
      'Premium Tunisian grocery known for high-end gluten-free pasta, breads and gourmet products.',
    category: 'grocery',
    glutenFree: true,
    certified: true,
    address: 'Avenue Habib Bourguiba',
    city: 'Tunis',
    phone: '+216 71 000 001',
    priceRange: '$$$',
    lng: 10.181667,
    lat: 36.806389,
    rating: { average: 4.8, count: 8200 },
  },
  {
    name: 'La Maison Sans Gluten',
    description: 'Dedicated 100% gluten-free bakery with fresh breads and pastries daily.',
    category: 'bakery',
    glutenFree: true,
    certified: true,
    address: '14 Rue de Marseille',
    city: 'Tunis',
    phone: '+216 71 000 002',
    priceRange: '$$',
    lng: 10.175,
    lat: 36.798,
    rating: { average: 4.9, count: 412 },
  },
  {
    name: 'Green Leaf Café',
    description: 'Cozy café offering certified gluten-free brunch, salads and smoothies.',
    category: 'cafe',
    glutenFree: true,
    certified: true,
    address: 'Avenue Mohamed V',
    city: 'Tunis',
    phone: '+216 71 000 003',
    priceRange: '$$',
    lng: 10.187,
    lat: 36.811,
    rating: { average: 4.6, count: 215 },
  },
  {
    name: 'Pasta Verde',
    description: 'Italian restaurant with a separate gluten-free kitchen line.',
    category: 'restaurant',
    glutenFree: true,
    certified: false,
    address: '5 Rue de Carthage',
    city: 'Tunis',
    phone: '+216 71 000 004',
    priceRange: '$$$',
    lng: 10.169,
    lat: 36.802,
    rating: { average: 4.4, count: 188 },
  },
  {
    name: 'Carrefour Marsa',
    description:
      'Supermarket with a wide selection of gluten-free products. Some shared shelves — check labels.',
    category: 'grocery',
    glutenFree: true,
    certified: false,
    contaminationWarning: true,
    address: 'La Marsa',
    city: 'La Marsa',
    phone: '+216 71 000 005',
    priceRange: '$$',
    lng: 10.323,
    lat: 36.878,
    rating: { average: 4.0, count: 1320 },
  },
  {
    name: 'Pharmacie Centrale',
    description: 'Stocks specialized gluten-free dietary supplements and medical-grade products.',
    category: 'pharmacy',
    glutenFree: true,
    certified: true,
    address: 'Rue Charles de Gaulle',
    city: 'Tunis',
    phone: '+216 71 000 006',
    priceRange: '$$',
    lng: 10.179,
    lat: 36.804,
    rating: { average: 4.5, count: 92 },
  },
];

async function run() {
  console.log('[seed] connecting to', env.mongo.uri.replace(/:[^@]+@/, ':***@'));
  await mongoose.connect(env.mongo.uri);

  console.log('[seed] clearing existing locations…');
  await Location.deleteMany({});

  const docs = SAMPLES.map(({ lng, lat, ...rest }) => ({
    ...rest,
    location: { type: 'Point', coordinates: [lng, lat] },
  }));

  const inserted = await Location.insertMany(docs);
  console.log(`[seed] inserted ${inserted.length} locations`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('[seed] failed:', err);
  try { await mongoose.disconnect(); } catch (_) { /* noop */ }
  process.exit(1);
});
