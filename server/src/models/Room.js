// server/src/models/Room.js
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  // 房间基本信息
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  roomType: {
    type: String,
    enum: ['friend', 'match', 'challenge'],
    default: 'friend'
  },
  baseGold: {
    type: Number,
    required: true,
    enum: [200, 500, 1000, 2000, 5000]
  },
  password: {
    type: String,
    default: ''
  },
  
  // 房主
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 玩家信息
  players: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinTime: Date,
    isReady: {
      type: Boolean,
      default: false
    },
    position: {
      type: Number,
      min: 0,
      max: 3
    },
    leftTime: Date,
    leftReason: String
  }],
  
  // 房间状态
  currentPlayers: {
    type: Number,
    default: 0,
    min: 0,
    max: 4
  },
  maxPlayers: {
    type: Number,
    default: 4
  },
  status: {
    type: String,
    enum: ['waiting', 'playing', 'finished', 'closed'],
    default: 'waiting'
  },
  
  // 游戏相关信息
  gameStartTime: Date,
  gameEndTime: Date,
  winnerTeam: Number, // 0或1
  multiplier: {
    type: Number,
    default: 1
  },
  
  // 房间设置
  settings: {
    allowSpectators: {
      type: Boolean,
      default: false
    },
    autoStart: {
      type: Boolean,
      default: true
    },
    timeLimit: {
      type: Number,
      default: 30 // 秒
    }
  },
  
  // 聊天记录
  chatMessages: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    nickname: String,
    content: String,
    type: {
      type: String,
      enum: ['text', 'emoji', 'system'],
      default: 'text'
    },
    timestamp: Date
  }],
  
  // 系统
  isPrivate: {
    type: Boolean,
    default: false
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  closeReason: String,
  
  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 索引
roomSchema.index({ status: 1, roomType: 1, createdAt: -1 });
roomSchema.index({ creator: 1 });
roomSchema.index({ 'players.userId': 1 });

module.exports = mongoose.model('Room', roomSchema);