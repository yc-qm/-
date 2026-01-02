// server/src/controllers/userController.js
const User = require('../models/User');
const { generateToken } = require('../utils/auth');
const { successResponse, errorResponse } = require('../utils/response');

class UserController {
  // 用户注册/登录
  async login(req, res) {
    try {
      const { code, userInfo } = req.body;
      
      if (!code || !userInfo) {
        return errorResponse(res, '参数不完整', 400);
      }
      
      // 这里应该调用微信API获取openid，简化处理
      // const wxResponse = await getOpenId(code);
      // const openid = wxResponse.openid;
      
      // 模拟获取openid
      const openid = `wx_${Date.now()}_${Math.random().toString(36).substr(2)}`;
      
      // 查找或创建用户
      let user = await User.findOne({ openid });
      
      if (!user) {
        // 新用户注册
        user = new User({
          openid,
          nickname: userInfo.nickName || '微信用户',
          avatarUrl: userInfo.avatarUrl || '',
          gender: userInfo.gender || 0,
          country: userInfo.country || '',
          province: userInfo.province || '',
          city: userInfo.city || '',
          goldCoins: 1000, // 初始金币
          diamond: 0,      // 初始钻石
          totalGames: 0,
          winGames: 0,
          maxWinStreak: 0,
          currentWinStreak: 0,
          totalEarnings: 0,
          vipLevel: 0,
          lastLoginAt: new Date()
        });
        
        await user.save();
        
        console.log(`新用户注册: ${user.nickname}`);
      } else {
        // 更新用户信息
        user.nickname = userInfo.nickName || user.nickname;
        user.avatarUrl = userInfo.avatarUrl || user.avatarUrl;
        user.lastLoginAt = new Date();
        await user.save();
      }
      
      // 生成token
      const token = generateToken(user._id);
      
      // 返回用户信息
      return successResponse(res, {
        token,
        userInfo: {
          userId: user._id,
          openid: user.openid,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          goldCoins: user.goldCoins,
          diamond: user.diamond,
          totalGames: user.totalGames,
          winGames: user.winGames,
          winRate: user.totalGames > 0 ? (user.winGames / user.totalGames * 100).toFixed(1) : 0,
          vipLevel: user.vipLevel,
          signature: user.signature || '',
          createdAt: user.createdAt
        }
      });
      
    } catch (error) {
      console.error('用户登录失败:', error);
      return errorResponse(res, '登录失败', 500);
    }
  }
  
  // 获取用户信息
  async getProfile(req, res) {
    try {
      const userId = req.userId;
      
      const user = await User.findById(userId).select('-openid -__v');
      
      if (!user) {
        return errorResponse(res, '用户不存在', 404);
      }
      
      // 计算胜率
      const winRate = user.totalGames > 0 ? (user.winGames / user.totalGames * 100).toFixed(1) : 0;
      
      return successResponse(res, {
        userId: user._id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        gender: user.gender,
        goldCoins: user.goldCoins,
        diamond: user.diamond,
        totalGames: user.totalGames,
        winGames: user.winGames,
        loseGames: user.totalGames - user.winGames,
        winRate: winRate,
        maxWinStreak: user.maxWinStreak,
        currentWinStreak: user.currentWinStreak,
        totalEarnings: user.totalEarnings,
        vipLevel: user.vipLevel,
        signature: user.signature || '',
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      });
      
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return errorResponse(res, '获取用户信息失败', 500);
    }
  }
  
  // 更新用户信息
  async updateProfile(req, res) {
    try {
      const userId = req.userId;
      const { nickname, avatarUrl, signature } = req.body;
      
      const updateData = {};
      if (nickname !== undefined) updateData.nickname = nickname;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
      if (signature !== undefined) updateData.signature = signature;
      
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, select: '-openid -__v' }
      );
      
      if (!user) {
        return errorResponse(res, '用户不存在', 404);
      }
      
      return successResponse(res, {
        userId: user._id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        signature: user.signature
      });
      
    } catch (error) {
      console.error('更新用户信息失败:', error);
      return errorResponse(res, '更新失败', 500);
    }
  }
  
  // 更新用户金币
  async updateGold(req, res) {
    try {
      const userId = req.userId;
      const { goldChange, reason } = req.body;
      
      if (!goldChange || typeof goldChange !== 'number') {
        return errorResponse(res, '参数错误', 400);
      }
      
      const user = await User.findById(userId);
      if (!user) {
        return errorResponse(res, '用户不存在', 404);
      }
      
      // 检查金币是否足够（如果是扣除）
      if (goldChange < 0 && user.goldCoins < Math.abs(goldChange)) {
        return errorResponse(res, '金币不足', 400);
      }
      
      // 更新金币
      user.goldCoins += goldChange;
      
      // 记录金币变化
      if (reason) {
        user.goldHistory = user.goldHistory || [];
        user.goldHistory.push({
          change: goldChange,
          reason: reason,
          balance: user.goldCoins,
          timestamp: new Date()
        });
        
        // 只保留最近100条记录
        if (user.goldHistory.length > 100) {
          user.goldHistory = user.goldHistory.slice(-100);
        }
      }
      
      await user.save();
      
      return successResponse(res, {
        userId: user._id,
        goldCoins: user.goldCoins,
        change: goldChange
      });
      
    } catch (error) {
      console.error('更新金币失败:', error);
      return errorResponse(res, '更新失败', 500);
    }
  }
  
  // 获取用户排行榜
  async getRanking(req, res) {
    try {
      const { type = 'gold', page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      let sortField;
      switch (type) {
        case 'gold':
          sortField = { goldCoins: -1 };
          break;
        case 'winRate':
          sortField = { winRate: -1 };
          break;
        case 'winStreak':
          sortField = { maxWinStreak: -1 };
          break;
        case 'totalGames':
          sortField = { totalGames: -1 };
          break;
        default:
          sortField = { goldCoins: -1 };
      }
      
      const users = await User.find()
        .select('nickname avatarUrl goldCoins totalGames winGames vipLevel')
        .sort(sortField)
        .skip(skip)
        .limit(parseInt(limit));
      
      // 计算排名和胜率
      const rankingList = users.map((user, index) => ({
        rank: skip + index + 1,
        userId: user._id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        goldCoins: user.goldCoins,
        totalGames: user.totalGames,
        winGames: user.winGames,
        winRate: user.totalGames > 0 ? (user.winGames / user.totalGames * 100).toFixed(1) : 0,
        vipLevel: user.vipLevel
      }));
      
      // 获取总用户数
      const total = await User.countDocuments();
      
      return successResponse(res, {
        rankingList,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
      
    } catch (error) {
      console.error('获取排行榜失败:', error);
      return errorResponse(res, '获取排行榜失败', 500);
    }
  }
  
  // 获取用户游戏记录
  async getGameRecords(req, res) {
    try {
      const userId = req.userId;
      const { page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // 这里需要查询GameRecord模型，简化处理
      // const records = await GameRecord.find({ players: userId })
      //   .sort({ createdAt: -1 })
      //   .skip(skip)
      //   .limit(parseInt(limit));
      
      // 模拟数据
      const records = [];
      const total = 0;
      
      return successResponse(res, {
        records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
      
    } catch (error) {
      console.error('获取游戏记录失败:', error);
      return errorResponse(res, '获取游戏记录失败', 500);
    }
  }
}

module.exports = new UserController();