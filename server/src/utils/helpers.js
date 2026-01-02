// server/src/utils/helpers.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { config } = require('../config');
const logger = require('./logger');

/**
 * 字符串工具类
 */
class StringHelper {
  /**
   * 生成随机字符串
   */
  static randomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 生成随机数字
   */
  static randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 生成房间号
   */
  static generateRoomCode(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 生成游戏ID
   */
  static generateGameId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `game_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * 截断字符串
   */
  static truncate(str, length, suffix = '...') {
    if (str.length <= length) return str;
    return str.substr(0, length - suffix.length) + suffix;
  }

  /**
   * 隐藏敏感信息
   */
  static maskSensitive(str, visibleChars = 4) {
    if (!str || str.length <= visibleChars * 2) return '***';
    const start = str.substr(0, visibleChars);
    const end = str.substr(-visibleChars);
    return `${start}***${end}`;
  }

  /**
   * 格式化手机号
   */
  static formatPhone(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1****$3');
    }
    return phone;
  }

  /**
   * 生成牌组ID
   */
  static generateCardId(value, suit) {
    return `${suit}_${value}`;
  }

  /**
   * 解析牌组ID
   */
  static parseCardId(cardId) {
    const parts = cardId.split('_');
    if (parts.length !== 2) return null;
    return {
      suit: parts[0],
      value: parseInt(parts[1], 10)
    };
  }
}

/**
 * 加密工具类
 */
class CryptoHelper {
  /**
   * 生成密码哈希
   */
  static async hashPassword(password) {
    try {
      const salt = await bcrypt.genSalt(10);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      logger.error(`密码哈希失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 验证密码
   */
  static async verifyPassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      logger.error(`密码验证失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 生成JWT令牌
   */
  static generateToken(payload, expiresIn = null) {
    try {
      const options = {
        algorithm: config.jwt.algorithm,
        issuer: config.jwt.issuer,
        audience: config.jwt.audience
      };

      if (expiresIn) {
        options.expiresIn = expiresIn;
      } else {
        options.expiresIn = config.jwt.expiresIn;
      }

      return jwt.sign(payload, config.jwt.secret, options);
    } catch (error) {
      logger.error(`生成JWT令牌失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 验证JWT令牌
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret, {
        algorithms: [config.jwt.algorithm],
        issuer: config.jwt.issuer,
        audience: config.jwt.audience
      });
    } catch (error) {
      logger.error(`验证JWT令牌失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 生成微信签名
   */
  static generateWechatSignature(params, key) {
    // 按照微信支付签名规则生成签名
    const sortedParams = Object.keys(params)
      .filter(k => params[k] && k !== 'sign')
      .sort()
      .map(k => `${k}=${params[k]}`)
      .join('&');
    
    const signString = `${sortedParams}&key=${key}`;
    return crypto.createHash('md5').update(signString).digest('hex').toUpperCase();
  }

  /**
   * AES加密
   */
  static aesEncrypt(data, key, iv) {
    try {
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      return encrypted;
    } catch (error) {
      logger.error(`AES加密失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * AES解密
   */
  static aesDecrypt(encrypted, key, iv) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error(`AES解密失败: ${error.message}`);
      throw error;
    }
  }
}

/**
 * 时间工具类
 */
class TimeHelper {
  /**
   * 格式化时间
   */
  static formatTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
    const d = date instanceof Date ? date : new Date(date);
    
    const pad = (n) => n.toString().padStart(2, '0');
    
    const replacements = {
      YYYY: d.getFullYear(),
      MM: pad(d.getMonth() + 1),
      DD: pad(d.getDate()),
      HH: pad(d.getHours()),
      mm: pad(d.getMinutes()),
      ss: pad(d.getSeconds()),
      SSS: pad(d.getMilliseconds(), 3)
    };

    return format.replace(/YYYY|MM|DD|HH|mm|ss|SSS/g, match => replacements[match]);
  }

  /**
   * 计算时间差（人类可读格式）
   */
  static timeDiff(start, end = new Date()) {
    const diff = Math.abs(new Date(end) - new Date(start));
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}秒前`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟前`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时前`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}天前`;
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}个月前`;
    return `${Math.floor(seconds / 31536000)}年前`;
  }

  /**
   * 获取当前时间戳（毫秒）
   */
  static timestamp() {
    return Date.now();
  }

  /**
   * 获取当前时间戳（秒）
   */
  static timestampSeconds() {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * 延迟执行
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 生成Cron表达式（相对时间）
   */
  static cronFromNow(minutes = 5) {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    
    return `${now.getSeconds()} ${now.getMinutes()} ${now.getHours()} ${now.getDate()} ${now.getMonth() + 1} *`;
  }

  /**
   * 判断是否在同一天
   */
  static isSameDay(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }
}

/**
 * 验证工具类
 */
class ValidationHelper {
  /**
   * 验证邮箱格式
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证手机号格式
   */
  static isValidPhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 验证身份证格式
   */
  static isValidIdCard(idCard) {
    const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
    return idCardRegex.test(idCard);
  }

  /**
   * 验证URL格式
   */
  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证JSON字符串
   */
  static isValidJson(str) {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证IP地址
   */
  static isValidIp(ip) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  /**
   * 验证微信OpenId格式
   */
  static isValidWechatOpenId(openId) {
    return openId && openId.length >= 28 && openId.length <= 32;
  }

  /**
   * 验证牌数组
   */
  static isValidCardArray(cards) {
    if (!Array.isArray(cards)) return false;
    
    return cards.every(card => {
      return card && 
             typeof card === 'object' &&
             'value' in card && 
             'suit' in card &&
             card.value >= 3 && card.value <= 17 &&
             ['spades', 'hearts', 'clubs', 'diamonds', 'joker'].includes(card.suit);
    });
  }
}

/**
 * 文件工具类
 */
class FileHelper {
  /**
   * 获取文件扩展名
   */
  static getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  }

  /**
   * 获取文件MIME类型
   */
  static getMimeType(extension) {
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'json': 'application/json'
    };
    
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * 生成唯一文件名
   */
  static generateUniqueFilename(originalName) {
    const ext = this.getFileExtension(originalName);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${timestamp}_${random}.${ext}`;
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 检查文件类型是否允许
   */
  static isAllowedFileType(filename, allowedTypes) {
    const ext = this.getFileExtension(filename).toLowerCase();
    return allowedTypes.includes(ext);
  }
}

/**
 * 游戏工具类
 */
class GameHelper {
  /**
   * 计算牌型分数
   */
  static calculateCardsScore(cards) {
    if (!cards || !cards.length) return 0;
    
    // 牌值映射（3最小，大王最大）
    const valueScores = {
      3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8, 11: 9, // J
      12: 10, // Q
      13: 11, // K
      14: 12, // A
      15: 13, // 2
      16: 14, // 小王
      17: 15  // 大王
    };
    
    return cards.reduce((sum, card) => sum + (valueScores[card.value] || 0), 0);
  }

  /**
   * 判断是否是顺子
   */
  static isStraight(cards) {
    if (cards.length < 5) return false;
    
    const values = cards.map(c => c.value).sort((a, b) => a - b);
    
    // 检查是否连续
    for (let i = 1; i < values.length; i++) {
      if (values[i] !== values[i - 1] + 1) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 计算加倍后的分数
   */
  static calculateFinalScore(baseScore, multiplier, hasBomb = false, isSpring = false) {
    let finalScore = baseScore * multiplier;
    
    if (hasBomb) {
      finalScore *= config.game.scoreMultipliers.bomb;
    }
    
    if (isSpring) {
      finalScore *= config.game.scoreMultipliers.spring;
    }
    
    return Math.round(finalScore);
  }

  /**
   * 生成座位安排（四人两两组队）
   */
  static generateSeating(playerIds) {
    if (playerIds.length !== 4) {
      throw new Error('需要4个玩家才能生成座位安排');
    }
    
    // 洗牌
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
    
    // 座位：0-北，1-东，2-南，3-西
    // 队友关系：0和2是队友，1和3是队友
    return {
      seats: {
        north: shuffled[0],
        east: shuffled[1],
        south: shuffled[2],
        west: shuffled[3]
      },
      teams: [
        [shuffled[0], shuffled[2]], // 队友1
        [shuffled[1], shuffled[3]]  // 队友2
      ]
    };
  }

  /**
   * 获取下一个玩家位置
   */
  static getNextPlayerPosition(currentPosition, direction = 'clockwise') {
    const positions = ['north', 'east', 'south', 'west'];
    const currentIndex = positions.indexOf(currentPosition);
    
    if (currentIndex === -1) return 'north';
    
    if (direction === 'clockwise') {
      return positions[(currentIndex + 1) % 4];
    } else {
      return positions[(currentIndex + 3) % 4];
    }
  }

  /**
   * 判断游戏是否结束
   */
  static isGameOver(players) {
    return players.some(player => player.cards && player.cards.length === 0);
  }

  /**
   * 计算游戏排名
   */
  static calculateRanking(players) {
    // 按剩余牌数排序，牌少的排名高
    return [...players]
      .filter(p => p.cards)
      .sort((a, b) => a.cards.length - b.cards.length)
      .map((player, index) => ({
        playerId: player.id,
        rank: index + 1,
        cardsLeft: player.cards.length
      }));
  }
}

/**
 * 响应工具类
 */
class ResponseHelper {
  /**
   * 成功响应
   */
  static success(data = null, message = '操作成功') {
    return {
      success: true,
      code: 200,
      message,
      data,
      timestamp: TimeHelper.timestamp()
    };
  }

  /**
   * 分页响应
   */
  static pagination(data, page, limit, total) {
    return {
      success: true,
      code: 200,
      message: '获取成功',
      data: {
        items: data,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total: parseInt(total, 10),
          pages: Math.ceil(total / limit)
        }
      },
      timestamp: TimeHelper.timestamp()
    };
  }

  /**
   * 错误响应
   */
  static error(message = '操作失败', code = 500, errors = null) {
    return {
      success: false,
      code,
      message,
      errors,
      timestamp: TimeHelper.timestamp()
    };
  }

  /**
   * 验证错误响应
   */
  static validationError(errors) {
    return {
      success: false,
      code: 400,
      message: '参数验证失败',
      errors,
      timestamp: TimeHelper.timestamp()
    };
  }

  /**
   * 未认证响应
   */
  static unauthorized(message = '未认证') {
    return {
      success: false,
      code: 401,
      message,
      timestamp: TimeHelper.timestamp()
    };
  }

  /**
   * 权限不足响应
   */
  static forbidden(message = '权限不足') {
    return {
      success: false,
      code: 403,
      message,
      timestamp: TimeHelper.timestamp()
    };
  }

  /**
   * 资源不存在响应
   */
  static notFound(message = '资源不存在') {
    return {
      success: false,
      code: 404,
      message,
      timestamp: TimeHelper.timestamp()
    };
  }

  /**
   * 频率限制响应
   */
  static rateLimit(message = '请求过于频繁') {
    return {
      success: false,
      code: 429,
      message,
      timestamp: TimeHelper.timestamp()
    };
  }
}

/**
 * 性能监控工具类
 */
class PerformanceHelper {
  constructor() {
    this.metrics = new Map();
  }

  /**
   * 开始计时
   */
  start(name) {
    this.metrics.set(name, {
      start: process.hrtime(),
      end: null,
      duration: null
    });
  }

  /**
   * 结束计时
   */
  end(name) {
    const metric = this.metrics.get(name);
    if (!metric) return null;

    const diff = process.hrtime(metric.start);
    metric.end = process.hrtime();
    metric.duration = diff[0] * 1000 + diff[1] / 1000000; // 转换为毫秒

    return metric.duration;
  }

  /**
   * 获取性能指标
   */
  getMetrics() {
    const result = {};
    
    this.metrics.forEach((metric, name) => {
      if (metric.duration !== null) {
        result[name] = `${metric.duration.toFixed(2)}ms`;
      }
    });
    
    return result;
  }

  /**
   * 清除所有指标
   */
  clear() {
    this.metrics.clear();
  }

  /**
   * 内存使用情况
   */
  static getMemoryUsage() {
    const memory = process.memoryUsage();
    return {
      rss: `${Math.round(memory.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memory.external / 1024 / 1024)} MB`
    };
  }
}

// 导出所有工具类
module.exports = {
  // 字符串工具
  randomString: (length) => StringHelper.randomString(length),
  randomNumber: (min, max) => StringHelper.randomNumber(min, max),
  generateRoomCode: (length) => StringHelper.generateRoomCode(length),
  generateGameId: () => StringHelper.generateGameId(),
  truncate: (str, length, suffix) => StringHelper.truncate(str, length, suffix),
  maskSensitive: (str, visibleChars) => StringHelper.maskSensitive(str, visibleChars),
  formatPhone: (phone) => StringHelper.formatPhone(phone),
  generateCardId: (value, suit) => StringHelper.generateCardId(value, suit),
  parseCardId: (cardId) => StringHelper.parseCardId(cardId),

  // 加密工具
  hashPassword: (password) => CryptoHelper.hashPassword(password),
  verifyPassword: (password, hashedPassword) => CryptoHelper.verifyPassword(password, hashedPassword),
  generateToken: (payload, expiresIn) => CryptoHelper.generateToken(payload, expiresIn),
  verifyToken: (token) => CryptoHelper.verifyToken(token),
  generateWechatSignature: (params, key) => CryptoHelper.generateWechatSignature(params, key),
  aesEncrypt: (data, key, iv) => CryptoHelper.aesEncrypt(data, key, iv),
  aesDecrypt: (encrypted, key, iv) => CryptoHelper.aesDecrypt(encrypted, key, iv),

  // 时间工具
  formatTime: (date, format) => TimeHelper.formatTime(date, format),
  timeDiff: (start, end) => TimeHelper.timeDiff(start, end),
  timestamp: () => TimeHelper.timestamp(),
  timestampSeconds: () => TimeHelper.timestampSeconds(),
  delay: (ms) => TimeHelper.delay(ms),
  cronFromNow: (minutes) => TimeHelper.cronFromNow(minutes),
  isSameDay: (date1, date2) => TimeHelper.isSameDay(date1, date2),

  // 验证工具
  isValidEmail: (email) => ValidationHelper.isValidEmail(email),
  isValidPhone: (phone) => ValidationHelper.isValidPhone(phone),
  isValidIdCard: (idCard) => ValidationHelper.isValidIdCard(idCard),
  isValidUrl: (url) => ValidationHelper.isValidUrl(url),
  isValidJson: (str) => ValidationHelper.isValidJson(str),
  isValidIp: (ip) => ValidationHelper.isValidIp(ip),
  isValidWechatOpenId: (openId) => ValidationHelper.isValidWechatOpenId(openId),
  isValidCardArray: (cards) => ValidationHelper.isValidCardArray(cards),

  // 文件工具
  getFileExtension: (filename) => FileHelper.getFileExtension(filename),
  getMimeType: (extension) => FileHelper.getMimeType(extension),
  generateUniqueFilename: (originalName) => FileHelper.generateUniqueFilename(originalName),
  formatFileSize: (bytes) => FileHelper.formatFileSize(bytes),
  isAllowedFileType: (filename, allowedTypes) => FileHelper.isAllowedFileType(filename, allowedTypes),

  // 游戏工具
  calculateCardsScore: (cards) => GameHelper.calculateCardsScore(cards),
  isStraight: (cards) => GameHelper.isStraight(cards),
  calculateFinalScore: (baseScore, multiplier, hasBomb, isSpring) => 
    GameHelper.calculateFinalScore(baseScore, multiplier, hasBomb, isSpring),
  generateSeating: (playerIds) => GameHelper.generateSeating(playerIds),
  getNextPlayerPosition: (currentPosition, direction) => 
    GameHelper.getNextPlayerPosition(currentPosition, direction),
  isGameOver: (players) => GameHelper.isGameOver(players),
  calculateRanking: (players) => GameHelper.calculateRanking(players),

  // 响应工具
  success: (data, message) => ResponseHelper.success(data, message),
  pagination: (data, page, limit, total) => ResponseHelper.pagination(data, page, limit, total),
  error: (message, code, errors) => ResponseHelper.error(message, code, errors),
  validationError: (errors) => ResponseHelper.validationError(errors),
  unauthorized: (message) => ResponseHelper.unauthorized(message),
  forbidden: (message) => ResponseHelper.forbidden(message),
  notFound: (message) => ResponseHelper.notFound(message),
  rateLimit: (message) => ResponseHelper.rateLimit(message),

  // 性能工具
  PerformanceHelper,
  getMemoryUsage: () => PerformanceHelper.getMemoryUsage(),

  // 类导出（如果需要直接使用类）
  StringHelper,
  CryptoHelper,
  TimeHelper,
  ValidationHelper,
  FileHelper,
  GameHelper,
  ResponseHelper
};