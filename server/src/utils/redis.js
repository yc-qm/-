// server/src/utils/redis.js
const Redis = require('ioredis');
const { config } = require('../config');
const logger = require('./logger');

/**
 * Redis客户端管理器
 * 支持连接池、重试、监控等功能
 */
class RedisClient {
  constructor() {
    this.clients = new Map(); // 多实例支持
    this.pubClient = null;
    this.subClient = null;
    this.defaultClient = null;
    
    this.init();
  }

  /**
   * 初始化Redis连接
   */
  init() {
    // 创建默认客户端
    this.defaultClient = this.createClient('default');
    
    // 创建发布订阅客户端（独立连接）
    this.pubClient = this.createClient('pub', { lazyConnect: true });
    this.subClient = this.createClient('sub', { lazyConnect: true });
    
    // 监听连接事件
    this.setupEventListeners(this.defaultClient, 'default');
    this.setupEventListeners(this.pubClient, 'pub');
    this.setupEventListeners(this.subClient, 'sub');
  }

  /**
   * 创建Redis客户端
   */
  createClient(name, options = {}) {
    const clientOptions = {
      ...config.database.redis.options,
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000);
        logger.warn(`Redis客户端[${name}]重试第${times}次，延迟${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      enableReadyCheck: true,
      autoResubscribe: true,
      ...options
    };

    const client = new Redis(config.database.redis.uri, clientOptions);
    this.clients.set(name, client);
    
    return client;
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners(client, name) {
    client.on('connect', () => {
      logger.info(`Redis客户端[${name}]连接中...`);
    });

    client.on('ready', () => {
      logger.info(`✅ Redis客户端[${name}]已就绪`);
    });

    client.on('error', (error) => {
      logger.error(`❌ Redis客户端[${name}]错误: ${error.message}`);
    });

    client.on('close', () => {
      logger.warn(`⚠️  Redis客户端[${name}]连接关闭`);
    });

    client.on('reconnecting', (delay) => {
      logger.info(`🔄 Redis客户端[${name}]重新连接，延迟${delay}ms`);
    });

    client.on('end', () => {
      logger.warn(`🔚 Redis客户端[${name}]连接结束`);
    });
  }

  /**
   * 获取客户端
   */
  getClient(name = 'default') {
    return this.clients.get(name) || this.defaultClient;
  }

  /**
   * 获取发布客户端
   */
  getPubClient() {
    return this.pubClient;
  }

  /**
   * 获取订阅客户端
   */
  getSubClient() {
    return this.subClient;
  }

  /**
   * 设置缓存值
   */
  async set(key, value, ttl = null) {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
      
      if (ttl) {
        await this.defaultClient.setex(key, ttl, stringValue);
      } else {
        await this.defaultClient.set(key, stringValue);
      }
      
      return true;
    } catch (error) {
      logger.error(`Redis设置缓存失败: ${error.message}`, { key });
      throw error;
    }
  }

  /**
   * 获取缓存值
   */
  async get(key) {
    try {
      const value = await this.defaultClient.get(key);
      
      if (!value) return null;
      
      // 尝试解析JSON
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error(`Redis获取缓存失败: ${error.message}`, { key });
      throw error;
    }
  }

  /**
   * 删除缓存
   */
  async del(key) {
    try {
      const result = await this.defaultClient.del(key);
      return result > 0;
    } catch (error) {
      logger.error(`Redis删除缓存失败: ${error.message}`, { key });
      throw error;
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key) {
    try {
      const result = await this.defaultClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis检查键失败: ${error.message}`, { key });
      throw error;
    }
  }

  /**
   * 设置过期时间
   */
  async expire(key, seconds) {
    try {
      const result = await this.defaultClient.expire(key, seconds);
      return result === 1;
    } catch (error) {
      logger.error(`Redis设置过期时间失败: ${error.message}`, { key, seconds });
      throw error;
    }
  }

  /**
   * 获取剩余过期时间
   */
  async ttl(key) {
    try {
      return await this.defaultClient.ttl(key);
    } catch (error) {
      logger.error(`Redis获取过期时间失败: ${error.message}`, { key });
      throw error;
    }
  }

  /**
   * 递增计数器
   */
  async incr(key, increment = 1) {
    try {
      if (increment === 1) {
        return await this.defaultClient.incr(key);
      } else {
        return await this.defaultClient.incrby(key, increment);
      }
    } catch (error) {
      logger.error(`Redis递增失败: ${error.message}`, { key, increment });
      throw error;
    }
  }

  /**
   * 递减计数器
   */
  async decr(key, decrement = 1) {
    try {
      if (decrement === 1) {
        return await this.defaultClient.decr(key);
      } else {
        return await this.defaultClient.decrby(key, decrement);
      }
    } catch (error) {
      logger.error(`Redis递减失败: ${error.message}`, { key, decrement });
      throw error;
    }
  }

  /**
   * 哈希表操作
   */
  async hset(key, field, value) {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
      await this.defaultClient.hset(key, field, stringValue);
      return true;
    } catch (error) {
      logger.error(`Redis哈希设置失败: ${error.message}`, { key, field });
      throw error;
    }
  }

  async hget(key, field) {
    try {
      const value = await this.defaultClient.hget(key, field);
      
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error(`Redis哈希获取失败: ${error.message}`, { key, field });
      throw error;
    }
  }

  async hgetall(key) {
    try {
      const result = await this.defaultClient.hgetall(key);
      
      if (!result) return {};
      
      // 尝试解析JSON值
      const parsed = {};
      for (const [field, value] of Object.entries(result)) {
        try {
          parsed[field] = JSON.parse(value);
        } catch {
          parsed[field] = value;
        }
      }
      
      return parsed;
    } catch (error) {
      logger.error(`Redis哈希获取全部失败: ${error.message}`, { key });
      throw error;
    }
  }

  /**
   * 列表操作
   */
  async lpush(key, value) {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
      return await this.defaultClient.lpush(key, stringValue);
    } catch (error) {
      logger.error(`Redis列表左推失败: ${error.message}`, { key });
      throw error;
    }
  }

  async rpush(key, value) {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
      return await this.defaultClient.rpush(key, stringValue);
    } catch (error) {
      logger.error(`Redis列表右推失败: ${error.message}`, { key });
      throw error;
    }
  }

  async lrange(key, start, end) {
    try {
      const list = await this.defaultClient.lrange(key, start, end);
      
      return list.map(item => {
        try {
          return JSON.parse(item);
        } catch {
          return item;
        }
      });
    } catch (error) {
      logger.error(`Redis列表范围获取失败: ${error.message}`, { key, start, end });
      throw error;
    }
  }

  /**
   * 集合操作
   */
  async sadd(key, member) {
    try {
      const stringMember = typeof member === 'object' ? JSON.stringify(member) : member;
      return await this.defaultClient.sadd(key, stringMember);
    } catch (error) {
      logger.error(`Redis集合添加失败: ${error.message}`, { key });
      throw error;
    }
  }

  async smembers(key) {
    try {
      const set = await this.defaultClient.smembers(key);
      
      return set.map(item => {
        try {
          return JSON.parse(item);
        } catch {
          return item;
        }
      });
    } catch (error) {
      logger.error(`Redis集合获取失败: ${error.message}`, { key });
      throw error;
    }
  }

  async sismember(key, member) {
    try {
      const stringMember = typeof member === 'object' ? JSON.stringify(member) : member;
      return await this.defaultClient.sismember(key, stringMember) === 1;
    } catch (error) {
      logger.error(`Redis集合成员检查失败: ${error.message}`, { key });
      throw error;
    }
  }

  /**
   * 发布消息
   */
  async publish(channel, message) {
    try {
      const stringMessage = typeof message === 'object' ? JSON.stringify(message) : message;
      return await this.pubClient.publish(channel, stringMessage);
    } catch (error) {
      logger.error(`Redis发布消息失败: ${error.message}`, { channel });
      throw error;
    }
  }

  /**
   * 订阅频道
   */
  subscribe(channel, callback) {
    try {
      this.subClient.subscribe(channel, (err, count) => {
        if (err) {
          logger.error(`Redis订阅频道失败: ${err.message}`, { channel });
          return;
        }
        logger.info(`✅ Redis订阅频道: ${channel}, 订阅数: ${count}`);
      });

      this.subClient.on('message', (chan, message) => {
        if (chan === channel) {
          try {
            const parsed = JSON.parse(message);
            callback(parsed);
          } catch {
            callback(message);
          }
        }
      });
    } catch (error) {
      logger.error(`Redis订阅失败: ${error.message}`, { channel });
      throw error;
    }
  }

  /**
   * 分布式锁
   */
  async acquireLock(lockKey, ttl = 10000, retryDelay = 100, maxRetries = 10) {
    const lockValue = `${Date.now()}_${Math.random()}`;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const result = await this.defaultClient.set(
          `lock:${lockKey}`,
          lockValue,
          'PX',
          ttl,
          'NX'
        );

        if (result === 'OK') {
          return lockValue;
        }

        retries++;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } catch (error) {
        logger.error(`获取分布式锁失败: ${error.message}`, { lockKey });
        throw error;
      }
    }

    throw new Error(`获取锁超时: ${lockKey}`);
  }

  async releaseLock(lockKey, lockValue) {
    try {
      // 使用Lua脚本确保原子性操作
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.defaultClient.eval(
        luaScript,
        1,
        `lock:${lockKey}`,
        lockValue
      );

      return result === 1;
    } catch (error) {
      logger.error(`释放分布式锁失败: ${error.message}`, { lockKey });
      throw error;
    }
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    try {
      const info = await this.defaultClient.info();
      const stats = {
        connected_clients: 0,
        used_memory: 0,
        total_connections_received: 0,
        total_commands_processed: 0
      };

      const lines = info.split('\r\n');
      lines.forEach(line => {
        if (line.startsWith('connected_clients:')) {
          stats.connected_clients = parseInt(line.split(':')[1], 10);
        } else if (line.startsWith('used_memory:')) {
          stats.used_memory = parseInt(line.split(':')[1], 10);
        } else if (line.startsWith('total_connections_received:')) {
          stats.total_connections_received = parseInt(line.split(':')[1], 10);
        } else if (line.startsWith('total_commands_processed:')) {
          stats.total_commands_processed = parseInt(line.split(':')[1], 10);
        }
      });

      return stats;
    } catch (error) {
      logger.error(`获取Redis统计信息失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 清空缓存（谨慎使用）
   */
  async flush(scope = 'all') {
    try {
      if (scope === 'all') {
        await this.defaultClient.flushall();
        logger.info('Redis缓存已全部清空');
      } else if (scope === 'db') {
        await this.defaultClient.flushdb();
        logger.info('当前数据库缓存已清空');
      }
      
      return true;
    } catch (error) {
      logger.error(`清空Redis缓存失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 关闭所有连接
   */
  async closeAll() {
    logger.info('正在关闭所有Redis连接...');
    
    const closePromises = Array.from(this.clients.values()).map(client => 
      client.quit().then(() => {
        logger.info(`Redis客户端已关闭`);
      }).catch(err => {
        logger.warn(`关闭Redis客户端失败: ${err.message}`);
      })
    );

    await Promise.allSettled(closePromises);
    logger.info('所有Redis连接已关闭');
  }
}

// 创建单例实例
const redisClient = new RedisClient();

// 导出常用方法
module.exports = {
  redis: redisClient,
  
  // 快捷方法
  set: (key, value, ttl) => redisClient.set(key, value, ttl),
  get: (key) => redisClient.get(key),
  del: (key) => redisClient.del(key),
  exists: (key) => redisClient.exists(key),
  expire: (key, seconds) => redisClient.expire(key, seconds),
  ttl: (key) => redisClient.ttl(key),
  
  // 高级方法
  incr: (key, increment) => redisClient.incr(key, increment),
  decr: (key, decrement) => redisClient.decr(key, decrement),
  
  // 哈希方法
  hset: (key, field, value) => redisClient.hset(key, field, value),
  hget: (key, field) => redisClient.hget(key, field),
  hgetall: (key) => redisClient.hgetall(key),
  
  // 发布订阅
  publish: (channel, message) => redisClient.publish(channel, message),
  subscribe: (channel, callback) => redisClient.subscribe(channel, callback),
  
  // 分布式锁
  acquireLock: (lockKey, ttl, retryDelay, maxRetries) => 
    redisClient.acquireLock(lockKey, ttl, retryDelay, maxRetries),
  releaseLock: (lockKey, lockValue) => redisClient.releaseLock(lockKey, lockValue),
  
  // 管理方法
  getStats: () => redisClient.getStats(),
  flush: (scope) => redisClient.flush(scope),
  closeAll: () => redisClient.closeAll(),
  
  // 获取客户端
  getClient: (name) => redisClient.getClient(name),
  getPubClient: () => redisClient.getPubClient(),
  getSubClient: () => redisClient.getSubClient()
};