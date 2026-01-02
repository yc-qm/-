// database/migrations/002-add-system-configs.js
/**
 * 添加系统配置数据
 */
module.exports = {
  async up(db, client) {
    const configs = [
      {
        key: 'app.version',
        value: '1.0.0',
        type: 'string',
        description: '应用版本号',
        category: 'system',
        isPublic: true
      },
      {
        key: 'game.base_score',
        value: 100,
        type: 'number',
        description: '基础分数',
        category: 'game',
        isPublic: false
      },
      {
        key: 'game.time_limit',
        value: 30,
        type: 'number',
        description: '出牌时间限制（秒）',
        category: 'game',
        isPublic: true
      },
      {
        key: 'payment.exchange_rate',
        value: { rmbToCoin: 100, coinToDiamond: 1000 },
        type: 'object',
        description: '兑换比例',
        category: 'payment',
        isPublic: false
      },
      {
        key: 'security.login_attempts',
        value: 5,
        type: 'number',
        description: '最大登录尝试次数',
        category: 'security',
        isPublic: false
      },
      {
        key: 'notification.enabled',
        value: true,
        type: 'boolean',
        description: '是否启用通知',
        category: 'notification',
        isPublic: false
      }
    ];
    
    await db.collection('configs').insertMany(configs);
    console.log('✅ 系统配置数据添加完成');
  },
  
  async down(db, client) {
    await db.collection('configs').deleteMany({
      key: { $in: [
        'app.version',
        'game.base_score',
        'game.time_limit',
        'payment.exchange_rate',
        'security.login_attempts',
        'notification.enabled'
      ]}
    });
    console.log('⚠️  系统配置数据已删除');
  }
};