const app = getApp();

class WebSocketManager {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectTimer = null;
    this.reconnectCount = 0;
    this.maxReconnectCount = 5;
    this.reconnectDelay = 1000;
    this.isConnected = false;
    this.heartbeatTimer = null;
    this.messageQueue = [];
    this.pendingMessages = new Map();
    this.messageId = 0;
  }
  
  // 连接WebSocket
  connect(url) {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      
      const token = wx.getStorageSync('token');
      const connectUrl = `${url}?token=${encodeURIComponent(token)}`;
      
      this.socket = wx.connectSocket({
        url: connectUrl,
        success: () => {
          console.log('WebSocket连接成功');
          this.setupListeners();
          resolve();
        },
        fail: (error) => {
          console.error('WebSocket连接失败:', error);
          reject(error);
        }
      });
    });
  }
  
  // 设置监听器
  setupListeners() {
    // 连接打开
    wx.onSocketOpen(() => {
      console.log('WebSocket已打开');
      this.isConnected = true;
      this.reconnectCount = 0;
      this.emit('open');
      
      // 开始心跳检测
      this.startHeartbeat();
      
      // 发送队列中的消息
      this.flushMessageQueue();
    });
    
    // 收到消息
    wx.onSocketMessage((res) => {
      try {
        const data = JSON.parse(res.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('解析消息失败:', error);
      }
    });
    
    // 连接错误
    wx.onSocketError((error) => {
      console.error('WebSocket错误:', error);
      this.isConnected = false;
      this.emit('error', error);
      this.reconnect();
    });
    
    // 连接关闭
    wx.onSocketClose(() => {
      console.log('WebSocket已关闭');
      this.isConnected = false;
      this.emit('close');
      
      // 停止心跳
      this.stopHeartbeat();
      
      // 重新连接
      this.reconnect();
    });
  }
  
  // 处理消息
  handleMessage(data) {
    // 处理心跳响应
    if (data.type === 'PONG') {
      return;
    }
    
    // 处理消息响应
    if (data.messageId && this.pendingMessages.has(data.messageId)) {
      const { resolve, reject } = this.pendingMessages.get(data.messageId);
      this.pendingMessages.delete(data.messageId);
      
      if (data.code === 0) {
        resolve(data.data);
      } else {
        reject(new Error(data.message));
      }
      return;
    }
    
    // 触发事件监听器
    this.emit(data.type, data.data);
    
    // 触发通配符监听器
    this.emit('*', { type: data.type, data: data.data });
  }
  
  // 开始心跳检测
  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: 'PING',
          timestamp: Date.now()
        });
      }
    }, 30000); // 30秒一次
  }
  
  // 停止心跳检测
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  
  // 重新连接
  reconnect() {
    if (this.reconnectCount >= this.maxReconnectCount) {
      console.error('达到最大重连次数');
      this.emit('reconnect_failed');
      return;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectCount++;
      console.log(`尝试第${this.reconnectCount}次重连`);
      
      this.connect(this.socket.url).catch((error) => {
        console.error('重连失败:', error);
      });
    }, this.reconnectDelay * Math.pow(2, this.reconnectCount)); // 指数退避
  }
  
  // 发送消息
  send(data, options = {}) {
    const messageId = this.messageId++;
    const message = {
      messageId: messageId,
      ...data
    };
    
    return new Promise((resolve, reject) => {
      // 如果不需要响应，直接发送
      if (!options.needResponse) {
        this.sendImmediately(message);
        resolve();
        return;
      }
      
      // 如果需要响应，保存到pendingMessages
      this.pendingMessages.set(messageId, { resolve, reject });
      
      // 设置超时
      const timeout = options.timeout || 10000;
      const timeoutId = setTimeout(() => {
        if (this.pendingMessages.has(messageId)) {
          this.pendingMessages.delete(messageId);
          reject(new Error('请求超时'));
        }
      }, timeout);
      
      // 保存超时ID
      this.pendingMessages.get(messageId).timeoutId = timeoutId;
      
      // 发送消息
      this.sendImmediately(message);
    });
  }
  
  // 立即发送消息
  sendImmediately(message) {
    if (this.isConnected) {
      wx.sendSocketMessage({
        data: JSON.stringify(message)
      });
    } else {
      // 如果未连接，加入队列
      this.messageQueue.push(message);
    }
  }
  
  // 发送队列中的消息
  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.sendImmediately(message);
    }
  }
  
  // 添加事件监听器
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  // 移除事件监听器
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
  
  // 触发事件
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件${event}处理失败:`, error);
        }
      });
    }
  }
  
  // 关闭连接
  close() {
    // 清理定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.stopHeartbeat();
    
    // 清理pending messages
    this.pendingMessages.forEach(({ reject, timeoutId }) => {
      clearTimeout(timeoutId);
      reject(new Error('连接关闭'));
    });
    this.pendingMessages.clear();
    
    // 关闭socket
    if (this.socket) {
      wx.closeSocket();
    }
    
    this.isConnected = false;
    this.reconnectCount = 0;
  }
  
  // 获取连接状态
  getState() {
    if (!this.socket) return 'CLOSED';
    
    const stateMap = {
      [WebSocket.CONNECTING]: 'CONNECTING',
      [WebSocket.OPEN]: 'OPEN',
      [WebSocket.CLOSING]: 'CLOSING',
      [WebSocket.CLOSED]: 'CLOSED'
    };
    
    return stateMap[this.socket.readyState] || 'UNKNOWN';
  }
}

// 创建单例
const websocketManager = new WebSocketManager();

export default websocketManager;