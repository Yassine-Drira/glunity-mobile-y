'use strict';

const mongoose = require('mongoose');
const { PROFILE_TYPES, LANGUAGES } = require('../../app/config/constants');

const { Schema, model, Types } = mongoose;

// ─── Sub-schema: Cloudinary image ────────────────────────────────────────────
const imageSchema = new Schema(
  {
    url: { type: String, default: null },
    publicId: { type: String, default: null },
  },
  { _id: false },
);

// ─── Sub-schema: Store info ───────────────────────────────────────────────────
const storeSchema = new Schema(
  {
    storeName: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    operatingHours: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, match: [/^\+?[\d\s\-().]{7,20}$/, 'Invalid phone number'], default: '' },
    imageUrl: { type: String, trim: true, default: '' },
    mapClicks: { type: Number, default: 0 },
  },
  { _id: false },
);

// ─── User Schema ──────────────────────────────────────────────────────────────
const userSchema = new Schema(
  {
    // ── Identity ────────────────────────────────────────────────────────────
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [80, 'Full name must be at most 80 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },

    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-().]{7,20}$/, 'Invalid phone number'],
    },

    storeInfo: storeSchema,

    // ── Security ─────────────────────────────────────────────────────────────
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // never returned in queries by default
    },

    // ── Profile ──────────────────────────────────────────────────────────────
    profileType: {
      type: String,
      enum: {
        values: Object.values(PROFILE_TYPES),
        message: `profileType must be one of: ${Object.values(PROFILE_TYPES).join(', ')}`,
      },
      default: PROFILE_TYPES.CELIAC,
    },

    avatar: imageSchema,

    // ── Gamification ─────────────────────────────────────────────────────────
    streakDays: {
      type: Number,
      default: 0,
      min: [0, 'streakDays cannot be negative'],
    },

    points: {
      type: Number,
      default: 0,
      min: [0, 'points cannot be negative'],
    },

    lastCheckInAt: {
      type: Date,
      default: null,
    },

    badges: [
      {
        type: Types.ObjectId,
        ref: 'Badge',
      },
    ],

    // ── Preferences ───────────────────────────────────────────────────────────
    language: {
      type: String,
      enum: {
        values: Object.values(LANGUAGES),
        message: `language must be one of: ${Object.values(LANGUAGES).join(', ')}`,
      },
      default: LANGUAGES.FR,
    },

    darkMode: {
      type: Boolean,
      default: false,
    },

    pushEnabled: {
      type: Boolean,
      default: true,
    },

    emailEnabled: {
      type: Boolean,
      default: true,
    },

    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    dataSharingEnabled: {
      type: Boolean,
      default: true,
    },

    publicProfileEnabled: {
      type: Boolean,
      default: false,
    },

    twoFactorCode: {
      type: String,
      select: false,
    },

    twoFactorCodeExpires: {
      type: Date,
      select: false,
    },

    pushToken: {
      type: String, // Expo push token
      trim: true,
    },

    // ── Auth Status ───────────────────────────────────────────────────────────
    emailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // ── Soft delete ───────────────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,            // createdAt / updatedAt
    versionKey: false,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Note: email unique index is defined inline above (unique: true)
userSchema.index({ profileType: 1, isActive: 1 });
userSchema.index({ pushToken: 1 }, { sparse: true });

// ─── Virtuals ─────────────────────────────────────────────────────────────────
userSchema.virtual('avatarUrl').get(function () {
  return this.avatar?.url ?? null;
});

// ─── Statics ──────────────────────────────────────────────────────────────────
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase().trim() });
};

// ─── Find active by ID and populate badges ────────────────────────────────────
userSchema.statics.findActiveById = function (id) {
  return this.findOne({ _id: id, isActive: true }).populate('badges');
};

// ─── Methods ──────────────────────────────────────────────────────────────────
/**
 * Returns a safe public representation (no sensitive fields).
 */
userSchema.methods.toPublic = function () {
  return {
    _id: this._id,
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
    storeInfo: this.storeInfo,
    profileType: this.profileType,
    avatarUrl: this.avatarUrl,
    streakDays: this.streakDays,
    points: this.points,
    lastCheckInAt: this.lastCheckInAt,
    badges: this.badges,
    language: this.language,
    darkMode: this.darkMode,
    pushEnabled: this.pushEnabled,
    emailEnabled: this.emailEnabled,
    twoFactorEnabled: this.twoFactorEnabled,
    dataSharingEnabled: this.dataSharingEnabled,
    publicProfileEnabled: this.publicProfileEnabled,
    emailVerified: this.emailVerified,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const User = model('User', userSchema);

module.exports = User;
