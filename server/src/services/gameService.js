// server/src/services/gameService.js
const GameCore = require('../core/GameCore');
const GameRecord = require('../models/GameRecord');
const Room = require('../models/Room');
const User = require('../models/User');
const CardLogic = require('../core/CardLogic');

// 游戏管理器
const gameManager = new Map();

class GameService {
  // 创建游戏
  async createGame(roomId, baseGold, players) {
    try {
      // 检查游戏是否已存在
      if (gameManager.has(roomId)) {
        throw new Error('游戏已存在');
      }
      
      // 创建游戏核心实例
      const gameCore = new GameCore(roomId, baseGold);
      
      // 准备玩家数据
      const playersData = players.map((player, index) => ({
        id: `player_${index}`,
        userId: player.userId,
        nickname: player.nickname || `玩家${index + 1}`,
        avatar: player.avatar || '',
        position: player.position
      }));
      
      // 初始化游戏
      gameCore.initialize(playersData);
      
      // 保存到游戏管理器
      gameManager.set(roomId, gameCore);
      
      console.log(`游戏创建: ${roomId}, 底注: ${baseGold}, 玩家: ${players.length}`);
      
      return gameCore;
    } catch (error) {
      console.error('创建游戏失败:', error);
      throw error;
    }
  }
  
  // 开始游戏
  async startGame(roomId) {
    try {
      const gameCore = this.getGame(roomId);
      if (!gameCore) {
        throw new Error('游戏不存在');
      }
      
      const gameState = gameCore.startGame();
      
      // 更新房间状态
      await Room.findOneAndUpdate(
        { roomId },
        { 
          status: 'playing',
          gameStartTime: new Date()
        }
      );
      
      console.log(`游戏开始: ${roomId}`);
      return gameState;
    } catch (error) {
      console.error('开始游戏失败:', error);
      throw error;
    }
  }
  
  // 处理出牌
  async playCards(roomId, playerId, cards) {
    try {
      const gameCore = this.getGame(roomId);
      if (!gameCore) {
        throw new Error('游戏不存在');
      }
      
      // 验证牌型
      const cardType = CardLogic.getCardType(cards);
      if (!cardType.valid) {
        throw new Error('牌型不合法');
      }
      
      const result = gameCore.playCards(playerId, cards);
      
      // 如果游戏结束，处理结算
      if (result.gameOver) {
        await this.finishGame(roomId, result.winnerTeam);
      }
      
      return result;
    } catch (error) {
      console.error('出牌失败:', error);
      throw error;
    }
  }
  
  // 处理过牌
  async passTurn(roomId, playerId) {
    try {
      const gameCore = this.getGame(roomId);
      if (!gameCore) {
        throw new Error('游戏不存在');
      }
      
      return gameCore.passTurn(playerId);
    } catch (error) {
      console.error('过牌失败:', error);
      throw error;
    }
  }
  
  // 处理加倍选择
  async processDoubling(roomId, playerId, choice) {
    try {
      const gameCore = this.getGame(roomId);
      if (!gameCore) {
        throw new Error('游戏不存在');
      }
      
      return gameCore.processDoublingChoice(playerId, choice);
    } catch (error) {
      console.error('处理加倍选择失败:', error);
      throw error;
    }
  }
  
  // 完成游戏
  async finishGame(roomId, winnerTeam) {
    try {
      const gameCore = this.getGame(roomId);
      if (!gameCore) {
        throw new Error('游戏不存在');
      }
      
      // 计算得分
      const scores = gameCore.calculateScores();
      
      // 保存游戏记录
      await this.saveGameRecord(gameCore, scores);
      
      // 更新玩家统计数据
      await this.updatePlayersStats(gameCore, scores);
      
      // 更新房间状态
      await Room.findOneAndUpdate(
        { roomId },
        { 
          status: 'finished',
          gameEndTime: new Date(),
          winnerTeam,
          multiplier: gameCore.multiplier
        }
      );
      
      // 从游戏管理器中移除
      gameManager.delete(roomId);
      
      console.log(`游戏完成: ${roomId}, 获胜队伍: ${winnerTeam}`);
      
      return {
        roomId,
        winnerTeam,
        scores,
        gameDuration: gameCore.gameEndTime - gameCore.gameStartTime
      };
    } catch (error) {
      console.error('完成游戏失败:', error);
      throw error;
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
      
      console.log(`游戏记录保存: ${gameCore.roomId}, 记录ID: ${gameRecord._id}`);
      
      return gameRecord;
    } catch (error) {
      console.error('保存游戏记录失败:', error);
      throw error;
    }
  }
  
  // 更新玩家统计数据
  async updatePlayersStats(gameCore, scores) {
    try {
      const updatePromises = gameCore.players.map(async player => {
        const user = await User.findById(player.userId);
        if (!user) return;
        
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
        
        console.log(`玩家统计更新: ${player.userId}, 胜利: ${player.team === gameCore.winnerTeam}, 金币变化: ${goldChange}`);
      });
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('更新玩家统计数据失败:', error);
      throw error;
    }
  }
  
  // 获取游戏状态
  getGameState(roomId) {
    const gameCore = this.getGame(roomId);
    if (!gameCore) {
      throw new Error('游戏不存在');
    }
    
    return gameCore.getGameState();
  }
  
  // 获取玩家手牌
  getPlayerCards(roomId, playerId) {
    const gameCore = this.getGame(roomId);
    if (!gameCore) {
      throw new Error('游戏不存在');
    }
    
    const player = gameCore.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('玩家不存在');
    }
    
    return gameCore.getPlayerCards(playerId);
  }
  
  // 获取游戏实例
  getGame(roomId) {
    return gameManager.get(roomId);
  }
  
  // 移除游戏
  removeGame(roomId) {
    const gameCore = gameManager.get(roomId);
    if (gameCore) {
      gameCore.clearAllTimers();
    }
    gameManager.delete(roomId);
    console.log(`游戏移除: ${roomId}`);
  }
  
  // 清理超时游戏
  async cleanupTimeoutGames() {
    try {
      const now = Date.now();
      const timeoutGames = [];
      
      for (const [roomId, gameCore] of gameManager.entries()) {
        // 检查游戏是否超时（超过2小时）
        if (gameCore.gameStartTime && (now - gameCore.gameStartTime > 2 * 60 * 60 * 1000)) {
          timeoutGames.push(roomId);
        }
      }
      
      for (const roomId of timeoutGames) {
        console.log(`清理超时游戏: ${roomId}`);
        this.removeGame(roomId);
        
        // 更新房间状态
        await Room.findOneAndUpdate(
          { roomId },
          { 
            status: 'closed',
            closeReason: '游戏超时',
            closedBy: 'system'
          }
        );
      }
      
      return {
        cleanedCount: timeoutGames.length,
        roomIds: timeoutGames
      };
    } catch (error) {
      console.error('清理超时游戏失败:', error);
      throw error;
    }
  }
  
  // 获取游戏建议（AI提示）
  getGameSuggestions(roomId, playerId) {
    try {
      const gameCore = this.getGame(roomId);
      if (!gameCore) {
        throw new Error('游戏不存在');
      }
      
      const player = gameCore.players.find(p => p.id === playerId);
      if (!player) {
        throw new Error('玩家不存在');
      }
      
      const handCards = gameCore.getPlayerCards(playerId);
      const currentCards = gameCore.currentCards;
      
      // 获取可能的出牌组合
      const possiblePlays = CardLogic.getPossiblePlays(handCards, currentCards);
      
      // 如果没有可能的出牌，建议过牌
      if (possiblePlays.length === 0) {
        return {
          suggestion: 'pass',
          reason: '没有可以出的牌',
          plays: []
        };
      }
      
      // 简单AI策略：出最小的牌
      const suggestedPlay = possiblePlays.reduce((minPlay, play) => {
        const currentMin = CardLogic.getMaxCardWeight(minPlay);
        const playMax = CardLogic.getMaxCardWeight(play);
        return playMax < currentMin ? play : minPlay;
      }, possiblePlays[0]);
      
      return {
        suggestion: 'play',
        reason: '建议出最小的牌',
        play: suggestedPlay,
        cardType: CardLogic.getCardType(suggestedPlay).type,
        allPossiblePlays: possiblePlays.length
      };
    } catch (error) {
      console.error('获取游戏建议失败:', error);
      return {
        suggestion: 'none',
        reason: '无法提供建议'
      };
    }
  }
  
  // 重新加入游戏
  async rejoinGame(roomId, userId) {
    try {
      const gameCore = this.getGame(roomId);
      if (!gameCore) {
        throw new Error('游戏不存在');
      }
      
      const player = gameCore.players.find(p => p.userId === userId);
      if (!player) {
        throw new Error('玩家不在游戏中');
      }
      
      // 获取游戏状态和玩家手牌
      const gameState = gameCore.getGameState();
      const playerCards = gameCore.getPlayerCards(player.id);
      
      return {
        rejoinSuccess: true,
        gameState,
        playerCards,
        playerId: player.id,
        seatIndex: player.seatIndex,
        canPlay: player.canPlay
      };
    } catch (error) {
      console.error('重新加入游戏失败:', error);
      throw error;
    }
  }
  
  // 投降
  async surrender(roomId, userId) {
    try {
      const gameCore = this.getGame(roomId);
      if (!gameCore) {
        throw new Error('游戏不存在');
      }
      
      const player = gameCore.players.find(p => p.userId === userId);
      if (!player) {
        throw new Error('玩家不在游戏中');
      }
      
      // 确定投降方队伍
      const surrenderTeam = player.team;
      const winnerTeam = surrenderTeam === 0 ? 1 : 0;
      
      // 结束游戏
      const result = await this.finishGame(roomId, winnerTeam);
      
      return {
        surrendered: true,
        surrenderTeam,
        winnerTeam,
        ...result
      };
    } catch (error) {
      console.error('投降失败:', error);
      throw error;
    }
  }
  
  // 获取活跃游戏列表
  getActiveGames() {
    const games = [];
    
    for (const [roomId, gameCore] of gameManager.entries()) {
      games.push({
        roomId,
        status: gameCore.status,
        phase: gameCore.phase,
        playersCount: gameCore.players.length,
        baseGold: gameCore.baseGold,
        multiplier: gameCore.multiplier,
        startTime: gameCore.gameStartTime,
        duration: gameCore.gameStartTime ? Date.now() - gameCore.gameStartTime : 0
      });
    }
    
    return games;
  }
}

module.exports = new GameService();