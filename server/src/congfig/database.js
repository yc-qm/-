// server/src/config/database.js
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { config } = require('./index');
const logger = require('../utils/logger');

/**
 * 数据库连接管理器
 */
class DatabaseManager {
  constructor() {
    this.mongoClient = null;
    this.redisClient = null;
    this.connectionState = {
      mongodb: false,
      redis: false
    };
  }

  /**
   * 连接MongoDB
   */
  async connectMongoDB() {
    try {
      // 连接事件监听
      mongoose.connection.on('connecting', () => {
        logger.info('正在连接MongoDB...');
      });

      mongoose.connection.on('connected', () => {
        logger.info('✅ MongoDB连接成功');
        this.connectionState.mongodb = true;
      });

      mongoose.connection.on('error', (err) => {
        logger.error(`❌ MongoDB连接错误: ${err.message}`);
        this.connectionState.mongodb = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('⚠️  MongoDB连接断开');
        this.connectionState.mongodb = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('🔄 MongoDB重新连接成功');
        this.connectionState.mongodb = true;
      });

      // 连接MongoDB
      await mongoose.connect(
        config.database.mongodb.uri,
        config.database.mongodb.options
      );

      this.mongoClient = mongoose.connection;
      return this.mongoClient;
    } catch (error) {
      logger.error(`MongoDB连接失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 连接Redis
   */
  async connectRedis() {
    try {
      this.redisClient = new Redis(config.database.redis.uri, {
        ...config.database.redis.options,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          logger.warn(`Redis连接重试第${times}次，延迟${delay}ms`);
          return delay;
        }
      });

      // Redis事件监听
      this.redisClient.on('connect', () => {
        logger.info('正在连接Redis...');
      });

      this.redisClient.on('ready', () => {
        logger.info('✅ Redis连接就绪');
        this.connectionState.redis = true;
      });

      this.redisClient.on('error', (err) => {
        logger.error(`❌ Redis连接错误: ${err.message}`);
        this.connectionState.redis = false;
      });

      this.redisClient.on('close', () => {
        logger.warn('⚠️  Redis连接关闭');
        this.connectionState.redis = false;
      });

      this.redisClient.on('reconnecting', () => {
        logger.info('🔄 Redis重新连接中...');
      });

      // 测试Redis连接
      await this.redisClient.ping();
      logger.info('Redis连接测试成功');

      return this.redisClient;
    } catch (error) {
      logger.error(`Redis连接失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取MongoDB连接状态
   */
  getMongoDBStatus() {
    return {
      connected: this.connectionState.mongodb,
      readyState: this.mongoClient ? this.mongoClient.readyState : 0,
      host: this.mongoClient ? this.mongoClient.host : null,
      name: this.mongoClient ? this.mongoClient.name : null
    };
  }

  /**
   * 获取Redis连接状态
   */
  getRedisStatus() {
    return {
      connected: this.connectionState.redis,
      status: this.redisClient ? this.redisClient.status : 'disconnected'
    };
  }

  /**
   * 获取所有数据库连接状态
   */
  getAllStatus() {
    return {
      mongodb: this.getMongoDBStatus(),
      redis: this.getRedisStatus(),
      allConnected: this.connectionState.mongodb && this.connectionState.redis
    };
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    const checks = [];

    // MongoDB健康检查
    try {
      if (this.mongoClient && this.mongoClient.db) {
        await this.mongoClient.db.admin().ping();
        checks.push({
          service: 'mongodb',
          status: 'healthy',
          latency: Date.now() - (this.mongoClient.lastPingTime || Date.now())
        });
        this.mongoClient.lastPingTime = Date.now();
      } else {
        checks.push({
          service: 'mongodb',
          status: 'unavailable',
          error: '未连接'
        });
      }
    } catch (error) {
      checks.push({
        service: 'mongodb',
        status: 'unhealthy',
        error: error.message
      });
    }

    // Redis健康检查
    try {
      if (this.redisClient) {
        const startTime = Date.now();
        await this.redisClient.ping();
        const latency = Date.now() - startTime;
        
        checks.push({
          service: 'redis',
          status: 'healthy',
          latency: latency
        });
      } else {
        checks.push({
          service: 'redis',
          status: 'unavailable',
          error: '未连接'
        });
      }
    } catch (error) {
      checks.push({
        service: 'redis',
        status: 'unhealthy',
        error: error.message
      });
    }

    return checks;
  }

  /**
   * 优雅关闭数据库连接
   */
  async gracefulShutdown() {
    logger.info('开始关闭数据库连接...');

    const shutdownPromises = [];

    // 关闭MongoDB连接
    if (this.mongoClient) {
      shutdownPromises.push(
        new Promise((resolve) => {
          this.mongoClient.close(false, (err) => {
            if (err) {
              logger.error(`关闭MongoDB连接失败: ${err.message}`);
            } else {
              logger.info('MongoDB连接已关闭');
            }
            resolve();
          });
        })
      );
    }

    // 关闭Redis连接
    if (this.redisClient) {
      shutdownPromises.push(
        this.redisClient.quit().then(() => {
          logger.info('Redis连接已关闭');
        }).catch((err) => {
          logger.error(`关闭Redis连接失败: ${err.message}`);
        })
      );
    }

    await Promise.allSettled(shutdownPromises);
    logger.info('所有数据库连接已关闭');
  }

  /**
   * 初始化数据库索引
   */
  async initIndexes() {
    try {
      logger.info('开始初始化数据库索引...');

      // 这里可以添加各种集合的索引创建
      // 例如：await User.createIndexes();

      logger.info('数据库索引初始化完成');
    } catch (error) {
      logger.error(`初始化数据库索引失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 执行数据库维护任务
   */
  async maintenance() {
    try {
      logger.info('开始数据库维护任务...');

      // 清理过期数据
      const expiredDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30天前
      
      // 示例：清理过期的游戏记录
      // const result = await GameRecord.deleteMany({ createdAt: { $lt: expiredDate } });
      // logger.info(`清理了${result.deletedCount}条过期游戏记录`);

      logger.info('数据库维护任务完成');
    } catch (error) {
      logger.error(`数据库维护任务失败: ${error.message}`);
    }
  }
}

// 创建单例实例
const dbManager = new DatabaseManager();

// 导出连接函数和实例
module.exports = {
  dbManager,
  connectMongoDB: () => dbManager.connectMongoDB(),
  connectRedis: () => dbManager.connectRedis(),
  getMongoDBStatus: () => dbManager.getMongoDBStatus(),
  getRedisStatus: () => dbManager.getRedisStatus(),
  getAllStatus: () => dbManager.getAllStatus(),
  healthCheck: () => dbManager.healthCheck(),
  gracefulShutdown: () => dbManager.gracefulShutdown(),
  initIndexes: () => dbManager.initIndexes(),
  maintenance: () => dbManager.maintenance()
};