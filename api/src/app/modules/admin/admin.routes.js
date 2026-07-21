'use strict';

const { Router } = require('express');
const adminController = require('./admin.controller');
const authenticate = require('../../common/middleware/auth.middleware');
const authorize = require('../../common/middleware/role.middleware');

const router = Router();

// Protect all admin routes with auth middleware & admin role authorization
router.use(authenticate);
router.use(authorize('admin'));

/**
 * GET /api/admin/stats
 */
router.get('/stats', (req, res, next) => adminController.getDashboardStats(req, res, next));

// Moderation
router.get('/moderation', (req, res, next) => adminController.getModerationItems(req, res, next));
router.post('/moderation/:type/:id/:action', (req, res, next) => adminController.moderateItem(req, res, next));

// Users
router.get('/users', (req, res, next) => adminController.getUsers(req, res, next));
router.patch('/users/:id/status', (req, res, next) => adminController.toggleUserStatus(req, res, next));

// Sellers
router.get('/sellers/pending', (req, res, next) => adminController.getSellerVerifications(req, res, next));
router.post('/sellers/:id/:action', (req, res, next) => adminController.processSellerBadge(req, res, next));

// Resources
router.get('/resources', (req, res, next) => adminController.getPatientResources(req, res, next));
router.get('/resources/analytics', (req, res, next) => adminController.getPatientResourceAnalytics(req, res, next));
router.post('/resources', (req, res, next) => adminController.createPatientResource(req, res, next));
router.put('/resources/:id', (req, res, next) => adminController.updatePatientResource(req, res, next));
router.delete('/resources/:id', (req, res, next) => adminController.deletePatientResource(req, res, next));

module.exports = router;
