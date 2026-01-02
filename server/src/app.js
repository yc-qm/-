// server/src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// 自定义模块
const { config, validateConfig } = require('./config');
const { logger, httpLogger } = require('./utils/logger');
const { dbManager } = require('./config/database');
const { authenticate, rateLimit: customRateLimit } = require('./middleware/auth');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');

/**
 * Express应用类
 */
class App {
  constructor() {
    this.app = express();
    this.server = null;
    
    this.init();
  }

  /**
   * 初始化应用
   */
  async init() {
    try {
      // 1. 验证配置
      this.validateConfig();
      
      // 2. 初始化中间件
      this.initMiddleware();
      
      // 3. 连接数据库
      await this.connectDatabase();
      
      // 4. 初始化路由
      this.initRoutes();
      
      // 5. 初始化错误处理
      this.initErrorHandling();
      
      // 6. 启动成功日志
      this.logStartup();
      
    } catch (error) {
      logger.error(`应用初始化失败: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * 验证配置
   */
  validateConfig() {
    const isValid = validateConfig();
    if (!isValid && config.isProduction()) {
      throw new Error('配置验证失败');
    }
  }

  /**
   * 初始化中间件
   */
  initMiddleware() {
    // 安全中间件
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", config.server.baseUrl, "wss://*"],
          fontSrc: ["'self'", "https:", "data:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        }
      },
      crossOriginEmbedderPolicy: false // 微信小程序需要
    }));

    // CORS配置
    this.app.use(cors({
      origin: (origin, callback) => {
        // 允许微信小程序请求
        if (!origin || origin.includes('file://') || config.server.corsOrigin.includes('*') || config.server.corsOrigin.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('不允许的跨域请求'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // 请求体解析
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 压缩响应
    this.app.use(compression());

    // HTTP请求日志
    this.app.use(httpLogger);

    // Morgan日志（开发环境）
    if (config.isDevelopment()) {
      this.app.use(morgan('dev'));
    }

    // 全局速率限制
    const globalLimiter = rateLimit({
      windowMs: config.server.rateLimit.windowMs,
      max: config.server.rateLimit.max,
      message: '请求过于频繁，请稍后再试',
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // 跳过健康检查
        return req.path === '/health' || req.path === '/api/status';
      }
    });

    // 慢速限制（防止暴力攻击）
    const speedLimiter = slowDown({
      windowMs: 15 * 60 * 1000, // 15分钟
      delayAfter: 50, // 50个请求后开始延迟
      delayMs: 100 // 每次请求延迟100ms
    });

    this.app.use(globalLimiter);
    this.app.use(speedLimiter);

    // 静态文件服务
    this.app.use('/uploads', express.static(config.server.upload.uploadPath, {
      maxAge: '1d',
      setHeaders: (res, path) => {
        res.set('Cache-Control', 'public, max-age=86400');
      }
    }));

    // 健康检查端点（不需要认证）
    this.app.get('/health', async (req, res) => {
      try {
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: require('./utils/helpers').getMemoryUsage(),
          database: await dbManager.healthCheck()
        };

        // 检查所有服务是否健康
        const unhealthy = health.database.filter(service => service.status !== 'healthy');
        if (unhealthy.length > 0) {
          health.status = 'degraded';
          health.unhealthyServices = unhealthy.map(s => s.service);
        }

        res.status(200).json(health);
      } catch (error) {
        logger.error('健康检查失败:', error);
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    });

    // 版本信息
    this.app.get('/version', (req, res) => {
      res.json({
        name: 'wechat-poker-game',
        version: '1.0.0',
        environment: config.server.env,
        build: process.env.BUILD_NUMBER || 'local',
        commit: process.env.COMMIT_HASH || 'unknown'
      });
    });
  }

  /**
   * 连接数据库
   */
  async connectDatabase() {
    try {
      logger.info('正在连接数据库...');
      
      // 连接MongoDB
      await dbManager.connectMongoDB();
      
      // 连接Redis
      await dbManager.connectRedis();
      
      // 初始化索引
      await dbManager.initIndexes();
      
      logger.info('✅ 所有数据库连接成功');
    } catch (error) {
      logger.error(`数据库连接失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 初始化路由
   */
  initRoutes() {
    // API文档重定向
    this.app.get('/api/docs', (req, res) => {
      res.redirect('https://github.com/your-repo/wechat-poker-game/blob/master/docs/API.md');
    });

    // API路由
    this.app.use('/', routes);

    // WebSocket测试端点
    this.app.get('/ws-test', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>WebSocket测试</title>
          <script>
            const ws = new WebSocket('ws://' + window.location.host);
            
            ws.onopen = () => {
              console.log('WebSocket连接已打开');
              ws.send(JSON.stringify({ type: 'ping' }));
            };
            
            ws.onmessage = (event) => {
              console.log('收到消息:', event.data);
            };
            
            ws.onerror = (error) => {
              console.error('WebSocket错误:', error);
            };
            
            ws.onclose = () => {
              console.log('WebSocket连接已关闭');
            };
          </script>
        </head>
        <body>
          <h1>WebSocket测试页面</h1>
          <p>打开控制台查看连接状态</p>
        </body>
        </html>
      `);
    });
  }

  /**
   * 初始化错误处理
   */
  initErrorHandling() {
    // 404处理
    this.app.use(notFoundHandler);
    
    // 全局错误处理
    this.app.use(globalErrorHandler);
  }

  /**
   * 启动成功日志
   */
  logStartup() {
    logger.logStartup();
    
    // 打印路由信息
    const routeCount = this.app._router.stack
      .filter(layer => layer.route)
      .length;
    
    logger.info(`已加载 ${routeCount} 个路由端点`);
    
    // 打印数据库状态
    const dbStatus = dbManager.getAllStatus();
    logger.info('数据库状态:', dbStatus);
  }

  /**
   * 启动服务器
   */
  start(port = config.server.port) {
    this.server = this.app.listen(port, config.server.host, () => {
      logger.info(`🚀 服务器启动成功`);
      logger.info(`📍 地址: http://${config.server.host}:${port}`);
      logger.info(`🌍 环境: ${config.server.env}`);
      
      // 打印有用的URL
      logger.info(`📊 健康检查: http://${config.server.host}:${port}/health`);
      logger.info(`📋 API状态: http://${config.server.host}:${port}/api/status`);
      logger.info(`⚡ 性能监控: http://${config.server.host}:${port}/metrics`);
    });

    // 优雅关闭处理
    this.setupGracefulShutdown();

    return this.server;
  }

  /**
   * 设置优雅关闭
   */
  setupGracefulShutdown() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        logger.info(`收到 ${signal} 信号，开始优雅关闭...`);
        
        // 1. 停止接收新请求
        if (this.server) {
          this.server.close(() => {
            logger.info('HTTP服务器已关闭');
          });
        }
        
        // 2. 关闭数据库连接
        await dbManager.gracefulShutdown();
        
        // 3. 关闭其他资源
        
        // 4. 退出进程
        logger.info('优雅关闭完成，退出进程');
        process.exit(0);
      });
    });

    // 未捕获异常处理
    process.on('uncaughtException', (error) => {
      logger.error('未捕获的异常:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('未处理的Promise拒绝:', reason);
    });
  }

  /**
   * 获取Express应用实例
   */
  getApp() {
    return this.app;
  }

  /**
   * 获取HTTP服务器实例
   */
  getServer() {
    return this.server;
  }

  /**
   * 获取应用状态
   */
  getStatus() {
    return {
      uptime: process.uptime(),
      memory: require('./utils/helpers').getMemoryUsage(),
      database: dbManager.getAllStatus(),
      connections: this.server ? this.server._connections : 0
    };
  }
}

// 创建应用实例
const appInstance = new App();

// 导出应用实例和启动函数
module.exports = {
  App,
  app: appInstance.getApp(),
  start: (port) => appInstance.start(port),
  getStatus: () => appInstance.getStatus()
};