'use strict';

const PatientResource = require('../../../database/models/patient-resource.model');
const { ResourceVideo } = require('../../../database/models/patient-resource.model');

const patientResourcesRepository = {
  // ── Articles ────────────────────────────────────────────────────────────────
  findFeatured() {
    return PatientResource.findOne({ isFeatured: true, isPublished: true })
      .select('-body')
      .sort({ publishedAt: -1 })
      .lean();
  },

  findMany({ category, limit = 50, skip = 0 } = {}) {
    const query = { isPublished: true };
    if (category) query.category = category;
    return PatientResource.find(query)
      .select('-body')
      .sort({ publishedAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
  },

  async findById(id) {
    const item = await PatientResource.findById(id);
    if (item) {
      await PatientResource.findByIdAndUpdate(id, { $inc: { viewsCount: 1 } });
    }
    return item ? item.toObject() : null;
  },

  incrementClick(id) {
    return PatientResource.findByIdAndUpdate(id, { $inc: { clicksCount: 1 } }, { new: true }).lean();
  },

  create(payload) {
    return PatientResource.create(payload);
  },

  update(id, payload) {
    return PatientResource.findByIdAndUpdate(id, payload, { new: true }).lean();
  },

  delete(id) {
    return PatientResource.findByIdAndDelete(id);
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
