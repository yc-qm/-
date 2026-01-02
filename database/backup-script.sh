#!/bin/bash
# database/backup-script.sh
# 数据库备份脚本

set -e

# 配置
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
MYSQL_DATABASE="wechat_poker"
MYSQL_USER="root"
MYSQL_PASSWORD="password"
MONGODB_URI="mongodb://localhost:27017/wechat_poker"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

echo "🚀 开始数据库备份: $TIMESTAMP"

# 1. 备份MySQL
echo "📊 备份MySQL数据库..."
mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  "$MYSQL_DATABASE" \
  > "$BACKUP_DIR/mysql_backup_$TIMESTAMP.sql"

# 压缩MySQL备份
gzip -f "$BACKUP_DIR/mysql_backup_$TIMESTAMP.sql"
echo "✅ MySQL备份完成: $BACKUP_DIR/mysql_backup_$TIMESTAMP.sql.gz"

# 2. 备份MongoDB
echo "📊 备份MongoDB数据库..."
mongodump --uri="$MONGODB_URI" \
  --out="$BACKUP_DIR/mongodb_backup_$TIMESTAMP"

# 压缩MongoDB备份
tar -czf "$BACKUP_DIR/mongodb_backup_$TIMESTAMP.tar.gz" \
  -C "$BACKUP_DIR" \
  "mongodb_backup_$TIMESTAMP"

# 删除原始备份目录
rm -rf "$BACKUP_DIR/mongodb_backup_$TIMESTAMP"
echo "✅ MongoDB备份完成: $BACKUP_DIR/mongodb_backup_$TIMESTAMP.tar.gz"

# 3. 清理旧备份（保留最近7天）
echo "🧹 清理旧备份..."
find "$BACKUP_DIR" -name "*.gz" -type f -mtime +7 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +7 -delete

# 4. 生成备份报告
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "📈 备份完成报告:"
echo "   时间: $TIMESTAMP"
echo "   目录: $BACKUP_DIR"
echo "   大小: $BACKUP_SIZE"
echo "   文件:"
ls -lh "$BACKUP_DIR"/*"$TIMESTAMP"*

# 5. 可选：上传到云存储
if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "☁️  上传到AWS S3..."
    aws s3 cp "$BACKUP_DIR/mysql_backup_$TIMESTAMP.sql.gz" \
        "s3://your-backup-bucket/mysql_backup_$TIMESTAMP.sql.gz"
    aws s3 cp "$BACKUP_DIR/mongodb_backup_$TIMESTAMP.tar.gz" \
        "s3://your-backup-bucket/mongodb_backup_$TIMESTAMP.tar.gz"
    echo "✅ 备份已上传到S3"
fi

echo "🎉 数据库备份完成!"