// 导入工具函数
import request from '../../utils/request.js';
import websocket from '../../utils/websocket.js';
import gameLogic from '../../utils/game-logic.js';
import util from '../../utils/util.js';

const app = getApp();

Page({
  data: {
    // 游戏状态
    roomId: '',
    gameStatus: 'waiting', // waiting, playing, finished
    players: [],
    myUserId: app.globalData.userInfo?.userId || '',
    
    // 牌相关
    handCards: [],
    selectedCards: [],
    currentCards: [],
    cardBacks: [], // 其他玩家的牌背
    
    // 聊天
    chatMessages: [],
    
    // 游戏信息
    multiplier: 1,
    baseGold: 200,
    currentPlayerIndex: -1,
    canPlay: true,
    showCards: false // 是否明牌
  },
  
  onLoad: function(options) {
    this.setData({
      roomId: options.roomId
    });
    
    // 初始化工具函数使用
    this.initTools();
    
    // 加载游戏数据
    this.loadGameData();
    
    // 连接WebSocket
    this.connectWebSocket();
  },
  
  initTools: function() {
    // 使用工具函数
    const randomId = util.randomString(8);
    console.log('随机ID:', randomId);
    
    // 使用游戏逻辑创建牌堆示例
    const deck = gameLogic.createDeck();
    const shuffled = gameLogic.shuffleDeck(deck);
    console.log('创建牌堆完成:', shuffled.length);
  },
  
  async loadGameData() {
    try {
      const data = await request.get(`/game/room/${this.data.roomId}`, null, {
        showLoading: true,
        loadingText: '加载游戏中...'
      });
      
      this.setData({
        players: data.players,
        handCards: data.handCards || [],
        baseGold: data.baseGold || 200,
        multiplier: data.multiplier || 1,
        gameStatus: data.status || 'waiting'
      });
    } catch (error) {
      console.error('加载游戏数据失败:', error);
    }
  },
  
  connectWebSocket: function() {
    const wsUrl = app.globalData.socketUrl;
    
    websocket.connect(wsUrl).then(() => {
      console.log('WebSocket连接成功');
      
      // 监听游戏更新
      websocket.on('GAME_UPDATE', (data) => {
        this.handleGameUpdate(data);
      });
      
      // 监听聊天消息
      websocket.on('CHAT_MESSAGE', (data) => {
        this.handleChatMessage(data);
      });
      
      // 监听玩家动作
      websocket.on('PLAYER_ACTION', (data) => {
        this.handlePlayerAction(data);
      });
      
      // 监听加倍结果
      websocket.on('DOUBLING_RESULT', (data) => {
        this.handleDoublingResult(data);
      });
      
    }).catch(error => {
      console.error('WebSocket连接失败:', error);
      util.showToast('连接失败，请重试');
    });
  },
  
  handleGameUpdate: function(data) {
    this.setData({
      players: data.players,
      currentCards: data.currentCards || [],
      currentPlayerIndex: data.currentPlayerIndex,
      gameStatus: data.status,
      multiplier: data.multiplier || this.data.multiplier
    });
  },
  
  handleChatMessage: function(data) {
    const chatMessages = [...this.data.chatMessages];
    chatMessages.push({
      id: Date.now(),
      senderId: data.senderId,
      senderName: data.senderName,
      content: data.content,
      timestamp: data.timestamp || Date.now()
    });
    
    this.setData({ chatMessages });
  },
  
  handlePlayerAction: function(data) {
    // 处理玩家动作，如出牌、过牌等
    console.log('玩家动作:', data);
  },
  
  handleDoublingResult: function(data) {
    this.setData({
      multiplier: data.multiplier,
      canPlay: data.canPlayUsers?.includes(this.data.myUserId) || true,
      showCards: data.showCards || false
    });
  },
  
  // 使用组件事件
  onPlayerTap: function(e) {
    const player = e.detail.player;
    console.log('点击玩家:', player.nickName);
    
    // 可以在这里显示玩家信息菜单
    this.showPlayerMenu(player);
  },
  
  onCardTap: function(e) {
    const card = e.detail.card;
    const handCards = this.data.handCards;
    const selectedCards = [...this.data.selectedCards];
    
    // 查找牌是否已选中
    const cardIndex = selectedCards.findIndex(c => 
      c.suit === card.suit && c.rank === card.rank
    );
    
    if (cardIndex > -1) {
      // 如果已选中，则取消选中
      selectedCards.splice(cardIndex, 1);
    } else {
      // 如果未选中，则添加到选中列表
      selectedCards.push(card);
    }
    
    this.setData({ selectedCards });
    
    console.log('点击牌:', card, '选中数量:', selectedCards.length);
  },
  
  onCardLongPress: function(e) {
    const card = e.detail.card;
    console.log('长按牌:', card);
    
    // 可以在这里显示牌的详细信息或操作菜单
    this.showCardDetail(card);
  },
  
  onChatSend: function(e) {
    const message = e.detail.content;
    this.sendChatMessage(message);
  },
  
  sendChatMessage: function(content) {
    if (!content || !content.trim()) return;
    
    websocket.send({
      type: 'SEND_CHAT',
      content: content.trim(),
      roomId: this.data.roomId
    });
  },
  
  // 出牌
  playCards: function() {
    const selectedCards = this.data.selectedCards;
    
    if (selectedCards.length === 0) {
      util.showToast('请选择要出的牌');
      return;
    }
    
    // 验证出牌
    const validation = gameLogic.validatePlay(
      this.data.handCards,
      selectedCards,
      this.data.currentCards
    );
    
    if (!validation.valid) {
      util.showToast(validation.reason);
      return;
    }
    
    // 发送出牌请求
    websocket.send({
      type: 'PLAY_CARDS',
      cards: selectedCards,
      roomId: this.data.roomId
    }).then(() => {
      // 出牌成功，从手牌中移除
      const newHandCards = gameLogic.removeCardsFromHand(
        this.data.handCards,
        selectedCards
      );
      
      this.setData({
        handCards: newHandCards,
        selectedCards: []
      });
    }).catch(error => {
      util.showToast('出牌失败: ' + error.message);
    });
  },
  
  // 过牌
  passTurn: function() {
    websocket.send({
      type: 'PASS_TURN',
      roomId: this.data.roomId
    });
  },
  
  // 加倍
  chooseDouble: function() {
    websocket.send({
      type: 'DOUBLING_CHOICE',
      choice: 'double',
      roomId: this.data.roomId
    });
  },
  
  // 三倍
  chooseTriple: function() {
    websocket.send({
      type: 'DOUBLING_CHOICE',
      choice: 'triple',
      roomId: this.data.roomId
    });
  },
  
  showPlayerMenu: function(player) {
    // 显示玩家操作菜单
    wx.showActionSheet({
      itemList: ['查看资料', '发送私聊', '添加好友', '举报玩家'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.viewPlayerProfile(player);
            break;
          case 1:
            this.sendPrivateMessage(player);
            break;
          case 2:
            this.addFriend(player);
            break;
          case 3:
            this.reportPlayer(player);
            break;
        }
      }
    });
  },
  
  viewPlayerProfile: function(player) {
    wx.navigateTo({
      url: `/pages/profile/profile?userId=${player.userId}`
    });
  },
  
  sendPrivateMessage: function(player) {
    this.setData({
      chatInput: `@${player.nickName} `
    });
  },
  
  addFriend: function(player) {
    request.post('/friend/add', {
      targetUserId: player.userId
    }).then(() => {
      util.showToast('好友请求已发送');
    }).catch(error => {
      util.showToast('添加好友失败');
    });
  },
  
  showCardDetail: function(card) {
    // 显示牌的详细信息
    wx.showModal({
      title: '牌信息',
      content: `花色: ${card.suit}\n点数: ${card.rank}\n权重: ${card.weight}`,
      showCancel: false,
      confirmText: '确定'
    });
  },
  
  onUnload: function() {
    // 页面卸载时关闭WebSocket
    if (websocket) {
      websocket.close();
    }
  }
});