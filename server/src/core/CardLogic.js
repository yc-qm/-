// server/src/core/CardLogic.js

// 牌面权重
const CARD_WEIGHTS = {
  '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6, '9': 7,
  '10': 8, 'J': 9, 'Q': 10, 'K': 11, 'A': 12, '2': 13,
  'BLACK': 16, 'RED': 17
};

// 花色权重（仅用于显示，不参与比较）
const SUIT_WEIGHTS = {
  'S': 4, // 黑桃
  'H': 3, // 红桃
  'D': 2, // 方块
  'C': 1  // 梅花
};

class CardLogic {
  // 创建一副牌（54张）
  static createDeck() {
    const suits = ['S', 'H', 'D', 'C'];
    const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
    const deck = [];
    
    // 普通牌
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({
          suit,
          rank,
          weight: CARD_WEIGHTS[rank],
          suitWeight: SUIT_WEIGHTS[suit],
          code: `${suit}_${rank}` // 用于前端显示
        });
      }
    }
    
    // 大小王
    deck.push({
      suit: 'JOKER',
      rank: 'BLACK',
      weight: CARD_WEIGHTS['BLACK'],
      suitWeight: 5,
      code: 'BLACK_JOKER'
    });
    
    deck.push({
      suit: 'JOKER',
      rank: 'RED',
      weight: CARD_WEIGHTS['RED'],
      suitWeight: 5,
      code: 'RED_JOKER'
    });
    
    return deck;
  }
  
  // 洗牌
  static shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  // 排序手牌（按点数从小到大，点数相同按花色从大到小）
  static sortCards(cards) {
    return [...cards].sort((a, b) => {
      // 先按点数排序
      if (a.weight !== b.weight) {
        return a.weight - b.weight;
      }
      // 点数相同按花色排序（黑桃最大）
      return b.suitWeight - a.suitWeight;
    });
  }
  
  // 判断牌型
  static getCardType(cards) {
    if (!cards || cards.length === 0) {
      return { type: 'invalid', valid: false };
    }
    
    const count = cards.length;
    
    // 单张
    if (count === 1) {
      return { type: 'single', valid: true };
    }
    
    // 对子
    if (count === 2) {
      if (cards[0].rank === cards[1].rank) {
        return { type: 'pair', valid: true };
      }
      return { type: 'invalid', valid: false };
    }
    
    // 三张
    if (count === 3) {
      if (cards[0].rank === cards[1].rank && 
          cards[1].rank === cards[2].rank) {
        return { type: 'triple', valid: true };
      }
      return { type: 'invalid', valid: false };
    }
    
    // 四张（炸弹）
    if (count === 4) {
      if (cards[0].rank === cards[1].rank && 
          cards[1].rank === cards[2].rank && 
          cards[2].rank === cards[3].rank) {
        return { type: 'bomb', valid: true };
      }
      return { type: 'invalid', valid: false };
    }
    
    return { type: 'invalid', valid: false };
  }
  
  // 比较牌大小（返回1: cards1大, -1: cards2大, 0: 相等）
  static compareCards(cards1, cards2) {
    const type1 = this.getCardType(cards1);
    const type2 = this.getCardType(cards2);
    
    // 牌型不同不能比较（根据规则，只能出相同牌型）
    if (type1.type !== type2.type) {
      return null;
    }
    
    // 获取最大点数
    const getMaxRankWeight = (cards) => {
      return Math.max(...cards.map(card => card.weight));
    };
    
    const max1 = getMaxRankWeight(cards1);
    const max2 = getMaxRankWeight(cards2);
    
    if (max1 > max2) return 1;
    if (max1 < max2) return -1;
    
    // 点数相同，比较最大牌的花色（仅用于牌型相同且点数相同时的精确比较）
    // 注意：根据规则，点数相同但花色不同时，通常认为相等，但实际游戏中可能需要更精确的比较
    const getMaxSuitWeight = (cards, targetWeight) => {
      let maxSuitWeight = 0;
      cards.forEach(card => {
        if (card.weight === targetWeight && card.suitWeight > maxSuitWeight) {
          maxSuitWeight = card.suitWeight;
        }
      });
      return maxSuitWeight;
    };
    
    const suitWeight1 = getMaxSuitWeight(cards1, max1);
    const suitWeight2 = getMaxSuitWeight(cards2, max2);
    
    if (suitWeight1 > suitWeight2) return 1;
    if (suitWeight1 < suitWeight2) return -1;
    
    return 0; // 完全相等（理论上不会出现）
  }
  
  // 检查是否包含黑桃3
  static hasSpade3(cards) {
    return cards.some(card => card.suit === 'S' && card.rank === '3');
  }
  
  // 从手牌中移除指定的牌
  static removeCardsFromHand(handCards, cardsToRemove) {
    const handCopy = [...handCards];
    const toRemoveCopy = [...cardsToRemove];
    
    for (const card of toRemoveCopy) {
      const index = handCopy.findIndex(c => 
        c.suit === card.suit && c.rank === card.rank
      );
      if (index !== -1) {
        handCopy.splice(index, 1);
      }
    }
    
    return handCopy;
  }
  
  // 检查手牌中是否包含指定的牌
  static containsCards(handCards, cardsToCheck) {
    const handCopy = [...handCards];
    
    for (const card of cardsToCheck) {
      const index = handCopy.findIndex(c => 
        c.suit === card.suit && c.rank === card.rank
      );
      if (index === -1) {
        return false;
      }
      handCopy.splice(index, 1);
    }
    
    return true;
  }
  
  // 获取可能的出牌组合（简化版）
  static getPossiblePlays(handCards, lastPlayedCards = []) {
    const plays = [];
    const sortedHand = this.sortCards(handCards);
    
    // 如果没有上家出牌，可以出任意合法牌型
    if (lastPlayedCards.length === 0) {
      // 单张
      sortedHand.forEach(card => {
        plays.push([card]);
      });
      
      // 对子
      for (let i = 0; i < sortedHand.length - 1; i++) {
        if (sortedHand[i].rank === sortedHand[i + 1].rank) {
          plays.push([sortedHand[i], sortedHand[i + 1]]);
          i++; // 跳过下一个
        }
      }
      
      // 三张
      for (let i = 0; i < sortedHand.length - 2; i++) {
        if (sortedHand[i].rank === sortedHand[i + 1].rank && 
            sortedHand[i].rank === sortedHand[i + 2].rank) {
          plays.push([sortedHand[i], sortedHand[i + 1], sortedHand[i + 2]]);
          i += 2; // 跳过两个
        }
      }
      
      // 炸弹
      for (let i = 0; i < sortedHand.length - 3; i++) {
        if (sortedHand[i].rank === sortedHand[i + 1].rank && 
            sortedHand[i].rank === sortedHand[i + 2].rank && 
            sortedHand[i].rank === sortedHand[i + 3].rank) {
          plays.push([sortedHand[i], sortedHand[i + 1], sortedHand[i + 2], sortedHand[i + 3]]);
          i += 3; // 跳过三个
        }
      }
      
      return plays;
    }
    
    // 有上家出牌，需要出比上家大的牌
    const lastPlayType = this.getCardType(lastPlayedCards);
    if (!lastPlayType.valid) return plays;
    
    // 根据上家牌型筛选可能的出牌
    const allPlays = this.getPossiblePlays(handCards, []);
    for (const play of allPlays) {
      const playType = this.getCardType(play);
      if (playType.type === lastPlayType.type) {
        const comparison = this.compareCards(play, lastPlayedCards);
        if (comparison === 1) { // play 比 lastPlayedCards 大
          plays.push(play);
        }
      }
    }
    
    return plays;
  }
  
  // 验证出牌是否合法
  static validatePlay(handCards, playCards, lastPlayedCards) {
    // 检查手牌中是否包含要出的牌
    if (!this.containsCards(handCards, playCards)) {
      return { valid: false, reason: '手牌中不包含这些牌' };
    }
    
    // 检查牌型是否合法
    const playType = this.getCardType(playCards);
    if (!playType.valid) {
      return { valid: false, reason: '牌型不合法' };
    }
    
    // 如果没有上家出牌，任何合法牌型都可以出
    if (lastPlayedCards.length === 0) {
      return { valid: true, reason: '' };
    }
    
    // 检查牌型是否与上家一致
    const lastPlayType = this.getCardType(lastPlayedCards);
    if (playType.type !== lastPlayType.type) {
      return { valid: false, reason: `牌型必须与上家一致，上家出的是${lastPlayType.type}` };
    }
    
    // 检查是否比上家大
    const comparison = this.compareCards(playCards, lastPlayedCards);
    if (comparison !== 1) {
      return { valid: false, reason: '必须出比上家大的牌' };
    }
    
    return { valid: true, reason: '' };
  }
  
  // 获取牌组中最大牌的点数
  static getMaxCardWeight(cards) {
    if (!cards || cards.length === 0) return 0;
    return Math.max(...cards.map(card => card.weight));
  }
  
  // 获取牌组中最小牌的点数
  static getMinCardWeight(cards) {
    if (!cards || cards.length === 0) return 0;
    return Math.min(...cards.map(card => card.weight));
  }
  
  // 将牌转换为字符串表示
  static cardsToString(cards) {
    return cards.map(card => `${card.suit}_${card.rank}`).join(',');
  }
  
  // 从字符串解析牌
  static stringToCards(cardString) {
    if (!cardString) return [];
    return cardString.split(',').map(str => {
      const [suit, rank] = str.split('_');
      return {
        suit,
        rank,
        weight: CARD_WEIGHTS[rank] || 0,
        suitWeight: SUIT_WEIGHTS[suit] || 0,
        code: str
      };
    });
  }
}

module.exports = CardLogic;