// server/src/utils/database.js
// 注：这个文件主要为了兼容性，实际功能已在config/database.js中实现
const { dbManager } = require('../config/database');

module.exports = {
  connectMongoDB: () => dbManager.connectMongoDB(),
  connectRedis: () => dbManager.connectRedis(),
  getMongoDBStatus: () => dbManager.getMongoDBStatus(),
  getRedisStatus: () => dbManager.getRedisStatus(),
  getAllStatus: () => dbManager.getAllStatus(),
  healthCheck: () => dbManager.healthCheck(),
  gracefulShutdown: () => dbManager.gracefulShutdown(),
  initIndexes: () => dbManager.initIndexes(),
  maintenance: () => dbManager.maintenance(),
  dbManager
};