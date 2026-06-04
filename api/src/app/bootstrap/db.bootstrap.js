'use strict';

const mongoose = require('mongoose');
const env      = require('../config/env');
const logger   = require('./logger.bootstrap');

const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS:          45000,
  maxPoolSize:              10,
  minPoolSize:              2,
};

async function connectDB() {
  try {
    mongoose.set('strict', true);
    mongoose.set('strictQuery', true);

    await mongoose.connect(env.mongo.uri, MONGO_OPTIONS);

    logger.info(`MongoDB connected → ${mongoose.connection.host}`);

    // Centralized startup seeding
    try {
      const patientResourcesService = require('../modules/patient-resources/patient-resources.service');
      await patientResourcesService.seedResourcesIfNeeded();
      logger.info('Database seeding checks completed successfully.');
    } catch (seedErr) {
      logger.error('Startup seeding failed', { err: seedErr.message });
    }

    mongoose.connection.on('disconnected', () =>
      logger.warn('MongoDB disconnected. Attempting to reconnect…'),
    );
    mongoose.connection.on('reconnected', () =>
      logger.info('MongoDB reconnected.'),
    );
    mongoose.connection.on('error', (err) =>
      logger.error('MongoDB connection error', { err: err.message }),
    );
  } catch (err) {
    logger.error('MongoDB initial connection failed', { err: err.message });
    process.exit(1);
  }
}

module.exports = connectDB;
