-- database/schema-mysql.sql
-- MySQL数据库表结构定义
-- 主要用于存储关系型数据和事务性数据

-- 创建数据库
CREATE DATABASE IF NOT EXISTS `wechat_poker` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `wechat_poker`;

-- 1. 用户扩展表（存储敏感信息）
CREATE TABLE IF NOT EXISTS `user_extensions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_mongo_id` VARCHAR(24) NOT NULL COMMENT 'MongoDB用户ID',
  `email` VARCHAR(255) NULL UNIQUE COMMENT '邮箱',
  `phone` VARCHAR(20) NULL UNIQUE COMMENT '手机号',
  `real_name` VARCHAR(50) NULL COMMENT '真实姓名',
  `id_card` VARCHAR(18) NULL COMMENT '身份证号',
  `security_question` TEXT NULL COMMENT '安全问题',
  `security_answer_hash` VARCHAR(255) NULL COMMENT '安全答案哈希',
  `login_history` JSON NULL COMMENT '登录历史',
  `device_info` JSON NULL COMMENT '设备信息',
  `risk_score` INT DEFAULT 0 COMMENT '风险评分',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_mongo_id` (`user_mongo_id`),
  INDEX `idx_email` (`email`),
  INDEX `idx_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 支付订单表（事务性数据）
CREATE TABLE IF NOT EXISTS `payment_orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `order_id` VARCHAR(64) NOT NULL UNIQUE COMMENT '订单号',
  `user_mongo_id` VARCHAR(24) NOT NULL COMMENT 'MongoDB用户ID',
  `transaction_id` VARCHAR(64) NULL COMMENT '第三方交易ID',
  `payment_method` ENUM('wechat', 'alipay', 'apple', 'other') NOT NULL,
  `payment_type` ENUM('recharge', 'purchase', 'refund', 'transfer') NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL COMMENT '金额',
  `currency` VARCHAR(3) DEFAULT 'CNY',
  `status` ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled') DEFAULT 'pending',
  `product_id` VARCHAR(50) NOT NULL COMMENT '商品ID',
  `product_name` VARCHAR(100) NOT NULL COMMENT '商品名称',
  `quantity` INT DEFAULT 1,
  `metadata` JSON NULL COMMENT '订单元数据',
  `callback_data` JSON NULL COMMENT '回调数据',
  `notified_at` TIMESTAMP NULL COMMENT '通知时间',
  `notify_count` INT DEFAULT 0,
  `refund_id` VARCHAR(64) NULL COMMENT '退款ID',
  `refund_amount` DECIMAL(10, 2) NULL COMMENT '退款金额',
  `refund_reason` VARCHAR(255) NULL COMMENT '退款原因',
  `refunded_at` TIMESTAMP NULL COMMENT '退款时间',
  `completed_at` TIMESTAMP NULL COMMENT '完成时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_user_mongo_id` (`user_mongo_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_transaction_id` (`transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 财务流水表
CREATE TABLE IF NOT EXISTS `financial_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `record_id` VARCHAR(64) NOT NULL UNIQUE COMMENT '流水号',
  `user_mongo_id` VARCHAR(24) NOT NULL COMMENT 'MongoDB用户ID',
  `type` ENUM('income', 'expense', 'transfer', 'adjustment') NOT NULL COMMENT '类型',
  `category` ENUM('game', 'recharge', 'withdraw', 'reward', 'penalty', 'other') NOT NULL COMMENT '分类',
  `amount` DECIMAL(10, 2) NOT NULL COMMENT '金额',
  `currency` VARCHAR(3) DEFAULT 'CNY',
  `coins_before` INT NOT NULL COMMENT '操作前金币',
  `coins_after` INT NOT NULL COMMENT '操作后金币',
  `diamonds_before` INT NOT NULL COMMENT '操作前钻石',
  `diamonds_after` INT NOT NULL COMMENT '操作后钻石',
  `description` VARCHAR(255) NOT NULL COMMENT '描述',
  `related_id` VARCHAR(64) NULL COMMENT '关联ID',
  `related_type` VARCHAR(50) NULL COMMENT '关联类型',
  `operator_id` VARCHAR(24) NULL COMMENT '操作员ID',
  `operator_type` ENUM('system', 'admin', 'user') DEFAULT 'system',
  `ip_address` VARCHAR(45) NULL COMMENT 'IP地址',
  `device_info` VARCHAR(255) NULL COMMENT '设备信息',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_mongo_id` (`user_mongo_id`),
  INDEX `idx_type_category` (`type`, `category`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_related` (`related_id`, `related_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 审计日志表
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `log_id` VARCHAR(64) NOT NULL UNIQUE COMMENT '日志ID',
  `user_mongo_id` VARCHAR(24) NULL COMMENT '操作用户ID',
  `action` VARCHAR(50) NOT NULL COMMENT '操作类型',
  `resource_type` VARCHAR(50) NOT NULL COMMENT '资源类型',
  `resource_id` VARCHAR(64) NOT NULL COMMENT '资源ID',
  `old_value` JSON NULL COMMENT '旧值',
  `new_value` JSON NULL COMMENT '新值',
  `changes` JSON NULL COMMENT '变更内容',
  `status` ENUM('success', 'failed', 'pending') DEFAULT 'success',
  `error_message` TEXT NULL COMMENT '错误信息',
  `ip_address` VARCHAR(45) NULL COMMENT 'IP地址',
  `user_agent` TEXT NULL COMMENT '用户代理',
  `location` VARCHAR(100) NULL COMMENT '地理位置',
  `metadata` JSON NULL COMMENT '元数据',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_action` (`user_mongo_id`, `action`),
  INDEX `idx_resource` (`resource_type`, `resource_id`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_action_status` (`action`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 用户行为日志表
CREATE TABLE IF NOT EXISTS `user_behavior_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_mongo_id` VARCHAR(24) NOT NULL COMMENT '用户ID',
  `session_id` VARCHAR(64) NOT NULL COMMENT '会话ID',
  `page` VARCHAR(100) NOT NULL COMMENT '页面',
  `action` VARCHAR(50) NOT NULL COMMENT '行为',
  `element` VARCHAR(100) NULL COMMENT '页面元素',
  `value` TEXT NULL COMMENT '值',
  `duration` INT NULL COMMENT '持续时间(毫秒)',
  `referrer` VARCHAR(500) NULL COMMENT '来源',
  `url` VARCHAR(500) NOT NULL COMMENT 'URL',
  `ip_address` VARCHAR(45) NULL COMMENT 'IP地址',
  `user_agent` TEXT NULL COMMENT '用户代理',
  `device_type` VARCHAR(50) NULL COMMENT '设备类型',
  `os` VARCHAR(50) NULL COMMENT '操作系统',
  `browser` VARCHAR(50) NULL COMMENT '浏览器',
  `screen_resolution` VARCHAR(20) NULL COMMENT '屏幕分辨率',
  `network_type` VARCHAR(20) NULL COMMENT '网络类型',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_session` (`user_mongo_id`, `session_id`),
  INDEX `idx_page_action` (`page`, `action`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_action_time` (`action`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 系统任务表
CREATE TABLE IF NOT EXISTS `system_tasks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `task_id` VARCHAR(64) NOT NULL UNIQUE COMMENT '任务ID',
  `name` VARCHAR(100) NOT NULL COMMENT '任务名称',
  `type` ENUM('cron', 'manual', 'event', 'queue') NOT NULL COMMENT '任务类型',
  `status` ENUM('pending', 'running', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
  `priority` INT DEFAULT 0 COMMENT '优先级',
  `payload` JSON NULL COMMENT '任务数据',
  `result` JSON NULL COMMENT '执行结果',
  `error_message` TEXT NULL COMMENT '错误信息',
  `attempts` INT DEFAULT 0 COMMENT '尝试次数',
  `max_attempts` INT DEFAULT 3 COMMENT '最大尝试次数',
  `scheduled_at` TIMESTAMP NULL COMMENT '计划执行时间',
  `started_at` TIMESTAMP NULL COMMENT '开始时间',
  `finished_at` TIMESTAMP NULL COMMENT '完成时间',
  `timeout` INT DEFAULT 300 COMMENT '超时时间(秒)',
  `created_by` VARCHAR(50) NULL COMMENT '创建者',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_task_id` (`task_id`),
  INDEX `idx_status_type` (`status`, `type`),
  INDEX `idx_scheduled_at` (`scheduled_at`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. 消息队列表
CREATE TABLE IF NOT EXISTS `message_queue` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `queue` VARCHAR(50) NOT NULL COMMENT '队列名称',
  `job` VARCHAR(100) NOT NULL COMMENT '任务名称',
  `payload` JSON NOT NULL COMMENT '任务数据',
  `status` ENUM('pending', 'processing', 'completed', 'failed', 'delayed') DEFAULT 'pending',
  `priority` INT DEFAULT 0 COMMENT '优先级',
  `attempts` INT DEFAULT 0 COMMENT '尝试次数',
  `max_attempts` INT DEFAULT 3 COMMENT '最大尝试次数',
  `error_message` TEXT NULL COMMENT '错误信息',
  `available_at` TIMESTAMP NULL COMMENT '可执行时间',
  `started_at` TIMESTAMP NULL COMMENT '开始时间',
  `finished_at` TIMESTAMP NULL COMMENT '完成时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_queue_status` (`queue`, `status`),
  INDEX `idx_available_at` (`available_at`),
  INDEX `idx_priority` (`priority`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. 缓存表
CREATE TABLE IF NOT EXISTS `cache` (
  `key` VARCHAR(255) NOT NULL PRIMARY KEY,
  `value` LONGTEXT NOT NULL,
  `expiration` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_expiration` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. 会话表
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `user_mongo_id` VARCHAR(24) NULL COMMENT '用户ID',
  `payload` TEXT NOT NULL,
  `last_activity` INT NOT NULL,
  `user_agent` TEXT NULL,
  `ip_address` VARCHAR(45) NULL,
  `device_info` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_mongo_id` (`user_mongo_id`),
  INDEX `idx_last_activity` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. 统计汇总表（用于快速查询）
CREATE TABLE IF NOT EXISTS `statistics_summary` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `date` DATE NOT NULL COMMENT '统计日期',
  `period` ENUM('daily', 'weekly', 'monthly') DEFAULT 'daily',
  `metric_name` VARCHAR(100) NOT NULL COMMENT '指标名称',
  `metric_value` DECIMAL(20, 4) NOT NULL COMMENT '指标值',
  `dimensions` JSON NULL COMMENT '维度',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_date_metric` (`date`, `period`, `metric_name`),
  INDEX `idx_date_period` (`date`, `period`),
  INDEX `idx_metric_name` (`metric_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. 管理员表
CREATE TABLE IF NOT EXISTS `admins` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  `email` VARCHAR(255) NOT NULL UNIQUE COMMENT '邮箱',
  `password_hash` VARCHAR(255) NOT NULL COMMENT '密码哈希',
  `real_name` VARCHAR(50) NULL COMMENT '真实姓名',
  `avatar` VARCHAR(500) NULL COMMENT '头像',
  `role` ENUM('super_admin', 'admin', 'moderator', 'operator') DEFAULT 'operator',
  `permissions` JSON NULL COMMENT '权限列表',
  `status` ENUM('active', 'suspended', 'deleted') DEFAULT 'active',
  `last_login_at` TIMESTAMP NULL,
  `last_login_ip` VARCHAR(45) NULL,
  `two_factor_enabled` BOOLEAN DEFAULT FALSE,
  `two_factor_secret` VARCHAR(255) NULL,
  `failed_attempts` INT DEFAULT 0,
  `locked_until` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_username` (`username`),
  INDEX `idx_email` (`email`),
  INDEX `idx_status` (`status`),
  INDEX `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. 操作日志表
CREATE TABLE IF NOT EXISTS `operation_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `admin_id` BIGINT UNSIGNED NULL COMMENT '管理员ID',
  `module` VARCHAR(50) NOT NULL COMMENT '模块',
  `action` VARCHAR(50) NOT NULL COMMENT '操作',
  `resource_type` VARCHAR(50) NOT NULL COMMENT '资源类型',
  `resource_id` VARCHAR(64) NOT NULL COMMENT '资源ID',
  `old_data` JSON NULL COMMENT '旧数据',
  `new_data` JSON NULL COMMENT '新数据',
  `ip_address` VARCHAR(45) NULL COMMENT 'IP地址',
  `user_agent` TEXT NULL COMMENT '用户代理',
  `result` ENUM('success', 'failed') DEFAULT 'success',
  `error_message` TEXT NULL COMMENT '错误信息',
  `execution_time` INT NULL COMMENT '执行时间(毫秒)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_admin_module` (`admin_id`, `module`),
  INDEX `idx_action_resource` (`action`, `resource_type`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_result` (`result`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建外键约束
ALTER TABLE `payment_orders`
ADD CONSTRAINT `fk_payment_user` 
FOREIGN KEY (`user_mongo_id`) 
REFERENCES `user_extensions`(`user_mongo_id`) 
ON DELETE CASCADE;

ALTER TABLE `financial_records`
ADD CONSTRAINT `fk_financial_user` 
FOREIGN KEY (`user_mongo_id`) 
REFERENCES `user_extensions`(`user_mongo_id`) 
ON DELETE CASCADE;

ALTER TABLE `audit_logs`
ADD CONSTRAINT `fk_audit_user` 
FOREIGN KEY (`user_mongo_id`) 
REFERENCES `user_extensions`(`user_mongo_id`) 
ON DELETE SET NULL;

ALTER TABLE `user_behavior_logs`
ADD CONSTRAINT `fk_behavior_user` 
FOREIGN KEY (`user_mongo_id`) 
REFERENCES `user_extensions`(`user_mongo_id`) 
ON DELETE CASCADE;

ALTER TABLE `operation_logs`
ADD CONSTRAINT `fk_operation_admin` 
FOREIGN KEY (`admin_id`) 
REFERENCES `admins`(`id`) 
ON DELETE SET NULL;

-- 创建视图
CREATE VIEW `daily_user_stats` AS
SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT user_mongo_id) as active_users,
    COUNT(*) as total_actions,
    AVG(duration) as avg_session_duration
FROM user_behavior_logs
GROUP BY DATE(created_at);

CREATE VIEW `payment_summary` AS
SELECT 
    DATE(created_at) as date,
    payment_method,
    COUNT(*) as total_orders,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount
FROM payment_orders
WHERE status = 'completed'
GROUP BY DATE(created_at), payment_method;

-- 存储过程：清理过期数据
DELIMITER //

CREATE PROCEDURE `cleanup_expired_data`()
BEGIN
    -- 清理30天前的行为日志
    DELETE FROM user_behavior_logs 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
    
    -- 清理90天前的审计日志
    DELETE FROM audit_logs 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
    
    -- 清理过期缓存
    DELETE FROM cache 
    WHERE expiration > 0 AND expiration < UNIX_TIMESTAMP();
    
    -- 清理过期会话
    DELETE FROM sessions 
    WHERE last_activity < UNIX_TIMESTAMP() - 3600;
    
    SELECT ROW_COUNT() as rows_deleted;
END //

DELIMITER ;

-- 触发器：自动更新统计
DELIMITER //

CREATE TRIGGER `after_payment_completed`
AFTER UPDATE ON `payment_orders`
FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- 更新每日统计
        INSERT INTO statistics_summary (date, period, metric_name, metric_value, dimensions)
        VALUES (
            DATE(NEW.completed_at),
            'daily',
            'payment_amount',
            NEW.amount,
            JSON_OBJECT('payment_method', NEW.payment_method, 'product_id', NEW.product_id)
        )
        ON DUPLICATE KEY UPDATE
        metric_value = metric_value + NEW.amount,
        dimensions = JSON_MERGE_PATCH(dimensions, VALUES(dimensions));
    END IF;
END //

DELIMITER ;