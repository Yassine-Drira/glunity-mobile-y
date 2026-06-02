#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../src/database/models/user.model');

const RESTORE_FILE = path.resolve(__dirname, '.points-restore.json');

const argv = process.argv.slice(2);
const hasFlag = (flag) => argv.includes(flag);
const getArg = (flag) => {
  const idx = argv.indexOf(flag);
  return idx >= 0 ? argv[idx + 1] : null;
};

const restore = hasFlag('--restore');
const email = getArg('--email');
const fullName = getArg('--name');
const deltaRaw = getArg('--delta');
const setRaw = getArg('--set');

const parseNumber = (value, label) => {
  if (value == null) return null;
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new Error(`${label} must be a number`);
  }
  return num;
};

const delta = parseNumber(deltaRaw, '--delta');
const setValue = parseNumber(setRaw, '--set');

const getMongoUri = () => {
  const uri = String(process.env.MONGO_URI || '').trim();
  if (!uri) {
    throw new Error('MONGO_URI not set in api/.env');
  }
  return uri;
};

const saveRestore = (payload) => {
  fs.writeFileSync(RESTORE_FILE, JSON.stringify(payload, null, 2));
};

const loadRestore = () => {
  if (!fs.existsSync(RESTORE_FILE)) {
    throw new Error('Restore file not found. Run with --delta or --set first.');
  }
  const raw = fs.readFileSync(RESTORE_FILE, 'utf8');
  return JSON.parse(raw);
};

const clearRestore = () => {
  if (fs.existsSync(RESTORE_FILE)) {
    fs.unlinkSync(RESTORE_FILE);
  }
};

(async () => {
  if (!restore && !email && !fullName) {
    throw new Error('Provide --email or --name');
  }
  if (!restore && delta == null && setValue == null) {
    throw new Error('Provide --delta or --set');
  }

  const uri = getMongoUri();
  await mongoose.connect(uri);

  if (restore) {
    const { userId, previousPoints, email: savedEmail, fullName: savedName } = loadRestore();
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Saved user no longer exists');
    }
    await User.updateOne({ _id: userId }, { $set: { points: previousPoints } });
    console.log(`[restore] ${savedEmail || savedName || userId}: ${user.points} -> ${previousPoints}`);
    clearRestore();
    await mongoose.disconnect();
    process.exit(0);
  }

  const query = email ? { email } : { fullName };
  const user = await User.findOne(query);
  if (!user) {
    throw new Error(`User not found for ${email ? `email ${email}` : `name ${fullName}`}`);
  }

  const previousPoints = Number(user.points || 0);
  let nextPoints = previousPoints;
  if (delta != null) nextPoints = previousPoints + delta;
  if (setValue != null) nextPoints = setValue;
  if (nextPoints < 0) nextPoints = 0;

  await User.updateOne({ _id: user._id }, { $set: { points: nextPoints } });
  saveRestore({
    userId: String(user._id),
    previousPoints,
    email: user.email,
    fullName: user.fullName,
    savedAt: new Date().toISOString(),
  });

  console.log(`[update] ${user.email} (${user.fullName}): ${previousPoints} -> ${nextPoints}`);
  console.log(`[restore] saved to ${RESTORE_FILE}`);

  await mongoose.disconnect();
  process.exit(0);
})().catch(async (err) => {
  console.error(err.message || err);
  try {
    await mongoose.disconnect();
  } catch (e) {
    // ignore
  }
  process.exit(1);
});
