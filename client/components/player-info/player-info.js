Component({
  properties: {
    // 玩家数据
    player: {
      type: Object,
      value: {}
    },
    
    // 是否是自己
    isMe: {
      type: Boolean,
      value: false
    },
    
    // 显示类型：normal, compact, small, large
    type: {
      type: String,
      value: 'normal'
    },
    
    // 大小：small, normal, large
    size: {
      type: String,
      value: 'normal'
    },
    
    // 是否显示操作按钮
    showActions: {
      type: Boolean,
      value: false
    },
    
    // 是否显示额外信息
    showExtra: {
      type: Boolean,
      value: false
    }
  },
  
  data: {
    // 内部数据
  },
  
  methods: {
    onTap: function() {
      this.triggerEvent('tap', {
        player: this.properties.player
      });
    },
    
    // 获取状态类名
    getStatusClass: function() {
      const player = this.properties.player;
      if (!player.status) return 'offline';
      return player.status;
    },
    
    // 获取状态图标
    getStatusIcon: function() {
      const player = this.properties.player;
      const status = player.status || 'offline';
      
      const iconMap = {
        'online': 'online',
        'offline': 'offline',
        'playing': 'playing',
        'busy': 'busy'
      };
      
      return iconMap[status] || 'offline';
    },
    
    // 获取状态文本
    getStatusText: function() {
      const player = this.properties.player;
      
      if (player.currentStatus) {
        return player.currentStatus;
      }
      
      const status = player.status || 'offline';
      const textMap = {
        'online': '在线',
        'offline': '离线',
        'playing': '游戏中',
        'busy': '忙碌中'
      };
      
      return textMap[status] || '离线';
    },
    
    // 获取状态文本类名
    getStatusTextClass: function() {
      const player = this.properties.player;
      
      if (player.currentStatus) {
        const status = player.currentStatus.toLowerCase();
        if (status.includes('准备')) return 'ready';
        if (status.includes('游戏')) return 'playing';
        if (status.includes('等待')) return 'waiting';
      }
      
      const status = player.status || 'offline';
      return status;
    },
    
    // 格式化数字
    formatNumber: function(num) {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
      }
      if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
      }
      return num.toString();
    }
  }
});