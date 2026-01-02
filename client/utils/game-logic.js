// 游戏常量
const CARD_VALUES = {
  '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6, '9': 7,
  '10': 8, 'J': 9, 'Q': 10, 'K': 11, 'A': 12, '2': 13,
  'BLACK': 16, 'RED': 17
};

const SUIT_VALUES = {
  'S': 4, // 黑桃
  'H': 3, // 红桃
  'D': 2, // 方块
  'C': 1  // 梅花
};

// 工具函数：创建牌堆
export function createDeck() {
  const suits = ['S', 'H', 'D', 'C'];
  const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
  
  const deck = [];
  
  // 添加普通牌
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank,
        weight: CARD_VALUES[rank],
        suitWeight: SUIT_VALUES[suit]
      });
    }
  }
  
  // 添加大小王
  deck.push({ suit: 'JOKER', rank: 'BLACK', weight: CARD_VALUES['BLACK'], suitWeight: 5 });
  deck.push({ suit: 'JOKER', rank: 'RED', weight: CARD_VALUES['RED'], suitWeight: 5 });
  
  return deck;
}

// 工具函数：洗牌
export function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 工具函数：发牌
export function dealCards(deck, playerCount = 4) {
  const players = Array.from({ length: playerCount }, () => []);
  const remainingCards = [...deck];
  
  // 计算每人多少张牌
  const totalCards = deck.length;
  const baseCardsPerPlayer = Math.floor(totalCards / playerCount);
  const extraCards = totalCards % playerCount;
  
  // 发牌
  let cardIndex = 0;
  for (let i = 0; i < playerCount; i++) {
    const cardsForPlayer = baseCardsPerPlayer + (i < extraCards ? 1 : 0);
    for (let j = 0; j < cardsForPlayer; j++) {
      if (cardIndex < remainingCards.length) {
        players[i].push(remainingCards[cardIndex]);
        cardIndex++;
      }
    }
  }
  
  return players;
}

// 工具函数：排序手牌
export function sortCards(cards) {
  return [...cards].sort((a, b) => {
    // 先按点数排序
    if (a.weight !== b.weight) {
      return a.weight - b.weight;
    }
    // 点数相同按花色排序
    return b.suitWeight - a.suitWeight;
  });
}

// 工具函数：判断牌型
export function getCardType(cards) {
  const count = cards.length;
  
  if (count === 0) return { type: 'invalid', valid: false };
  if (count === 1) return { type: 'single', valid: true };
  
  // 检查是否为对子
  if (count === 2) {
    if (cards[0].rank === cards[1].rank) {
      return { type: 'pair', valid: true };
    }
    return { type: 'invalid', valid: false };
  }
  
  // 检查是否为三张
  if (count === 3) {
    if (cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank) {
      return { type: 'triple', valid: true };
    }
    return { type: 'invalid', valid: false };
  }
  
  // 检查是否为四张（炸弹）
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

// 工具函数：比较牌的大小
export function compareCards(cards1, cards2) {
  const type1 = getCardType(cards1);
  const type2 = getCardType(cards2);
  
  // 牌型不同不能比较
  if (type1.type !== type2.type) {
    return null;
  }
  
  // 获取牌组的最大点数
  const getMaxRank = (cards) => {
    let maxWeight = 0;
    cards.forEach(card => {
      if (card.weight > maxWeight) {
        maxWeight = card.weight;
      }
    });
    return maxWeight;
  };
  
  const max1 = getMaxRank(cards1);
  const max2 = getMaxRank(cards2);
  
  if (max1 > max2) return 1;  // cards1 大
  if (max1 < max2) return -1; // cards2 大
  
  // 点数相同，比较最大牌的花色
  const getMaxSuit = (cards, targetWeight) => {
    let maxSuitWeight = 0;
    cards.forEach(card => {
      if (card.weight === targetWeight && card.suitWeight > maxSuitWeight) {
        maxSuitWeight = card.suitWeight;
      }
    });
    return maxSuitWeight;
  };
  
  const suitWeight1 = getMaxSuit(cards1, max1);
  const suitWeight2 = getMaxSuit(cards2, max2);
  
  if (suitWeight1 > suitWeight2) return 1;
  if (suitWeight1 < suitWeight2) return -1;
  
  return 0; // 完全相等
}

// 工具函数：检查是否包含黑桃3
export function hasSpade3(cards) {
  return cards.some(card => card.suit === 'S' && card.rank === '3');
}

// 工具函数：从手牌中移除指定的牌
export function removeCardsFromHand(handCards, cardsToRemove) {
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

// 工具函数：检查手牌中是否包含指定的牌
export function containsCards(handCards, cardsToCheck) {
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

// 工具函数：获取可能的出牌组合
export function getPossiblePlays(handCards, lastPlayedCards = []) {
  const plays = [];
  const sortedHand = sortCards(handCards);
  
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
        i++; // 跳过下一个，避免重复
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
  const lastPlayType = getCardType(lastPlayedCards);
  if (!lastPlayType.valid) return plays;
  
  // 根据上家牌型筛选可能的出牌
  const allPlays = getPossiblePlays(handCards, []);
  for (const play of allPlays) {
    const playType = getCardType(play);
    if (playType.type === lastPlayType.type) {
      const comparison = compareCards(play, lastPlayedCards);
      if (comparison === 1) { // play 比 lastPlayedCards 大
        plays.push(play);
      }
    }
  }
  
  return plays;
}

// 工具函数：计算加倍阶段的结果
export function calculateDoublingResult(choices) {
  // choices: [{userId, choice}]
  let multiplier = 1;
  let canPlayUsers = []; // 可以出牌的用户
  let showCards = false; // 是否明牌
  
  const hasTriple = choices.some(c => c.choice === 'triple');
  const hasDouble = choices.some(c => c.choice === 'double');
  const hasAntiDouble = choices.some(c => c.choice === 'anti-double');
  
  if (hasTriple) {
    // 有人叫三倍
    multiplier = 3;
    const tripleUser = choices.find(c => c.choice === 'triple');
    canPlayUsers = [tripleUser.userId];
    showCards = true;
  } else if (hasDouble && hasAntiDouble) {
    // 有加倍和反加倍
    multiplier = 3;
    const doubleUser = choices.find(c => c.choice === 'double');
    const antiDoubleUser = choices.find(c => c.choice === 'anti-double');
    canPlayUsers = [doubleUser.userId, antiDoubleUser.userId];
    showCards = true;
  } else if (hasDouble) {
    // 只有加倍
    multiplier = 2;
    const doubleUser = choices.find(c => c.choice === 'double');
    canPlayUsers = [doubleUser.userId];
    showCards = true;
  }
  
  return {
    multiplier,
    canPlayUsers,
    showCards
  };
}

// 工具函数：计算游戏得分
export function calculateGameScore(baseGold, multiplier, winnerTeam, playerTeams) {
  // baseGold: 底注
  // multiplier: 倍数
  // winnerTeam: 获胜队伍 (0或1)
  // playerTeams: [{userId, team}]
  
  const score = baseGold * multiplier;
  const result = {};
  
  playerTeams.forEach(player => {
    if (player.team === winnerTeam) {
      // 胜利方获得金币
      result[player.userId] = score;
    } else {
      // 失败方扣除金币
      result[player.userId] = -score;
    }
  });
  
  return result;
}

// 工具函数：验证出牌是否合法
export function validatePlay(handCards, playCards, lastPlayedCards) {
  // 检查手牌中是否包含要出的牌
  if (!containsCards(handCards, playCards)) {
    return { valid: false, reason: '手牌中不包含这些牌' };
  }
  
  // 检查牌型是否合法
  const playType = getCardType(playCards);
  if (!playType.valid) {
    return { valid: false, reason: '牌型不合法' };
  }
  
  // 如果没有上家出牌，任何合法牌型都可以出
  if (lastPlayedCards.length === 0) {
    return { valid: true, reason: '' };
  }
  
  // 检查牌型是否与上家一致
  const lastPlayType = getCardType(lastPlayedCards);
  if (playType.type !== lastPlayType.type) {
    return { valid: false, reason: '牌型必须与上家一致' };
  }
  
  // 检查是否比上家大
  const comparison = compareCards(playCards, lastPlayedCards);
  if (comparison !== 1) {
    return { valid: false, reason: '必须出比上家大的牌' };
  }
  
  return { valid: true, reason: '' };
}

// 导出所有工具函数
export default {
  createDeck,
  shuffleDeck,
  dealCards,
  sortCards,
  getCardType,
  compareCards,
  hasSpade3,
  removeCardsFromHand,
  containsCards,
  getPossiblePlays,
  calculateDoublingResult,
  calculateGameScore,
  validatePlay,
  CARD_VALUES,
  SUIT_VALUES
};