// database/migration-runner.js
/**
 * 数据库迁移执行器
 * 支持MongoDB和MySQL的迁移脚本执行
 */

const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const { config } = require('../server/src/config');
const logger = require('../server/src/utils/logger');

class MigrationRunner {
  constructor() {
    this.mongoDb = null;
    this.mysqlPool = null;
    this.migrationCollection = 'migrations';
    this.migrationsDir = path.join(__dirname, 'migrations');
    this.seedersDir = path.join(__dirname, 'seeders');
  }
  
  /**
   * 初始化数据库连接
   */
  async init() {
    try {
      // 连接MongoDB
      await mongoose.connect(config.database.mongodb.uri, config.database.mongodb.options);
      this.mongoDb = mongoose.connection.db;
      logger.info('✅ MongoDB连接成功');
      
      // 连接MySQL
      const mysqlConfig = {
        host: process.env.MYSQL_HOST || 'localhost',
        port: process.env.MYSQL_PORT || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || 'password',
        database: process.env.MYSQL_DATABASE || 'wechat_poker',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      };
      
      this.mysqlPool = await mysql.createPool(mysqlConfig);
      await this.mysqlPool.query('SELECT 1');
      logger.info('✅ MySQL连接成功');
      
      // 确保迁移记录集合存在
      const exists = await this.mongoDb.listCollections({ name: this.migrationCollection }).hasNext();
      if (!exists) {
        await this.mongoDb.createCollection(this.migrationCollection);
        logger.info('✅ 创建迁移记录集合');
      }
      
      logger.info('🚀 迁移执行器初始化完成');
    } catch (error) {
      logger.error(`初始化失败: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 获取所有迁移文件
   */
  async getMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsDir);
      return files
        .filter(file => file.endsWith('.js'))
        .sort()
        .map(file => ({
          name: file,
          path: path.join(this.migrationsDir, file)
        }));
    } catch (error) {
      logger.error(`读取迁移文件失败: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 获取已执行的迁移
   */
  async getExecutedMigrations() {
    try {
      const migrations = await this.mongoDb.collection(this.migrationCollection)
        .find({})
        .sort({ name: 1 })
        .toArray();
      return migrations.map(m => m.name);
    } catch (error) {
      logger.error(`获取已执行迁移失败: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 执行单个迁移
   */
  async runMigration(migrationFile, direction = 'up') {
    try {
      const migration = require(migrationFile.path);
      const migrationName = migrationFile.name;
      
      logger.info(`🔄 执行迁移: ${migrationName} (${direction})`);
      
      if (typeof migration[direction] !== 'function') {
        throw new Error(`迁移 ${migrationName} 没有 ${direction} 方法`);
      }
      
      // 执行迁移
      await migration[direction](this.mongoDb, this.mysqlPool);
      
      // 记录迁移
      if (direction === 'up') {
        await this.mongoDb.collection(this.migrationCollection).insertOne({
          name: migrationName,
          executedAt: new Date(),
          direction: 'up'
        });
        logger.info(`✅ 迁移完成: ${migrationName}`);
      } else {
        await this.mongoDb.collection(this.migrationCollection).deleteOne({
          name: migrationName
        });
        logger.info(`✅ 回滚完成: ${migrationName}`);
      }
      
      return true;
    } catch (error) {
      logger.error(`执行迁移失败 ${migrationFile.name}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 执行所有待处理迁移
   */
  async migrate() {
    try {
      logger.info('🚀 开始执行数据库迁移...');
      
      const migrationFiles = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();
      
      const pendingMigrations = migrationFiles.filter(
        file => !executedMigrations.includes(file.name)
      );
      
      if (pendingMigrations.length === 0) {
        logger.info('✅ 所有迁移已是最新状态');
        return;
      }
      
      logger.info(`📊 发现 ${pendingMigrations.length} 个待处理迁移`);
      
      for (const migrationFile of pendingMigrations) {
        await this.runMigration(migrationFile, 'up');
      }
      
      logger.info('🎉 所有迁移执行完成');
    } catch (error) {
      logger.error(`迁移执行失败: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 回滚到指定迁移
   */
  async rollback(targetMigration = null) {
    try {
      logger.info('🔄 开始回滚迁移...');
      
      const migrationFiles = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();
      
      if (executedMigrations.length === 0) {
        logger.info('ℹ️  没有可回滚的迁移');
        return;
      }
      
      let migrationsToRollback = migrationFiles
        .filter(file => executedMigrations.includes(file.name))
        .reverse();
      
      if (targetMigration) {
        const targetIndex = migrationsToRollback.findIndex(m => m.name === targetMigration);
        if (targetIndex === -1) {
          throw new Error(`找不到迁移: ${targetMigration}`);
        }
        migrationsToRollback = migrationsToRollback.slice(0, targetIndex + 1);
      }
      
      logger.info(`📊 将回滚 ${migrationsToRollback.length} 个迁移`);
      
      for (const migrationFile of migrationsToRollback) {
        await this.runMigration(migrationFile, 'down');
      }
      
      logger.info('🎉 迁移回滚完成');
    } catch (error) {
      logger.error(`迁移回滚失败: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 执行数据填充
   */
  async seed(seederName = null) {
    try {
      logger.info('🌱 开始执行数据填充...');
      
      const seedFiles = await fs.readdir(this.seedersDir);
      const jsSeedFiles = seedFiles
        .filter(file => file.endsWith('.js'))
        .sort()
        .map(file => ({
          name: file,
          path: path.join(this.seedersDir, file)
        }));
      
      if (seederName) {
        const seederFile = jsSeedFiles.find(file => file.name === seederName);
        if (!seederFile) {
          throw new Error(`找不到种子文件: ${seederName}`);
        }
        await this.runSeeder(seederFile);
      } else {
        for (const seederFile of jsSeedFiles) {
          await this.runSeeder(seederFile);
        }
      }
      
      logger.info('🎉 数据填充完成');
    } catch (error) {
      logger.error(`数据填充失败: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 执行单个种子
   */
  async runSeeder(seederFile) {
    try {
      const seeder = require(seederFile.path);
      const seederName = seederFile.name;
      
      logger.info(`🌱 执行种子: ${seederName}`);
      
      if (typeof seeder.up !== 'function') {
        throw new Error(`种子 ${seederName} 没有 up 方法`);
      }
      
      await seeder.up(this.mongoDb, this.mysqlPool);
      logger.info(`✅ 种子完成: ${seederName}`);
      
      return true;
    } catch (error) {
      logger.error(`执行种子失败 ${seederFile.name}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 重置数据库（开发环境使用）
   */
  async reset() {
    try {
      logger.warn('⚠️  开始重置数据库...');
      
      // 获取所有迁移文件
      const migrationFiles = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();
      
      // 按相反顺序回滚所有已执行的迁移
      const migrationsToRollback = migrationFiles
        .filter(file => executedMigrations.includes(file.name))
        .reverse();
      
      for (const migrationFile of migrationsToRollback) {
        await this.runMigration(migrationFile, 'down');
      }
      
      logger.info('✅ 数据库重置完成');
    } catch (error) {
      logger.error(`数据库重置失败: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 显示迁移状态
   */
  async status() {
    try {
      logger.info('📊 迁移状态检查...');
      
      const migrationFiles = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();
      
      console.log('\n📋 迁移状态表:');
      console.log('='.repeat(80));
      console.log('状态 | 迁移文件');
      console.log('-'.repeat(80));
      
      for (const file of migrationFiles) {
        const isExecuted = executedMigrations.includes(file.name);
        const status = isExecuted ? '✅ 已执行' : '⏳ 待执行';
        console.log(`${status} | ${file.name}`);
      }
      
      console.log('='.repeat(80));
      console.log(`总计: ${migrationFiles.length} 个迁移，${executedMigrations.length} 个已执行`);
      
      // 显示MySQL表状态
      try {
        const [tables] = await this.mysqlPool.query(`
          SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH
          FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = ?
          ORDER BY TABLE_NAME
        `, [process.env.MYSQL_DATABASE || 'wechat_poker']);
        
        console.log('\n🗄️  MySQL表状态:');
        console.log('='.repeat(80));
        console.log('表名 | 行数 | 数据大小 | 索引大小');
        console.log('-'.repeat(80));
        
        for (const table of tables) {
          const dataSize = table.DATA_LENGTH ? Math.round(table.DATA_LENGTH / 1024 / 1024 * 100) / 100 : 0;
          const indexSize = table.INDEX_LENGTH ? Math.round(table.INDEX_LENGTH / 1024 / 1024 * 100) / 100 : 0;
          console.log(`${table.TABLE_NAME} | ${table.TABLE_ROWS} | ${dataSize} MB | ${indexSize} MB`);
        }
        
        console.log('='.repeat(80));
      } catch (mysqlError) {
        console.log('\n⚠️  MySQL状态查询失败，可能未配置MySQL');
      }
      
    } catch (error) {
      logger.error(`状态检查失败: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 创建新迁移文件
   */
  async create(name) {
    try {
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
      const filename = `${timestamp}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.js`;
      const filepath = path.join(this.migrationsDir, filename);
      
      const template = `/**
 * 迁移: ${name}
 * ${new Date().toISOString()}
 */

module.exports = {
  async up(db, client) {
    // TODO: 实现迁移逻辑
    console.log('执行迁移: ${name}');
  },
  
  async down(db, client) {
    // TODO: 实现回滚逻辑
    console.log('回滚迁移: ${name}');
  }
};
`;
      
      await fs.writeFile(filepath, template);
      logger.info(`✅ 创建迁移文件: ${filename}`);
      
      return filepath;
    } catch (error) {
      logger.error(`创建迁移文件失败: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 关闭数据库连接
   */
  async close() {
    try {
      if (this.mongoDb) {
        await mongoose.disconnect();
        logger.info('✅ MongoDB连接已关闭');
      }
      
      if (this.mysqlPool) {
        await this.mysqlPool.end();
        logger.info('✅ MySQL连接池已关闭');
      }
    } catch (error) {
      logger.error(`关闭连接失败: ${error.message}`);
    }
  }
}

// 命令行接口
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const param = args[1];
  
  const runner = new MigrationRunner();
  
  try {
    await runner.init();
    
    switch (command) {
      case 'migrate':
        await runner.migrate();
        break;
        
      case 'rollback':
        await runner.rollback(param);
        break;
        
      case 'reset':
        await runner.reset();
        break;
        
      case 'seed':
        await runner.seed(param);
        break;
        
      case 'status':
        await runner.status();
        break;
        
      case 'create':
        if (!param) {
          throw new Error('请提供迁移名称');
        }
        await runner.create(param);
        break;
        
      case 'fresh':
        // 重置并重新迁移
        await runner.reset();
        await runner.migrate();
        await runner.seed();
        break;
        
      default:
        console.log(`
🚀 数据库迁移工具

使用方法:
  node database/migration-runner.js <command> [options]

命令:
  migrate                  执行所有待处理迁移
  rollback [name]         回滚到指定迁移（或全部）
  reset                   重置数据库（开发环境）
  seed [name]             执行数据填充
  status                  显示迁移状态
  create <name>           创建新迁移文件
  fresh                   重置并重新迁移（含种子数据）

示例:
  node database/migration-runner.js migrate
  node database/migration-runner.js rollback 001-initial-schema.js
  node database/migration-runner.js seed development-seed.js
  node database/migration-runner.js create add-new-feature
        `);
        break;
    }
    
    await runner.close();
  } catch (error) {
    console.error(`❌ 执行失败: ${error.message}`);
    await runner.close();
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main();
}

module.exports = MigrationRunner;