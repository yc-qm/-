// database/migrations/004-update-user-stats-index.js
/**
 * 更新用户统计索引以提高查询性能
 */
module.exports = {
  async up(db, client) {
    // 创建复合索引
    await db.collection('users').createIndex({
      'stats.totalGames': -1,
      'stats.winRate': -1,
      level: -1
    });
    
    await db.collection('game_records').createIndex({
      startedAt: -1,
      gameMode: 1,
      'players.userId': 1
    });
    
    console.log('✅ 性能索引创建完成');
  },
  
  async down(db, client) {
    await db.collection('users').dropIndex('stats.totalGames_-1_stats.winRate_-1_level_-1');
    await db.collection('game_records').dropIndex('startedAt_-1_gameMode_1_players.userId_1');
    console.log('⚠️  性能索引已删除');
  }
};