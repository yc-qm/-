// server/src/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authMiddleware } = require('../utils/auth');

// 需要认证的路由
router.use(authMiddleware);

router.post('/order', (req, res) => paymentController.createOrder(req, res));
router.get('/order/:orderNo', (req, res) => paymentController.getOrderStatus(req, res));
router.get('/packages', (req, res) => paymentController.getRechargePackages(req, res));
router.get('/history', (req, res) => paymentController.getPaymentHistory(req, res));

// 支付回调（不需要认证）
router.post('/callback', (req, res) => paymentController.paymentCallback(req, res));

module.exports = router;