'use strict';

const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('./logger.bootstrap');

async function connectDB() {
  try {
    const conn = await mongoose.connect(env.mongo.uri);
    logger.info(`MongoDB connected → ${conn.connection.host}`);
  } catch (err) {
    logger.error('Failed to connect to MongoDB', { err: err.message });
    process.exit(1);
  }
}

module.exports = connectDB;
