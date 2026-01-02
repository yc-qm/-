#!/bin/bash
# database/restore-script.sh
# 数据库恢复脚本

set -e

# 配置
BACKUP_DIR="./backups"
MYSQL_DATABASE="wechat_poker"
MYSQL_USER="root"
MYSQL_PASSWORD="password"
MONGODB_URI="mongodb://localhost:27017/wechat_poker"

# 显示可用备份
echo "📂 可用备份列表:"
ls -1 "$BACKUP_DIR"/*.gz 2>/dev/null || echo "没有找到备份文件"
echo ""

# 询问要恢复的备份
read -p "请输入要恢复的备份时间戳 (例如: 20240101_120000): " TIMESTAMP

MYSQL_BACKUP="$BACKUP_DIR/mysql_backup_$TIMESTAMP.sql.gz"
MONGODB_BACKUP="$BACKUP_DIR/mongodb_backup_$TIMESTAMP.tar.gz"

# 检查备份文件是否存在
if [ ! -f "$MYSQL_BACKUP" ] || [ ! -f "$MONGODB_BACKUP" ]; then
    echo "❌ 找不到备份文件"
    exit 1
fi

echo "⚠️  警告: 此操作将覆盖现有数据库!"
read -p "确认恢复? (输入 YES 继续): " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo "❌ 操作取消"
    exit 0
fi

echo "🔄 开始恢复数据库..."

# 1. 恢复MySQL
echo "📊 恢复MySQL数据库..."
gunzip -c "$MYSQL_BACKUP" | mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"
echo "✅ MySQL恢复完成"

# 2. 恢复MongoDB
echo "📊 恢复MongoDB数据库..."
# 先删除现有数据
mongosh "$MONGODB_URI" --eval "db.dropDatabase()"
# 恢复备份
tar -xzf "$MONGODB_BACKUP" -C /tmp
mongorestore --uri="$MONGODB_URI" "/tmp/mongodb_backup_$TIMESTAMP"
rm -rf "/tmp/mongodb_backup_$TIMESTAMP"
echo "✅ MongoDB恢复完成"

echo "🎉 数据库恢复完成!"
echo "恢复时间: $TIMESTAMP"