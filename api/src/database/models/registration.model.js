'use strict';

const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const registrationSchema = new Schema(
  {
    eventId: {
      type: Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
      index: true,
    },
    userId: {
      type: Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    ticketsCount: {
      type: Number,
      required: true,
      default: 1,
      min: [1, 'Must register at least 1 ticket'],
    },
    ticketCount: {
      type: Number,
      required: true,
      default: 1,
      min: [1, 'Must register at least 1 ticket'],
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['WAITING_PAYMENT', 'APPROVED', 'REJECTED', 'CANCELLED', 'CONFIRMED', 'PAID', 'pending', 'waiting_payment', 'paid', 'confirmed', 'cancelled'],
      default: 'WAITING_PAYMENT',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['online', 'presentiel'],
      required: false,
    },
    paidAt: {
      type: Date,
    },
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: Types.ObjectId,
      ref: 'User',
    },
    rejectedReason: {
      type: String,
      trim: true,
      default: '',
    },
    registrationForm: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      gender: { type: String, required: true },
      dateOfBirth: { type: String },
      address: { type: String },
      city: { type: String },
      country: { type: String },
      ticketCount: { type: Number, default: 1 },
      notes: { type: String }
    }
  },
  {
    timestamps: true,
  }
);

registrationSchema.index({ eventId: 1, phone: 1 });
registrationSchema.index({ eventId: 1, status: 1 });

// Backward compatibility pre-save hook
registrationSchema.pre('validate', function() {
  if (!this.registrationForm) {
    const names = (this.fullName || '').split(' ');
    this.registrationForm = {
      firstName: names[0] || 'Attendee',
      lastName: names.slice(1).join(' ') || 'User',
      email: this.email || '',
      phone: this.phone || '',
      gender: 'Male',
      ticketCount: this.ticketCount || this.ticketsCount || 1,
      notes: this.notes || ''
    };
  } else {
    const names = (this.fullName || '').split(' ');
    if (!this.registrationForm.firstName) {
      this.registrationForm.firstName = names[0] || 'Attendee';
    }
    if (!this.registrationForm.lastName) {
      this.registrationForm.lastName = names.slice(1).join(' ') || 'User';
    }
    if (!this.registrationForm.email) {
      this.registrationForm.email = this.email || '';
    }
    if (!this.registrationForm.phone) {
      this.registrationForm.phone = this.phone || '';
    }
    if (!this.registrationForm.gender) {
      this.registrationForm.gender = 'Male';
    }
    if (this.registrationForm.ticketCount == null) {
      this.registrationForm.ticketCount = this.ticketCount || this.ticketsCount || 1;
    }
    if (this.registrationForm.notes == null) {
      this.registrationForm.notes = this.notes || '';
    }
  }

  if (!this.fullName && this.registrationForm.firstName && this.registrationForm.lastName) {
    this.fullName = `${this.registrationForm.firstName} ${this.registrationForm.lastName}`;
  }
  if (!this.email && this.registrationForm.email) {
    this.email = this.registrationForm.email;
  }
  if (!this.phone && this.registrationForm.phone) {
    this.phone = this.registrationForm.phone;
  }
  if (this.ticketCount == null) {
    this.ticketCount = this.registrationForm.ticketCount || this.ticketsCount || 1;
  }
  if (this.ticketsCount == null) {
    this.ticketsCount = this.registrationForm.ticketCount || this.ticketCount || 1;
  }
});

const Registration = model('Registration', registrationSchema);
module.exports = Registration;
