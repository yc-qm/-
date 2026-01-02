// server/src/services/roomService.js
const Room = require('../models/Room');
const User = require('../models/User');

class RoomService {
  // 创建房间
  async createRoom(roomData) {
    try {
      const { creator, roomType = 'friend', baseGold = 200, password = '' } = roomData;
      
      // 验证底注
      const validBaseGolds = [200, 500, 1000, 2000, 5000];
      if (!validBaseGolds.includes(baseGold)) {
        throw new Error('无效的底注');
      }
      
      // 生成房间ID
      const roomId = this.generateRoomId();
      
      // 创建房间
      const room = new Room({
        roomId,
        creator,
        roomType,
        baseGold,
        password: password || '',
        maxPlayers: 4,
        currentPlayers: 1,
        status: 'waiting',
        players: [{
          userId: creator,
          joinTime: new Date(),
          isReady: false,
          position: 0
        }]
      });
      
      await room.save();
      
      console.log(`房间创建: ${roomId}, 创建者: ${creator}, 类型: ${roomType}, 底注: ${baseGold}`);
      
      return room;
    } catch (error) {
      console.error('创建房间失败:', error);
      throw error;
    }
  }
  
  // 加入房间
  async joinRoom(roomId, userId, password = '') {
    try {
      // 查找房间
      const room = await Room.findOne({ roomId });
      if (!room) {
        throw new Error('房间不存在');
      }
      
      // 检查房间状态
      if (room.status !== 'waiting') {
        throw new Error('房间已开始游戏');
      }
      
      // 检查房间人数
      if (room.currentPlayers >= room.maxPlayers) {
        throw new Error('房间已满');
      }
      
      // 检查密码
      if (room.password && room.password !== password) {
        throw new Error('房间密码错误');
      }
      
      // 检查是否已经在房间中
      const alreadyInRoom = room.players.some(p => p.userId.toString() === userId.toString());
      if (alreadyInRoom) {
        throw new Error('你已经在房间中');
      }
      
      // 获取用户信息
      const user = await User.findById(userId).select('nickname avatarUrl');
      if (!user) {
        throw new Error('用户不存在');
      }
      
      // 分配位置
      const positions = [0, 1, 2, 3];
      const takenPositions = room.players.map(p => p.position);
      const availablePositions = positions.filter(p => !takenPositions.includes(p));
      const position = availablePositions[0];
      
      // 加入房间
      room.players.push({
        userId,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        joinTime: new Date(),
        isReady: false,
        position
      });
      room.currentPlayers += 1;
      
      await room.save();
      
      console.log(`玩家加入房间: ${roomId}, 玩家: ${userId}, 位置: ${position}`);
      
      return {
        room,
        position,
        playerInfo: {
          userId,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl
        }
      };
      
    } catch (error) {
      console.error('加入房间失败:', error);
      throw error;
    }
  }
  
  // 离开房间
  async leaveRoom(roomId, userId) {
    try {
      // 查找房间
      const room = await Room.findOne({ roomId });
      if (!room) {
        throw new Error('房间不存在');
      }
      
      // 查找玩家
      const playerIndex = room.players.findIndex(p => p.userId.toString() === userId.toString());
      if (playerIndex === -1) {
        throw new Error('你不在这个房间中');
      }
      
      // 移除玩家
      const removedPlayer = room.players.splice(playerIndex, 1)[0];
      room.currentPlayers -= 1;
      
      // 记录离开时间
      removedPlayer.leftTime = new Date();
      removedPlayer.leftReason = '主动离开';
      
      // 如果是房主离开且还有其他人，转移房主
      if (room.creator.toString() === userId.toString() && room.players.length > 0) {
        room.creator = room.players[0].userId;
      }
      
      // 如果房间没人了，删除房间
      if (room.currentPlayers === 0) {
        await Room.deleteOne({ roomId });
        console.log(`房间删除: ${roomId}`);
        
        return {
          roomId,
          left: true,
          roomDeleted: true,
          currentPlayers: 0
        };
      }
      
      await room.save();
      
      return {
        roomId,
        left: true,
        roomDeleted: false,
        currentPlayers: room.currentPlayers,
        removedPlayer
      };
      
    } catch (error) {
      console.error('离开房间失败:', error);
      throw error;
    }
  }
  
  // 获取房间信息
  async getRoomInfo(roomId, includePlayers = true) {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) {
        throw new Error('房间不存在');
      }
      
      // 获取玩家详细信息
      let playersWithDetails = [];
      if (includePlayers) {
        const playerIds = room.players.map(p => p.userId);
        const users = await User.find({ _id: { $in: playerIds } })
          .select('nickname avatarUrl goldCoins totalGames winGames vipLevel');
        
        playersWithDetails = room.players.map(player => {
          const user = users.find(u => u._id.toString() === player.userId.toString());
          return {
            userId: player.userId,
            nickname: user ? user.nickname : '未知玩家',
            avatarUrl: user ? user.avatarUrl : '',
            goldCoins: user ? user.goldCoins : 0,
            totalGames: user ? user.totalGames : 0,
            winGames: user ? user.winGames : 0,
            vipLevel: user ? user.vipLevel : 0,
            position: player.position,
            isReady: player.isReady,
            joinTime: player.joinTime,
            isCreator: room.creator.toString() === player.userId.toString()
          };
        });
      }
      
      return {
        roomId: room.roomId,
        roomType: room.roomType,
        baseGold: room.baseGold,
        creator: room.creator,
        currentPlayers: room.currentPlayers,
        maxPlayers: room.maxPlayers,
        status: room.status,
        players: playersWithDetails,
        hasPassword: !!room.password,
        settings: room.settings || {},
        createdAt: room.createdAt,
        gameStartTime: room.gameStartTime,
        winnerTeam: room.winnerTeam,
        multiplier: room.multiplier
      };
      
    } catch (error) {
      console.error('获取房间信息失败:', error);
      throw error;
    }
  }
  
  // 更新玩家准备状态
  async updatePlayerReady(roomId, userId, isReady) {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) {
        throw new Error('房间不存在');
      }
      
      // 查找玩家
      const player = room.players.find(p => p.userId.toString() === userId.toString());
      if (!player) {
        throw new Error('你不在这个房间中');
      }
      
      // 更新准备状态
      player.isReady = isReady;
      await room.save();
      
      // 检查是否所有玩家都准备好了
      const allReady = room.players.every(p => p.isReady) && room.players.length === 4;
      
      return {
        roomId,
        userId,
        isReady,
        allReady,
        readyCount: room.players.filter(p => p.isReady).length,
        totalPlayers: room.players.length
      };
      
    } catch (error) {
      console.error('更新玩家准备状态失败:', error);
      throw error;
    }
  }
  
  // 开始游戏
  async startGame(roomId, userId) {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) {
        throw new Error('房间不存在');
      }
      
      // 检查是否是房主
      if (room.creator.toString() !== userId.toString()) {
        throw new Error('只有房主可以开始游戏');
      }
      
      // 检查房间状态
      if (room.status !== 'waiting') {
        throw new Error('游戏已经开始');
      }
      
      // 检查玩家人数
      if (room.currentPlayers !== 4) {
        throw new Error('需要4名玩家才能开始');
      }
      
      // 检查是否所有玩家都准备好了
      if (!room.players.every(p => p.isReady)) {
        throw new Error('还有玩家未准备');
      }
      
      // 更新房间状态
      room.status = 'playing';
      room.gameStartTime = new Date();
      await room.save();
      
      console.log(`游戏开始: ${roomId}, 开始时间: ${room.gameStartTime}`);
      
      return {
        roomId,
        started: true,
        startTime: room.gameStartTime,
        players: room.players
      };
      
    } catch (error) {
      console.error('开始游戏失败:', error);
      throw error;
    }
  }
  
  // 踢出玩家
  async kickPlayer(roomId, userId, targetUserId) {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) {
        throw new Error('房间不存在');
      }
      
      // 检查是否是房主
      if (room.creator.toString() !== userId.toString()) {
        throw new Error('只有房主可以踢出玩家');
      }
      
      // 不能踢出自己
      if (targetUserId.toString() === userId.toString()) {
        throw new Error('不能踢出自己');
      }
      
      // 查找目标玩家
      const playerIndex = room.players.findIndex(p => p.userId.toString() === targetUserId.toString());
      if (playerIndex === -1) {
        throw new Error('目标玩家不在房间中');
      }
      
      // 移除玩家
      const removedPlayer = room.players.splice(playerIndex, 1)[0];
      room.currentPlayers -= 1;
      
      // 记录离开信息
      removedPlayer.leftTime = new Date();
      removedPlayer.leftReason = '被房主踢出';
      
      await room.save();
      
      console.log(`玩家被踢出: ${targetUserId}, 房间: ${roomId}, 操作者: ${userId}`);
      
      return {
        roomId,
        targetUserId,
        currentPlayers: room.currentPlayers,
        removedPlayer
      };
      
    } catch (error) {
      console.error('踢出玩家失败:', error);
      throw error;
    }
  }
  
  // 获取快速开始房间列表
  async getQuickRooms(filters = {}) {
    try {
      const { 
        roomType = 'friend', 
        baseGold, 
        page = 1, 
        limit = 20 
      } = filters;
      
      const skip = (page - 1) * limit;
      
      // 构建查询条件
      const query = {
        roomType,
        status: 'waiting',
        currentPlayers: { $lt: 4 }
      };
      
      if (baseGold) {
        query.baseGold = baseGold;
      }
      
      // 查找房间
      const rooms = await Room.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('roomId roomType baseGold creator currentPlayers maxPlayers createdAt');
      
      // 获取房间创建者信息
      const creatorIds = rooms.map(room => room.creator);
      const creators = await User.find({ _id: { $in: creatorIds } })
        .select('nickname avatarUrl');
      
      // 格式化房间列表
      const roomList = rooms.map(room => {
        const creator = creators.find(c => c._id.toString() === room.creator.toString());
        return {
          roomId: room.roomId,
          roomType: room.roomType,
          baseGold: room.baseGold,
          currentPlayers: room.currentPlayers,
          maxPlayers: room.maxPlayers,
          creatorId: room.creator,
          creatorName: creator ? creator.nickname : '未知玩家',
          creatorAvatar: creator ? creator.avatarUrl : '',
          createdAt: room.createdAt,
          canJoin: room.currentPlayers < room.maxPlayers
        };
      });
      
      // 获取总房间数
      const total = await Room.countDocuments(query);
      
      return {
        rooms: roomList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      console.error('获取快速开始房间列表失败:', error);
      throw error;
    }
  }
  
  // 检查房间密码
  async checkRoomPassword(roomId) {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) {
        throw new Error('房间不存在');
      }
      
      return {
        roomId,
        requirePassword: !!room.password
      };
    } catch (error) {
      console.error('检查房间密码失败:', error);
      throw error;
    }
  }
  
  // 更新房间设置
  async updateRoomSettings(roomId, userId, settings) {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) {
        throw new Error('房间不存在');
      }
      
      // 检查是否是房主
      if (room.creator.toString() !== userId.toString()) {
        throw new Error('只有房主可以修改房间设置');
      }
      
      // 检查房间状态
      if (room.status !== 'waiting') {
        throw new Error('游戏已经开始，无法修改设置');
      }
      
      // 更新设置
      room.settings = {
        ...room.settings,
        ...settings
      };
      
      await room.save();
      
      return {
        roomId,
        settings: room.settings,
        updated: true
      };
      
    } catch (error) {
      console.error('更新房间设置失败:', error);
      throw error;
    }
  }
  
  // 清理过期房间
  async cleanupExpiredRooms() {
    try {
      const expiredTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24小时前
      
      const expiredRooms = await Room.find({
        status: 'waiting',
        createdAt: { $lt: expiredTime }
      });
      
      const roomIds = expiredRooms.map(room => room.roomId);
      
      if (roomIds.length > 0) {
        await Room.deleteMany({ roomId: { $in: roomIds } });
        console.log(`清理过期房间: ${roomIds.length}个`);
      }
      
      return {
        cleanedCount: roomIds.length,
        roomIds
      };
    } catch (error) {
      console.error('清理过期房间失败:', error);
      throw error;
    }
  }
  
  // 生成房间ID
  generateRoomId() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
  
  // 获取用户所在的房间
  async getUserRoom(userId) {
    try {
      const room = await Room.findOne({
        'players.userId': userId,
        status: { $in: ['waiting', 'playing'] }
      });
      
      if (!room) {
        return null;
      }
      
      return this.getRoomInfo(room.roomId);
    } catch (error) {
      console.error('获取用户房间失败:', error);
      throw error;
    }
  }
  
  // 广播消息到房间
  async broadcastToRoom(roomId, message, excludeUserId = null) {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) {
        throw new Error('房间不存在');
      }
      
      // 添加聊天消息
      room.chatMessages = room.chatMessages || [];
      room.chatMessages.push({
        userId: message.userId || 'system',
        nickname: message.nickname || '系统',
        content: message.content,
        type: message.type || 'text',
        timestamp: new Date()
      });
      
      // 只保留最近100条聊天记录
      if (room.chatMessages.length > 100) {
        room.chatMessages = room.chatMessages.slice(-100);
      }
      
      await room.save();
      
      return {
        roomId,
        messageCount: room.chatMessages.length,
        lastMessage: room.chatMessages[room.chatMessages.length - 1]
      };
    } catch (error) {
      console.error('广播消息失败:', error);
      throw error;
    }
  }
  
  // 获取房间聊天记录
  async getRoomChat(roomId, limit = 50) {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) {
        throw new Error('房间不存在');
      }
      
      const chatMessages = room.chatMessages || [];
      
      return {
        roomId,
        messages: chatMessages.slice(-limit),
        total: chatMessages.length
      };
    } catch (error) {
      console.error('获取房间聊天记录失败:', error);
      throw error;
    }
  }
}

module.exports = new RoomService();