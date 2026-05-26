'use strict';

const Location = require('../../../database/models/location.model');

const locationsRepository = {
  /**
   * Find locations near a [lng, lat] point within radius (meters).
   * If lng/lat omitted, returns a normal find().
   */
  findMany({ lng, lat, radius, category, glutenFree, certified, search, limit = 100, skip = 0 }) {
    const query = {};

    if (typeof lng === 'number' && typeof lat === 'number') {
      query.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radius || 5000,
        },
      };
    }

    if (category) query.category = category;
    if (typeof glutenFree === 'boolean') query.glutenFree = glutenFree;
    if (typeof certified === 'boolean') query.certified = certified;
    if (search && search.trim()) query.$text = { $search: search.trim() };

    return Location.find(query).limit(limit).skip(skip).lean();
  },

  findById(id) {
    return Location.findById(id).lean();
  },

  create(payload) {
    return Location.create(payload);
  },

  count(filter = {}) {
    return Location.countDocuments(filter);
  },
};

module.exports = locationsRepository;
