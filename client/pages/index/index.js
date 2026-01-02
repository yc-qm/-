// pages/index/index.js
const app = getApp();

Page({
  data: {
    // 用户信息
    userInfo: {},
    userGold: 0,
    userDiamond: 0,
    
    // 活动数据
    activities: [
      {
        id: 1,
        title: "新手福利",
        description: "首次登录赠送500金币",
        bgColor: "#FF9800"
      },
      {
        id: 2,
        title: "每日签到",
        description: "连续签到奖励翻倍",
        bgColor: "#4CAF50"
      },
      {
        id: 3,
        title: "周末狂欢",
        description: "周末游戏奖励+50%",
        bgColor: "#2196F3"
      }
    ],
    
    // 场次数据
    stakes: [
      { value: 200, name: "新手场", amount: 200, desc: "适合新手" },
      { value: 500, name: "普通场", amount: 500, desc: "娱乐为主" },
      { value: 1000, name: "高手场", amount: 1000, desc: "高手对决" },
      { value: 2000, name: "精英场", amount: 2000, desc: "挑战极限" },
      { value: 5000, name: "大师场", amount: 5000, desc: "大师竞技" },
      { value: 10000, name: "富豪场", amount: 10000, desc: "一掷千金" }
    ],
    selectedStake: 200,
    showStakes: false,
    
    // 快速房间数据
    quickRooms: [],
    
    // 创建房间弹窗数据
    showCreateModal: false,
    roomTypes: ["好友对战", "随机匹配"],
    selectedRoomType: 0,
    stakeOptions: [
      { value: 200, name: "200金币场" },
      { value: 500, name: "500金币场" },
      { value: 1000, name: "1000金币场" },
      { value: 2000, name: "2000金币场" },
      { value: 5000, name: "5000金币场" }
    ],
    selectedStakeOption: 0,
    roomPassword: ""
  },
  
  onLoad: function() {
    this.loadUserInfo();
    this.loadQuickRooms();
  },
  
  onShow: function() {
    // 页面显示时刷新用户数据
    this.loadUserInfo();
    
    // 检查是否有未完成的游戏
    this.checkUnfinishedGame();
  },
  
  onPullDownRefresh: function() {
    // 下拉刷新
    this.loadUserInfo();
    this.loadQuickRooms();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },
  
  // 加载用户信息
  loadUserInfo: function() {
    const userInfo = app.globalData.userInfo;
    const userGold = app.globalData.userGold || 1000;
    const userDiamond = app.globalData.userDiamond || 0;
    
    this.setData({
      userInfo: userInfo || {},
      userGold: userGold,
      userDiamond: userDiamond
    });
    
    // 如果未登录，尝试获取用户信息
    if (!userInfo) {
      this.getUserProfile();
    }
  },
  
  // 获取用户信息
  getUserProfile: function() {
    const that = this;
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: function(res) {
        const userInfo = res.userInfo;
        app.globalData.userInfo = userInfo;
        that.setData({ userInfo: userInfo });
        
        // 保存到本地存储
        wx.setStorageSync('userInfo', userInfo);
        
        // 发送到服务器
        that.registerUser(userInfo);
      },
      fail: function() {
        console.log('用户拒绝授权');
      }
    });
  },
  
  // 注册用户到服务器
  registerUser: function(userInfo) {
    wx.request({
      url: app.globalData.apiUrl + '/user/register',
      method: 'POST',
      data: {
        nickName: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl,
        gender: userInfo.gender,
        country: userInfo.country,
        province: userInfo.province,
        city: userInfo.city
      },
      success: function(res) {
        if (res.data.code === 0) {
          app.globalData.userGold = res.data.data.goldCoins || 1000;
          app.globalData.userDiamond = res.data.data.diamond || 0;
          wx.setStorageSync('token', res.data.data.token);
        }
      }
    });
  },
  
  // 加载快速开始房间
  loadQuickRooms: function() {
    const that = this;
    
    // 模拟数据，实际应从服务器获取
    const mockRooms = [
      {
        id: "ABC123",
        type: "friend",
        baseGold: 200,
        currentPlayers: 2,
        creatorName: "玩家A"
      },
      {
        id: "DEF456",
        type: "match",
        baseGold: 500,
        currentPlayers: 3,
        creatorName: "玩家B"
      },
      {
        id: "GHI789",
        type: "friend",
        baseGold: 1000,
        currentPlayers: 1,
        creatorName: "玩家C"
      }
    ];
    
    // 模拟网络请求
    setTimeout(() => {
      that.setData({
        quickRooms: mockRooms
      });
    }, 500);
    
    // 实际请求代码
    /*
    wx.request({
      url: app.globalData.apiUrl + '/room/quick',
      method: 'GET',
      success: function(res) {
        if (res.data.code === 0) {
          that.setData({
            quickRooms: res.data.data.rooms || []
          });
        }
      },
      fail: function() {
        that.showToast('网络错误，请重试');
      }
    });
    */
  },
  
  // 检查是否有未完成的游戏
  checkUnfinishedGame: function() {
    const unfinishedGame = wx.getStorageSync('unfinishedGame');
    if (unfinishedGame) {
      wx.showModal({
        title: '提示',
        content: '检测到有未完成的游戏，是否继续？',
        success: function(res) {
          if (res.confirm) {
            wx.navigateTo({
              url: `/pages/game/game?roomId=${unfinishedGame.roomId}`
            });
          } else {
            wx.removeStorageSync('unfinishedGame');
          }
        }
      });
    }
  },
  
  // 事件处理函数
  
  // 前往个人中心
  goToProfile: function() {
    wx.navigateTo({
      url: '/pages/profile/profile'
    });
  },
  
  // 前往充值页面
  goToRecharge: function() {
    wx.navigateTo({
      url: '/pages/recharge/recharge'
    });
  },
  
  // 查看活动详情
  viewActivity: function(e) {
    const activityId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/activity/activity?id=${activityId}`
    });
  },
  
  // 前往好友对战
  goToFriendGame: function() {
    this.setData({
      showStakes: true
    });
  },
  
  // 前往随机匹配
  goToRandomMatch: function() {
    this.setData({
      showStakes: true
    });
  },
  
  // 前往残局闯关
  goToChallenge: function() {
    wx.navigateTo({
      url: '/pages/challenge/challenge'
    });
  },
  
  // 前往游戏规则
  goToRules: function() {
    wx.navigateTo({
      url: '/pages/rules/rules'
    });
  },
  
  // 选择场次
  selectStake: function(e) {
    const stakeValue = e.currentTarget.dataset.value;
    this.setData({
      selectedStake: stakeValue
    });
  },
  
  // 确认场次选择，开始匹配
  confirmStakeSelection: function() {
    const selectedStake = this.data.selectedStake;
    
    // 检查金币是否足够
    if (this.data.userGold < selectedStake) {
      this.showToast('金币不足，请充值或选择更低场次');
      return;
    }
    
    // 显示加载中
    wx.showLoading({
      title: '匹配中...',
      mask: true
    });
    
    // 开始匹配
    const that = this;
    wx.request({
      url: app.globalData.apiUrl + '/game/match',
      method: 'POST',
      data: {
        stake: selectedStake
      },
      header: {
        'Authorization': 'Bearer ' + wx.getStorageSync('token')
      },
      success: function(res) {
        wx.hideLoading();
        if (res.data.code === 0) {
          const roomId = res.data.data.roomId;
          wx.navigateTo({
            url: `/pages/game/game?roomId=${roomId}`
          });
        } else {
          that.showToast(res.data.message || '匹配失败');
        }
      },
      fail: function() {
        wx.hideLoading();
        that.showToast('网络错误，请重试');
      }
    });
  },
  
  // 刷新房间列表
  refreshRooms: function() {
    wx.showLoading({
      title: '刷新中...'
    });
    
    this.loadQuickRooms();
    
    setTimeout(() => {
      wx.hideLoading();
      this.showToast('刷新成功');
    }, 1000);
  },
  
  // 加入房间
  joinRoom: function(e) {
    const roomId = e.currentTarget.dataset.roomid;
    const roomType = e.currentTarget.dataset.roomtype;
    const baseGold = e.currentTarget.dataset.basegold;
    
    // 检查金币是否足够
    if (this.data.userGold < baseGold) {
      this.showToast(`金币不足，需要${baseGold}金币`);
      return;
    }
    
    // 加入房间
    wx.navigateTo({
      url: `/pages/room/room?roomId=${roomId}&type=join`
    });
  },
  
  // 创建房间弹窗相关
  createRoom: function() {
    this.setData({
      showCreateModal: true
    });
  },
  
  hideCreateModal: function() {
    this.setData({
      showCreateModal: false
    });
  },
  
  onRoomTypeChange: function(e) {
    this.setData({
      selectedRoomType: e.detail.value
    });
  },
  
  onStakeOptionChange: function(e) {
    this.setData({
      selectedStakeOption: e.detail.value
    });
  },
  
  onPasswordInput: function(e) {
    this.setData({
      roomPassword: e.detail.value
    });
  },
  
  createNewRoom: function() {
    const roomType = this.data.selectedRoomType === 0 ? 'friend' : 'match';
    const baseGold = this.data.stakeOptions[this.data.selectedStakeOption].value;
    const password = this.data.roomPassword;
    
    // 检查金币是否足够
    if (this.data.userGold < baseGold) {
      this.showToast(`金币不足，需要${baseGold}金币`);
      return;
    }
    
    wx.showLoading({
      title: '创建中...',
      mask: true
    });
    
    const that = this;
    wx.request({
      url: app.globalData.apiUrl + '/room/create',
      method: 'POST',
      data: {
        roomType: roomType,
        baseGold: baseGold,
        password: password
      },
      header: {
        'Authorization': 'Bearer ' + wx.getStorageSync('token')
      },
      success: function(res) {
        wx.hideLoading();
        if (res.data.code === 0) {
          const roomId = res.data.data.roomId;
          that.hideCreateModal();
          wx.navigateTo({
            url: `/pages/room/room?roomId=${roomId}&type=create`
          });
        } else {
          that.showToast(res.data.message || '创建失败');
        }
      },
      fail: function() {
        wx.hideLoading();
        that.showToast('网络错误，请重试');
      }
    });
  },
  
  // 其他页面跳转
  goToRank: function() {
    wx.navigateTo({
      url: '/pages/rank/rank'
    });
  },
  
  goToShop: function() {
    wx.navigateTo({
      url: '/pages/shop/shop'
    });
  },
  
  goToSettings: function() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },
  
  // 工具函数
  showToast: function(title, icon = 'none') {
    wx.showToast({
      title: title,
      icon: icon,
      duration: 2000
    });
  }
});

/*import util from '../../utils/util.js';

Page({
  onLoad() {
    // 使用工具函数格式化时间
    const now = util.formatTime(new Date(), 'YYYY-MM-DD HH:mm');
    console.log('当前时间:', now);
  }
}); */