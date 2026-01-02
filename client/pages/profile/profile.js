// pages/profile/profile.js
const app = getApp();

Page({
  data: {
    // 用户信息
    userInfo: {},
    
    // 游戏数据
    gameStats: {
      totalGames: 0,
      winGames: 0,
      loseGames: 0,
      drawGames: 0,
      winRate: '0%',
      winStreak: 0,
      maxWinStreak: 0,
      totalEarnings: 0
    },
    
    // 其他数据
    friendRequests: 0,
    
    // 弹窗控制
    showEditSignature: false,
    signatureInput: ''
  },
  
  onLoad: function(options) {
    // 如果有传入userId，查看其他用户资料
    const userId = options.userId;
    if (userId) {
      this.loadOtherUserProfile(userId);
    } else {
      this.loadMyProfile();
    }
  },
  
  onShow: function() {
    // 每次显示页面时刷新数据
    this.loadMyProfile();
  },
  
  onPullDownRefresh: function() {
    // 下拉刷新
    this.loadMyProfile(() => {
      wx.stopPullDownRefresh();
    });
  },
  
  // 加载我的个人资料
  loadMyProfile: function(callback) {
    const that = this;
    const token = wx.getStorageSync('token');
    
    wx.showLoading({
      title: '加载中...'
    });
    
    // 获取用户信息
    wx.request({
      url: `${app.globalData.apiUrl}/user/profile`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: function(res) {
        wx.hideLoading();
        
        if (res.data.code === 0) {
          const userInfo = res.data.data;
          
          // 更新全局用户信息
          app.globalData.userInfo = userInfo;
          app.globalData.userGold = userInfo.goldCoins || 0;
          app.globalData.userDiamond = userInfo.diamond || 0;
          
          // 更新页面数据
          that.setData({
            userInfo: userInfo,
            signatureInput: userInfo.signature || ''
          });
          
          // 获取游戏数据
          that.loadGameStats();
          
          // 获取好友请求数量
          that.loadFriendRequests();
        }
      },
      fail: function() {
        wx.hideLoading();
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
      },
      complete: function() {
        callback && callback();
      }
    });
  },
  
  // 加载其他用户资料
  loadOtherUserProfile: function(userId) {
    const that = this;
    
    wx.showLoading({
      title: '加载中...'
    });
    
    wx.request({
      url: `${app.globalData.apiUrl}/user/profile/${userId}`,
      method: 'GET',
      success: function(res) {
        wx.hideLoading();
        
        if (res.data.code === 0) {
          that.setData({
            userInfo: res.data.data
          });
          
          // 获取游戏数据
          that.loadGameStats(userId);
        }
      },
      fail: function() {
        wx.hideLoading();
      }
    });
  },
  
  // 加载游戏数据
  loadGameStats: function(userId) {
    const that = this;
    const targetUserId = userId || this.data.userInfo.userId;
    
    wx.request({
      url: `${app.globalData.apiUrl}/user/stats/${targetUserId}`,
      method: 'GET',
      success: function(res) {
        if (res.data.code === 0) {
          const stats = res.data.data;
          
          // 计算胜率
          const totalGames = stats.totalGames || 0;
          const winGames = stats.winGames || 0;
          const winRate = totalGames > 0 ? ((winGames / totalGames) * 100).toFixed(1) + '%' : '0%';
          
          that.setData({
            gameStats: {
              ...stats,
              winRate: winRate
            }
          });
        }
      }
    });
  },
  
  // 加载好友请求数量
  loadFriendRequests: function() {
    const that = this;
    
    wx.request({
      url: `${app.globalData.apiUrl}/friend/requests/count`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: function(res) {
        if (res.data.code === 0) {
          that.setData({
            friendRequests: res.data.data.count || 0
          });
        }
      }
    });
  },
  
  // 事件处理函数
  
  // 更换头像
  changeAvatar: function() {
    const that = this;
    
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        const tempFilePath = res.tempFilePaths[0];
        
        // 上传头像
        wx.uploadFile({
          url: `${app.globalData.apiUrl}/user/avatar`,
          filePath: tempFilePath,
          name: 'avatar',
          header: {
            'Authorization': `Bearer ${wx.getStorageSync('token')}`
          },
          success: function(uploadRes) {
            const data = JSON.parse(uploadRes.data);
            if (data.code === 0) {
              // 更新本地头像
              const userInfo = that.data.userInfo;
              userInfo.avatarUrl = data.data.avatarUrl;
              
              that.setData({
                userInfo: userInfo
              });
              
              // 更新全局数据
              app.globalData.userInfo = userInfo;
              
              wx.showToast({
                title: '头像更新成功',
                icon: 'success'
              });
            }
          }
        });
      }
    });
  },
  
  // 编辑个人资料
  editProfile: function() {
    wx.navigateTo({
      url: '/pages/profile-edit/profile-edit'
    });
  },
  
  // 编辑个性签名
  editSignature: function() {
    this.setData({
      showEditSignature: true,
      signatureInput: this.data.userInfo.signature || ''
    });
  },
  
  // 输入签名
  onSignatureInput: function(e) {
    this.setData({
      signatureInput: e.detail.value
    });
  },
  
  // 关闭编辑签名弹窗
  closeEditSignature: function() {
    this.setData({
      showEditSignature: false
    });
  },
  
  // 保存签名
  saveSignature: function() {
    const that = this;
    const signature = this.data.signatureInput.trim();
    
    if (signature.length > 50) {
      wx.showToast({
        title: '签名不能超过50字',
        icon: 'none'
      });
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiUrl}/user/update`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      data: {
        signature: signature
      },
      success: function(res) {
        if (res.data.code === 0) {
          // 更新本地数据
          const userInfo = that.data.userInfo;
          userInfo.signature = signature;
          
          that.setData({
            userInfo: userInfo,
            showEditSignature: false
          });
          
          // 更新全局数据
          app.globalData.userInfo = userInfo;
          
          wx.showToast({
            title: '签名更新成功',
            icon: 'success'
          });
        }
      }
    });
  },
  
  // 跳转到钱包
  goToWallet: function() {
    wx.navigateTo({
      url: '/pages/wallet/wallet'
    });
  },
  
  // 跳转到VIP
  goToVip: function() {
    wx.navigateTo({
      url: '/pages/vip/vip'
    });
  },
  
  // 跳转到历史战绩
  goToGameRecords: function() {
    wx.navigateTo({
      url: '/pages/records/records'
    });
  },
  
  // 跳转到成就系统
  goToAchievements: function() {
    wx.navigateTo({
      url: '/pages/achievements/achievements'
    });
  },
  
  // 跳转到排行榜
  goToRank: function() {
    wx.navigateTo({
      url: '/pages/rank/rank'
    });
  },
  
  // 跳转到好友列表
  goToFriends: function() {
    wx.navigateTo({
      url: '/pages/friends/friends'
    });
  },
  
  // 跳转到道具商城
  goToShop: function() {
    wx.navigateTo({
      url: '/pages/shop/shop'
    });
  },
  
  // 跳转到系统设置
  goToSettings: function() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },
  
  // 跳转到意见反馈
  goToFeedback: function() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    });
  },
  
  // 跳转到帮助中心
  goToHelp: function() {
    wx.navigateTo({
      url: '/pages/help/help'
    });
  },
  
  // 跳转到关于我们
  goToAbout: function() {
    wx.navigateTo({
      url: '/pages/about/about'
    });
  },
  
  // 退出登录
  logout: function() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          
          // 重置全局数据
          app.globalData.userInfo = null;
          app.globalData.userGold = 0;
          app.globalData.userDiamond = 0;
          
          // 返回首页
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }
      }
    });
  }
});