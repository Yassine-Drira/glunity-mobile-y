'use strict';

const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

// ── Resource Category ──────────────────────────────────────────────────────────
const RESOURCE_CATEGORIES = ['celiac-disease', 'diet-basics', 'safe-foods', 'lifestyle-tips'];

// ── Patient Resource (Article) ─────────────────────────────────────────────────
const patientResourceSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title must be at most 200 characters'],
    },
    excerpt: {
      type: String,
      required: [true, 'Excerpt is required'],
      trim: true,
      maxlength: [500, 'Excerpt must be at most 500 characters'],
    },
    body: {
      type: String,
      required: [true, 'Body content is required'],
    },
    category: {
      type: String,
      required: true,
      enum: { values: RESOURCE_CATEGORIES, message: 'Invalid category' },
      index: true,
    },
    icon: {
      type: String,
      default: 'information-outline', // MaterialCommunityIcons / Ionicons icon name
    },
    coverImageUrl: {
      type: String,
      default: null,
    },
    readMinutes: {
      type: Number,
      required: true,
      min: [1, 'readMinutes must be at least 1'],
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    authorName: {
      type: String,
      trim: true,
      default: 'GlUnity Medical Team',
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Video Session ──────────────────────────────────────────────────────────────
const resourceVideoSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    presenter: { type: String, trim: true, default: '' },
    thumbnailUrl: { type: String, required: true },
    videoUrl: { type: String, required: true },
    durationMinutes: { type: Number, required: true, min: 1 },
    category: {
      type: String,
      enum: { values: RESOURCE_CATEGORIES, message: 'Invalid category' },
      index: true,
    },
    isPublished: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const PatientResource = model('PatientResource', patientResourceSchema);
const ResourceVideo = model('ResourceVideo', resourceVideoSchema);

module.exports = PatientResource;
module.exports.ResourceVideo = ResourceVideo;
module.exports.RESOURCE_CATEGORIES = RESOURCE_CATEGORIES;
