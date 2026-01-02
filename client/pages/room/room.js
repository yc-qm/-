// pages/room/room.js
const app = getApp();

Page({
  data: {
    // 房间信息
    roomId: '',
    roomInfo: {},
    roomStatus: 'waiting', // waiting, countdown, playing
    isOwner: false,
    isFull: false,
    playerCount: 0,
    
    // 玩家信息
    players: [{}, {}, {}, {}], // 0:上, 1:左, 2:右, 3:下
    myInfo: {},
    userInfo: {},
    isReady: false,
    
    // 选中的玩家（用于菜单操作）
    selectedPlayer: {},
    showPlayerMenu: false,
    
    // 聊天相关
    chatMessages: [],
    chatInput: '',
    chatScrollTop: 0,
    quickChats: [
      '快点吧，我等得花儿都谢了！',
      '大家好，很高兴见到各位！',
      '不要走，决战到天亮！',
      '你的牌打得太好了！',
      '我们合作愉快！',
      '不好意思，我要离开一会'
    ],
    
    // 场次选项
    stakeOptions: ['200', '500', '1000', '2000', '5000'],
    selectedStakeIndex: 0,
    
    // 弹窗控制
    showPasswordModal: false,
    showExitConfirmModal: false,
    passwordInput: '',
    passwordError: '',
    
    // 其他
    countdown: 5,
    countdownTimer: null,
    joinType: '', // create or join
    penaltyGold: 20, // 退出惩罚金币数
    
    // WebSocket
    socket: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 3
  },
  
  onLoad: function(options) {
    console.log('房间页面加载，参数:', options);
    
    const roomId = options.roomId;
    const joinType = options.type || 'join';
    const userInfo = app.globalData.userInfo;
    
    if (!roomId) {
      wx.showToast({
        title: '房间号不存在',
        icon: 'error',
        complete: () => {
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      });
      return;
    }
    
    // 设置页面数据
    this.setData({
      roomId: roomId,
      joinType: joinType,
      userInfo: userInfo,
      myInfo: {
        userId: userInfo.userId,
        nickName: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl,
        isReady: false,
        position: 3 // 下方位置
      }
    });
    
    // 初始化房间
    this.initRoom();
    
    // 设置WebSocket监听
    this.initWebSocket();
  },
  
  onShow: function() {
    // 页面显示时恢复状态
    if (this.data.socket && this.data.socket.readyState === WebSocket.OPEN) {
      this.sendHeartbeat();
    }
  },
  
  onHide: function() {
    // 页面隐藏时停止计时器
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
    }
  },
  
  onUnload: function() {
    // 页面卸载时清理
    this.cleanup();
  },
  
  // 初始化房间
  initRoom: function() {
    const roomId = this.data.roomId;
    const userInfo = this.data.userInfo;
    
    // 从服务器获取房间信息
    this.fetchRoomInfo(roomId);
    
    // 根据加入类型设置是否为房主
    const isOwner = this.data.joinType === 'create';
    this.setData({ isOwner });
    
    // 如果是加入房间，检查是否需要密码
    if (!isOwner) {
      this.checkRoomPassword();
    }
  },
  
  // 获取房间信息
  fetchRoomInfo: function(roomId) {
    const that = this;
    
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
    
    wx.request({
      url: `${app.globalData.apiUrl}/room/info/${roomId}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: function(res) {
        wx.hideLoading();
        
        if (res.data.code === 0) {
          const roomInfo = res.data.data;
          const players = that.formatPlayers(roomInfo.players);
          const playerCount = players.filter(p => p.userId).length;
          const isFull = playerCount === 4;
          
          // 更新房间信息
          that.setData({
            roomInfo: roomInfo,
            players: players,
            playerCount: playerCount,
            isFull: isFull,
            selectedStakeIndex: that.data.stakeOptions.indexOf(roomInfo.baseGold.toString())
          });
          
          // 更新自己的准备状态
          const myPlayer = players.find(p => p.userId === that.data.userInfo.userId);
          if (myPlayer) {
            that.setData({
              myInfo: { ...that.data.myInfo, ...myPlayer },
              isReady: myPlayer.isReady || false
            });
          }
        } else {
          wx.showToast({
            title: res.data.message || '房间不存在',
            icon: 'error'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      },
      fail: function() {
        wx.hideLoading();
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        });
      }
    });
  },
  
  // 格式化玩家数据
  formatPlayers: function(playersData) {
    // 创建4个位置的数组
    const formatted = [{}, {}, {}, {}];
    
    if (playersData && Array.isArray(playersData)) {
      playersData.forEach(player => {
        if (player.position >= 0 && player.position < 4) {
          formatted[player.position] = {
            userId: player.userId,
            nickName: player.nickName,
            avatarUrl: player.avatarUrl,
            isReady: player.isReady,
            position: player.position,
            gold: player.gold,
            isOwner: player.isOwner
          };
        }
      });
    }
    
    return formatted;
  },
  
  // 检查房间密码
  checkRoomPassword: function() {
    const that = this;
    
    wx.request({
      url: `${app.globalData.apiUrl}/room/check-password/${this.data.roomId}`,
      method: 'GET',
      success: function(res) {
        if (res.data.code === 0 && res.data.data.requirePassword) {
          that.setData({
            showPasswordModal: true
          });
        } else {
          // 不需要密码，直接加入
          that.joinRoom();
        }
      }
    });
  },
  
  // 初始化WebSocket
  initWebSocket: function() {
    const that = this;
    const token = wx.getStorageSync('token');
    
    // 连接WebSocket
    const socket = wx.connectSocket({
      url: `${app.globalData.socketUrl}?token=${token}&roomId=${this.data.roomId}`,
      success: function() {
        console.log('WebSocket连接成功');
      },
      fail: function(err) {
        console.error('WebSocket连接失败:', err);
        that.handleSocketError();
      }
    });
    
    // 监听WebSocket打开
    wx.onSocketOpen(function() {
      console.log('WebSocket已打开');
      that.setData({ socket });
      
      // 发送加入房间消息
      that.sendSocketMessage({
        type: 'JOIN_ROOM',
        roomId: that.data.roomId,
        userId: that.data.userInfo.userId
      });
      
      // 开始心跳检测
      that.startHeartbeat();
    });
    
    // 监听WebSocket消息
    wx.onSocketMessage(function(res) {
      try {
        const data = JSON.parse(res.data);
        that.handleSocketMessage(data);
      } catch (e) {
        console.error('解析消息失败:', e);
      }
    });
    
    // 监听WebSocket错误
    wx.onSocketError(function(err) {
      console.error('WebSocket错误:', err);
      that.handleSocketError();
    });
    
    // 监听WebSocket关闭
    wx.onSocketClose(function() {
      console.log('WebSocket已关闭');
      that.handleSocketClose();
    });
  },
  
  // 处理WebSocket消息
  handleSocketMessage: function(data) {
    console.log('收到WebSocket消息:', data);
    
    switch (data.type) {
      case 'ROOM_UPDATE':
        this.handleRoomUpdate(data.data);
        break;
        
      case 'PLAYER_JOINED':
        this.handlePlayerJoined(data.data);
        break;
        
      case 'PLAYER_LEFT':
        this.handlePlayerLeft(data.data);
        break;
        
      case 'PLAYER_READY':
        this.handlePlayerReady(data.data);
        break;
        
      case 'PLAYER_KICKED':
        this.handlePlayerKicked(data.data);
        break;
        
      case 'GAME_STARTING':
        this.handleGameStarting(data.data);
        break;
        
      case 'GAME_STARTED':
        this.handleGameStarted(data.data);
        break;
        
      case 'CHAT_MESSAGE':
        this.handleChatMessage(data.data);
        break;
        
      case 'ROOM_CLOSED':
        this.handleRoomClosed(data.data);
        break;
        
      case 'PONG':
        // 心跳响应
        break;
        
      default:
        console.log('未知消息类型:', data.type);
    }
  },
  
  // 处理房间更新
  handleRoomUpdate: function(roomData) {
    const players = this.formatPlayers(roomData.players);
    const playerCount = players.filter(p => p.userId).length;
    const isFull = playerCount === 4;
    
    this.setData({
      roomInfo: roomData,
      players: players,
      playerCount: playerCount,
      isFull: isFull,
      roomStatus: roomData.status || 'waiting'
    });
    
    // 更新自己的信息
    const myPlayer = players.find(p => p.userId === this.data.userInfo.userId);
    if (myPlayer) {
      this.setData({
        myInfo: { ...this.data.myInfo, ...myPlayer },
        isReady: myPlayer.isReady || false
      });
    }
  },
  
  // 处理玩家加入
  handlePlayerJoined: function(playerData) {
    const players = [...this.data.players];
    players[playerData.position] = playerData;
    
    const playerCount = players.filter(p => p.userId).length;
    const isFull = playerCount === 4;
    
    this.setData({
      players: players,
      playerCount: playerCount,
      isFull: isFull
    });
    
    // 显示加入提示
    if (playerData.userId !== this.data.userInfo.userId) {
      this.addSystemMessage(`${playerData.nickName} 加入了房间`);
    }
  },
  
  // 处理玩家离开
  handlePlayerLeft: function(playerData) {
    const players = [...this.data.players];
    const leftPlayer = players.find(p => p.userId === playerData.userId);
    
    if (leftPlayer) {
      players[leftPlayer.position] = {};
      
      const playerCount = players.filter(p => p.userId).length;
      const isFull = playerCount === 4;
      
      this.setData({
        players: players,
        playerCount: playerCount,
        isFull: isFull
      });
      
      // 显示离开提示
      this.addSystemMessage(`${leftPlayer.nickName} 离开了房间`);
    }
  },
  
  // 处理玩家准备状态变化
  handlePlayerReady: function(data) {
    const players = [...this.data.players];
    const player = players.find(p => p.userId === data.userId);
    
    if (player) {
      player.isReady = data.isReady;
      this.setData({ players });
      
      // 如果是自己，更新准备状态
      if (data.userId === this.data.userInfo.userId) {
        this.setData({ isReady: data.isReady });
      }
      
      // 显示提示
      const status = data.isReady ? '已准备' : '取消准备';
      this.addSystemMessage(`${player.nickName} ${status}`);
    }
  },
  
  // 处理玩家被踢出
  handlePlayerKicked: function(data) {
    if (data.userId === this.data.userInfo.userId) {
      wx.showToast({
        title: '您已被房主踢出房间',
        icon: 'error',
        complete: () => {
          this.exitRoom();
        }
      });
    } else {
      this.handlePlayerLeft(data);
      this.addSystemMessage(`${data.nickName} 被踢出房间`);
    }
  },
  
  // 处理游戏开始倒计时
  handleGameStarting: function(data) {
    this.setData({
      roomStatus: 'countdown',
      countdown: data.countdown || 5
    });
    
    // 开始倒计时
    this.startCountdown();
  },
  
  // 处理游戏开始
  handleGameStarted: function(data) {
    // 停止倒计时
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
    }
    
    // 跳转到游戏页面
    wx.redirectTo({
      url: `/pages/game/game?roomId=${this.data.roomId}`
    });
  },
  
  // 处理聊天消息
  handleChatMessage: function(messageData) {
    const chatMessages = [...this.data.chatMessages];
    chatMessages.push({
      id: Date.now(),
      senderId: messageData.senderId,
      senderName: messageData.senderName,
      content: messageData.content,
      type: messageData.type || 'text',
      timestamp: messageData.timestamp || Date.now()
    });
    
    // 限制消息数量
    if (chatMessages.length > 100) {
      chatMessages.splice(0, 20);
    }
    
    this.setData({ chatMessages }, () => {
      // 滚动到底部
      this.scrollChatToBottom();
    });
  },
  
  // 处理房间关闭
  handleRoomClosed: function() {
    wx.showToast({
      title: '房间已解散',
      icon: 'error',
      complete: () => {
        this.exitRoom();
      }
    });
  },
  
  // 发送WebSocket消息
  sendSocketMessage: function(data) {
    const socket = this.data.socket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      wx.sendSocketMessage({
        data: JSON.stringify(data)
      });
    } else {
      console.warn('WebSocket未连接，无法发送消息');
    }
  },
  
  // 开始心跳检测
  startHeartbeat: function() {
    setInterval(() => {
      this.sendHeartbeat();
    }, 30000); // 30秒一次心跳
  },
  
  // 发送心跳
  sendHeartbeat: function() {
    this.sendSocketMessage({
      type: 'PING',
      timestamp: Date.now()
    });
  },
  
  // 处理WebSocket错误
  handleSocketError: function() {
    this.reconnectAttempts += 1;
    
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      wx.showToast({
        title: `连接失败，正在重试(${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
        icon: 'none'
      });
      
      setTimeout(() => {
        this.initWebSocket();
      }, 2000);
    } else {
      wx.showToast({
        title: '连接失败，请检查网络',
        icon: 'error'
      });
    }
  },
  
  // 处理WebSocket关闭
  handleSocketClose: function() {
    console.log('WebSocket连接关闭');
    // 可以在这里处理重连逻辑
  },
  
  // 开始倒计时
  startCountdown: function() {
    const that = this;
    
    this.data.countdownTimer = setInterval(() => {
      let countdown = that.data.countdown - 1;
      
      if (countdown <= 0) {
        clearInterval(that.data.countdownTimer);
        that.setData({ countdown: 0 });
      } else {
        that.setData({ countdown });
      }
    }, 1000);
  },
  
  // 滚动聊天到底部
  scrollChatToBottom: function() {
    this.setData({
      chatScrollTop: 99999
    });
  },
  
  // 添加系统消息
  addSystemMessage: function(content) {
    const chatMessages = [...this.data.chatMessages];
    chatMessages.push({
      id: Date.now(),
      senderId: 'system',
      senderName: '系统',
      content: content,
      type: 'system',
      timestamp: Date.now()
    });
    
    this.setData({ chatMessages }, () => {
      this.scrollChatToBottom();
    });
  },
  
  // 事件处理函数
  
  // 邀请好友
  inviteFriend: function() {
    wx.showShareMenu({
      withShareTicket: true
    });
  },
  
  // 分享房间
  shareRoom: function() {
    wx.shareAppMessage({
      title: '快来和我一起玩扑克！',
      path: `/pages/room/room?roomId=${this.data.roomId}&type=join`,
      imageUrl: '/images/share-poker.png'
    });
  },
  
  // 点击玩家
  clickPlayer: function(e) {
    const player = e.currentTarget.dataset.player;
    
    if (player && player.userId && player.userId !== this.data.userInfo.userId) {
      this.setData({
        selectedPlayer: player,
        showPlayerMenu: true
      });
    }
  },
  
  // 关闭玩家菜单
  closePlayerMenu: function() {
    this.setData({
      showPlayerMenu: false
    });
  },
  
  // 查看玩家资料
  viewPlayerProfile: function() {
    const playerId = this.data.selectedPlayer.userId;
    wx.navigateTo({
      url: `/pages/profile/profile?userId=${playerId}`
    });
    this.closePlayerMenu();
  },
  
  // 踢出玩家
  kickPlayer: function() {
    const player = this.data.selectedPlayer;
    
    wx.showModal({
      title: '确认踢出',
      content: `确定要将 ${player.nickName} 踢出房间吗？`,
      success: (res) => {
        if (res.confirm) {
          this.sendSocketMessage({
            type: 'KICK_PLAYER',
            targetUserId: player.userId,
            roomId: this.data.roomId
          });
          this.closePlayerMenu();
        }
      }
    });
  },
  
  // 添加好友
  addFriend: function() {
    const player = this.data.selectedPlayer;
    
    wx.request({
      url: `${app.globalData.apiUrl}/friend/request`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      data: {
        targetUserId: player.userId
      },
      success: (res) => {
        if (res.data.code === 0) {
          wx.showToast({
            title: '好友请求已发送',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: res.data.message || '发送失败',
            icon: 'error'
          });
        }
      }
    });
    
    this.closePlayerMenu();
  },
  
  // 发送私聊
  sendPrivateMessage: function() {
    const player = this.data.selectedPlayer;
    this.setData({
      chatInput: `@${player.nickName} `,
      showPlayerMenu: false
    });
  },
  
  // 输入密码
  onPasswordInput: function(e) {
    this.setData({
      passwordInput: e.detail.value,
      passwordError: ''
    });
  },
  
  // 确认密码
  confirmPassword: function() {
    const password = this.data.passwordInput;
    
    if (!password || password.length !== 6) {
      this.setData({
        passwordError: '请输入6位数字密码'
      });
      return;
    }
    
    // 验证密码并加入房间
    this.joinRoom(password);
  },
  
  // 取消加入
  cancelJoin: function() {
    this.setData({
      showPasswordModal: false,
      passwordInput: ''
    });
    wx.navigateBack();
  },
  
  // 加入房间
  joinRoom: function(password) {
    const that = this;
    
    wx.request({
      url: `${app.globalData.apiUrl}/room/join`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      data: {
        roomId: this.data.roomId,
        password: password
      },
      success: function(res) {
        if (res.data.code === 0) {
          that.setData({
            showPasswordModal: false,
            passwordInput: ''
          });
          
          // 加入成功，WebSocket会处理后续
        } else {
          that.setData({
            passwordError: res.data.message || '密码错误'
          });
        }
      }
    });
  },
  
  // 切换准备状态
  toggleReady: function(e) {
    const isReady = e.detail.value;
    
    this.sendSocketMessage({
      type: 'SET_READY',
      roomId: this.data.roomId,
      isReady: isReady
    });
  },
  
  // 更改底注
  onStakeChange: function(e) {
    const index = e.detail.value;
    const baseGold = parseInt(this.data.stakeOptions[index]);
    
    this.setData({
      selectedStakeIndex: index
    });
    
    // 发送底注变更请求
    this.sendSocketMessage({
      type: 'CHANGE_STAKE',
      roomId: this.data.roomId,
      baseGold: baseGold
    });
  },
  
  // 开始游戏
  startGame: function() {
    if (!this.data.isFull) {
      wx.showToast({
        title: '需要4名玩家才能开始',
        icon: 'none'
      });
      return;
    }
    
    // 检查是否所有玩家都已准备
    const allReady = this.data.players.every(p => !p.userId || p.isReady);
    
    if (!allReady) {
      wx.showToast({
        title: '还有玩家未准备',
        icon: 'none'
      });
      return;
    }
    
    this.sendSocketMessage({
      type: 'START_GAME',
      roomId: this.data.roomId
    });
  },
  
  // 清空房间（踢出所有玩家）
  kickAllPlayers: function() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空房间，踢出所有玩家吗？',
      success: (res) => {
        if (res.confirm) {
          this.sendSocketMessage({
            type: 'KICK_ALL',
            roomId: this.data.roomId
          });
        }
      }
    });
  },
  
  // 重新加入游戏
  rejoinGame: function() {
    wx.redirectTo({
      url: `/pages/game/game?roomId=${this.data.roomId}`
    });
  },
  
  // 输入聊天内容
  onChatInput: function(e) {
    this.setData({
      chatInput: e.detail.value
    });
  },
  
  // 发送聊天
  sendChat: function() {
    const content = this.data.chatInput.trim();
    
    if (!content) {
      return;
    }
    
    // 发送聊天消息
    this.sendSocketMessage({
      type: 'SEND_CHAT',
      roomId: this.data.roomId,
      content: content
    });
    
    // 清空输入框
    this.setData({
      chatInput: ''
    });
  },
  
  // 发送快捷聊天
  sendQuickChat: function(e) {
    const index = e.currentTarget.dataset.index;
    const content = this.data.quickChats[index];
    
    this.sendSocketMessage({
      type: 'SEND_CHAT',
      roomId: this.data.roomId,
      content: content
    });
  },
  
  // 清空聊天记录
  clearChat: function() {
    this.setData({
      chatMessages: []
    });
  },
  
  // 显示退出确认
  showExitConfirm: function() {
    this.setData({
      showExitConfirmModal: true
    });
  },
  
  // 取消退出
  cancelExit: function() {
    this.setData({
      showExitConfirmModal: false
    });
  },
  
  // 确认退出
  confirmExit: function() {
    this.exitRoom();
  },
  
  // 退出房间
  exitRoom: function() {
    // 发送退出房间消息
    this.sendSocketMessage({
      type: 'LEAVE_ROOM',
      roomId: this.data.roomId
    });
    
    // 清理资源
    this.cleanup();
    
    // 返回首页
    wx.navigateBack();
  },
  
  // 清理资源
  cleanup: function() {
    // 关闭WebSocket
    if (this.data.socket) {
      wx.closeSocket();
    }
    
    // 停止计时器
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
    }
  },
  
  // 计算属性
  get roomTypeText() {
    const roomInfo = this.data.roomInfo;
    if (!roomInfo.type) return '';
    
    const typeMap = {
      'friend': '好友房',
      'match': '匹配房',
      'challenge': '挑战房'
    };
    
    return typeMap[roomInfo.type] || roomInfo.type;
  }
});