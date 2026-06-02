'use strict';

const express         = require('express');
const authMiddleware  = require('../../common/middleware/auth.middleware');
const usersController = require('./users.controller');

const router = express.Router();

// All /api/users/* routes require authentication
router.use(authMiddleware);

/** PATCH /api/users/me — update authenticated user's profile */
router.patch('/me', usersController.updateMe);

/** GET /api/users/me/seller-stats — get authenticated user's seller statistics */
router.get('/me/seller-stats', usersController.getSellerStats);

/** POST /api/users/change-password — update user password */
router.post('/change-password', usersController.changePassword);

/** POST /api/users/check-in — daily check-in */
router.post('/check-in', usersController.checkIn);

/** GET /api/users/:id — get user profile by ID */
router.get('/:id', usersController.getById);

module.exports = router;
