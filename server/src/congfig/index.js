// server/src/config/index.js
require('dotenv').config();
const path = require('path');

/**
 * 配置类
 * 统一管理所有配置项，支持环境变量覆盖
 */
class Config {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
    this.rootPath = path.resolve(__dirname, '../..');
  }

  // 服务器配置
  get server() {
    return {
      env: this.env,
      port: parseInt(process.env.PORT, 10) || 3000,
      host: process.env.HOST || '0.0.0.0',
      baseUrl: process.env.BASE_URL || `http://localhost:${this.server.port}`,
      corsOrigin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['*'],
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15分钟
        max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100
      },
      upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 2 * 1024 * 1024, // 2MB
        uploadPath: process.env.UPLOAD_PATH || path.join(this.rootPath, 'uploads'),
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif']
      }
    };
  }

  // 数据库配置
  get database() {
    return {
      mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/wechat_poker',
        options: {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          poolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          family: 4
        }
      },
      redis: {
        uri: process.env.REDIS_URI || 'redis://localhost:6379',
        options: {
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          autoResubscribe: true
        }
      }
    };
  }

  // JWT配置
  get jwt() {
    return {
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      expiresIn: process.env.JWT_EXPIRE || '7d',
      algorithm: 'HS256',
      issuer: 'wechat-poker-game',
      audience: 'wechat-poker-users'
    };
  }

  // 微信小程序配置
  get wechat() {
    return {
      appId: process.env.WX_APPID,
      appSecret: process.env.WX_SECRET,
      loginUrl: 'https://api.weixin.qq.com/sns/jscode2session',
      templateIds: {
        gameInvite: process.env.WX_TEMPLATE_GAME_INVITE,
        gameResult: process.env.WX_TEMPLATE_GAME_RESULT
      }
    };
  }

  // 支付配置
  get payment() {
    return {
      wechatPay: {
        mchId: process.env.WX_PAY_MCHID,
        apiKey: process.env.WX_PAY_KEY,
        certPath: process.env.WX_PAY_CERT_PATH,
        notifyUrl: process.env.WX_PAY_NOTIFY_URL || `${this.server.baseUrl}/api/payment/wechat/notify`
      },
      alipay: {
        appId: process.env.ALIPAY_APPID,
        privateKey: process.env.ALIPAY_PRIVATE_KEY,
        publicKey: process.env.ALIPAY_PUBLIC_KEY,
        notifyUrl: process.env.ALIPAY_NOTIFY_URL || `${this.server.baseUrl}/api/payment/alipay/notify`
      },
      exchangeRate: {
        rmbToCoin: 100, // 1元 = 100金币
        coinToDiamond: 1000 // 1000金币 = 1钻石
      }
    };
  }

  // 游戏配置
  get game() {
    return {
      minPlayers: 4,
      maxPlayers: 4,
      baseScore: parseInt(process.env.BASE_SCORE, 10) || 100,
      maxRoundTime: 30000, // 出牌时间30秒
      maxThinkTime: 15000, // 加倍思考时间15秒
      autoStartDelay: 5000, // 满员后自动开始延迟
      maxRoomIdleTime: parseInt(process.env.MAX_ROOM_IDLE_TIME, 10) || 3600, // 房间空闲超时（秒）
      scoreMultipliers: {
        normal: 1,
        double: 2,
        triple: 3,
        bomb: 2, // 炸弹倍数
        spring: 2 // 春天倍数
      },
      cardValueMap: {
        3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8, 11: 9, // J
        12: 10, // Q
        13: 11, // K
        14: 12, // A
        15: 13, // 2
        16: 14, // 小王
        17: 15  // 大王
      }
    };
  }

  // 邮件配置
  get email() {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      from: process.env.EMAIL_FROM || 'noreply@wechat-poker.com',
      templates: {
        welcome: 'welcome',
        resetPassword: 'reset-password',
        gameNotification: 'game-notification'
      }
    };
  }

  // 日志配置
  get log() {
    return {
      level: process.env.LOG_LEVEL || (this.env === 'production' ? 'info' : 'debug'),
      path: process.env.LOG_PATH || path.join(this.rootPath, 'logs'),
      maxSize: '10m',
      maxFiles: '30d',
      format: ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
    };
  }

  // 缓存配置
  get cache() {
    return {
      ttl: {
        roomState: 3600, // 房间状态缓存1小时
        userSession: 86400, // 用户会话缓存1天
        leaderboard: 300, // 排行榜缓存5分钟
        gameResult: 604800 // 游戏结果缓存7天
      },
      prefix: {
        room: 'room:',
        user: 'user:',
        game: 'game:',
        lock: 'lock:'
      }
    };
  }

  // 定时任务配置
  get cron() {
    return {
      cleanRooms: '0 */5 * * * *', // 每5分钟清理空闲房间
      updateLeaderboard: '0 */10 * * * *', // 每10分钟更新排行榜
      sendNotifications: '0 */15 * * * *', // 每15分钟发送通知
      backupDatabase: '0 0 2 * * *' // 每天凌晨2点备份数据库
    };
  }

  // 验证配置
  get validation() {
    return {
      nickname: {
        minLength: 2,
        maxLength: 12,
        pattern: /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/
      },
      password: {
        minLength: 6,
        maxLength: 20,
        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,20}$/
      },
      room: {
        name: {
          minLength: 1,
          maxLength: 20
        },
        password: {
          minLength: 4,
          maxLength: 6,
          pattern: /^\d+$/
        }
      }
    };
  }

  // 监控配置
  get monitoring() {
    return {
      enabled: process.env.MONITORING_ENABLED === 'true',
      sentryDsn: process.env.SENTRY_DSN,
      newRelicKey: process.env.NEW_RELIC_KEY,
      metricsPort: parseInt(process.env.METRICS_PORT, 10) || 9090
    };
  }

  // 环境检测
  isProduction() {
    return this.env === 'production';
  }

  isDevelopment() {
    return this.env === 'development';
  }

  isTest() {
    return this.env === 'test';
  }

  // 获取完整配置
  getAll() {
    return {
      server: this.server,
      database: this.database,
      jwt: this.jwt,
      wechat: this.wechat,
      payment: this.payment,
      game: this.game,
      email: this.email,
      log: this.log,
      cache: this.cache,
      cron: this.cron,
      validation: this.validation,
      monitoring: this.monitoring
    };
  }
}

// 创建单例配置实例
const config = new Config();

// 配置验证函数
const validateConfig = () => {
  const errors = [];

  // 生产环境必须配置
  if (config.isProduction()) {
    if (!config.jwt.secret || config.jwt.secret.includes('change-in-production')) {
      errors.push('JWT_SECRET必须在生产环境中设置');
    }

    if (!config.wechat.appId || !config.wechat.appSecret) {
      errors.push('微信小程序配置(WX_APPID, WX_SECRET)必须设置');
    }

    if (!process.env.MONGODB_URI) {
      errors.push('MONGODB_URI必须设置');
    }
  }

  // 配置完整性检查
  const required = [
    'JWT_SECRET',
    'MONGODB_URI'
  ];

  required.forEach(key => {
    if (!process.env[key] && config.isProduction()) {
      errors.push(`环境变量 ${key} 必须设置`);
    }
  });

  if (errors.length > 0) {
    console.error('配置验证失败:');
    errors.forEach(error => console.error(`  - ${error}`));
    
    if (config.isProduction()) {
      throw new Error('配置验证失败，请检查环境变量设置');
    } else {
      console.warn('⚠️  开发环境配置不完整，请检查.env文件');
    }
  }

  return errors.length === 0;
};

// 导出配置和验证函数
module.exports = {
  config,
  validateConfig
};