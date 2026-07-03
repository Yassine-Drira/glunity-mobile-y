'use strict';

const { Router } = require('express');
const controller = require('./reels.controller');
const validate = require('../../common/middleware/validation.middleware');
const authMiddleware = require('../../common/middleware/auth.middleware');
const env = require('../../config/env');
const { reelIdSchema, createReelSchema, createCommentSchema, updateCommentSchema, updateReelSchema } = require('./reels.schema');
const multer = require('multer');

// Configure multer for memory uploads (local fallback)
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: env.media?.maxVideoSize || 50 * 1024 * 1024, // Default 50MB
	}
});

const router = Router();

// ── Upload ───────────────────────────────────────────────────────────────────
// Signatures for direct upload to Cloudinary
router.get('/signature', authMiddleware, controller.getUploadSignature);

// Local fallback endpoint (in case Cloudinary is not configured in dev)
router.post('/upload', authMiddleware, upload.single('video'), controller.uploadVideoLocal);

// ── Reels CRUD ───────────────────────────────────────────────────────────────
router.get('/', authMiddleware.optional, controller.list);
router.post('/', authMiddleware, createReelSchema, validate, controller.create);
router.put('/:id', authMiddleware, updateReelSchema, validate, controller.update);
router.delete('/:id', authMiddleware, reelIdSchema, validate, controller.remove);

// ── Interactions ─────────────────────────────────────────────────────────────
router.post('/:id/like', authMiddleware, reelIdSchema, validate, controller.toggleLike);
router.post('/:id/view', authMiddleware.optional, reelIdSchema, validate, controller.recordView);
router.post('/:id/share', authMiddleware, reelIdSchema, validate, controller.recordShare);

// ── Comments ─────────────────────────────────────────────────────────────────
router.get('/:id/comments', authMiddleware, reelIdSchema, validate, controller.listComments);
router.post('/:id/comments', authMiddleware, createCommentSchema, validate, controller.postComment);
router.put('/:id/comments/:commentId', authMiddleware, updateCommentSchema, validate, controller.updateComment);
router.delete('/:id/comments/:commentId', authMiddleware, controller.deleteComment);
router.post('/:id/comments/:commentId/like', authMiddleware, controller.toggleCommentLike);
router.get('/:id/comments/:commentId/replies', authMiddleware, controller.listReplies);

module.exports = router;
