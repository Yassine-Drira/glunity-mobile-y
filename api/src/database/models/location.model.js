'use strict';

const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

/**
 * Embedded GeoJSON Point. Mongo's $near / $geoWithin operators
 * require coordinates in the [longitude, latitude] order.
 */
const pointSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.length === 2 &&
          arr[0] >= -180 && arr[0] <= 180 &&
          arr[1] >= -90  && arr[1] <= 90,
        message: 'coordinates must be [lng, lat] with valid ranges',
      },
    },
  },
  { _id: false },
);

const imageSchema = new Schema(
  {
    url:      { type: String, default: null },
    publicId: { type: String, default: null },
  },
  { _id: false },
);

/**
 * Location categories shown in the collaborative map filter pill.
 * Each maps to a specific marker color/icon on the client.
 */
const LOCATION_CATEGORIES = Object.freeze({
  RESTAURANT:  'restaurant',
  BAKERY:      'bakery',
  GROCERY:     'grocery',
  PHARMACY:    'pharmacy',
  CAFE:        'cafe',
  OTHER:       'other',
});

const locationSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [120, 'Name must be at most 120 characters'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description too long'],
      default: '',
    },

    category: {
      type: String,
      enum: Object.values(LOCATION_CATEGORIES),
      default: LOCATION_CATEGORIES.OTHER,
      index: true,
    },

    // Gluten-free safety status — moderated by community/admins
    glutenFree: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Has been formally certified by GlUnity moderators
    certified: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Cross-contamination warning surfaced as a red icon on the map
    contaminationWarning: {
      type: Boolean,
      default: false,
    },

    address: {
      type: String,
      trim: true,
      default: '',
    },

    city: {
      type: String,
      trim: true,
      default: '',
    },

    country: {
      type: String,
      trim: true,
      default: 'Tunisia',
    },

    phone: {
      type: String,
      trim: true,
      default: '',
    },

    // GeoJSON Point — required, indexed with 2dsphere
    location: {
      type: pointSchema,
      required: true,
    },

    images: {
      type: [imageSchema],
      default: [],
    },

    // Aggregated rating cache, recomputed whenever a review is added
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count:   { type: Number, default: 0, min: 0 },
    },

    priceRange: {
      type: String,
      enum: ['$', '$$', '$$$', '$$$$', ''],
      default: '',
    },

    createdBy: {
      type: Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  },
);

// 2dsphere index — required for $near / $geoWithin queries
locationSchema.index({ location: '2dsphere' });
locationSchema.index({ name: 'text', description: 'text', address: 'text' });

const Location = model('Location', locationSchema);
Location.CATEGORIES = LOCATION_CATEGORIES;

module.exports = Location;
