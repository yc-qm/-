// database/migrations/003-add-achievements.js
/**
 * 添加成就系统数据
 */
module.exports = {
  async up(db, client) {
    const achievements = [
      {
        achievementId: 'first_win',
        category: 'gameplay',
        tier: 'bronze',
        name: '首胜',
        description: '赢得第一局游戏',
        icon: '/images/achievements/first_win.png',
        unlockType: 'count',
        unlockValue: 1,
        progressType: 'boolean',
        rewardCoins: 100,
        rewardDiamonds: 0,
        rewardExp: 100,
        isHidden: false,
        isSecret: false,
        isActive: true
      },
      {
        achievementId: 'win_streak_5',
        category: 'gameplay',
        tier: 'silver',
        name: '五连胜',
        description: '连续赢得5局游戏',
        icon: '/images/achievements/win_streak_5.png',
        unlockType: 'streak',
        unlockValue: 5,
        progressType: 'incremental',
        rewardCoins: 500,
        rewardDiamonds: 10,
        rewardExp: 500,
        isHidden: false,
        isSecret: false,
        isActive: true
      },
      {
        achievementId: 'rich_player',
        category: 'collection',
        tier: 'gold',
        name: '大富翁',
        description: '拥有10000金币',
        icon: '/images/achievements/rich_player.png',
        unlockType: 'score',
        unlockValue: 10000,
        progressType: 'threshold',
        rewardCoins: 1000,
        rewardDiamonds: 50,
        rewardExp: 1000,
        isHidden: false,
        isSecret: false,
        isActive: true
      },
      {
        achievementId: 'perfect_game',
        category: 'special',
        tier: 'diamond',
        name: '完美游戏',
        description: '一局游戏中打出所有炸弹',
        icon: '/images/achievements/perfect_game.png',
        unlockType: 'special',
        unlockValue: 1,
        progressType: 'boolean',
        rewardCoins: 2000,
        rewardDiamonds: 100,
        rewardExp: 2000,
        isHidden: true,
        isSecret: true,
        isActive: true
      }
    ];
    
    await db.collection('achievements').insertMany(achievements);
    console.log('✅ 成就数据添加完成');
  },
  
  async down(db, client) {
    await db.collection('achievements').deleteMany({
      achievementId: { $in: [
        'first_win',
        'win_streak_5',
        'rich_player',
        'perfect_game'
      ]}
    });
    console.log('⚠️  成就数据已删除');
  }
};