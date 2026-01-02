// server/src/controllers/paymentController.js
const Payment = require('../models/Payment');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');

class PaymentController {
  // 创建充值订单
  async createOrder(req, res) {
    try {
      const userId = req.userId;
      const { amount, paymentType = 'wechat', productId } = req.body;
      
      // 验证金额
      const validAmounts = [600, 1800, 3000, 5000, 9800, 19800]; // 单位：分
      if (!validAmounts.includes(amount)) {
        return errorResponse(res, '无效的充值金额', 400);
      }
      
      // 生成订单号
      const orderNo = this.generateOrderNo();
      
      // 创建订单
      const payment = new Payment({
        orderNo,
        userId,
        amount,
        paymentType,
        productId,
        status: 'pending',
        createTime: new Date()
      });
      
      await payment.save();
      
      console.log(`创建充值订单: ${orderNo}, 用户: ${userId}, 金额: ${amount}`);
      
      // 这里应该调用支付接口生成支付参数
      // 简化处理，返回模拟数据
      const paymentParams = {
        orderNo,
        amount,
        timestamp: Date.now(),
        nonceStr: this.generateNonceStr(),
        package: `prepay_id=MOCK_${orderNo}`,
        signType: 'MD5',
        paySign: this.generateMockSign(orderNo)
      };
      
      return successResponse(res, {
        orderNo,
        paymentParams,
        message: '订单创建成功'
      });
      
    } catch (error) {
      console.error('创建订单失败:', error);
      return errorResponse(res, '创建订单失败', 500);
    }
  }
  
  // 支付回调
  async paymentCallback(req, res) {
    try {
      const { orderNo, transactionId, paymentResult } = req.body;
      
      // 查找订单
      const payment = await Payment.findOne({ orderNo });
      if (!payment) {
        return errorResponse(res, '订单不存在', 404);
      }
      
      // 验证支付结果
      if (paymentResult !== 'SUCCESS') {
        payment.status = 'failed';
        payment.failReason = '支付失败';
        await payment.save();
        
        return errorResponse(res, '支付失败', 400);
      }
      
      // 更新订单状态
      payment.status = 'completed';
      payment.transactionId = transactionId;
      payment.completeTime = new Date();
      await payment.save();
      
      // 更新用户金币
      const goldAmount = this.calculateGoldAmount(payment.amount);
      const user = await User.findById(payment.userId);
      if (user) {
        user.goldCoins += goldAmount;
        
        // 记录金币变化
        user.goldHistory = user.goldHistory || [];
        user.goldHistory.push({
          change: goldAmount,
          reason: '充值',
          balance: user.goldCoins,
          timestamp: new Date(),
          orderNo
        });
        
        await user.save();
      }
      
      console.log(`支付成功: ${orderNo}, 交易ID: ${transactionId}, 金币: ${goldAmount}`);
      
      // 返回成功响应（支付平台需要）
      return successResponse(res, {
        code: 'SUCCESS',
        message: '支付成功'
      });
      
    } catch (error) {
      console.error('处理支付回调失败:', error);
      return errorResponse(res, '处理支付回调失败', 500);
    }
  }
  
  // 查询订单状态
  async getOrderStatus(req, res) {
    try {
      const { orderNo } = req.params;
      const userId = req.userId;
      
      // 查找订单
      const payment = await Payment.findOne({ orderNo, userId });
      if (!payment) {
        return errorResponse(res, '订单不存在', 404);
      }
      
      return successResponse(res, {
        orderNo: payment.orderNo,
        amount: payment.amount,
        status: payment.status,
        createTime: payment.createTime,
        completeTime: payment.completeTime,
        goldAmount: this.calculateGoldAmount(payment.amount)
      });
      
    } catch (error) {
      console.error('查询订单状态失败:', error);
      return errorResponse(res, '查询订单状态失败', 500);
    }
  }
  
  // 获取充值套餐
  async getRechargePackages(req, res) {
    try {
      const packages = [
        {
          id: 'pkg_1',
          name: '新手礼包',
          amount: 600, // 单位：分
          goldAmount: 60,
          extraGold: 6,
          description: '首次充值推荐',
          hot: true
        },
        {
          id: 'pkg_2',
          name: '小试牛刀',
          amount: 1800,
          goldAmount: 180,
          extraGold: 18,
          description: '性价比之选',
          hot: false
        },
        {
          id: 'pkg_3',
          name: '高手进阶',
          amount: 3000,
          goldAmount: 300,
          extraGold: 30,
          description: '进阶玩家必备',
          hot: false
        },
        {
          id: 'pkg_4',
          name: '土豪专属',
          amount: 5000,
          goldAmount: 500,
          extraGold: 50,
          description: '尊享VIP体验',
          hot: false
        },
        {
          id: 'pkg_5',
          name: '王者风范',
          amount: 9800,
          goldAmount: 980,
          extraGold: 98,
          description: '彰显王者气概',
          hot: true
        },
        {
          id: 'pkg_6',
          name: '至尊荣耀',
          amount: 19800,
          goldAmount: 1980,
          extraGold: 198,
          description: '至尊荣耀体验',
          hot: false
        }
      ];
      
      return successResponse(res, { packages });
      
    } catch (error) {
      console.error('获取充值套餐失败:', error);
      return errorResponse(res, '获取充值套餐失败', 500);
    }
  }
  
  // 获取用户充值记录
  async getPaymentHistory(req, res) {
    try {
      const userId = req.userId;
      const { page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // 查找充值记录
      const payments = await Payment.find({ userId })
        .sort({ createTime: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('orderNo amount paymentType status createTime completeTime');
      
      // 格式化记录
      const history = payments.map(payment => ({
        orderNo: payment.orderNo,
        amount: payment.amount / 100, // 转换为元
        goldAmount: this.calculateGoldAmount(payment.amount),
        paymentType: payment.paymentType,
        status: payment.status,
        createTime: payment.createTime,
        completeTime: payment.completeTime
      }));
      
      // 获取总记录数
      const total = await Payment.countDocuments({ userId });
      
      return successResponse(res, {
        history,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
      
    } catch (error) {
      console.error('获取充值记录失败:', error);
      return errorResponse(res, '获取充值记录失败', 500);
    }
  }
  
  // 生成订单号
  generateOrderNo() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `ORDER${timestamp}${random.toString().padStart(4, '0')}`;
  }
  
  // 生成随机字符串
  generateNonceStr() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  // 生成模拟签名
  generateMockSign(orderNo) {
    return `MOCK_SIGN_${orderNo}_${Date.now()}`;
  }
  
  // 计算金币数量（金额单位：分）
  calculateGoldAmount(amount) {
    // 1元 = 10金币，首充双倍等优惠在这里处理
    const baseGold = (amount / 100) * 10;
    
    // 根据金额给予额外奖励
    let extraGold = 0;
    if (amount >= 19800) extraGold = 200;
    else if (amount >= 9800) extraGold = 100;
    else if (amount >= 5000) extraGold = 50;
    else if (amount >= 3000) extraGold = 30;
    else if (amount >= 1800) extraGold = 18;
    else if (amount >= 600) extraGold = 6;
    
    return baseGold + extraGold;
  }
}

module.exports = new PaymentController();