-- database/seed.sql
-- 初始数据填充脚本

-- 1. 插入管理员账户（密码：Admin@123456）
INSERT INTO `admins` (
  `username`,
  `email`,
  `password_hash`,
  `real_name`,
  `role`,
  `permissions`,
  `status`
) VALUES (
  'admin',
  'admin@wechat-poker.com',
  '$2a$10$3kUq.8q5vMvW3YwH6ZQrB.ZpZt3F5jQ5WJNkQc5q5vQ3GpY6X2qQzW', -- bcrypt哈希
  '系统管理员',
  'super_admin',
  '["*"]',
  'active'
);

-- 2. 插入默认系统配置
INSERT INTO `configs` (`key`, `value`, `type`, `description`, `category`, `isPublic`) VALUES
('system.name', '微信扑克牌小程序', 'string', '系统名称', 'system', true),
('system.maintenance', 'false', 'boolean', '是否在维护中', 'system', true),
('game.min_coins', '100', 'number', '游戏所需最低金币', 'game', true),
('game.max_coins', '1000000', 'number', '用户最大金币数', 'game', false),
('payment.min_amount', '1', 'number', '最低充值金额', 'payment', true),
('payment.max_amount', '5000', 'number', '最高充值金额', 'payment', true),
('security.auto_logout', '3600', 'number', '自动登出时间(秒)', 'security', false),
('notification.game_start', 'true', 'boolean', '游戏开始通知', 'notification', false);

-- 3. 插入支付商品配置
INSERT INTO `payment_products` (`product_id`, `name`, `type`, `price`, `coins`, `diamonds`, `description`, `is_active`) VALUES
('coins_100', '100金币', 'coins', 1.00, 100, 0, '100游戏金币', true),
('coins_500', '500金币', 'coins', 4.99, 500, 0, '500游戏金币', true),
('coins_1200', '1200金币', 'coins', 9.99, 1200, 0, '1200游戏金币', true),
('diamonds_10', '10钻石', 'diamonds', 0.99, 0, 10, '10钻石', true),
('diamonds_50', '50钻石', 'diamonds', 4.99, 0, 50, '50钻石', true),
('vip_monthly', '月卡会员', 'vip', 29.99, 1000, 100, '月卡会员特权', true);

-- 4. 插入默认成就数据（已在MongoDB迁移中插入，这里作为备份）
-- 见 migrations/003-add-achievements.js

-- 5. 插入初始统计记录
INSERT INTO `statistics_summary` (`date`, `period`, `metric_name`, `metric_value`, `dimensions`) VALUES
(CURDATE(), 'daily', 'new_users', 0, '{"source": "all"}'),
(CURDATE(), 'daily', 'active_users', 0, '{"source": "all"}'),
(CURDATE(), 'daily', 'total_games', 0, '{"game_mode": "all"}'),
(CURDATE(), 'daily', 'payment_amount', 0, '{"payment_method": "all"}');

-- 6. 插入默认消息模板
INSERT INTO `message_templates` (`code`, `title`, `content`, `type`, `category`, `is_active`) VALUES
('welcome', '欢迎加入', '欢迎来到微信扑克牌小程序！祝您游戏愉快！', 'notification', 'system', true),
('friend_request', '好友申请', '{{from_user}} 向您发送了好友申请', 'notification', 'social', true),
('game_invite', '游戏邀请', '{{from_user}} 邀请您加入房间 {{room_code}}', 'notification', 'game', true),
('payment_success', '支付成功', '您的充值订单 {{order_id}} 已支付成功，获得 {{coins}} 金币', 'notification', 'payment', true);

-- 创建测试用户（仅用于开发环境）
-- 注意：实际生产环境不应该包含测试用户
SET @testUserMongoId = '507f1f77bcf86cd799439011';

INSERT INTO `user_extensions` (`user_mongo_id`, `email`, `phone`, `real_name`) VALUES
(@testUserMongoId, 'test@wechat-poker.com', '13800138000', '测试用户');

-- 插入测试支付记录
INSERT INTO `payment_orders` (
  `order_id`,
  `user_mongo_id`,
  `payment_method`,
  `payment_type`,
  `amount`,
  `product_id`,
  `product_name`,
  `status`,
  `completed_at`
) VALUES
('TEST_ORDER_001', @testUserMongoId, 'wechat', 'recharge', 9.99, 'coins_500', '500金币', 'completed', NOW()),
('TEST_ORDER_002', @testUserMongoId, 'alipay', 'recharge', 29.99, 'vip_monthly', '月卡会员', 'completed', NOW());

-- 插入测试财务流水
INSERT INTO `financial_records` (
  `record_id`,
  `user_mongo_id`,
  `type`,
  `category`,
  `amount`,
  `coins_before`,
  `coins_after`,
  `diamonds_before`,
  `diamonds_after`,
  `description`
) VALUES
('FIN_001', @testUserMongoId, 'income', 'recharge', 9.99, 0, 500, 0, 0, '充值获得金币'),
('FIN_002', @testUserMongoId, 'income', 'recharge', 29.99, 500, 1500, 0, 100, '充值获得月卡');

-- 插入测试操作日志
INSERT INTO `operation_logs` (
  `admin_id`,
  `module`,
  `action`,
  `resource_type`,
  `resource_id`,
  `result`,
  `execution_time`
) VALUES
(1, 'user', 'create', 'user', @testUserMongoId, 'success', 50),
(1, 'payment', 'verify', 'order', 'TEST_ORDER_001', 'success', 30);

-- 输出完成信息
SELECT '✅ 初始数据填充完成' as message;