// server/src/core/GameCore.js
const CardLogic = require('./CardLogic');

class GameCore {
  constructor(roomId, baseGold) {
    this.roomId = roomId;
    this.baseGold = baseGold;
    
    // 游戏状态
    this.status = 'waiting'; // waiting, dealing, doubling, playing, finished
    this.phase = 'waiting';  // 当前阶段
    
    // 玩家数据
    this.players = [];      // 4个玩家对象
    this.teams = [[], []];  // 两个队伍 [0队, 1队]
    
    // 游戏数据
    this.deck = [];         // 牌堆
    this.currentPlayerIndex = -1;  // 当前出牌玩家索引
    this.currentCards = [];        // 当前桌面上出的牌
    this.currentCardsType = '';    // 当前牌型
    this.lastPlayedPlayerIndex = -1; // 上一轮出牌玩家
    this.passedPlayers = new Set(); // 过牌的玩家
    
    // 加倍相关
    this.multiplier = 1;
    this.doublingChoices = new Map(); // 玩家加倍选择
    this.doublingStage = 0; // 0:未开始, 1:加倍选择, 2:反加倍选择
    this.doublingCompleted = false;
    
    // 游戏结果
    this.winnerTeam = null;
    this.winnerPlayers = [];
    this.gameStartTime = null;
    this.gameEndTime = null;
    
    // 黑桃3持有者
    this.spade3PlayerIndex = -1;
    
    // 出牌历史
    this.playHistory = [];
    
    // 定时器
    this.timers = new Map();
  }
  
  // 初始化游戏
  initialize(playersData) {
    // 设置玩家
    this.players = playersData.map((player, index) => ({
      id: player.id,
      userId: player.userId,
      nickname: player.nickname,
      avatar: player.avatar,
      seatIndex: index,
      team: index % 2, // 0: 队伍A, 1: 队伍B
      cards: [],       // 手牌
      remainingCards: 0,
      isReady: false,
      canPlay: true,   // 是否可出牌（加倍阶段可能禁出）
      hasPassed: false,
      isDoubler: false,
      isTripler: false,
      isAntiDoubler: false,
      totalCards: 0
    }));
    
    // 分配队伍
    this.teams[0] = this.players.filter(p => p.team === 0);
    this.teams[1] = this.players.filter(p => p.team === 1);
    
    console.log(`游戏初始化完成，房间: ${this.roomId}, 玩家: ${this.players.length}`);
  }
  
  // 开始游戏
  startGame() {
    if (this.status !== 'waiting') {
      throw new Error('游戏已经开始');
    }
    
    if (this.players.length !== 4) {
      throw new Error('需要4名玩家才能开始游戏');
    }
    
    this.status = 'dealing';
    this.gameStartTime = Date.now();
    
    // 洗牌和发牌
    this.shuffleAndDeal();
    
    // 确定黑桃3持有者
    this.determineSpade3Holder();
    
    // 进入加倍阶段
    this.enterDoublingPhase();
    
    console.log(`游戏开始，房间: ${this.roomId}`);
    
    return this.getGameState();
  }
  
  // 洗牌和发牌
  shuffleAndDeal() {
    // 创建牌堆
    this.deck = CardLogic.createDeck();
    
    // 洗牌
    this.deck = CardLogic.shuffleDeck(this.deck);
    
    // 发牌：前52张每人13张
    let cardIndex = 0;
    for (let i = 0; i < 52; i++) {
      const playerIndex = i % 4;
      this.players[playerIndex].cards.push(this.deck[cardIndex]);
      cardIndex++;
    }
    
    // 最后两张给前两个玩家（每人14张）
    this.players[0].cards.push(this.deck[cardIndex]);
    this.players[1].cards.push(this.deck[cardIndex + 1]);
    
    // 排序手牌
    this.players.forEach(player => {
      player.cards = CardLogic.sortCards(player.cards);
      player.remainingCards = player.cards.length;
      player.totalCards = player.cards.length;
    });
    
    console.log(`发牌完成，房间: ${this.roomId}`);
  }
  
  // 确定黑桃3持有者
  determineSpade3Holder() {
    for (let i = 0; i < this.players.length; i++) {
      if (CardLogic.hasSpade3(this.players[i].cards)) {
        this.spade3PlayerIndex = i;
        this.currentPlayerIndex = i; // 黑桃3持有者先出牌
        console.log(`黑桃3持有者: 玩家${i} (${this.players[i].nickname})`);
        return;
      }
    }
  }
  
  // 进入加倍阶段
  enterDoublingPhase() {
    this.status = 'doubling';
    this.phase = 'doubling';
    this.doublingStage = 1;
    this.doublingChoices.clear();
    
    // 重置所有玩家的出牌权限
    this.players.forEach(player => {
      player.canPlay = true;
    });
    
    console.log(`进入加倍阶段，房间: ${this.roomId}`);
  }
  
  // 处理加倍选择
  processDoublingChoice(playerId, choice) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('玩家不存在');
    }
    
    if (this.status !== 'doubling') {
      throw new Error('当前不是加倍阶段');
    }
    
    // 记录选择
    this.doublingChoices.set(playerId, {
      playerId,
      choice,
      timestamp: Date.now()
    });
    
    // 根据选择设置玩家状态
    if (choice === 'triple') {
      player.isTripler = true;
    } else if (choice === 'double') {
      player.isDoubler = true;
    } else if (choice === 'anti-double') {
      player.isAntiDoubler = true;
    }
    
    // 检查是否需要进入下一阶段或结束加倍
    this.checkDoublingProgress();
    
    console.log(`玩家${player.nickname}选择: ${choice}`);
    
    return this.getDoublingState();
  }
  
  // 检查加倍进度
  checkDoublingProgress() {
    const allPlayersMadeChoice = this.players.every(p => 
      this.doublingChoices.has(p.id)
    );
    
    if (!allPlayersMadeChoice) {
      return;
    }
    
    // 所有玩家都做出了选择
    const choices = Array.from(this.doublingChoices.values());
    
    // 检查是否有人选择三倍
    const hasTriple = choices.some(c => c.choice === 'triple');
    const hasDouble = choices.some(c => c.choice === 'double');
    const hasAntiDouble = choices.some(c => c.choice === 'anti-double');
    
    if (hasTriple) {
      // 有人叫三倍，直接结束
      this.finalizeDoubling();
    } else if (hasDouble && !hasAntiDouble) {
      // 只有加倍，没有反加倍，询问反加倍
      if (this.doublingStage === 1) {
        this.doublingStage = 2; // 进入反加倍阶段
        this.resetAntiDoublingChoices();
      } else {
        this.finalizeDoubling();
      }
    } else {
      // 无人加倍或有加倍和反加倍
      this.finalizeDoubling();
    }
  }
  
  // 重置反加倍选择
  resetAntiDoublingChoices() {
    // 只重置非加倍方的选择
    const doublePlayer = this.players.find(p => p.isDoubler);
    if (doublePlayer) {
      const doubleTeam = doublePlayer.team;
      this.players.forEach(player => {
        if (player.team !== doubleTeam) {
          // 清除非加倍方玩家的选择，让他们选择反加倍
          this.doublingChoices.delete(player.id);
          player.isAntiDoubler = false;
        }
      });
    }
  }
  
  // 完成加倍阶段
  finalizeDoubling() {
    const choices = Array.from(this.doublingChoices.values());
    const hasTriple = choices.some(c => c.choice === 'triple');
    const hasDouble = choices.some(c => c.choice === 'double');
    const hasAntiDouble = choices.some(c => c.choice === 'anti-double');
    
    // 计算倍数
    if (hasTriple) {
      this.multiplier = 3;
      const triplePlayer = this.players.find(p => p.isTripler);
      if (triplePlayer) {
        // 三倍者获得出牌权
        this.currentPlayerIndex = triplePlayer.seatIndex;
        // 三倍者队友禁出
        this.players.forEach(p => {
          if (p.team === triplePlayer.team && p.id !== triplePlayer.id) {
            p.canPlay = false;
          }
        });
      }
    } else if (hasDouble && hasAntiDouble) {
      this.multiplier = 3;
      // 只有加倍者和反加倍者可以出牌
      this.players.forEach(p => {
        if (!p.isDoubler && !p.isAntiDoubler) {
          p.canPlay = false;
        }
      });
    } else if (hasDouble) {
      this.multiplier = 2;
      // 只有加倍者可以出牌，队友禁出
      const doublePlayer = this.players.find(p => p.isDoubler);
      if (doublePlayer) {
        this.players.forEach(p => {
          if (p.team === doublePlayer.team && p.id !== doublePlayer.id) {
            p.canPlay = false;
          }
        });
      }
    } else {
      this.multiplier = 1;
      // 所有玩家都可以出牌
      this.players.forEach(p => {
        p.canPlay = true;
      });
    }
    
    // 进入出牌阶段
    this.status = 'playing';
    this.phase = 'playing';
    this.doublingCompleted = true;
    
    console.log(`加倍阶段完成，倍数: ${this.multiplier}, 房间: ${this.roomId}`);
  }
  
  // 处理出牌
  playCards(playerId, cards) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('玩家不存在');
    }
    
    if (this.status !== 'playing') {
      throw new Error('游戏未开始或已结束');
    }
    
    if (this.currentPlayerIndex !== player.seatIndex) {
      throw new Error('不是你的回合');
    }
    
    if (!player.canPlay) {
      throw new Error('你被禁出，不能出牌');
    }
    
    // 验证手牌中是否包含这些牌
    if (!CardLogic.containsCards(player.cards, cards)) {
      throw new Error('手牌中不包含这些牌');
    }
    
    // 验证牌型
    const cardType = CardLogic.getCardType(cards);
    if (!cardType.valid) {
      throw new Error(`牌型不合法: ${cardType.type}`);
    }
    
    // 如果不是第一手牌，需要比上家大
    if (this.currentCards.length > 0) {
      // 检查牌型是否匹配
      const lastCardType = CardLogic.getCardType(this.currentCards);
      if (cardType.type !== lastCardType.type) {
        throw new Error(`必须出相同牌型: ${lastCardType.type}`);
      }
      
      // 比较牌大小
      const comparison = CardLogic.compareCards(cards, this.currentCards);
      if (comparison !== 1) { // 1表示cards更大
        throw new Error('出的牌不够大');
      }
    }
    
    // 出牌有效，更新游戏状态
    player.cards = CardLogic.removeCardsFromHand(player.cards, cards);
    player.remainingCards = player.cards.length;
    
    // 更新当前牌
    this.currentCards = cards;
    this.currentCardsType = cardType.type;
    this.lastPlayedPlayerIndex = player.seatIndex;
    
    // 重置过牌状态
    this.passedPlayers.clear();
    this.players.forEach(p => {
      p.hasPassed = false;
    });
    
    // 记录出牌历史
    this.playHistory.push({
      playerId: player.id,
      playerName: player.nickname,
      cards: cards,
      cardType: cardType.type,
      timestamp: Date.now(),
      round: this.playHistory.length + 1
    });
    
    // 检查是否出完牌
    if (player.cards.length === 0) {
      this.endGame(player.team);
      return {
        success: true,
        gameOver: true,
        winnerTeam: player.team,
        nextPlayer: -1
      };
    }
    
    // 更新下一个出牌玩家
    this.currentPlayerIndex = (player.seatIndex + 1) % 4;
    
    // 跳过被禁出的玩家
    while (!this.players[this.currentPlayerIndex].canPlay) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 4;
    }
    
    return {
      success: true,
      gameOver: false,
      nextPlayer: this.currentPlayerIndex
    };
  }
  
  // 过牌
  passTurn(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('玩家不存在');
    }
    
    if (this.status !== 'playing') {
      throw new Error('游戏未开始或已结束');
    }
    
    if (this.currentPlayerIndex !== player.seatIndex) {
      throw new Error('不是你的回合');
    }
    
    if (!player.canPlay) {
      throw new Error('你被禁出，不能过牌');
    }
    
    // 记录过牌
    player.hasPassed = true;
    this.passedPlayers.add(player.seatIndex);
    
    // 如果所有人都过牌，清空当前牌
    if (this.passedPlayers.size === 3) {
      this.currentCards = [];
      this.currentCardsType = '';
      this.passedPlayers.clear();
      this.players.forEach(p => {
        p.hasPassed = false;
      });
      
      // 上一轮出牌者继续出牌
      if (this.lastPlayedPlayerIndex !== -1) {
        this.currentPlayerIndex = this.lastPlayedPlayerIndex;
      }
    } else {
      // 下一个玩家
      this.currentPlayerIndex = (player.seatIndex + 1) % 4;
      
      // 跳过被禁出的玩家
      while (!this.players[this.currentPlayerIndex].canPlay) {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 4;
      }
    }
    
    return {
      success: true,
      currentPlayerIndex: this.currentPlayerIndex,
      allPassed: this.passedPlayers.size === 3
    };
  }
  
  // 结束游戏
  endGame(winnerTeam) {
    this.status = 'finished';
    this.phase = 'finished';
    this.winnerTeam = winnerTeam;
    this.gameEndTime = Date.now();
    
    // 确定胜利玩家
    this.winnerPlayers = this.players.filter(p => p.team === winnerTeam);
    
    console.log(`游戏结束，获胜队伍: ${winnerTeam}, 房间: ${this.roomId}`);
    
    // 计算得分
    return this.calculateScores();
  }
  
  // 计算得分
  calculateScores() {
    const scores = {};
    const baseScore = this.baseGold * this.multiplier;
    
    this.players.forEach(player => {
      if (player.team === this.winnerTeam) {
        // 胜利方获得金币
        scores[player.userId] = {
          goldChange: baseScore,
          isWinner: true,
          finalScore: baseScore
        };
      } else {
        // 失败方扣除金币
        scores[player.userId] = {
          goldChange: -baseScore,
          isWinner: false,
          finalScore: -baseScore
        };
      }
    });
    
    return scores;
  }
  
  // 获取游戏状态
  getGameState() {
    return {
      roomId: this.roomId,
      status: this.status,
      phase: this.phase,
      players: this.players.map(p => ({
        id: p.id,
        userId: p.userId,
        nickname: p.nickname,
        avatar: p.avatar,
        seatIndex: p.seatIndex,
        team: p.team,
        remainingCards: p.remainingCards,
        totalCards: p.totalCards,
        canPlay: p.canPlay,
        hasPassed: p.hasPassed,
        isDoubler: p.isDoubler,
        isTripler: p.isTripler,
        isAntiDoubler: p.isAntiDoubler
      })),
      currentPlayerIndex: this.currentPlayerIndex,
      currentCards: this.currentCards,
      currentCardsType: this.currentCardsType,
      multiplier: this.multiplier,
      spade3PlayerIndex: this.spade3PlayerIndex,
      winnerTeam: this.winnerTeam,
      playHistory: this.playHistory.slice(-10), // 最近10条记录
      gameDuration: this.gameStartTime ? Date.now() - this.gameStartTime : 0
    };
  }
  
  // 获取加倍状态
  getDoublingState() {
    const choices = {};
    this.doublingChoices.forEach((choice, playerId) => {
      choices[playerId] = choice;
    });
    
    return {
      stage: this.doublingStage,
      choices: choices,
      completed: this.doublingCompleted,
      waitingPlayers: this.players.filter(p => !this.doublingChoices.has(p.id)).map(p => p.id)
    };
  }
  
  // 获取玩家手牌（仅自己可见）
  getPlayerCards(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      return [];
    }
    return player.cards;
  }
  
  // 重置游戏（用于重新开始）
  resetGame() {
    this.status = 'waiting';
    this.phase = 'waiting';
    this.currentPlayerIndex = -1;
    this.currentCards = [];
    this.currentCardsType = '';
    this.lastPlayedPlayerIndex = -1;
    this.passedPlayers.clear();
    this.multiplier = 1;
    this.doublingChoices.clear();
    this.doublingStage = 0;
    this.doublingCompleted = false;
    this.winnerTeam = null;
    this.winnerPlayers = [];
    this.playHistory = [];
    this.gameStartTime = null;
    this.gameEndTime = null;
    
    // 重置玩家状态
    this.players.forEach(player => {
      player.cards = [];
      player.remainingCards = 0;
      player.totalCards = 0;
      player.canPlay = true;
      player.hasPassed = false;
      player.isDoubler = false;
      player.isTripler = false;
      player.isAntiDoubler = false;
    });
  }
  
  // 设置定时器
  setTimer(timerId, callback, delay) {
    const timer = setTimeout(() => {
      callback();
      this.timers.delete(timerId);
    }, delay);
    
    this.timers.set(timerId, timer);
  }
  
  // 清除定时器
  clearTimer(timerId) {
    if (this.timers.has(timerId)) {
      clearTimeout(this.timers.get(timerId));
      this.timers.delete(timerId);
    }
  }
  
  // 清理所有定时器
  clearAllTimers() {
    this.timers.forEach(timer => {
      clearTimeout(timer);
    });
    this.timers.clear();
  }
}

module.exports = GameCore;