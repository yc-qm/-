// server/src/routes/roomRoutes.js
const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { authenticate } = require('../middleware/auth');
const {
  validateCreateRoom,
  validateJoinRoom,
  validatePagination,
  validateSearch
} = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   POST /api/rooms/create
 * @desc    创建房间
 * @access  Private
 */
router.post(
  '/create',
  authenticate,
  validateCreateRoom,
  asyncHandler(roomController.createRoom)
);

/**
 * @route   POST /api/rooms/join
 * @desc    加入房间
 * @access  Private
 */
router.post(
  '/join',
  authenticate,
  validateJoinRoom,
  asyncHandler(roomController.joinRoom)
);

/**
 * @route   POST /api/rooms/quick-join
 * @desc    快速加入房间
 * @access  Private
 */
router.post(
  '/quick-join',
  authenticate,
  asyncHandler(roomController.quickJoin)
);

/**
 * @route   POST /api/rooms/leave
 * @desc    离开房间
 * @access  Private
 */
router.post(
  '/leave',
  authenticate,
  asyncHandler(roomController.leaveRoom)
);

/**
 * @route   GET /api/rooms/:roomId
 * @desc    获取房间信息
 * @access  Private
 */
router.get(
  '/:roomId',
  authenticate,
  asyncHandler(roomController.getRoomInfo)
);

/**
 * @route   GET /api/rooms/list/active
 * @desc    获取活跃房间列表
 * @access  Public
 */
router.get(
  '/list/active',
  validatePagination,
  asyncHandler(roomController.getActiveRooms)
);

/**
 * @route   GET /api/rooms/list/my
 * @desc    获取我的房间（创建或加入的）
 * @access  Private
 */
router.get(
  '/list/my',
  authenticate,
  validatePagination,
  asyncHandler(roomController.getMyRooms)
);

/**
 * @route   PUT /api/rooms/:roomId/ready
 * @desc    准备/取消准备
 * @access  Private
 */
router.put(
  '/:roomId/ready',
  authenticate,
  asyncHandler(roomController.toggleReady)
);

/**
 * @route   POST /api/rooms/:roomId/start
 * @desc    开始游戏
 * @access  Private（房主权限）
 */
router.post(
  '/:roomId/start',
  authenticate,
  asyncHandler(roomController.startGame)
);

/**
 * @route   PUT /api/rooms/:roomId/settings
 * @desc    修改房间设置（房主权限）
 * @access  Private
 */
router.put(
  '/:roomId/settings',
  authenticate,
  asyncHandler(roomController.updateRoomSettings)
);

/**
 * @route   POST /api/rooms/:roomId/kick
 * @desc    踢出玩家（房主权限）
 * @access  Private
 */
router.post(
  '/:roomId/kick',
  authenticate,
  asyncHandler(roomController.kickPlayer)
);

/**
 * @route   POST /api/rooms/:roomId/transfer
 * @desc    转移房主权限
 * @access  Private（房主权限）
 */
router.post(
  '/:roomId/transfer',
  authenticate,
  asyncHandler(roomController.transferOwnership)
);

/**
 * @route   GET /api/rooms/search
 * @desc    搜索房间
 * @access  Public
 */
router.get(
  '/search',
  validateSearch,
  asyncHandler(roomController.searchRooms)
);

/**
 * @route   POST /api/rooms/:roomId/chat
 * @desc    发送房间聊天消息
 * @access  Private
 */
router.post(
  '/:roomId/chat',
  authenticate,
  asyncHandler(roomController.sendChatMessage)
);

/**
 * @route   GET /api/rooms/:roomId/history
 * @desc    获取房间聊天历史
 * @access  Private
 */
router.get(
  '/:roomId/history',
  authenticate,
  validatePagination,
  asyncHandler(roomController.getChatHistory)
);

module.exports = router;