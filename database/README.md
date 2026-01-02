# 微信扑克牌小程序 - 数据库系统

## 概述

本目录包含微信扑克牌小程序的所有数据库相关文件，包括：
- MongoDB集合结构定义
- MySQL表结构定义
- 数据库迁移脚本
- 数据填充脚本
- 备份和恢复脚本

## 数据库架构

### MongoDB (主数据库)
存储业务数据：
- `users` - 用户信息
- `rooms` - 房间信息
- `game_records` - 游戏记录
- `payments` - 支付记录
- `achievements` - 成就定义
- `configs` - 系统配置
- `notifications` - 用户通知

### MySQL (辅助数据库)
存储关系型数据和事务性数据：
- `user_extensions` - 用户扩展信息
- `payment_orders` - 支付订单
- `financial_records` - 财务流水
- `audit_logs` - 审计日志
- `user_behavior_logs` - 用户行为日志
- `system_tasks` - 系统任务
- `message_queue` - 消息队列

## 快速开始

### 1. 环境要求
- Node.js 14+
- MongoDB 4.4+
- MySQL 8.0+
- Redis 6.0+

### 2. 安装依赖
```bash
# 项目根目录
npm install

# 数据库工具依赖
npm install mongoose mysql2 mongodb