'use strict';

const repo     = require('./locations.repository');
const AppError = require('../../common/errors/app-error');

const locationsService = {
  async list(query) {
    const items = await repo.findMany(query);
    // total is approximate when geo $near is used (Mongo $near streams sorted
    // results); fall back to result length for the indicator badge.
    const total = items.length;
    return { items, total };
  },

  async getById(id) {
    const doc = await repo.findById(id);
    if (!doc) throw AppError.notFound('Location');
    return doc;
  },

  async create(payload, userId) {
    const { lng, lat, ...rest } = payload;
    const doc = await repo.create({
      ...rest,
      createdBy: userId || undefined,
      location: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
    });
    return doc.toObject();
  },
};

module.exports = locationsService;
