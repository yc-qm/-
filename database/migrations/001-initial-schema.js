// database/migrations/001-initial-schema.js
/**
 * 初始数据库迁移
 * 创建所有必要的集合和表
 */
module.exports = {
  async up(db, client) {
    // MongoDB集合创建
    const collections = [
      'users',
      'rooms',
      'game_records',
      'payments',
      'achievements',
      'configs',
      'notifications'
    ];
    
    for (const collection of collections) {
      const exists = await db.listCollections({ name: collection }).hasNext();
      if (!exists) {
        await db.createCollection(collection);
        console.log(`✅ 创建集合: ${collection}`);
      }
    }
    
    // 创建索引
    await db.collection('users').createIndex({ openid: 1 }, { unique: true, sparse: true });
    await db.collection('users').createIndex({ nickname: 1 });
    await db.collection('users').createIndex({ 'stats.winRate': -1 });
    await db.collection('users').createIndex({ coins: -1 });
    await db.collection('users').createIndex({ createdAt: -1 });
    
    await db.collection('rooms').createIndex({ roomCode: 1 }, { unique: true });
    await db.collection('rooms').createIndex({ gameState: 1, isActive: 1 });
    await db.collection('rooms').createIndex({ 'players.userId': 1, isActive: 1 });
    await db.collection('rooms').createIndex({ createdAt: -1 });
    
    await db.collection('game_records').createIndex({ gameId: 1 }, { unique: true });
    await db.collection('game_records').createIndex({ 'players.userId': 1, startedAt: -1 });
    await db.collection('game_records').createIndex({ gameMode: 1, startedAt: -1 });
    await db.collection('game_records').createIndex({ createdAt: -1 });
    
    await db.collection('payments').createIndex({ orderId: 1 }, { unique: true });
    await db.collection('payments').createIndex({ userId: 1, paymentStatus: 1, createdAt: -1 });
    await db.collection('payments').createIndex({ transactionId: 1 });
    
    console.log('✅ 所有索引创建完成');
  },
  
  async down(db, client) {
    // 删除所有集合
    await db.collection('users').drop();
    await db.collection('rooms').drop();
    await db.collection('game_records').drop();
    await db.collection('payments').drop();
    await db.collection('achievements').drop();
    await db.collection('configs').drop();
    await db.collection('notifications').drop();
    
    console.log('⚠️  所有集合已删除');
  }
};