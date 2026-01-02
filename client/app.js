// app.js - 小程序入口文件
import request from './utils/request.js';
import websocket from './utils/websocket.js';
import util from './utils/util.js';

App({
  // 全局数据
  globalData: {
    // 用户信息
    userInfo: null,
    userGold: 1000,       // 用户金币
    userDiamond: 0,       // 用户钻石
    token: null,          // 用户token
    
    // 游戏相关
    currentRoomId: null,  // 当前房间ID
    gameStatus: null,     // 游戏状态
    
    // 网络配置
    apiUrl: 'https://your-api-domain.com/api',  // 替换为实际API地址
    socketUrl: 'wss://your-socket-domain.com/ws', // 替换为实际WebSocket地址
    
    // 系统信息
    systemInfo: null,
    safeArea: null,
    menuButtonRect: null,
    
    // 版本信息
    version: '1.0.0',
    env: 'dev', // dev, test, prod
  },

  // 小程序初始化完成时触发
  onLaunch: function(options) {
    console.log('小程序初始化完成', options);
    
    // 获取系统信息
    this.getSystemInfo();
    
    // 检查登录状态
    this.checkLoginStatus();
    
    // 初始化网络监听
    this.initNetworkListener();
    
    // 检查版本更新
    this.checkUpdate();
    
    // 初始化性能监控
    this.initPerformance();
  },

  // 小程序启动或从后台进入前台显示时触发
  onShow: function(options) {
    console.log('小程序显示', options);
    
    // 检查是否有分享卡片进入
    if (options.scene === 1044) {
      this.handleShareCardEntry(options);
    }
    
    // 恢复网络连接状态
    this.restoreNetwork();
  },

  // 小程序从前台进入后台时触发
  onHide: function() {
    console.log('小程序隐藏');
    
    // 保存当前状态
    this.saveAppState();
  },

  // 小程序发生脚本错误或API调用失败时触发
  onError: function(msg) {
    console.error('小程序错误:', msg);
    
    // 错误上报
    this.reportError(msg);
  },

  // 页面不存在时触发
  onPageNotFound: function(res) {
    console.warn('页面不存在:', res);
    
    // 重定向到首页
    wx.redirectTo({
      url: '/pages/index/index'
    });
  },

  // 获取系统信息
  getSystemInfo: function() {
    try {
      // 获取系统信息
      const systemInfo = wx.getSystemInfoSync();
      this.globalData.systemInfo = systemInfo;
      
      // 获取安全区域
      const safeArea = systemInfo.safeArea;
      this.globalData.safeArea = safeArea;
      
      // 获取菜单按钮位置信息
      const menuButtonRect = wx.getMenuButtonBoundingClientRect();
      this.globalData.menuButtonRect = menuButtonRect;
      
      console.log('系统信息:', systemInfo);
      console.log('安全区域:', safeArea);
      console.log('菜单按钮位置:', menuButtonRect);
    } catch (error) {
      console.error('获取系统信息失败:', error);
    }
  },

  // 检查登录状态
  checkLoginStatus: function() {
    try {
      // 从本地存储获取用户信息
      const token = wx.getStorageSync('token');
      const userInfo = wx.getStorageSync('userInfo');
      const userGold = wx.getStorageSync('userGold');
      const userDiamond = wx.getStorageSync('userDiamond');
      
      if (token && userInfo) {
        this.globalData.token = token;
        this.globalData.userInfo = userInfo;
        this.globalData.userGold = userGold || 1000;
        this.globalData.userDiamond = userDiamond || 0;
        
        console.log('用户已登录:', userInfo);
        
        // 验证token有效性
        this.validateToken();
      } else {
        console.log('用户未登录');
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
    }
  },

  // 验证token有效性
  validateToken: function() {
    const that = this;
    const token = this.globalData.token;
    
    if (!token) return;
    
    // 这里可以添加token验证逻辑
    // 例如：发送请求到服务器验证token是否过期
    /*
    request.get('/user/validate-token')
      .then(data => {
        // token有效
        console.log('token验证成功');
      })
      .catch(error => {
        // token无效，清除登录状态
        console.error('token验证失败:', error);
        that.clearLoginStatus();
      });
    */
  },

  // 初始化网络监听
  initNetworkListener: function() {
    // 监听网络状态变化
    wx.onNetworkStatusChange((res) => {
      console.log('网络状态变化:', res);
      
      if (!res.isConnected) {
        wx.showToast({
          title: '网络已断开',
          icon: 'none',
          duration: 2000
        });
      } else {
        // 网络恢复时重新连接WebSocket
        if (this.globalData.currentRoomId) {
          this.reconnectWebSocket();
        }
      }
    });
    
    // 获取当前网络状态
    wx.getNetworkType({
      success: (res) => {
        console.log('当前网络类型:', res.networkType);
      }
    });
  },

  // 检查版本更新
  checkUpdate: function() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      
      updateManager.onCheckForUpdate((res) => {
        console.log('检查更新结果:', res.hasUpdate);
      });
      
      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate();
            }
          }
        });
      });
      
      updateManager.onUpdateFailed(() => {
        wx.showToast({
          title: '更新失败',
          icon: 'error'
        });
      });
    }
  },

  // 初始化性能监控
  initPerformance: function() {
    // 可以在这里添加性能监控逻辑
    // 例如：监控页面加载时间、API响应时间等
  },

  // 处理分享卡片进入
  handleShareCardEntry: function(options) {
    console.log('从分享卡片进入:', options);
    
    // 解析分享参数
    const query = options.query;
    if (query && query.roomId) {
      // 保存房间ID，等待用户登录后跳转
      this.globalData.pendingRoomId = query.roomId;
    }
  },

  // 恢复网络连接
  restoreNetwork: function() {
    // 检查网络状态并尝试恢复
    wx.getNetworkType({
      success: (res) => {
        if (res.networkType === 'none') {
          wx.showToast({
            title: '网络已断开',
            icon: 'none'
          });
        }
      }
    });
  },

  // 重新连接WebSocket
  reconnectWebSocket: function() {
    const roomId = this.globalData.currentRoomId;
    if (roomId && websocket.getState() !== 'OPEN') {
      websocket.connect(this.globalData.socketUrl).then(() => {
        console.log('WebSocket重连成功');
      }).catch(error => {
        console.error('WebSocket重连失败:', error);
      });
    }
  },

  // 保存应用状态
  saveAppState: function() {
    try {
      // 保存当前状态到本地存储
      const state = {
        currentRoomId: this.globalData.currentRoomId,
        gameStatus: this.globalData.gameStatus,
        timestamp: Date.now()
      };
      wx.setStorageSync('appState', state);
    } catch (error) {
      console.error('保存应用状态失败:', error);
    }
  },

  // 错误上报
  reportError: function(error) {
    // 这里可以实现错误上报逻辑
    // 例如：发送到错误监控服务器
    console.error('上报错误:', error);
  },

  // 用户登录
  login: function(userInfo) {
    return new Promise((resolve, reject) => {
      const that = this;
      
      // 调用微信登录
      wx.login({
        success: (loginRes) => {
          if (loginRes.code) {
            // 发送code到服务器获取token
            request.post('/user/login', {
              code: loginRes.code,
              userInfo: userInfo
            })
            .then(data => {
              // 保存用户信息
              that.globalData.token = data.token;
              that.globalData.userInfo = data.userInfo;
              that.globalData.userGold = data.goldCoins || 1000;
              that.globalData.userDiamond = data.diamond || 0;
              
              // 保存到本地存储
              wx.setStorageSync('token', data.token);
              wx.setStorageSync('userInfo', data.userInfo);
              wx.setStorageSync('userGold', data.goldCoins || 1000);
              wx.setStorageSync('userDiamond', data.diamond || 0);
              
              console.log('登录成功:', data.userInfo);
              
              // 检查是否有待处理的房间
              if (that.globalData.pendingRoomId) {
                that.handlePendingRoom();
              }
              
              resolve(data);
            })
            .catch(error => {
              console.error('登录失败:', error);
              reject(error);
            });
          } else {
            reject(new Error('获取登录code失败'));
          }
        },
        fail: (error) => {
          reject(error);
        }
      });
    });
  },

  // 处理待处理的房间
  handlePendingRoom: function() {
    const roomId = this.globalData.pendingRoomId;
    if (roomId) {
      // 跳转到房间页面
      wx.navigateTo({
        url: `/pages/room/room?roomId=${roomId}&type=join`
      });
      
      // 清除待处理房间
      delete this.globalData.pendingRoomId;
    }
  },

  // 用户退出登录
  logout: function() {
    // 清除全局数据
    this.globalData.userInfo = null;
    this.globalData.token = null;
    this.globalData.userGold = 1000;
    this.globalData.userDiamond = 0;
    
    // 清除本地存储
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('userGold');
    wx.removeStorageSync('userDiamond');
    wx.removeStorageSync('appState');
    
    // 关闭WebSocket连接
    if (websocket) {
      websocket.close();
    }
    
    console.log('用户已退出登录');
    
    // 跳转到首页
    wx.reLaunch({
      url: '/pages/index/index'
    });
  },

  // 清除登录状态
  clearLoginStatus: function() {
    this.globalData.token = null;
    this.globalData.userInfo = null;
    
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    
    console.log('登录状态已清除');
  },

  // 更新用户金币
  updateUserGold: function(goldChange) {
    const newGold = this.globalData.userGold + goldChange;
    this.globalData.userGold = newGold;
    
    // 更新本地存储
    wx.setStorageSync('userGold', newGold);
    
    return newGold;
  },

  // 更新用户钻石
  updateUserDiamond: function(diamondChange) {
    const newDiamond = this.globalData.userDiamond + diamondChange;
    this.globalData.userDiamond = newDiamond;
    
    // 更新本地存储
    wx.setStorageSync('userDiamond', newDiamond);
    
    return newDiamond;
  },

  // 显示加载提示
  showLoading: function(title = '加载中...', mask = true) {
    wx.showLoading({
      title: title,
      mask: mask
    });
  },

  // 隐藏加载提示
  hideLoading: function() {
    wx.hideLoading();
  },

  // 显示提示消息
  showToast: function(title, icon = 'none', duration = 2000) {
    wx.showToast({
      title: title,
      icon: icon,
      duration: duration
    });
  },

  // 显示确认对话框
  showConfirm: function(title, content, confirmText = '确定', cancelText = '取消') {
    return new Promise((resolve, reject) => {
      wx.showModal({
        title: title,
        content: content,
        confirmText: confirmText,
        cancelText: cancelText,
        success: (res) => {
          if (res.confirm) {
            resolve(true);
          } else {
            resolve(false);
          }
        },
        fail: (error) => {
          reject(error);
        }
      });
    });
  },

  // 复制文本到剪贴板
  copyText: function(text, successMsg = '复制成功') {
    wx.setClipboardData({
      data: text,
      success: () => {
        if (successMsg) {
          this.showToast(successMsg);
        }
      }
    });
  },

  // 获取图片完整路径
  getImagePath: function(relativePath) {
    return `/images/${relativePath}`;
  },

  // 分享小程序
  shareApp: function(title = '快来和我一起玩扑克！', path = '/pages/index/index') {
    return {
      title: title,
      path: path,
      imageUrl: '/images/share/share-poker.png'
    };
  },

  // 页面跳转
  navigateTo: function(url, params = {}) {
    if (Object.keys(params).length > 0) {
      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
    
    wx.navigateTo({
      url: url
    });
  },

  // 返回上一页
  navigateBack: function(delta = 1) {
    wx.navigateBack({
      delta: delta
    });
  },

  // 重定向到页面
  redirectTo: function(url, params = {}) {
    if (Object.keys(params).length > 0) {
      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
    
    wx.redirectTo({
      url: url
    });
  },

  // 重启小程序
  reLaunch: function(url, params = {}) {
    if (Object.keys(params).length > 0) {
      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
    
    wx.reLaunch({
      url: url
    });
  },

  // 检查权限
  checkPermission: function(scope) {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: (res) => {
          if (res.authSetting[scope]) {
            resolve(true);
          } else {
            resolve(false);
          }
        },
        fail: reject
      });
    });
  },

  // 请求权限
  requestPermission: function(scope, title, content) {
    return new Promise((resolve, reject) => {
      wx.authorize({
        scope: scope,
        success: resolve,
        fail: () => {
          // 用户拒绝，显示提示
          wx.showModal({
            title: title || '权限提示',
            content: content || '需要您授权才能使用该功能',
            confirmText: '去设置',
            cancelText: '取消',
            success: (res) => {
              if (res.confirm) {
                // 打开设置页面
                wx.openSetting({
                  success: (settingRes) => {
                    if (settingRes.authSetting[scope]) {
                      resolve();
                    } else {
                      reject(new Error('用户未授权'));
                    }
                  }
                });
              } else {
                reject(new Error('用户取消授权'));
              }
            }
          });
        }
      });
    });
  }
});