// server/src/controllers/roomController.js
const Room = require('../models/Room');
const GameCore = require('../core/GameCore');
const { successResponse, errorResponse } = require('../utils/response');

// 房间管理器
const activeRooms = new Map();

class RoomController {
  // 创建房间
  async createRoom(req, res) {
    try {
      const userId = req.userId;
      const { roomType = 'friend', baseGold = 200, password = '' } = req.body;
      
      // 验证底注
      const validBaseGolds = [200, 500, 1000, 2000, 5000];
      if (!validBaseGolds.includes(baseGold)) {
        return errorResponse(res, '无效的底注', 400);
      }
      
      // 生成房间ID
      const roomId = this.generateRoomId();
      
      // 创建房间
      const room = new Room({
        roomId,
        creator: userId,
        roomType,
        baseGold,
        password: password || '',
        maxPlayers: 4,
        currentPlayers: 1,
        status: 'waiting',
        players: [{
          userId,
          joinTime: new Date(),
          isReady: false,
          position: 0
        }]
      });
      
      await room.save();
      
      // 创建游戏核心实例
      const gameCore = new GameCore(roomId, baseGold);
      activeRooms.set(roomId, gameCore);
      
      console.log(`房间创建: ${roomId}, 创建者: ${userId}`);
      
      return successResponse(res, {
        roomId,
        roomType,
        baseGold,
        creator: userId,
        hasPassword: !!password
      });
      
    } catch (error) {
      console.error('创建房间失败:', error);
      return errorResponse(res, '创建房间失败', 500);
    }
  }
  
  // 加入房间
  async joinRoom(req, res) {
    try {
      const userId = req.userId;
      const { roomId, password = '' } = req.body;
      
      // 查找房间
      const room = await Room.findOne({ roomId });
      if (!room) {
        return errorResponse(res, '房间不存在', 404);
      }
      
      // 检查房间状态
      if (room.status !== 'waiting') {
        return errorResponse(res, '房间已开始游戏', 400);
      }
      
      // 检查房间人数
      if (room.currentPlayers >= room.maxPlayers) {
        return errorResponse(res, '房间已满', 400);
      }
      
      // 检查密码
      if (room.password && room.password !== password) {
        return errorResponse(res, '房间密码错误', 401);
      }
      
      // 检查是否已经在房间中
      const alreadyInRoom = room.players.some(p => p.userId.toString() === userId.toString());
      if (alreadyInRoom) {
        return errorResponse(res, '你已经在房间中', 400);
      }
      
      // 分配位置
      const positions = [0, 1, 2, 3];
      const takenPositions = room.players.map(p => p.position);
      const availablePositions = positions.filter(p => !takenPositions.includes(p));
      const position = availablePositions[0];
      
      // 加入房间
      room.players.push({
        userId,
        joinTime: new Date(),
        isReady: false,
        position
      });
      room.currentPlayers += 1;
      
      await room.save();
      
      console.log(`玩家加入房间: ${roomId}, 玩家: ${userId}, 位置: ${position}`);
      
      return successResponse(res, {
        roomId,
        roomType: room.roomType,
        baseGold: room.baseGold,
        currentPlayers: room.currentPlayers,
        maxPlayers: room.maxPlayers,
        position,
        players: room.players
      });
      
    } catch (error) {
      console.error('加入房间失败:', error);
      return errorResponse(res, '加入房间失败', 500);
    }
  }
  
  // 离开房间
  async leaveRoom(req, res) {
    try {
      const userId = req.userId;
      const { roomId } = req.body;
      
      // 查找房间
      const room = await Room.findOne({ roomId });
      if (!room) {
        return errorResponse(res, '房间不存在', 404);
      }
      
      // 查找玩家
      const playerIndex = room.players.findIndex(p => p.userId.toString() === userId.toString());
      if (playerIndex === -1) {
        return errorResponse(res, '你不在这个房间中', 400);
      }
      
      // 移除玩家
      const removedPlayer = room.players.splice(playerIndex, 1)[0];
      room.currentPlayers -= 1;
      
      // 如果是房主离开且还有其他人，转移房主
      if (room.creator.toString() === userId.toString() && room.players.length > 0) {
        room.creator = room.players[0].userId;
      }
      
      // 如果房间没人了，删除房间
      if (room.currentPlayers === 0) {
        await Room.deleteOne({ roomId });
        activeRooms.delete(roomId);
        console.log(`房间删除: ${roomId}`);
      } else {
        await room.save();
      }
      
      // 如果是游戏进行中离开，需要特殊处理
      const gameCore = activeRooms.get(roomId);
      if (gameCore && gameCore.status !== 'waiting') {
        // 游戏进行中离开，视为逃跑
        // 这里可以添加逃跑惩罚逻辑
        console.log(`玩家逃跑: ${userId}, 房间: ${roomId}`);
      }
      
      return successResponse(res, {
        roomId,
        left: true,
        currentPlayers: room.currentPlayers
      });
      
    } catch (error) {
      console.error('离开房间失败:', error);
      return errorResponse(res, '离开房间失败', 500);
    }
  }
  
  // 获取房间信息
  async getRoomInfo(req, res) {
    try {
      const { roomId } = req.params;
      
      // 查找房间
      const room = await Room.findOne({ roomId });
      if (!room) {
        return errorResponse(res, '房间不存在', 404);
      }
      
      // 获取游戏状态（如果有）
      let gameState = null;
      const gameCore = activeRooms.get(roomId);
      if (gameCore) {
        gameState = gameCore.getGameState();
      }
      
      return successResponse(res, {
        roomId: room.roomId,
        roomType: room.roomType,
        baseGold: room.baseGold,
        creator: room.creator,
        currentPlayers: room.currentPlayers,
        maxPlayers: room.maxPlayers,
        status: room.status,
        players: room.players,
        hasPassword: !!room.password,
        createdAt: room.createdAt,
        gameState
      });
      
    } catch (error) {
      console.error('获取房间信息失败:', error);
      return errorResponse(res, '获取房间信息失败', 500);
    }
  }
  
  // 准备/取消准备
  async toggleReady(req, res) {
    try {
      const userId = req.userId;
      const { roomId, isReady } = req.body;
      
      // 查找房间
      const room = await Room.findOne({ roomId });
      if (!room) {
        return errorResponse(res, '房间不存在', 404);
      }
      
      // 查找玩家
      const player = room.players.find(p => p.userId.toString() === userId.toString());
      if (!player) {
        return errorResponse(res, '你不在这个房间中', 400);
      }
      
      // 更新准备状态
      player.isReady = isReady;
      await room.save();
      
      return successResponse(res, {
        roomId,
        userId,
        isReady,
        allReady: room.players.every(p => p.isReady) && room.players.length === 4
      });
      
    } catch (error) {
      console.error('更新准备状态失败:', error);
      return errorResponse(res, '更新失败', 500);
    }
  }
  
  // 开始游戏
  async startGame(req, res) {
    try {
      const userId = req.userId;
      const { roomId } = req.body;
      
      // 查找房间
      const room = await Room.findOne({ roomId });
      if (!room) {
        return errorResponse(res, '房间不存在', 404);
      }
      
      // 检查是否是房主
      if (room.creator.toString() !== userId.toString()) {
        return errorResponse(res, '只有房主可以开始游戏', 403);
      }
      
      // 检查房间状态
      if (room.status !== 'waiting') {
        return errorResponse(res, '游戏已经开始', 400);
      }
      
      // 检查玩家人数
      if (room.currentPlayers !== 4) {
        return errorResponse(res, '需要4名玩家才能开始', 400);
      }
      
      // 检查是否所有玩家都准备好了
      if (!room.players.every(p => p.isReady)) {
        return errorResponse(res, '还有玩家未准备', 400);
      }
      
      // 获取游戏核心实例
      let gameCore = activeRooms.get(roomId);
      if (!gameCore) {
        gameCore = new GameCore(roomId, room.baseGold);
        activeRooms.set(roomId, gameCore);
      }
      
      // 准备玩家数据
      const playersData = room.players.map((player, index) => ({
        id: `player_${index}`,
        userId: player.userId,
        nickname: `玩家${index + 1}`, // 实际应该从用户表获取
        avatar: '', // 实际应该从用户表获取
        position: player.position
      }));
      
      // 初始化游戏
      gameCore.initialize(playersData);
      
      // 开始游戏
      const gameState = gameCore.startGame();
      
      // 更新房间状态
      room.status = 'playing';
      room.gameStartTime = new Date();
      await room.save();
      
      console.log(`游戏开始: ${roomId}`);
      
      return successResponse(res, {
        roomId,
        gameState,
        message: '游戏开始'
      });
      
    } catch (error) {
      console.error('开始游戏失败:', error);
      return errorResponse(res, '开始游戏失败: ' + error.message, 500);
    }
  }
  
  // 获取快速开始房间列表
  async getQuickRooms(req, res) {
    try {
      const { roomType = 'friend', page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // 查找等待中的房间
      const rooms = await Room.find({
        roomType,
        status: 'waiting',
        currentPlayers: { $lt: 4 }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('roomId roomType baseGold creator currentPlayers maxPlayers createdAt');
      
      // 获取房间创建者信息（简化处理）
      const roomList = rooms.map(room => ({
        roomId: room.roomId,
        roomType: room.roomType,
        baseGold: room.baseGold,
        currentPlayers: room.currentPlayers,
        maxPlayers: room.maxPlayers,
        creatorId: room.creator,
        creatorName: `玩家${room.creator.toString().substr(-4)}`,
        createdAt: room.createdAt
      }));
      
      // 获取总房间数
      const total = await Room.countDocuments({
        roomType,
        status: 'waiting',
        currentPlayers: { $lt: 4 }
      });
      
      return successResponse(res, {
        rooms: roomList,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
      
    } catch (error) {
      console.error('获取房间列表失败:', error);
      return errorResponse(res, '获取房间列表失败', 500);
    }
  }
  
  // 踢出玩家
  async kickPlayer(req, res) {
    try {
      const userId = req.userId;
      const { roomId, targetUserId } = req.body;
      
      // 查找房间
      const room = await Room.findOne({ roomId });
      if (!room) {
        return errorResponse(res, '房间不存在', 404);
      }
      
      // 检查是否是房主
      if (room.creator.toString() !== userId.toString()) {
        return errorResponse(res, '只有房主可以踢出玩家', 403);
      }
      
      // 不能踢出自己
      if (targetUserId.toString() === userId.toString()) {
        return errorResponse(res, '不能踢出自己', 400);
      }
      
      // 查找目标玩家
      const playerIndex = room.players.findIndex(p => p.userId.toString() === targetUserId.toString());
      if (playerIndex === -1) {
        return errorResponse(res, '目标玩家不在房间中', 400);
      }
      
      // 移除玩家
      room.players.splice(playerIndex, 1);
      room.currentPlayers -= 1;
      await room.save();
      
      console.log(`玩家被踢出: ${targetUserId}, 房间: ${roomId}, 操作者: ${userId}`);
      
      return successResponse(res, {
        roomId,
        targetUserId,
        currentPlayers: room.currentPlayers
      });
      
    } catch (error) {
      console.error('踢出玩家失败:', error);
      return errorResponse(res, '踢出玩家失败', 500);
    }
  }
  
  // 检查房间密码
  async checkRoomPassword(req, res) {
    try {
      const { roomId } = req.params;
      
      const room = await Room.findOne({ roomId });
      if (!room) {
        return errorResponse(res, '房间不存在', 404);
      }
      
      return successResponse(res, {
        roomId,
        requirePassword: !!room.password
      });
      
    } catch (error) {
      console.error('检查房间密码失败:', error);
      return errorResponse(res, '检查失败', 500);
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
  
  // 获取活跃的游戏核心实例
  static getGameCore(roomId) {
    return activeRooms.get(roomId);
  }
  
  // 设置游戏核心实例
  static setGameCore(roomId, gameCore) {
    activeRooms.set(roomId, gameCore);
  }
  
  // 移除游戏核心实例
  static removeGameCore(roomId) {
    activeRooms.delete(roomId);
  }
}

module.exports = RoomController;