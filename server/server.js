// server/server.js
const { start } = require('./src/app');

// 启动服务器
const server = start();

// WebSocket服务集成（需要独立的Socket.IO服务）
const socketService = require('./src/services/socketService');
socketService.init(server);

module.exports = server;
//*********************************************************8*/
// server/server.js
const mongoose = require('mongoose');
const { server, io } = require('./src/app');
const config = require('./src/config');
const SocketService = require('./src/services/socketService');

// 连接数据库
mongoose.connect(config.database.url, config.database.options)
  .then(() => {
    console.log('数据库连接成功');
    
    // 初始化Socket.IO服务
    const socketService = new SocketService(io);
    
    // 启动服务器
    server.listen(config.port, () => {
      console.log(`服务器运行在端口 ${config.port}`);
      console.log(`环境: ${config.env}`);
    });
  })
  .catch((error) => {
    console.error('数据库连接失败:', error);
    process.exit(1);
  });

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，开始关闭服务器...');
  
  server.close(() => {
    console.log('HTTP服务器已关闭');
    
    mongoose.connection.close(false, () => {
      console.log('数据库连接已关闭');
      process.exit(0);
    });
  });
});

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});