Component({
  properties: {
    message: {
      type: Object,
      value: {}
    },
    isMe: {
      type: Boolean,
      value: false
    }
  },
  
  data: {
    type: 'text'
  },
  
  observers: {
    'message': function(message) {
      if (message) {
        this.setData({
          type: message.type || 'text'
        });
      }
    }
  },
  
  methods: {
    getAvatarUrl: function() {
      const message = this.properties.message;
      // 这里可以根据senderId获取用户头像
      // 暂时使用默认头像
      return message.avatarUrl || '/images/avatars/default.png';
    },
    
    formatTime: function(timestamp) {
      if (!timestamp) return '';
      
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      
      // 今天
      if (date.toDateString() === now.toDateString()) {
        return `${this.padZero(date.getHours())}:${this.padZero(date.getMinutes())}`;
      }
      
      // 昨天
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return `昨天 ${this.padZero(date.getHours())}:${this.padZero(date.getMinutes())}`;
      }
      
      // 更早
      return `${date.getMonth() + 1}-${date.getDate()} ${this.padZero(date.getHours())}:${this.padZero(date.getMinutes())}`;
    },
    
    padZero: function(num) {
      return num < 10 ? '0' + num : num;
    }
  }
});