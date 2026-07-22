const Order = require('../../../database/models/order.model');
const Product = require('../../../database/models/product.model');

const DELIVERY_FEE = 7;

const STATUS_NOTIFICATIONS = {
  pending: 'Votre commande est en attente.',
  confirmed: 'Votre commande a été confirmée.',
  shipped: 'Votre commande est en cours de livraison !',
  delivered: 'Votre commande a été livrée avec succès.',
  cancelled: 'Votre commande a été annulée.',
};

/**
 * Build validated order items from products database
 */
const buildOrderItems = async (requestItems) => {
  if (!Array.isArray(requestItems) || requestItems.length === 0) {
    const error = new Error('Order items list is empty');
    error.statusCode = 400;
    throw error;
  }

  const productIds = requestItems.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  const productsById = new Map(
    products.map((product) => [product._id.toString(), product])
  );

  return requestItems.map((item) => {
    const product = productsById.get(item.productId);

    if (!product) {
      const error = new Error(`Product not found: ${item.productId}`);
      error.statusCode = 404;
      throw error;
    }

    return {
      product: product._id,
      name: product.name,
      qty: Math.max(1, parseInt(item.qty || 1, 10)),
      price: product.price,
      image: product.image || (Array.isArray(product.images) && product.images[0]) || '',
    };
  });
};

/**
 * Create a new order
 */
exports.createOrder = async (req, res, next) => {
  try {
    const { items, address } = req.body;

    if (!address || !address.fullName || !address.addressLine || !address.phone) {
      return res.status(400).json({
        success: false,
        message: 'Complete shipping address (fullName, addressLine, city, phone) is required',
      });
    }

    const userId = req.user.id || req.user._id;
    const orderItems = await buildOrderItems(items);
    const subtotal = orderItems.reduce((sum, item) => sum + item.qty * item.price, 0);
    const total = subtotal + DELIVERY_FEE;

    const order = await Order.create({
      user: userId,
      items: orderItems,
      total,
      deliveryFee: DELIVERY_FEE,
      address,
      status: 'confirmed',
    });

    // Update product stock levels
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.qty },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Commande créée avec succès',
      data: order,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get buyer's orders history
 */
exports.getMyOrders = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get seller's received orders
 */
exports.getSellerOrders = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const productIds = await Product.find({ createdBy: userId }).distinct('_id');
    const ownedIds = new Set(productIds.map((id) => id.toString()));

    const orders = await Order.find({ 'items.product': { $in: productIds } })
      .populate('user', 'name email avatar profileType')
      .sort({ createdAt: -1 });

    const sellerOrders = orders.map((order) => {
      const plain = order.toObject();
      plain.items = plain.items.filter((item) => ownedIds.has(item.product.toString()));
      return plain;
    });

    return res.json({
      success: true,
      data: sellerOrders,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get single order by ID
 */
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email avatar');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const userId = req.user.id || req.user._id;
    const orderUserId = typeof order.user === 'object' && order.user._id ? order.user._id.toString() : order.user.toString();

    if (req.user.role !== 'admin' && req.user.profileType !== 'admin' && orderUserId !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only access your own orders',
      });
    }

    return res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Update order status (Seller or Admin)
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    order.status = status;
    await order.save();

    return res.json({
      success: true,
      message: STATUS_NOTIFICATIONS[status] || `Statut de la commande mis à jour: ${status}`,
      data: order,
    });
  } catch (error) {
    return next(error);
  }
};
