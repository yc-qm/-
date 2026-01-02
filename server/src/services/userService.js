// server/src/services/userService.js
const User = require('../models/User');
const GameRecord = require('../models/GameRecord');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class UserService {
  // 创建用户
  async createUser(userData) {
    try {
      const { openid, nickname, avatarUrl, gender, country, province, city } = userData;
      
      // 检查用户是否已存在
      const existingUser = await User.findOne({ openid });
      if (existingUser) {
        return existingUser;
      }
      
      // 生成邀请码
      const inviteCode = this.generateInviteCode();
      
      // 创建新用户
      const user = new User({
        openid,
        nickname: nickname || `玩家${Date.now().toString().slice(-6)}`,
        avatarUrl: avatarUrl || '/images/avatars/default.png',
        gender: gender || 0,
        country: country || '',
        province: province || '',
        city: city || '',
        inviteCode,
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
      
      console.log(`新用户创建: ${user._id}, 昵称: ${user.nickname}`);
      return user;
      
    } catch (error) {
      console.error('创建用户失败:', error);
      throw new Error('创建用户失败');
    }
  }
  
  // 获取用户信息
  async getUserById(userId) {
    try {
      const user = await User.findById(userId)
        .select('-openid -__v -goldHistory');
      
      if (!user) {
        throw new Error('用户不存在');
      }
      
      return user;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      throw error;
    }
  }
  
  // 获取用户详细信息（包含统计数据）
  async getUserDetail(userId) {
    try {
      const user = await User.findById(userId)
        .select('-openid -__v');
      
      if (!user) {
        throw new Error('用户不存在');
      }
      
      // 计算胜率
      const winRate = user.totalGames > 0 ? 
        ((user.winGames / user.totalGames) * 100).toFixed(1) : 0;
      
      // 获取最近游戏记录
      const recentGames = await GameRecord.find({
        'players.userId': userId
      })
      .sort({ endTime: -1 })
      .limit(5)
      .select('roomId winnerTeam gameDuration startTime players');
      
      // 格式化最近游戏
      const formattedGames = recentGames.map(game => {
        const playerInfo = game.players.find(p => p.userId.toString() === userId.toString());
        return {
          roomId: game.roomId,
          isWinner: playerInfo ? playerInfo.isWinner : false,
          gameDuration: game.gameDuration,
          startTime: game.startTime,
          goldChange: playerInfo ? playerInfo.goldChange : 0
        };
      });
      
      // 计算今日游戏数据
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayGames = await GameRecord.countDocuments({
        'players.userId': userId,
        startTime: { $gte: today }
      });
      
      const todayWins = await GameRecord.countDocuments({
        'players.userId': userId,
        winnerTeam: { $exists: true },
        startTime: { $gte: today },
        'players.isWinner': true
      });
      
      return {
        user: {
          _id: user._id,
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
          vipExp: user.vipExp,
          signature: user.signature || '',
          inviteCode: user.inviteCode,
          isBanned: user.isBanned,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        },
        stats: {
          todayGames,
          todayWins,
          todayWinRate: todayGames > 0 ? ((todayWins / todayGames) * 100).toFixed(1) : 0,
          recentGames: formattedGames
        }
      };
      
    } catch (error) {
      console.error('获取用户详情失败:', error);
      throw error;
    }
  }
  
  // 更新用户信息
  async updateUser(userId, updateData) {
    try {
      const allowedFields = ['nickname', 'avatarUrl', 'signature', 'gender'];
      const filteredData = {};
      
      // 只允许更新指定字段
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key) && updateData[key] !== undefined) {
          filteredData[key] = updateData[key];
        }
      });
      
      // 昵称长度验证
      if (filteredData.nickname && filteredData.nickname.length > 20) {
        throw new Error('昵称不能超过20个字符');
      }
      
      // 签名长度验证
      if (filteredData.signature && filteredData.signature.length > 50) {
        throw new Error('个性签名不能超过50个字符');
      }
      
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: filteredData },
        { new: true, runValidators: true }
      );
      
      if (!user) {
        throw new Error('用户不存在');
      }
      
      return user;
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw error;
    }
  }
  
  // 更新用户金币
  async updateUserGold(userId, goldChange, reason = '', extraData = {}) {
    try {
      if (typeof goldChange !== 'number') {
        throw new Error('金币变化值必须是数字');
      }
      
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }
      
      // 检查金币是否足够（如果是扣除）
      if (goldChange < 0 && user.goldCoins < Math.abs(goldChange)) {
        throw new Error('金币不足');
      }
      
      // 更新金币
      const oldGold = user.goldCoins;
      user.goldCoins += goldChange;
      
      // 记录金币变化历史
      user.goldHistory = user.goldHistory || [];
      user.goldHistory.push({
        change: goldChange,
        reason: reason || '系统调整',
        balance: user.goldCoins,
        timestamp: new Date(),
        ...extraData
      });
      
      // 只保留最近100条记录
      if (user.goldHistory.length > 100) {
        user.goldHistory = user.goldHistory.slice(-100);
      }
      
      await user.save();
      
      console.log(`用户金币更新: ${userId}, 变化: ${goldChange}, 原因: ${reason}`);
      
      return {
        userId: user._id,
        oldGold,
        newGold: user.goldCoins,
        change: goldChange
      };
      
    } catch (error) {
      console.error('更新用户金币失败:', error);
      throw error;
    }
  }
  
  // 更新用户钻石
  async updateUserDiamond(userId, diamondChange, reason = '') {
    try {
      if (typeof diamondChange !== 'number') {
        throw new Error('钻石变化值必须是数字');
      }
      
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }
      
      // 检查钻石是否足够（如果是扣除）
      if (diamondChange < 0 && user.diamond < Math.abs(diamondChange)) {
        throw new Error('钻石不足');
      }
      
      // 更新钻石
      user.diamond += diamondChange;
      await user.save();
      
      console.log(`用户钻石更新: ${userId}, 变化: ${diamondChange}, 原因: ${reason}`);
      
      return {
        userId: user._id,
        diamond: user.diamond,
        change: diamondChange
      };
      
    } catch (error) {
      console.error('更新用户钻石失败:', error);
      throw error;
    }
  }
  
  // 更新用户游戏统计数据
  async updateUserGameStats(userId, gameResult) {
    try {
      const { isWinner, goldChange } = gameResult;
      
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }
      
      // 更新游戏次数
      user.totalGames += 1;
      
      // 更新胜利次数
      if (isWinner) {
        user.winGames += 1;
        user.currentWinStreak += 1;
        
        // 更新最高连胜
        if (user.currentWinStreak > user.maxWinStreak) {
          user.maxWinStreak = user.currentWinStreak;
        }
      } else {
        user.currentWinStreak = 0;
      }
      
      // 更新金币和总收益
      user.goldCoins += goldChange;
      user.totalEarnings += goldChange;
      
      await user.save();
      
      console.log(`用户游戏统计更新: ${userId}, 胜利: ${isWinner}, 金币变化: ${goldChange}`);
      
      return {
        userId: user._id,
        totalGames: user.totalGames,
        winGames: user.winGames,
        winRate: user.totalGames > 0 ? ((user.winGames / user.totalGames) * 100).toFixed(1) : 0,
        currentWinStreak: user.currentWinStreak,
        maxWinStreak: user.maxWinStreak,
        goldCoins: user.goldCoins,
        totalEarnings: user.totalEarnings
      };
      
    } catch (error) {
      console.error('更新用户游戏统计失败:', error);
      throw error;
    }
  }
  
  // 搜索用户
  async searchUsers(keyword, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const query = {
        $or: [
          { nickname: { $regex: keyword, $options: 'i' } },
          { inviteCode: keyword }
        ]
      };
      
      const users = await User.find(query)
        .select('nickname avatarUrl goldCoins totalGames winGames vipLevel createdAt')
        .sort({ goldCoins: -1 })
        .skip(skip)
        .limit(limit);
      
      const total = await User.countDocuments(query);
      
      const formattedUsers = users.map(user => ({
        userId: user._id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        goldCoins: user.goldCoins,
        totalGames: user.totalGames,
        winGames: user.winGames,
        winRate: user.totalGames > 0 ? ((user.winGames / user.totalGames) * 100).toFixed(1) : 0,
        vipLevel: user.vipLevel,
        createdAt: user.createdAt
      }));
      
      return {
        users: formattedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      console.error('搜索用户失败:', error);
      throw error;
    }
  }
  
  // 获取用户排行榜
  async getUserRankings(type = 'gold', page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      let sortField;
      let projection = {};
      
      switch (type) {
        case 'gold':
          sortField = { goldCoins: -1 };
          projection = { nickname: 1, avatarUrl: 1, goldCoins: 1, vipLevel: 1 };
          break;
        case 'winRate':
          // 需要计算胜率，先获取所有用户再排序
          return await this.getWinRateRankings(page, limit);
        case 'winStreak':
          sortField = { maxWinStreak: -1 };
          projection = { nickname: 1, avatarUrl: 1, maxWinStreak: 1, vipLevel: 1 };
          break;
        case 'totalGames':
          sortField = { totalGames: -1 };
          projection = { nickname: 1, avatarUrl: 1, totalGames: 1, winGames: 1, vipLevel: 1 };
          break;
        case 'vip':
          sortField = { vipLevel: -1, goldCoins: -1 };
          projection = { nickname: 1, avatarUrl: 1, vipLevel: 1, goldCoins: 1 };
          break;
        default:
          sortField = { goldCoins: -1 };
          projection = { nickname: 1, avatarUrl: 1, goldCoins: 1, vipLevel: 1 };
      }
      
      const users = await User.find({}, projection)
        .sort(sortField)
        .skip(skip)
        .limit(limit);
      
      const total = await User.countDocuments();
      
      const rankings = users.map((user, index) => ({
        rank: skip + index + 1,
        userId: user._id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        value: type === 'gold' ? user.goldCoins :
               type === 'winStreak' ? user.maxWinStreak :
               type === 'totalGames' ? user.totalGames :
               type === 'vip' ? user.vipLevel : 0,
        vipLevel: user.vipLevel,
        winGames: user.winGames || 0,
        totalGames: user.totalGames || 0
      }));
      
      return {
        rankings,
        type,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      console.error('获取用户排行榜失败:', error);
      throw error;
    }
  }
  
  // 获取胜率排行榜（特殊处理）
  async getWinRateRankings(page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      // 获取所有用户计算胜率
      const users = await User.find({
        totalGames: { $gt: 0 }
      })
      .select('nickname avatarUrl totalGames winGames vipLevel')
      .sort({ winGames: -1, totalGames: 1 }); // 先按胜场排序
      
      // 计算胜率并排序
      const usersWithWinRate = users.map(user => ({
        userId: user._id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        totalGames: user.totalGames,
        winGames: user.winGames,
        winRate: (user.winGames / user.totalGames) * 100,
        vipLevel: user.vipLevel
      }));
      
      // 按胜率排序
      usersWithWinRate.sort((a, b) => b.winRate - a.winRate);
      
      // 分页
      const total = usersWithWinRate.length;
      const paginatedUsers = usersWithWinRate.slice(skip, skip + limit);
      
      const rankings = paginatedUsers.map((user, index) => ({
        rank: skip + index + 1,
        ...user,
        winRate: user.winRate.toFixed(1)
      }));
      
      return {
        rankings,
        type: 'winRate',
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      console.error('获取胜率排行榜失败:', error);
      throw error;
    }
  }
  
  // 获取用户好友列表
  async getUserFriends(userId) {
    try {
      const user = await User.findById(userId).populate('friends.userId', 'nickname avatarUrl goldCoins totalGames winGames vipLevel');
      
      if (!user) {
        throw new Error('用户不存在');
      }
      
      const friends = user.friends.map(friend => ({
        userId: friend.userId._id,
        nickname: friend.userId.nickname,
        avatarUrl: friend.userId.avatarUrl,
        goldCoins: friend.userId.goldCoins,
        totalGames: friend.userId.totalGames,
        winGames: friend.userId.winGames,
        winRate: friend.userId.totalGames > 0 ? ((friend.userId.winGames / friend.userId.totalGames) * 100).toFixed(1) : 0,
        vipLevel: friend.userId.vipLevel,
        friendSince: friend.friendSince,
        lastPlayed: friend.lastPlayed,
        isOnline: false // 需要从在线用户管理器中获取
      }));
      
      return friends;
    } catch (error) {
      console.error('获取用户好友列表失败:', error);
      throw error;
    }
  }
  
  // 添加好友
  async addFriend(userId, friendId) {
    try {
      if (userId.toString() === friendId.toString()) {
        throw new Error('不能添加自己为好友');
      }
      
      const [user, friend] = await Promise.all([
        User.findById(userId),
        User.findById(friendId)
      ]);
      
      if (!user || !friend) {
        throw new Error('用户不存在');
      }
      
      // 检查是否已经是好友
      const isAlreadyFriend = user.friends.some(f => 
        f.userId.toString() === friendId.toString()
      );
      
      if (isAlreadyFriend) {
        throw new Error('已经是好友了');
      }
      
      // 添加好友
      user.friends.push({
        userId: friendId,
        nickname: friend.nickname,
        avatarUrl: friend.avatarUrl,
        friendSince: new Date()
      });
      
      friend.friends.push({
        userId: userId,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        friendSince: new Date()
      });
      
      await Promise.all([user.save(), friend.save()]);
      
      console.log(`好友关系建立: ${userId} <-> ${friendId}`);
      
      return {
        success: true,
        friendId,
        nickname: friend.nickname,
        avatarUrl: friend.avatarUrl,
        friendSince: new Date()
      };
      
    } catch (error) {
      console.error('添加好友失败:', error);
      throw error;
    }
  }
  
  // 移除好友
  async removeFriend(userId, friendId) {
    try {
      const [user, friend] = await Promise.all([
        User.findById(userId),
        User.findById(friendId)
      ]);
      
      if (!user || !friend) {
        throw new Error('用户不存在');
      }
      
      // 移除好友
      user.friends = user.friends.filter(f => 
        f.userId.toString() !== friendId.toString()
      );
      
      friend.friends = friend.friends.filter(f => 
        f.userId.toString() !== userId.toString()
      );
      
      await Promise.all([user.save(), friend.save()]);
      
      console.log(`好友关系解除: ${userId} <-> ${friendId}`);
      
      return { success: true };
      
    } catch (error) {
      console.error('移除好友失败:', error);
      throw error;
    }
  }
  
  // 通过邀请码添加好友
  async addFriendByInviteCode(userId, inviteCode) {
    try {
      const friend = await User.findOne({ inviteCode });
      if (!friend) {
        throw new Error('邀请码无效');
      }
      
      return await this.addFriend(userId, friend._id);
    } catch (error) {
      console.error('通过邀请码添加好友失败:', error);
      throw error;
    }
  }
  
  // 更新VIP经验
  async updateVipExp(userId, expChange) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }
      
      user.vipExp += expChange;
      
      // 检查是否升级
      const vipLevels = [
        { level: 0, exp: 0 },
        { level: 1, exp: 100 },
        { level: 2, exp: 500 },
        { level: 3, exp: 2000 },
        { level: 4, exp: 5000 },
        { level: 5, exp: 10000 },
        { level: 6, exp: 20000 },
        { level: 7, exp: 50000 },
        { level: 8, exp: 100000 },
        { level: 9, exp: 200000 },
        { level: 10, exp: 500000 }
      ];
      
      let newLevel = user.vipLevel;
      for (let i = vipLevels.length - 1; i >= 0; i--) {
        if (user.vipExp >= vipLevels[i].exp && user.vipLevel < vipLevels[i].level) {
          newLevel = vipLevels[i].level;
          break;
        }
      }
      
      const leveledUp = newLevel > user.vipLevel;
      user.vipLevel = newLevel;
      
      await user.save();
      
      return {
        userId: user._id,
        vipLevel: user.vipLevel,
        vipExp: user.vipExp,
        leveledUp,
        oldLevel: user.vipLevel - (leveledUp ? 1 : 0)
      };
      
    } catch (error) {
      console.error('更新VIP经验失败:', error);
      throw error;
    }
  }
  
  // 生成邀请码
  generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
  
  // 批量操作用户金币（用于活动奖励等）
  async batchUpdateUserGold(userIds, goldChange, reason = '活动奖励') {
    try {
      const results = [];
      
      for (const userId of userIds) {
        try {
          const result = await this.updateUserGold(userId, goldChange, reason);
          results.push({
            userId,
            success: true,
            ...result
          });
        } catch (error) {
          results.push({
            userId,
            success: false,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('批量操作用户金币失败:', error);
      throw error;
    }
  }
}

module.exports = new UserService();