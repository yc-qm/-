// database/schema-mongodb.js
/**
 * MongoDB集合结构定义
 * 使用Mongoose Schema定义所有集合结构
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * 1. 用户集合
 */
const UserSchema = new Schema({
  // 微信信息
  openid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  unionid: {
    type: String,
    sparse: true,
    index: true
  },
  sessionKey: {
    type: String,
    select: false // 查询时不返回
  },
  
  // 基础信息
  nickname: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 12,
    index: true
  },
  avatarUrl: {
    type: String,
    default: '/images/avatars/default.png'
  },
  gender: {
    type: Number,
    enum: [0, 1, 2], // 0未知，1男，2女
    default: 0
  },
  city: String,
  province: String,
  country: String,
  
  // 游戏信息
  coins: {
    type: Number,
    default: 1000,
    min: 0
  },
  diamonds: {
    type: Number,
    default: 0,
    min: 0
  },
  level: {
    type: Number,
    default: 1
  },
  exp: {
    type: Number,
    default: 0
  },
  vipLevel: {
    type: Number,
    default: 0
  },
  vipExp: {
    type: Number,
    default: 0
  },
  
  // 游戏统计
  stats: {
    totalGames: {
      type: Number,
      default: 0
    },
    wins: {
      type: Number,
      default: 0
    },
    losses: {
      type: Number,
      default: 0
    },
    draws: {
      type: Number,
      default: 0
    },
    winRate: {
      type: Number,
      default: 0
    },
    totalRounds: {
      type: Number,
      default: 0
    },
    maxWinStreak: {
      type: Number,
      default: 0
    },
    maxCardsLeft: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    totalSpending: {
      type: Number,
      default: 0
    }
  },
  
  // 社交信息
  friends: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    nickname: String,
    avatarUrl: String,
    addedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'blocked'],
      default: 'accepted'
    }
  }],
  friendRequests: [{
    from: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    nickname: String,
    avatarUrl: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    }
  }],
  
  // 成就系统
  achievements: [{
    achievementId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    description: String,
    icon: String,
    unlockedAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      default: 0
    },
    maxProgress: {
      type: Number,
      default: 1
    },
    unlocked: {
      type: Boolean,
      default: false
    }
  }],
  
  // 设置
  settings: {
    soundEnabled: {
      type: Boolean,
      default: true
    },
    musicEnabled: {
      type: Boolean,
      default: true
    },
    vibrationEnabled: {
      type: Boolean,
      default: true
    },
    autoReady: {
      type: Boolean,
      default: false
    },
    showCardHint: {
      type: Boolean,
      default: true
    },
    privateRoom: {
      type: Boolean,
      default: false
    },
    language: {
      type: String,
      default: 'zh-CN',
      enum: ['zh-CN', 'en-US']
    }
  },
  
  // 安全与状态
  status: {
    type: String,
    enum: ['active', 'suspended', 'banned', 'deleted'],
    default: 'active',
    index: true
  },
  role: {
    type: String,
    enum: ['user', 'vip', 'moderator', 'admin'],
    default: 'user'
  },
  lastLoginAt: Date,
  lastLoginIp: String,
  
  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段
UserSchema.virtual('winRatePercentage').get(function() {
  if (this.stats.totalGames === 0) return 0;
  return Math.round((this.stats.wins / this.stats.totalGames) * 100);
});

UserSchema.virtual('isOnline').get(function() {
  // 检查最后登录时间，5分钟内视为在线
  if (!this.lastLoginAt) return false;
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.lastLoginAt > fiveMinutesAgo;
});

// 索引优化
UserSchema.index({ 'stats.winRate': -1 });
UserSchema.index({ coins: -1 });
UserSchema.index({ level: -1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'friends.userId': 1 });

/**
 * 2. 房间集合
 */
const RoomSchema = new Schema({
  // 房间基本信息
  roomCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
    uppercase: true
  },
  name: {
    type: String,
    trim: true,
    default: '欢乐斗地主'
  },
  description: String,
  password: String,
  
  // 房间配置
  gameMode: {
    type: String,
    enum: ['normal', 'competitive', 'friendly', 'puzzle'],
    default: 'normal'
  },
  baseScore: {
    type: Number,
    default: 100,
    min: 100,
    max: 10000
  },
  maxPlayers: {
    type: Number,
    default: 4,
    min: 2,
    max: 4
  },
  maxRounds: {
    type: Number,
    default: 10,
    min: 1,
    max: 100
  },
  timeLimit: {
    type: Number, // 秒
    default: 30,
    min: 10,
    max: 120
  },
  allowSpectators: {
    type: Boolean,
    default: false
  },
  
  // 房主信息
  owner: {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    nickname: String,
    avatarUrl: String
  },
  
  // 玩家信息
  players: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    nickname: String,
    avatarUrl: String,
    position: {
      type: String,
      enum: ['north', 'east', 'south', 'west']
    },
    team: {
      type: Number,
      enum: [1, 2]
    },
    ready: {
      type: Boolean,
      default: false
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastActiveAt: {
      type: Date,
      default: Date.now
    },
    isOnline: {
      type: Boolean,
      default: true
    }
  }],
  
  // 旁观者
  spectators: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    nickname: String,
    avatarUrl: String,
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 游戏状态
  gameState: {
    type: String,
    enum: [
      'waiting',      // 等待开始
      'dealing',      // 发牌中
      'doubling',     // 加倍阶段
      'playing',      // 游戏中
      'finished',     // 游戏结束
      'closed'        // 房间关闭
    ],
    default: 'waiting',
    index: true
  },
  
  // 当前游戏信息
  currentGame: {
    gameId: String,
    dealer: {
      type: String,
      enum: ['north', 'east', 'south', 'west']
    },
    currentTurn: {
      type: String,
      enum: ['north', 'east', 'south', 'west']
    },
    lastCards: [{
      player: String,
      cards: [{
        value: Number,
        suit: String
      }],
      playedAt: Date
    }],
    multiplier: {
      type: Number,
      default: 1,
      min: 1,
      max: 3
    },
    round: {
      type: Number,
      default: 1
    },
    startedAt: Date,
    timerEndsAt: Date
  },
  
  // 聊天记录
  chatMessages: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    nickname: String,
    avatarUrl: String,
    type: {
      type: String,
      enum: ['text', 'emoji', 'voice', 'system'],
      default: 'text'
    },
    content: String,
    voiceUrl: String,
    duration: Number,
    sentAt: {
      type: Date,
      default: Date.now
    },
    readBy: [{
      userId: Schema.Types.ObjectId,
      readAt: Date
    }]
  }],
  
  // 房间统计
  stats: {
    totalGames: {
      type: Number,
      default: 0
    },
    activePlayers: {
      type: Number,
      default: 0
    },
    avgGameDuration: {
      type: Number,
      default: 0
    }
  },
  
  // 元数据
  isPrivate: {
    type: Boolean,
    default: false
  },
  isFull: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  lastActivityAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  closedAt: Date
}, {
  timestamps: true
});

// 索引优化
RoomSchema.index({ gameState: 1, isActive: 1 });
RoomSchema.index({ 'players.userId': 1, isActive: 1 });
RoomSchema.index({ 'owner.userId': 1, isActive: 1 });
RoomSchema.index({ roomCode: 1, password: 1 });
RoomSchema.index({ createdAt: -1 });

/**
 * 3. 游戏记录集合
 */
const GameRecordSchema = new Schema({
  // 游戏基本信息
  gameId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  roomId: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    index: true
  },
  roomCode: String,
  
  // 游戏配置
  gameMode: {
    type: String,
    enum: ['normal', 'competitive', 'friendly', 'puzzle'],
    index: true
  },
  baseScore: Number,
  
  // 玩家信息
  players: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    nickname: String,
    avatarUrl: String,
    position: {
      type: String,
      enum: ['north', 'east', 'south', 'west']
    },
    team: {
      type: Number,
      enum: [1, 2]
    },
    initialCards: [{
      value: Number,
      suit: String
    }],
    cardsCount: {
      type: Number,
      default: 0
    }
  }],
  
  // 游戏过程
  rounds: [{
    roundNumber: {
      type: Number,
      required: true
    },
    dealer: {
      type: String,
      enum: ['north', 'east', 'south', 'west']
    },
    multiplier: {
      type: Number,
      default: 1
    },
    moves: [{
      player: {
        type: String,
        enum: ['north', 'east', 'south', 'west']
      },
      action: {
        type: String,
        enum: ['play', 'pass', 'double', 'triple', 'surrender']
      },
      cards: [{
        value: Number,
        suit: String
      }],
      timestamp: {
        type: Date,
        default: Date.now
      },
      isValid: {
        type: Boolean,
        default: true
      },
      isWinningMove: {
        type: Boolean,
        default: false
      }
    }],
    winner: {
      player: String,
      team: Number
    },
    duration: {
      type: Number, // 秒
      default: 0
    },
    endedAt: Date
  }],
  
  // 游戏结果
  result: {
    winnerTeam: {
      type: Number,
      enum: [1, 2]
    },
    winningPlayers: [{
      userId: Schema.Types.ObjectId,
      nickname: String,
      position: String
    }],
    losingPlayers: [{
      userId: Schema.Types.ObjectId,
      nickname: String,
      position: String
    }],
    scores: {
      team1: {
        type: Number,
        default: 0
      },
      team2: {
        type: Number,
        default: 0
      }
    },
    earnings: [{
      userId: Schema.Types.ObjectId,
      coins: Number,
      diamonds: Number,
      exp: Number
    }],
    isDraw: {
      type: Boolean,
      default: false
    },
    isSurrender: {
      type: Boolean,
      default: false
    },
    isSpring: {
      type: Boolean,
      default: false
    },
    hasBomb: {
      type: Boolean,
      default: false
    }
  },
  
  // 游戏统计
  stats: {
    totalMoves: {
      type: Number,
      default: 0
    },
    totalRounds: {
      type: Number,
      default: 0
    },
    longestRound: {
      type: Number,
      default: 0
    },
    shortestRound: {
      type: Number,
      default: 0
    },
    totalDuration: {
      type: Number,
      default: 0
    },
    maxMultiplier: {
      type: Number,
      default: 1
    },
    bombsUsed: {
      type: Number,
      default: 0
    }
  },
  
  // 回放数据
  replayData: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  // 审核标记
  isReviewed: {
    type: Boolean,
    default: false
  },
  reviewedBy: {
    userId: Schema.Types.ObjectId,
    nickname: String,
    reviewedAt: Date
  },
  flags: [{
    userId: Schema.Types.ObjectId,
    reason: String,
    reportedAt: Date,
    resolved: {
      type: Boolean,
      default: false
    }
  }],
  
  // 时间戳
  startedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  endedAt: {
    type: Date,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 索引优化
GameRecordSchema.index({ 'players.userId': 1, startedAt: -1 });
GameRecordSchema.index({ 'result.winnerTeam': 1 });
GameRecordSchema.index({ 'result.isDraw': 1 });
GameRecordSchema.index({ gameMode: 1, startedAt: -1 });
GameRecordSchema.index({ createdAt: -1 });

/**
 * 4. 支付记录集合
 */
const PaymentSchema = new Schema({
  // 订单信息
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  transactionId: String, // 第三方交易ID
  
  // 用户信息
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  openid: String,
  
  // 商品信息
  productId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  productType: {
    type: String,
    enum: ['coins', 'diamonds', 'vip', 'other'],
    default: 'coins'
  },
  quantity: {
    type: Number,
    default: 1
  },
  
  // 金额信息
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  currency: {
    type: String,
    default: 'CNY',
    enum: ['CNY', 'USD']
  },
  coinsAwarded: {
    type: Number,
    default: 0
  },
  diamondsAwarded: {
    type: Number,
    default: 0
  },
  
  // 支付信息
  paymentMethod: {
    type: String,
    enum: ['wechat', 'alipay', 'apple', 'other'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed', 'refunded', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // 支付详情
  prepayId: String,
  codeUrl: String, // 二维码URL
  paymentParams: Schema.Types.Mixed,
  
  // 回调信息
  notifyData: Schema.Types.Mixed,
  notifyTime: Date,
  notifyCount: {
    type: Number,
    default: 0
  },
  
  // 退款信息
  refundId: String,
  refundAmount: Number,
  refundReason: String,
  refundedAt: Date,
  
  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  paidAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

// 索引优化
PaymentSchema.index({ userId: 1, paymentStatus: 1, createdAt: -1 });
PaymentSchema.index({ transactionId: 1 });
PaymentSchema.index({ 'productType': 1, createdAt: -1 });

/**
 * 5. 成就定义集合
 */
const AchievementSchema = new Schema({
  // 成就标识
  achievementId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  category: {
    type: String,
    enum: ['gameplay', 'social', 'collection', 'special', 'hidden'],
    default: 'gameplay',
    index: true
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    default: 'bronze'
  },
  
  // 成就信息
  name: {
    type: String,
    required: true
  },
  description: String,
  icon: {
    type: String,
    required: true
  },
  unlockMessage: String,
  
  // 解锁条件
  unlockType: {
    type: String,
    enum: ['count', 'score', 'streak', 'combo', 'collection', 'special'],
    default: 'count'
  },
  unlockValue: {
    type: Number,
    required: true
  },
  progressType: {
    type: String,
    enum: ['incremental', 'threshold', 'boolean'],
    default: 'incremental'
  },
  
  // 奖励
  rewardCoins: {
    type: Number,
    default: 0
  },
  rewardDiamonds: {
    type: Number,
    default: 0
  },
  rewardExp: {
    type: Number,
    default: 0
  },
  
  // 统计
  unlockedCount: {
    type: Number,
    default: 0
  },
  unlockRate: {
    type: Number,
    default: 0
  },
  
  // 可见性
  isHidden: {
    type: Boolean,
    default: false
  },
  isSecret: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

/**
 * 6. 系统配置集合
 */
const ConfigSchema = new Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  value: Schema.Types.Mixed,
  type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'array', 'object'],
    default: 'string'
  },
  description: String,
  category: {
    type: String,
    enum: ['game', 'payment', 'system', 'security', 'notification', 'other'],
    default: 'system'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

/**
 * 7. 通知集合
 */
const NotificationSchema = new Schema({
  // 接收者
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 通知内容
  type: {
    type: String,
    enum: [
      'friend_request', 
      'friend_accept',
      'game_invite',
      'room_invite',
      'game_result',
      'achievement',
      'payment',
      'system',
      'warning',
      'promotion'
    ],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  data: Schema.Types.Mixed,
  
  // 关联资源
  relatedId: Schema.Types.ObjectId,
  relatedType: String,
  
  // 状态
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  priority: {
    type: Number,
    enum: [1, 2, 3], // 1低，2中，3高
    default: 2
  },
  
  // 过期时间
  expiresAt: Date,
  
  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  readAt: Date
}, {
  timestamps: true
});

// 导出所有模式
module.exports = {
  UserSchema,
  RoomSchema,
  GameRecordSchema,
  PaymentSchema,
  AchievementSchema,
  ConfigSchema,
  NotificationSchema
};