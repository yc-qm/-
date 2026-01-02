Component({
  properties: {
    // 牌数据
    card: {
      type: Object,
      value: null,
      observer: 'updateCardInfo'
    },
    
    // 显示类型：small, normal, large, table
    type: {
      type: String,
      value: 'normal'
    },
    
    // 是否显示背面
    showBack: {
      type: Boolean,
      value: false
    },
    
    // 是否选中
    selected: {
      type: Boolean,
      value: false
    },
    
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    
    // 自定义样式
    cardStyle: {
      type: String,
      value: ''
    }
  },
  
  data: {
    // 牌信息
    suit: '',
    rank: '',
    suitClass: '',
    suitSymbol: '',
    suitImage: '',
    displayRank: '',
    isJoker: false,
    jokerText: '',
    
    // 花色映射
    suitMap: {
      'S': { class: 'spade', symbol: '♠', image: '/images/suits/spade.png' },
      'H': { class: 'heart', symbol: '♥', image: '/images/suits/heart.png' },
      'D': { class: 'diamond', symbol: '♦', image: '/images/suits/diamond.png' },
      'C': { class: 'club', symbol: '♣', image: '/images/suits/club.png' }
    }
  },
  
  methods: {
    updateCardInfo: function() {
      const card = this.properties.card;
      if (!card) return;
      
      const suit = card.suit;
      const rank = card.rank;
      
      // 判断是否为大小王
      const isJoker = suit === 'JOKER';
      
      if (isJoker) {
        this.setData({
          isJoker: true,
          jokerText: rank === 'RED' ? '大王' : '小王',
          suitClass: 'joker',
          suitSymbol: 'JOKER'
        });
      } else {
        const suitInfo = this.data.suitMap[suit] || { class: '', symbol: '', image: '' };
        
        this.setData({
          isJoker: false,
          suit: suit,
          rank: rank,
          suitClass: suitInfo.class,
          suitSymbol: suitInfo.symbol,
          suitImage: suitInfo.image,
          displayRank: this.formatRank(rank)
        });
      }
    },
    
    // 格式化点数显示
    formatRank: function(rank) {
      const rankMap = {
        'A': 'A',
        'J': 'J',
        'Q': 'Q',
        'K': 'K',
        'BLACK': 'J',
        'RED': 'J'
      };
      
      return rankMap[rank] || rank;
    },
    
    // 点击事件
    onTap: function() {
      if (!this.properties.disabled) {
        this.triggerEvent('tap', {
          card: this.properties.card
        });
      }
    },
    
    // 长按事件
    onLongPress: function() {
      if (!this.properties.disabled) {
        this.triggerEvent('longpress', {
          card: this.properties.card
        });
      }
    }
  },
  
  ready: function() {
    this.updateCardInfo();
  }
});