// server/src/utils/logger.js
const winston = require('winston');
const path = require('path');
const { config } = require('../config');
const DailyRotateFile = require('winston-daily-rotate-file');

/**
 * 自定义日志格式
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}`;
  })
);

/**
 * 控制台输出格式（开发环境）
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaString}`;
  })
);

/**
 * 创建日志记录器
 */
class Logger {
  constructor() {
    this.logger = null;
    this.init();
  }

  init() {
    // 确保日志目录存在
    const fs = require('fs');
    if (!fs.existsSync(config.log.path)) {
      fs.mkdirSync(config.log.path, { recursive: true });
    }

    // 配置传输方式
    const transports = [];

    // 文件传输
    transports.push(
      new DailyRotateFile({
        filename: path.join(config.log.path, 'application-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: config.log.maxSize,
        maxFiles: config.log.maxFiles,
        level: config.log.level,
        format: customFormat
      }),
      new DailyRotateFile({
        filename: path.join(config.log.path, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: config.log.maxSize,
        maxFiles: config.log.maxFiles,
        level: 'error',
        format: customFormat
      })
    );

    // 控制台传输（开发环境）
    if (!config.isProduction()) {
      transports.push(
        new winston.transports.Console({
          level: 'debug',
          format: consoleFormat
        })
      );
    }

    // 创建记录器
    this.logger = winston.createLogger({
      level: config.log.level,
      levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        verbose: 4,
        debug: 5,
        silly: 6
      },
      format: customFormat,
      transports: transports,
      exceptionHandlers: [
        new DailyRotateFile({
          filename: path.join(config.log.path, 'exceptions-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: config.log.maxSize,
          maxFiles: config.log.maxFiles
        })
      ],
      rejectionHandlers: [
        new DailyRotateFile({
          filename: path.join(config.log.path, 'rejections-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: config.log.maxSize,
          maxFiles: config.log.maxFiles
        })
      ]
    });

    // 添加HTTP请求日志中间件
    this.httpLogger = this.createHttpLogger();
  }

  /**
   * 创建HTTP请求日志中间件
   */
  createHttpLogger() {
    return (req, res, next) => {
      const startTime = Date.now();

      // 记录请求开始
      this.logger.http(`${req.method} ${req.originalUrl} - 请求开始`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        referrer: req.get('Referrer'),
        userId: req.userId || 'anonymous'
      });

      // 记录响应完成
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logData = {
          method: req.method,
          url: req.originalUrl,
          status: res.statusCode,
          duration: `${duration}ms`,
          contentLength: res.get('Content-Length') || '0',
          ip: req.ip,
          userId: req.userId || 'anonymous'
        };

        if (res.statusCode >= 400) {
          this.logger.warn('HTTP请求错误', logData);
        } else {
          this.logger.http('HTTP请求完成', logData);
        }
      });

      next();
    };
  }

  /**
   * 系统启动日志
   */
  logStartup() {
    this.info('🚀 服务器启动', {
      env: config.server.env,
      port: config.server.port,
      nodeVersion: process.version,
      pid: process.pid,
      uptime: process.uptime()
    });

    // 记录所有配置（敏感信息已脱敏）
    const safeConfig = { ...config.getAll() };
    if (safeConfig.jwt) safeConfig.jwt.secret = '[HIDDEN]';
    if (safeConfig.wechat) {
      safeConfig.wechat.appSecret = '[HIDDEN]';
    }
    
    this.debug('当前配置', safeConfig);
  }

  /**
   * 数据库连接日志
   */
  logDatabaseConnection(service, status, details = {}) {
    const emoji = status === 'connected' ? '✅' : status === 'error' ? '❌' : '⚠️';
    this.info(`${emoji} ${service} ${status}`, details);
  }

  /**
   * 游戏事件日志
   */
  logGameEvent(event, data) {
    this.info(`🎮 游戏事件: ${event}`, data);
  }

  /**
   * 用户活动日志
   */
  logUserActivity(userId, action, details = {}) {
    this.info(`👤 用户活动: ${action}`, { userId, ...details });
  }

  /**
   * 错误日志（带上下文）
   */
  logErrorWithContext(error, context = {}) {
    this.error(error.message, {
      stack: error.stack,
      name: error.name,
      ...context
    });
  }

  /**
   * 性能日志
   */
  logPerformance(operation, duration, details = {}) {
    this.info(`⏱️  性能: ${operation} 耗时 ${duration}ms`, details);
  }

  /**
   * 业务指标日志
   */
  logMetrics(metrics) {
    this.info('📊 业务指标', metrics);
  }

  /**
   * 审计日志（重要操作）
   */
  logAudit(action, user, resource, details = {}) {
    this.info(`🔒 审计日志: ${action}`, {
      userId: user._id || user,
      userNickname: user.nickname,
      resource,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // 快捷方法
  error(message, meta) { this.logger.error(message, meta); }
  warn(message, meta) { this.logger.warn(message, meta); }
  info(message, meta) { this.logger.info(message, meta); }
  http(message, meta) { this.logger.http(message, meta); }
  verbose(message, meta) { this.logger.verbose(message, meta); }
  debug(message, meta) { this.logger.debug(message, meta); }
  silly(message, meta) { this.logger.silly(message, meta); }
}

// 创建单例实例
const loggerInstance = new Logger();

// 导出记录器和HTTP中间件
module.exports = {
  logger: loggerInstance,
  httpLogger: loggerInstance.httpLogger,
  
  // 快捷方法
  error: (message, meta) => loggerInstance.error(message, meta),
  warn: (message, meta) => loggerInstance.warn(message, meta),
  info: (message, meta) => loggerInstance.info(message, meta),
  http: (message, meta) => loggerInstance.http(message, meta),
  verbose: (message, meta) => loggerInstance.verbose(message, meta),
  debug: (message, meta) => loggerInstance.debug(message, meta),
  silly: (message, meta) => loggerInstance.silly(message, meta),
  
  // 专用方法
  logGameEvent: (event, data) => loggerInstance.logGameEvent(event, data),
  logUserActivity: (userId, action, details) => loggerInstance.logUserActivity(userId, action, details),
  logErrorWithContext: (error, context) => loggerInstance.logErrorWithContext(error, context),
  logPerformance: (operation, duration, details) => loggerInstance.logPerformance(operation, duration, details),
  logMetrics: (metrics) => loggerInstance.logMetrics(metrics),
  logAudit: (action, user, resource, details) => loggerInstance.logAudit(action, user, resource, details),
  logStartup: () => loggerInstance.logStartup()
};