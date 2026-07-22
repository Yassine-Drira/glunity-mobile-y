const express = require('express');
const router = express.Router();
const orderController = require('./order.controller');
const authMiddleware = require('../../common/middleware/auth.middleware');

router.use(authMiddleware);

router.post('/', orderController.createOrder);
router.get('/my-orders', orderController.getMyOrders);
router.get('/seller-orders', orderController.getSellerOrders);
router.get('/:id', orderController.getOrderById);
router.put('/:id/status', orderController.updateOrderStatus);

module.exports = router;
