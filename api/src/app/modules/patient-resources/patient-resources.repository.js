'use strict';

const PatientResource = require('../../../database/models/patient-resource.model');
const { ResourceVideo } = require('../../../database/models/patient-resource.model');

const patientResourcesRepository = {
  // ── Articles ────────────────────────────────────────────────────────────────
  findFeatured() {
    return PatientResource.findOne({ isFeatured: true, isPublished: true })
      .sort({ publishedAt: -1 })
      .lean();
  },

  findMany({ category, limit = 50, skip = 0 } = {}) {
    const query = { isPublished: true };
    if (category) query.category = category;
    return PatientResource.find(query)
      .sort({ publishedAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
  },

  findById(id) {
    return PatientResource.findById(id).lean();
  },

  create(payload) {
    return PatientResource.create(payload);
  },

  // ── Videos ──────────────────────────────────────────────────────────────────
  findVideos({ limit = 10, skip = 0 } = {}) {
    return ResourceVideo.find({ isPublished: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
  },

  createVideo(payload) {
    return ResourceVideo.create(payload);
  },

  countResources() {
    return PatientResource.countDocuments({ isPublished: true });
  },

  countVideos() {
    return ResourceVideo.countDocuments({ isPublished: true });
  },

  clearAll() {
    return PatientResource.deleteMany({});
  },

  async hasDetailedContent() {
    const item = await PatientResource.findOne({ body: /Maladie cœliaque/ }).lean();
    return !!item;
  },
};

module.exports = patientResourcesRepository;
