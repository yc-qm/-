// server/src/utils/auth.js
const jwt = require('jsonwebtoken');
const config = require('../config');

// 生成JWT token
function generateToken(userId) {
  return jwt.sign(
    { userId },
    config.jwtSecret,
    { expiresIn: config.jwtExpire }
  );
}

// 验证JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    return null;
  }
}

// 认证中间件
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      code: 401,
      message: '未提供认证令牌'
    });
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      code: 401,
      message: '认证令牌无效或已过期'
    });
  }
  
  req.userId = decoded.userId;
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  authMiddleware
};