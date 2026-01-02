// server/src/controllers/gameController.js
const RoomController = require('./roomController');
const User = require('../models/User');
const GameRecord = require('../models/GameRecord');
const { successResponse, errorResponse } = require('../utils/response');

class GameController {
  // 处理游戏操作
  async handleGameAction(req, res) {
    try {
      const userId = req.userId;
      const { roomId, action, data } = req.body;
      
      // 获取游戏核心实例
      const gameCore = RoomController.getGameCore(roomId);
      if (!gameCore) {
        return errorResponse(res, '游戏不存在或已结束', 404);
      }
      
      // 查找玩家ID
      const player = gameCore.players.find(p => p.userId === userId);
      if (!player) {
        return errorResponse(res, '你不在这个游戏中', 400);
      }
      
      let result;
      
      // 根据action处理
      switch (action) {
        case 'play_cards':
          // 出牌
          result = await this.handlePlayCards(gameCore, player.id, data.cards);
          break;
          
        case 'pass_turn':
          // 过牌
          result = await this.handlePassTurn(gameCore, player.id);
          break;
          
        case 'doubling_choice':
          // 加倍选择
          result = await this.handleDoublingChoice(gameCore, player.id, data.choice);
          break;
          
        default:
          return errorResponse(res, '无效的操作', 400);
      }
      
      // 如果游戏结束，保存记录
      if (result.gameOver) {
        await this.saveGameRecord(gameCore, result.scores);
      }
      
      return successResponse(res, result);
      
    } catch (error) {
      console.error('处理游戏操作失败:', error);
      return errorResponse(res, error.message, 400);
    }
  }
  
  // 处理出牌
  async handlePlayCards(gameCore, playerId, cards) {
    try {
      const result = gameCore.playCards(playerId, cards);
      
      // 如果游戏结束，返回结果
      if (result.gameOver) {
        const scores = gameCore.calculateScores();
        return {
          ...result,
          scores,
          gameState: gameCore.getGameState()
        };
      }
      
      return {
        ...result,
        gameState: gameCore.getGameState()
      };
      
    } catch (error) {
      throw error;
    }
  }
  
  // 处理过牌
  async handlePassTurn(gameCore, playerId) {
    try {
      const result = gameCore.passTurn(playerId);
      return {
        ...result,
        gameState: gameCore.getGameState()
      };
    } catch (error) {
      throw error;
    }
  }
  
  // 处理加倍选择
  async handleDoublingChoice(gameCore, playerId, choice) {
    try {
      const validChoices = ['none', 'double', 'triple', 'anti-double'];
      if (!validChoices.includes(choice)) {
        throw new Error('无效的加倍选择');
      }
      
      const result = gameCore.processDoublingChoice(playerId, choice);
      
      // 检查加倍是否完成
      if (gameCore.doublingCompleted) {
        return {
          ...result,
          doublingCompleted: true,
          gameState: gameCore.getGameState()
        };
      }
      
      return {
        ...result,
        doublingCompleted: false,
        gameState: gameCore.getGameState()
      };
      
    } catch (error) {
      throw error;
    }
  }
  
  // 获取游戏状态
  async getGameState(req, res) {
    try {
      const { roomId } = req.params;
      const userId = req.userId;
      
      // 获取游戏核心实例
      const gameCore = RoomController.getGameCore(roomId);
      if (!gameCore) {
        return errorResponse(res, '游戏不存在或已结束', 404);
      }
      
      // 获取游戏状态
      const gameState = gameCore.getGameState();
      
      // 获取玩家自己的手牌
      const player = gameCore.players.find(p => p.userId === userId);
      let playerCards = [];
      if (player) {
        playerCards = gameCore.getPlayerCards(player.id);
      }
      
      return successResponse(res, {
        ...gameState,
        playerCards // 只有自己能看见
      });
      
    } catch (error) {
      console.error('获取游戏状态失败:', error);
      return errorResponse(res, '获取游戏状态失败', 500);
    }
  }
  
  // 保存游戏记录
  async saveGameRecord(gameCore, scores) {
    try {
      // 准备玩家数据
      const playersData = gameCore.players.map(player => ({
        userId: player.userId,
        seatIndex: player.seatIndex,
        team: player.team,
        initialCards: player.totalCards,
        remainingCards: player.remainingCards,
        isDoubler: player.isDoubler,
        isTripler: player.isTripler,
        isAntiDoubler: player.isAntiDoubler,
        isWinner: player.team === gameCore.winnerTeam,
        goldChange: scores[player.userId]?.goldChange || 0
      }));
      
      // 创建游戏记录
      const gameRecord = new GameRecord({
        roomId: gameCore.roomId,
        baseGold: gameCore.baseGold,
        multiplier: gameCore.multiplier,
        winnerTeam: gameCore.winnerTeam,
        gameDuration: gameCore.gameEndTime - gameCore.gameStartTime,
        startTime: gameCore.gameStartTime,
        endTime: gameCore.gameEndTime,
        players: playersData,
        playHistory: gameCore.playHistory,
        totalRounds: gameCore.playHistory.length
      });
      
      await gameRecord.save();
      
      // 更新玩家统计数据
      await this.updatePlayerStats(gameCore, scores);
      
      console.log(`游戏记录保存: ${gameCore.roomId}`);
      
    } catch (error) {
      console.error('保存游戏记录失败:', error);
    }
  }
  
  // 更新玩家统计数据
  async updatePlayerStats(gameCore, scores) {
    try {
      for (const player of gameCore.players) {
        const user = await User.findById(player.userId);
        if (!user) continue;
        
        // 更新游戏次数
        user.totalGames += 1;
        
        // 更新胜利次数
        if (player.team === gameCore.winnerTeam) {
          user.winGames += 1;
          user.currentWinStreak += 1;
          
          // 更新最高连胜
          if (user.currentWinStreak > user.maxWinStreak) {
            user.maxWinStreak = user.currentWinStreak;
          }
        } else {
          user.currentWinStreak = 0;
        }
        
        // 更新金币
        const goldChange = scores[player.userId]?.goldChange || 0;
        user.goldCoins += goldChange;
        user.totalEarnings += goldChange;
        
        // 记录金币变化
        user.goldHistory = user.goldHistory || [];
        user.goldHistory.push({
          change: goldChange,
          reason: '游戏结算',
          balance: user.goldCoins,
          timestamp: new Date(),
          roomId: gameCore.roomId
        });
        
        // 只保留最近100条记录
        if (user.goldHistory.length > 100) {
          user.goldHistory = user.goldHistory.slice(-100);
        }
        
        await user.save();
      }
      
    } catch (error) {
      console.error('更新玩家统计数据失败:', error);
    }
  }
  
  // 获取游戏历史记录
  async getGameHistory(req, res) {
    try {
      const userId = req.userId;
      const { page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // 查找玩家参与的游戏记录
      const records = await GameRecord.find({
        'players.userId': userId
      })
      .sort({ endTime: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('roomId baseGold multiplier winnerTeam gameDuration startTime endTime players totalRounds');
      
      // 格式化记录
      const formattedRecords = records.map(record => {
        const playerInfo = record.players.find(p => p.userId.toString() === userId.toString());
        return {
          recordId: record._id,
          roomId: record.roomId,
          baseGold: record.baseGold,
          multiplier: record.multiplier,
          winnerTeam: record.winnerTeam,
          isWinner: playerInfo ? playerInfo.isWinner : false,
          goldChange: playerInfo ? playerInfo.goldChange : 0,
          gameDuration: record.gameDuration,
          startTime: record.startTime,
          totalRounds: record.totalRounds,
          playersCount: record.players.length
        };
      });
      
      // 获取总记录数
      const total = await GameRecord.countDocuments({
        'players.userId': userId
      });
      
      return successResponse(res, {
        records: formattedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
      
    } catch (error) {
      console.error('获取游戏历史失败:', error);
      return errorResponse(res, '获取游戏历史失败', 500);
    }
  }
  
  // 重新加入游戏
  async rejoinGame(req, res) {
    try {
      const userId = req.userId;
      const { roomId } = req.body;
      
      // 获取游戏核心实例
      const gameCore = RoomController.getGameCore(roomId);
      if (!gameCore) {
        return errorResponse(res, '游戏不存在或已结束', 404);
      }
      
      // 检查玩家是否在游戏中
      const player = gameCore.players.find(p => p.userId === userId);
      if (!player) {
        return errorResponse(res, '你不在这个游戏中', 400);
      }
      
      // 获取游戏状态
      const gameState = gameCore.getGameState();
      
      // 获取玩家手牌
      const playerCards = gameCore.getPlayerCards(player.id);
      
      return successResponse(res, {
        rejoinSuccess: true,
        gameState,
        playerCards
      });
      
    } catch (error) {
      console.error('重新加入游戏失败:', error);
      return errorResponse(res, '重新加入游戏失败', 500);
    }
  }
  
  // 投降
  async surrender(req, res) {
    try {
      const userId = req.userId;
      const { roomId } = req.body;
      
      // 获取游戏核心实例
      const gameCore = RoomController.getGameCore(roomId);
      if (!gameCore) {
        return errorResponse(res, '游戏不存在或已结束', 404);
      }
      
      // 检查玩家是否在游戏中
      const player = gameCore.players.find(p => p.userId === userId);
      if (!player) {
        return errorResponse(res, '你不在这个游戏中', 400);
      }
      
      // 检查游戏状态
      if (gameCore.status !== 'playing') {
        return errorResponse(res, '游戏未在进行中', 400);
      }
      
      // 确定投降方队伍
      const surrenderTeam = player.team;
      const winnerTeam = surrenderTeam === 0 ? 1 : 0;
      
      // 结束游戏
      const scores = gameCore.calculateScores();
      
      // 保存游戏记录
      await this.saveGameRecord(gameCore, scores);
      
      // 清理游戏实例
      RoomController.removeGameCore(roomId);
      
      return successResponse(res, {
        surrendered: true,
        surrenderTeam,
        winnerTeam,
        scores,
        message: '投降成功'
      });
      
    } catch (error) {
      console.error('投降失败:', error);
      return errorResponse(res, '投降失败', 500);
    }
  }
}

module.exports = new GameController();