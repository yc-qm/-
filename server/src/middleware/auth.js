// server/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');

/**
 * JWT认证中间件
 * 验证请求头中的Authorization令牌
 */
const authenticate = async (req, res, next) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 401,
        message: '未提供认证令牌'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // 验证JWT令牌
    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    // 从数据库查找用户
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '用户不存在或令牌无效'
      });
    }

    // 检查用户状态
    if (user.status !== 'active') {
      return res.status(403).json({
        code: 403,
        message: '用户账号已被禁用'
      });
    }

    // 将用户信息附加到请求对象
    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        code: 401,
        message: '无效的认证令牌'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: 401,
        message: '认证令牌已过期'
      });
    }
    
    res.status(500).json({
      code: 500,
      message: '服务器认证错误'
    });
  }
};

/**
 * 可选认证中间件
 * 如果提供了token就验证，没有就跳过
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.status === 'active') {
        req.user = user;
        req.userId = user._id;
      }
    }
  } catch (error) {
    // 可选认证，验证失败也不阻止请求
    console.warn('可选认证失败:', error.message);
  }
  
  next();
};

/**
 * 微信小程序登录验证中间件
 * 验证微信code并获取openid
 */
const wechatAuth = async (req, res, next) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        code: 400,
        message: '缺少微信code参数'
      });
    }

    // 调用微信API获取openid
    const wechatApiUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${config.WX_APPID}&secret=${config.WX_SECRET}&js_code=${code}&grant_type=authorization_code`;
    
    const response = await fetch(wechatApiUrl);
    const data = await response.json();
    
    if (data.errcode) {
      return res.status(401).json({
        code: 401,
        message: `微信登录失败: ${data.errmsg}`
      });
    }

    const { openid, session_key, unionid } = data;
    
    // 将微信信息附加到请求对象
    req.wechatInfo = {
      openid,
      session_key,
      unionid
    };
    
    next();
  } catch (error) {
    console.error('微信认证中间件错误:', error);
    res.status(500).json({
      code: 500,
      message: '微信登录服务异常'
    });
  }
};

/**
 * 管理员权限验证中间件
 */
const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      code: 401,
      message: '需要管理员权限'
    });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      code: 403,
      message: '权限不足，需要管理员权限'
    });
  }
  
  next();
};

/**
 * 频率限制中间件
 */
const rateLimit = (options = {}) => {
  const { windowMs = 15 * 60 * 1000, max = 100 } = options;
  const requests = new Map();
  
  return (req, res, next) => {
    const key = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requests.has(key)) {
      requests.set(key, []);
    }
    
    const timestamps = requests.get(key);
    
    // 清理过期的请求记录
    const windowStart = now - windowMs;
    while (timestamps.length > 0 && timestamps[0] < windowStart) {
      timestamps.shift();
    }
    
    // 检查是否超过限制
    if (timestamps.length >= max) {
      return res.status(429).json({
        code: 429,
        message: '请求过于频繁，请稍后再试'
      });
    }
    
    // 记录本次请求
    timestamps.push(now);
    requests.set(key, timestamps);
    
    next();
  };
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  wechatAuth,
  requireAdmin,
  rateLimit
};