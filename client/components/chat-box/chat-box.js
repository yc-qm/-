Component({
  properties: {
    // 聊天模式：normal, compact, fullscreen
    mode: {
      type: String,
      value: 'normal'
    },
    
    // 我的用户ID
    myUserId: {
      type: String,
      value: ''
    },
    
    // 是否显示输入区域
    showInput: {
      type: Boolean,
      value: true
    },
    
    // 是否显示发送者信息
    showSenderInfo: {
      type: Boolean,
      value: true
    },
    
    // 是否显示快捷短语
    showQuickPhrases: {
      type: Boolean,
      value: true
    },
    
    // 输入框占位符
    inputPlaceholder: {
      type: String,
      value: '输入消息...'
    },
    
    // 是否还有更多消息
    hasMore: {
      type: Boolean,
      value: false
    }
  },
  
  data: {
    // 消息列表
    messages: [],
    messageGroups: [],
    
    // 输入相关
    inputValue: '',
    isInputFocus: false,
    isVoiceMode: false,
    
    // 表情相关
    showEmojiPanel: false,
    
    // 语音相关
    isRecording: false,
    recordingTime: 0,
    recordingTimer: null,
    
    // 滚动相关
    scrollTop: 0,
    isScrolling: false,
    
    // 快捷短语
    quickPhrases: [
      '快点吧，我等得花儿都谢了！',
      '大家好，很高兴见到各位！',
      '不要走，决战到天亮！',
      '你的牌打得太好了！',
      '我们合作愉快！',
      '不好意思，我要离开一会'
    ],
    
    // 表情列表
    emojiList: [
      '/images/emojis/emoji_1.png',
      '/images/emojis/emoji_2.png',
      '/images/emojis/emoji_3.png',
      '/images/emojis/emoji_4.png',
      '/images/emojis/emoji_5.png',
      '/images/emojis/emoji_6.png'
    ]
  },
  
  observers: {
    'messages': function(messages) {
      this.groupMessages(messages);
    }
  },
  
  methods: {
    // 分组消息（按发送者和时间）
    groupMessages: function(messages) {
      if (!messages || !messages.length) {
        this.setData({ messageGroups: [] });
        return;
      }
      
      const groups = [];
      let currentGroup = null;
      const groupTimeThreshold = 5 * 60 * 1000; // 5分钟
      
      messages.forEach((message, index) => {
        // 判断是否需要显示时间分割线
        const showTime = index === 0 || 
          (message.timestamp - messages[index - 1].timestamp) > groupTimeThreshold;
        
        // 判断是否为连续消息
        const isContinuation = index > 0 && 
          message.senderId === messages[index - 1].senderId &&
          (message.timestamp - messages[index - 1].timestamp) < 60000; // 1分钟内
        
        message.isContinuation = isContinuation;
        
        if (showTime || !currentGroup) {
          currentGroup = {
            timestamp: message.timestamp,
            showTime: showTime,
            messages: [message]
          };
          groups.push(currentGroup);
        } else {
          currentGroup.messages.push(message);
        }
      });
      
      this.setData({ messageGroups: groups });
      
      // 如果不是在滚动中，滚动到底部
      if (!this.data.isScrolling) {
        this.scrollToBottom();
      }
    },
    
    // 格式化时间
    formatTime: function(timestamp, format = 'HH:mm') {
      if (!timestamp) return '';
      
      const date = new Date(timestamp);
      const now = new Date();
      const pad = (n) => n < 10 ? '0' + n : n;
      
      if (format === 'HH:mm') {
        return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
      }
      
      if (format === 'MM-DD HH:mm') {
        return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
      }
      
      return '';
    },
    
    // 滚动到底部
    scrollToBottom: function() {
      this.setData({
        scrollTop: 99999
      });
    },
    
    // 滚动事件
    onScroll: function(e) {
      const scrollTop = e.detail.scrollTop;
      this.setData({
        isScrolling: scrollTop < this.data.scrollTop - 100
      });
    },
    
    // 输入事件
    onInput: function(e) {
      this.setData({
        inputValue: e.detail.value
      });
    },
    
    // 发送消息
    sendMessage: function() {
      const content = this.data.inputValue.trim();
      if (!content) return;
      
      const message = {
        id: Date.now(),
        senderId: this.data.myUserId,
        senderName: '我',
        contentType: 'text',
        content: content,
        timestamp: Date.now(),
        status: 'sending'
      };
      
      // 触发发送事件
      this.triggerEvent('send', {
        type: 'text',
        content: content
      });
      
      // 添加到消息列表
      const messages = [...this.data.messages, message];
      this.setData({
        messages: messages,
        inputValue: ''
      });
    },
    
    // 发送快捷短语
    sendQuickPhrase: function(e) {
      const index = e.currentTarget.dataset.index;
      const phrase = this.data.quickPhrases[index];
      
      this.triggerEvent('send', {
        type: 'text',
        content: phrase
      });
      
      const message = {
        id: Date.now(),
        senderId: this.data.myUserId,
        senderName: '我',
        contentType: 'text',
        content: phrase,
        timestamp: Date.now(),
        status: 'sending'
      };
      
      const messages = [...this.data.messages, message];
      this.setData({ messages });
    },
    
    // 切换表情面板
    toggleEmojiPanel: function() {
      this.setData({
        showEmojiPanel: !this.data.showEmojiPanel,
        isVoiceMode: false
      });
    },
    
    // 选择表情
    selectEmoji: function(e) {
      const emoji = e.currentTarget.dataset.emoji;
      
      this.triggerEvent('send', {
        type: 'emoji',
        content: emoji
      });
      
      const message = {
        id: Date.now(),
        senderId: this.data.myUserId,
        senderName: '我',
        contentType: 'emoji',
        content: emoji,
        timestamp: Date.now(),
        status: 'sending'
      };
      
      const messages = [...this.data.messages, message];
      this.setData({
        messages: messages,
        showEmojiPanel: false
      });
    },
    
    // 切换语音模式
    toggleVoiceMode: function() {
      this.setData({
        isVoiceMode: !this.data.isVoiceMode,
        showEmojiPanel: false
      });
    },
    
    // 开始录音
    startVoiceRecord: function() {
      this.setData({
        isRecording: true,
        recordingTime: 0
      });
      
      // 开始计时
      const timer = setInterval(() => {
        const time = this.data.recordingTime + 1;
        if (time >= 60) { // 最长60秒
          this.endVoiceRecord();
          return;
        }
        this.setData({ recordingTime: time });
      }, 1000);
      
      this.setData({ recordingTimer: timer });
      
      // 触发开始录音事件
      this.triggerEvent('recordstart');
    },
    
    // 结束录音
    endVoiceRecord: function() {
      if (this.data.recordingTimer) {
        clearInterval(this.data.recordingTimer);
      }
      
      const duration = this.data.recordingTime;
      this.setData({
        isRecording: false,
        recordingTime: 0,
        recordingTimer: null
      });
      
      if (duration > 0) {
        // 触发录音结束事件
        this.triggerEvent('recordend', { duration });
        
        const message = {
          id: Date.now(),
          senderId: this.data.myUserId,
          senderName: '我',
          contentType: 'voice',
          duration: duration,
          timestamp: Date.now(),
          status: 'sending'
        };
        
        const messages = [...this.data.messages, message];
        this.setData({ messages });
      }
    },
    
    // 播放语音
    playVoice: function(e) {
      const index = e.currentTarget.dataset.index;
      this.triggerEvent('playvoice', { index });
    },
    
    // 加载更多消息
    loadMoreMessages: function() {
      this.triggerEvent('loadmore');
    },
    
    // 添加消息
    addMessage: function(message) {
      const messages = [...this.data.messages, message];
      this.setData({ messages });
    },
    
    // 批量添加消息
    addMessages: function(newMessages) {
      const messages = [...this.data.messages, ...newMessages];
      this.setData({ messages });
    },
    
    // 清空消息
    clearMessages: function() {
      this.setData({ messages: [] });
    },
    
    // 更新消息状态
    updateMessageStatus: function(messageId, status) {
      const messages = this.data.messages.map(msg => {
        if (msg.id === messageId) {
          return { ...msg, status };
        }
        return msg;
      });
      
      this.setData({ messages });
    },
    
    // 获取是否能发送
    get canSend() {
      return this.data.inputValue.trim().length > 0;
    }
  }
});