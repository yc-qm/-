// server/src/models/GameRecord.js
const mongoose = require('mongoose');

const gameRecordSchema = new mongoose.Schema({
  // 房间信息
  roomId: {
    type: String,
    required: true,
    index: true
  },
  
  // 游戏基本信息
  baseGold: {
    type: Number,
    required: true
  },
  multiplier: {
    type: Number,
    default: 1
  },
  winnerTeam: {
    type: Number,
    required: true
  },
  
  // 游戏时间
  gameDuration: {
    type: Number, // 毫秒
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  
  // 玩家信息
  players: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    seatIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 3
    },
    team: {
      type: Number,
      required: true
    },
    initialCards: {
      type: Number,
      required: true
    },
    remainingCards: {
      type: Number,
      required: true
    },
    isDoubler: {
      type: Boolean,
      default: false
    },
    isTripler: {
      type: Boolean,
      default: false
    },
    isAntiDoubler: {
      type: Boolean,
      default: false
    },
    isWinner: {
      type: Boolean,
      required: true
    },
    goldChange: {
      type: Number,
      required: true
    }
  }],
  
  // 出牌历史
  playHistory: [{
    playerIndex: Number,
    playerId: String,
    cards: [{
      suit: String,
      rank: String
    }],
    cardType: String,
    timestamp: Date,
    round: Number
  }],
  
  // 统计数据
  totalRounds: {
    type: Number,
    default: 0
  },
  totalPlays: {
    type: Number,
    default: 0
  },
  maxCombo: {
    type: Number,
    default: 0
  },
  
  // 系统
  recordedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 索引
gameRecordSchema.index({ 'players.userId': 1, endTime: -1 });
gameRecordSchema.index({ winnerTeam: 1 });
gameRecordSchema.index({ startTime: -1 });

module.exports = mongoose.model('GameRecord', gameRecordSchema);