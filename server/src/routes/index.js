// server/src/routes/index.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// 自动加载所有路由文件
const loadRoutes = () => {
  const routesDir = __dirname;
  const files = fs.readdirSync(routesDir);
  
  files.forEach(file => {
    if (file === 'index.js' || !file.endsWith('.js')) return;
    
    const routeName = file.replace('Routes.js', '').replace('.js', '');
    const routePath = `/${routeName === 'user' ? '' : routeName + 's'}`;
    
    try {
      const routeModule = require(path.join(routesDir, file));
      router.use(`/api${routePath}`, routeModule);
      console.log(`✅ 路由加载成功: ${routePath}`);
    } catch (error) {
      console.error(`❌ 路由加载失败 ${file}:`, error.message);
    }
  });
};

// 加载所有路由
loadRoutes();

/**
 * @route   GET /api/status
 * @desc    获取API状态
 * @access  Public
 */
router.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'connected', // 实际应该检查数据库连接状态
      redis: 'connected',    // 实际应该检查Redis连接状态
      websocket: 'running'   // 实际应该检查WebSocket状态
    }
  });
});

/**
 * @route   GET /api/docs
 * @desc    API文档重定向
 * @access  Public
 */
router.get('/api/docs', (req, res) => {
  res.redirect('https://github.com/your-repo/wechat-poker-game/blob/master/docs/API.md');
});

/**
 * @route   GET /api/routes
 * @desc    获取所有可用路由
 * @access  Public
 */
router.get('/api/routes', (req, res) => {
  const routes = [];
  
  router.stack.forEach(middleware => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase()).join(', ');
      routes.push({
        path: middleware.route.path,
        methods
      });
    }
  });
  
  res.json({
    count: routes.length,
    routes: routes.sort((a, b) => a.path.localeCompare(b.path))
  });
});

module.exports = router;