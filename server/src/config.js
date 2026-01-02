// server/src/config.js
require('dotenv').config();

const config = {
  // 服务器配置
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  
  // 数据库配置
  database: {
    url: process.env.DATABASE_URL || 'mongodb://localhost:27017/poker_game',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: true
    }
  },
  
  // Redis配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: process.env.REDIS_DB || 0
  },
  
  // JWT配置
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  
  // 微信配置
  wechat: {
    appId: process.env.WECHAT_APP_ID || '',
    appSecret: process.env.WECHAT_APP_SECRET || ''
  },
  
  // 游戏配置
  game: {
    maxPlayers: 4,
    minPlayers: 4,
    baseGolds: [200, 500, 1000, 2000, 5000],
    timeLimits: {
      playCard: 30, // 出牌时间限制（秒）
      doubling: 15, // 加倍选择时间限制（秒）
      ready: 10     // 准备时间限制（秒）
    },
    penalties: {
      escape: 100, // 逃跑惩罚金币
      timeout: 50  // 超时惩罚金币
    }
  },
  
  // Socket.IO配置
  socket: {
    pingInterval: 25000,
    pingTimeout: 60000,
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  },
  
  // 日志配置
  logLevel: process.env.LOG_LEVEL || 'info'
};

module.exports = config;