// server/src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { 
  authenticate, 
  optionalAuthenticate, 
  wechatAuth,
  requireAdmin,
  rateLimit 
} = require('../middleware/auth');
const {
  validateUserRegister,
  validatePagination,
  validateSearch
} = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   POST /api/users/login
 * @desc    微信小程序登录
 * @access  Public
 */
router.post(
  '/login',
  rateLimit({ windowMs: 60 * 1000, max: 5 }), // 1分钟内最多5次
  wechatAuth,
  asyncHandler(userController.login)
);

/**
 * @route   POST /api/users/register
 * @desc    用户注册（完善信息）
 * @access  Private（需要微信登录后）
 */
router.post(
  '/register',
  authenticate,
  validateUserRegister,
  asyncHandler(userController.register)
);

/**
 * @route   GET /api/users/profile
 * @desc    获取当前用户信息
 * @access  Private
 */
router.get(
  '/profile',
  authenticate,
  asyncHandler(userController.getProfile)
);

/**
 * @route   PUT /api/users/profile
 * @desc    更新用户信息
 * @access  Private
 */
router.put(
  '/profile',
  authenticate,
  asyncHandler(userController.updateProfile)
);

/**
 * @route   GET /api/users/:userId
 * @desc    获取指定用户信息（公开信息）
 * @access  Public
 */
router.get(
  '/:userId',
  optionalAuthenticate,
  asyncHandler(userController.getUserById)
);

/**
 * @route   GET /api/users/stats/leaderboard
 * @desc    获取排行榜
 * @access  Public
 */
router.get(
  '/stats/leaderboard',
  validatePagination,
  asyncHandler(userController.getLeaderboard)
);

/**
 * @route   GET /api/users/stats/:userId
 * @desc    获取用户统计数据
 * @access  Public
 */
router.get(
  '/stats/:userId',
  asyncHandler(userController.getUserStats)
);

/**
 * @route   GET /api/users/friends/list
 * @desc    获取好友列表
 * @access  Private
 */
router.get(
  '/friends/list',
  authenticate,
  validatePagination,
  asyncHandler(userController.getFriendsList)
);

/**
 * @route   POST /api/users/friends/add
 * @desc    添加好友
 * @access  Private
 */
router.post(
  '/friends/add',
  authenticate,
  asyncHandler(userController.addFriend)
);

/**
 * @route   DELETE /api/users/friends/remove
 * @desc    移除好友
 * @access  Private
 */
router.delete(
  '/friends/remove',
  authenticate,
  asyncHandler(userController.removeFriend)
);

/**
 * @route   GET /api/users/search
 * @desc    搜索用户
 * @access  Private
 */
router.get(
  '/search',
  authenticate,
  validateSearch,
  asyncHandler(userController.searchUsers)
);

/**
 * @route   GET /api/admin/users
 * @desc    管理员获取用户列表
 * @access  Private/Admin
 */
router.get(
  '/admin/users',
  authenticate,
  requireAdmin,
  validatePagination,
  asyncHandler(userController.adminGetUsers)
);

/**
 * @route   PUT /api/admin/users/:userId/status
 * @desc    管理员修改用户状态
 * @access  Private/Admin
 */
router.put(
  '/admin/users/:userId/status',
  authenticate,
  requireAdmin,
  asyncHandler(userController.adminUpdateUserStatus)
);

/**
 * @route   POST /api/users/feedback
 * @desc    提交用户反馈
 * @access  Private
 */
router.post(
  '/feedback',
  authenticate,
  asyncHandler(userController.submitFeedback)
);

/**
 * @route   GET /api/users/notifications
 * @desc    获取用户通知
 * @access  Private
 */
router.get(
  '/notifications',
  authenticate,
  validatePagination,
  asyncHandler(userController.getNotifications)
);

/**
 * @route   PUT /api/users/notifications/:id/read
 * @desc    标记通知为已读
 * @access  Private
 */
router.put(
  '/notifications/:id/read',
  authenticate,
  asyncHandler(userController.markNotificationAsRead)
);

module.exports = router;