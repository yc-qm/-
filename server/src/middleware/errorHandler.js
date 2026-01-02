// server/src/middleware/errorHandler.js
const logger = require('../utils/logger');

/**
 * 自定义错误类
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = '认证失败') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = '权限不足') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = '资源') {
    super(`${resource}不存在`, 404, 'NOT_FOUND_ERROR');
  }
}

class RateLimitError extends AppError {
  constructor(message = '请求过于频繁') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

/**
 * 404处理中间件
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`路由 ${req.method} ${req.originalUrl}`);
  next(error);
};

/**
 * 全局错误处理中间件
 */
const globalErrorHandler = (err, req, res, next) => {
  // 设置默认值
  err.statusCode = err.statusCode || 500;
  err.code = err.code || 'INTERNAL_ERROR';
  err.message = err.message || '服务器内部错误';
  
  // 记录错误日志
  logger.error('全局错误处理:', {
    error: err.message,
    code: err.code,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.userId || '未登录'
  });
  
  // 开发环境返回详细错误信息
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // 处理MongoDB错误
  if (err.name === 'CastError') {
    err.statusCode = 400;
    err.code = 'INVALID_ID';
    err.message = '无效的ID格式';
  }
  
  if (err.name === 'ValidationError') {
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    const messages = Object.values(err.errors).map(e => e.message);
    err.message = messages.join(', ');
  }
  
  if (err.code === 11000) { // MongoDB重复键错误
    err.statusCode = 409;
    err.code = 'DUPLICATE_KEY';
    err.message = '数据已存在';
  }
  
  // 处理JWT错误
  if (err.name === 'JsonWebTokenError') {
    err.statusCode = 401;
    err.code = 'INVALID_TOKEN';
    err.message = '无效的令牌';
  }
  
  if (err.name === 'TokenExpiredError') {
    err.statusCode = 401;
    err.code = 'TOKEN_EXPIRED';
    err.message = '令牌已过期';
  }
  
  // 响应格式
  const errorResponse = {
    success: false,
    code: err.code,
    message: err.message,
    statusCode: err.statusCode,
    timestamp: new Date().toISOString(),
    path: req.path
  };
  
  // 开发环境附加堆栈信息
  if (isDevelopment) {
    errorResponse.stack = err.stack;
    if (err.errors) {
      errorResponse.errors = err.errors;
    }
  }
  
  // 发送错误响应
  res.status(err.statusCode).json(errorResponse);
};

/**
 * 异步错误包装器
 * 用于包装async函数，自动捕获错误并传递给next
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 游戏逻辑错误处理
 */
const gameErrorHandler = (err, roomId, playerId) => {
  logger.error('游戏逻辑错误:', {
    roomId,
    playerId,
    error: err.message,
    stack: err.stack
  });
  
  // 这里可以通知房间内的所有玩家
  // socketService.notifyRoom(roomId, 'gameError', {
  //   message: '游戏出现异常，请重新开始'
  // });
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  notFoundHandler,
  globalErrorHandler,
  asyncHandler,
  gameErrorHandler
};