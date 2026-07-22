const express = require('express');
const router = express.Router();
const establishmentController = require('./establishment.controller');
const authMiddleware = require('../../common/middleware/auth.middleware');

// Public routes for Map & Patients
router.get('/', establishmentController.getEstablishments);
router.get('/:id', establishmentController.getEstablishmentById);

// Seller protected routes
router.use(authMiddleware);
router.get('/my/all', establishmentController.getMyEstablishments);
router.post('/my', establishmentController.upsertEstablishment);
router.delete('/my/:id', establishmentController.deleteEstablishment);

module.exports = router;
