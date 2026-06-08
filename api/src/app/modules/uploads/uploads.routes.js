'use strict';

const express = require('express');
const multer = require('multer');
const controller = require('./uploads.controller');

const router = express.Router();

// Use memory storage and limit file size to 20MB
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// POST /api/uploads - single file field name: file
router.post('/', upload.single('file'), controller.uploadFile);

module.exports = router;
