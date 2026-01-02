// server/src/models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // 订单信息
  orderNo: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 支付信息
  amount: {
    type: Number, // 单位：分
    required: true
  },
  paymentType: {
    type: String,
    enum: ['wechat', 'alipay', 'apple'],
    default: 'wechat'
  },
  productId: String,
  
  // 交易信息
  transactionId: String,
  prepayId: String,
  nonceStr: String,
  timeStamp: String,
  package: String,
  signType: String,
  paySign: String,
  
  // 订单状态
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  failReason: String,
  refundReason: String,
  
  // 时间戳
  createTime: {
    type: Date,
    default: Date.now
  },
  completeTime: Date,
  refundTime: Date
}, {
  timestamps: true
});

// 索引
paymentSchema.index({ userId: 1, createTime: -1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);