// server/src/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // 微信相关
  openid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // 用户信息
  nickname: {
    type: String,
    required: true,
    trim: true
  },
  avatarUrl: {
    type: String,
    default: ''
  },
  gender: {
    type: Number,
    default: 0 // 0:未知, 1:男性, 2:女性
  },
  country: String,
  province: String,
  city: String,
  
  // 资产
  goldCoins: {
    type: Number,
    default: 1000
  },
  diamond: {
    type: Number,
    default: 0
  },
  
  // 游戏数据
  totalGames: {
    type: Number,
    default: 0
  },
  winGames: {
    type: Number,
    default: 0
  },
  maxWinStreak: {
    type: Number,
    default: 0
  },
  currentWinStreak: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  
  // VIP系统
  vipLevel: {
    type: Number,
    default: 0
  },
  vipExp: {
    type: Number,
    default: 0
  },
  vipExpireDate: Date,
  
  // 个性签名
  signature: {
    type: String,
    default: '',
    maxlength: 50
  },
  
  // 金币变化历史
  goldHistory: [{
    change: Number,
    reason: String,
    balance: Number,
    timestamp: Date,
    roomId: String,
    orderNo: String
  }],
  
  // 好友相关
  friends: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    nickname: String,
    avatarUrl: String,
    friendSince: Date,
    lastPlayed: Date
  }],
  
  // 系统
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: String,
  banUntil: Date,
  
  // 时间戳
  lastLoginAt: Date,
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

// 计算胜率（虚拟字段）
userSchema.virtual('winRate').get(function() {
  return this.totalGames > 0 ? (this.winGames / this.totalGames * 100).toFixed(1) : 0;
});

// 索引
userSchema.index({ goldCoins: -1 });
userSchema.index({ totalGames: -1 });
userSchema.index({ winRate: -1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);