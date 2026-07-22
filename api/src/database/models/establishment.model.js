const mongoose = require('mongoose');

const establishmentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['Supermarket', 'Restaurant', 'Bakery', 'Health Store', 'Bio Store', 'Pharmacy', 'Other'],
      default: 'Other',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    coverImageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    logoUrl: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    openTime: {
      type: String,
      default: '08:00',
    },
    closeTime: {
      type: String,
      default: '19:00',
    },
    daysClosed: {
      type: [String],
      default: ['Sunday'],
    },
    coordinates: {
      latitude: { type: Number, default: 36.8065 },
      longitude: { type: Number, default: 10.1815 },
    },
    verified: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index allowing sellers to own multiple establishments
establishmentSchema.index({ owner: 1, createdAt: -1 });
establishmentSchema.index({ category: 1 });

module.exports = mongoose.models.Establishment || mongoose.model('Establishment', establishmentSchema);
