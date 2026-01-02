// server/src/services/socketService.js
const jwt = require('jsonwebtoken');
const config = require('../config');
const UserService = require('./userService');
const RoomService = require('./roomService');
const GameService = require('./gameService');

// 在线用户管理
const onlineUsers = new Map(); // userId -> socket
const userRooms = new Map();   // userId -> roomId

class SocketService {
  constructor(io) {
    this.io = io;
    this.setupSocketHandlers();
  }
  
  setupSocketHandlers() {
    // 认证中间件
    this.io.use(this.authMiddleware.bind(this));
    
    // 连接处理
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }
  
  // 认证中间件
  async authMiddleware(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('认证失败：未提供token'));
      }
      
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      console.error('Socket认证失败:', error);
      next(new Error('认证失败：token无效'));
    }
  }
  
  // 处理连接
  async handleConnection(socket) {
    const { userId } = socket;
    
    console.log(`客户端连接: ${socket.id}, 用户: ${userId}`);
    
    // 保存用户socket映射
    onlineUsers.set(userId, socket);
    
    // 获取用户所在房间
    try {
      const userRoom = await RoomService.getUserRoom(userId);
      if (userRoom) {
        userRooms.set(userId, userRoom.roomId);
        socket.join(userRoom.roomId);
        socket.roomId = userRoom.roomId;
        
        // 通知房间内其他用户
        socket.to(userRoom.roomId).emit('player_online', {
          userId,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('获取用户房间失败:', error);
    }
    
    // 设置事件监听器
    this.setupEventListeners(socket);
    
    // 发送连接成功消息
    socket.emit('connected', {
      userId,
      socketId: socket.id,
      timestamp: Date.now()
    });
  }
  
  // 设置事件监听器
  setupEventListeners(socket) {
    const { userId } = socket;
    
    // 加入房间
    socket.on('join_room', (data) => this.handleJoinRoom(socket, data));
    
    // 离开房间
    socket.on('leave_room', (data) => this.handleLeaveRoom(socket, data));
    
    // 准备状态
    socket.on('player_ready', (data) => this.handlePlayerReady(socket, data));
    
    // 游戏操作
    socket.on('game_action', (data) => this.handleGameAction(socket, data));
    
    // 聊天消息
    socket.on('chat_message', (data) => this.handleChatMessage(socket, data));
    
    // 心跳
    socket.on('heartbeat', () => {
      socket.emit('heartbeat_ack', { timestamp: Date.now() });
    });
    
    // 断开连接
    socket.on('disconnect', () => this.handleDisconnect(socket));
    
    // 错误处理
    socket.on('error', (error) => {
      console.error(`Socket错误: ${socket.id}`, error);
    });
  }
  
  // 处理加入房间
  async handleJoinRoom(socket, data) {
    try {
      const { roomId, password = '' } = data;
      const { userId } = socket;
      
      if (!roomId) {
        socket.emit('error', { message: '房间ID不能为空' });
        return;
      }
      
      // 离开之前的房间
      if (socket.roomId && socket.roomId !== roomId) {
        await this.handleLeaveRoom(socket, { roomId: socket.roomId });
      }
      
      // 加入房间
      const result = await RoomService.joinRoom(roomId, userId, password);
      
      // 加入socket房间
      socket.join(roomId);
      socket.roomId = roomId;
      userRooms.set(userId, roomId);
      
      // 广播给房间内其他用户
      socket.to(roomId).emit('player_joined', {
        userId,
        playerInfo: result.playerInfo,
        position: result.position,
        timestamp: Date.now()
      });
      
      // 发送房间信息给新加入的用户
      const roomInfo = await RoomService.getRoomInfo(roomId);
      socket.emit('room_info', roomInfo);
      
      console.log(`用户 ${userId} 加入房间 ${roomId}`);
      
    } catch (error) {
      console.error('加入房间失败:', error);
      socket.emit('error', { message: error.message });
    }
  }
  
  // 处理离开房间
  async handleLeaveRoom(socket, data) {
    try {
      const { roomId } = data;
      const { userId } = socket;
      
      if (!roomId || !socket.roomId) {
        return;
      }
      
      // 离开房间
      const result = await RoomService.leaveRoom(roomId, userId);
      
      // 离开socket房间
      socket.leave(roomId);
      delete socket.roomId;
      userRooms.delete(userId);
      
      // 通知房间内其他用户
      if (!result.roomDeleted) {
        socket.to(roomId).emit('player_left', {
          userId,
          timestamp: Date.now(),
          reason: '主动离开'
        });
      }
      
      console.log(`用户 ${userId} 离开房间 ${roomId}`);
      
    } catch (error) {
      console.error('离开房间失败:', error);
    }
  }
  
  // 处理玩家准备状态
  async handlePlayerReady(socket, data) {
    try {
      const { roomId, isReady } = data;
      const { userId } = socket;
      
      if (!roomId) {
        socket.emit('error', { message: '房间ID不能为空' });
        return;
      }
      
      // 验证用户在房间中
      if (socket.roomId !== roomId) {
        socket.emit('error', { message: '你不在这个房间中' });
        return;
      }
      
      // 更新准备状态
      const result = await RoomService.updatePlayerReady(roomId, userId, isReady);
      
      // 广播给房间内其他用户
      socket.to(roomId).emit('player_ready', {
        userId,
        isReady,
        timestamp: Date.now()
      });
      
      // 如果所有人都准备好了，通知房主
      if (result.allReady) {
        const roomInfo = await RoomService.getRoomInfo(roomId);
        const creatorSocket = onlineUsers.get(roomInfo.creator);
        if (creatorSocket) {
          creatorSocket.emit('all_ready', {
            roomId,
            timestamp: Date.now()
          });
        }
      }
      
      console.log(`玩家准备状态: 房间 ${roomId}, 用户 ${userId}, 准备 ${isReady}`);
      
    } catch (error) {
      console.error('处理玩家准备状态失败:', error);
      socket.emit('error', { message: error.message });
    }
  }
  
  // 处理游戏操作
  async handleGameAction(socket, data) {
    try {
      const { roomId, action, payload } = data;
      const { userId } = socket;
      
      if (!roomId || !action) {
        socket.emit('error', { message: '参数不完整' });
        return;
      }
      
      // 验证用户在房间中
      if (socket.roomId !== roomId) {
        socket.emit('error', { message: '你不在这个房间中' });
        return;
      }
      
      let result;
      
      // 根据action类型处理
      switch (action) {
        case 'play_cards':
          // 出牌
          result = await GameService.playCards(roomId, `player_${socket.id}`, payload.cards);
          break;
          
        case 'pass_turn':
          // 过牌
          result = await GameService.passTurn(roomId, `player_${socket.id}`);
          break;
          
        case 'doubling_choice':
          // 加倍选择
          result = await GameService.processDoubling(roomId, `player_${socket.id}`, payload.choice);
          break;
          
        case 'get_suggestions':
          // 获取建议
          result = GameService.getGameSuggestions(roomId, `player_${socket.id}`);
          socket.emit('game_suggestions', result);
          return;
          
        default:
          throw new Error('无效的游戏操作');
      }
      
      // 如果游戏结束，广播结果
      if (result.gameOver) {
        this.io.to(roomId).emit('game_over', {
          winnerTeam: result.winnerTeam,
          scores: result.scores,
          timestamp: Date.now()
        });
      } else {
        // 广播游戏状态更新
        const gameState = GameService.getGameState(roomId);
        this.io.to(roomId).emit('game_state_update', {
          action,
          playerId: `player_${socket.id}`,
          result,
          gameState,
          timestamp: Date.now()
        });
      }
      
      console.log(`游戏操作: 房间 ${roomId}, 用户 ${userId}, 操作 ${action}`);
      
    } catch (error) {
      console.error('处理游戏操作失败:', error);
      socket.emit('error', { message: error.message });
    }
  }
  
  // 处理聊天消息
  async handleChatMessage(socket, data) {
    try {
      const { roomId, content, type = 'text' } = data;
      const { userId } = socket;
      
      if (!roomId || !content) {
        socket.emit('error', { message: '参数不完整' });
        return;
      }
      
      // 验证用户在房间中
      if (socket.roomId !== roomId) {
        socket.emit('error', { message: '你不在这个房间中' });
        return;
      }
      
      // 获取用户信息
      const user = await UserService.getUserById(userId);
      
      // 构建聊天消息
      const chatMessage = {
        userId,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        content,
        type,
        timestamp: Date.now()
      };
      
      // 保存到数据库
      await RoomService.broadcastToRoom(roomId, chatMessage);
      
      // 广播给房间内所有用户
      this.io.to(roomId).emit('chat_message', chatMessage);
      
      console.log(`聊天消息: 房间 ${roomId}, 用户 ${userId}, 内容 ${content.substring(0, 20)}...`);
      
    } catch (error) {
      console.error('处理聊天消息失败:', error);
      socket.emit('error', { message: '发送消息失败' });
    }
  }
  
  // 处理断开连接
  async handleDisconnect(socket) {
    try {
      const { userId } = socket;
      const roomId = socket.roomId;
      
      console.log(`客户端断开连接: ${socket.id}, 用户: ${userId}`);
      
      // 从在线用户中移除
      onlineUsers.delete(userId);
      userRooms.delete(userId);
      
      // 如果用户在房间中，通知其他用户
      if (roomId) {
        // 标记为离线离开
        await RoomService.leaveRoom(roomId, userId);
        
        // 广播给房间内其他用户
        socket.to(roomId).emit('player_offline', {
          userId,
          timestamp: Date.now(),
          reason: '连接断开'
        });
      }
      
    } catch (error) {
      console.error('处理断开连接失败:', error);
    }
  }
  
  // 发送消息给特定用户
  sendToUser(userId, event, data) {
    const socket = onlineUsers.get(userId);
    if (socket) {
      socket.emit(event, data);
      return true;
    }
    return false;
  }
  
  // 广播消息给房间
  broadcastToRoom(roomId, event, data, excludeUserId = null) {
    if (excludeUserId) {
      const excludeSocket = onlineUsers.get(excludeUserId);
      if (excludeSocket) {
        excludeSocket.to(roomId).emit(event, data);
      } else {
        this.io.to(roomId).emit(event, data);
      }
    } else {
      this.io.to(roomId).emit(event, data);
    }
  }
  
  // 获取在线用户列表
  getOnlineUsers() {
    const users = [];
    for (const [userId, socket] of onlineUsers.entries()) {
      users.push({
        userId,
        socketId: socket.id,
        roomId: socket.roomId,
        connectedAt: socket.handshake.issued
      });
    }
    return users;
  }
  
  // 获取房间在线用户
  getRoomOnlineUsers(roomId) {
    const sockets = this.io.sockets.adapter.rooms.get(roomId);
    if (!sockets) {
      return [];
    }
    
    const users = [];
    for (const socketId of sockets) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket && socket.userId) {
        users.push({
          userId: socket.userId,
          socketId: socket.id
        });
      }
    }
    return users;
  }
  
  // 检查用户是否在线
  isUserOnline(userId) {
    return onlineUsers.has(userId);
  }
  
  // 清理无效连接
  cleanupInactiveConnections() {
    const now = Date.now();
    const inactiveThreshold = 5 * 60 * 1000; // 5分钟
    
    for (const [userId, socket] of onlineUsers.entries()) {
      const lastActivity = socket.handshake.issued || 0;
      if (now - lastActivity > inactiveThreshold) {
        console.log(`清理不活跃连接: ${userId}`);
        socket.disconnect(true);
        onlineUsers.delete(userId);
        userRooms.delete(userId);
      }
    }
  }
}

module.exports = SocketService;