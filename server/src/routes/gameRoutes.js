// server/src/routes/gameRoutes.js
const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const { authenticate } = require('../middleware/auth');
const {
  validatePlayCards,
  validateDoubleAction,
  validatePagination
} = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/games/:gameId
 * @desc    获取游戏详情（包括历史记录）
 * @access  Private
 */
router.get(
  '/:gameId',
  authenticate,
  asyncHandler(gameController.getGameDetails)
);

/**
 * @route   POST /api/games/:roomId/play
 * @desc    出牌
 * @access  Private
 */
router.post(
  '/:roomId/play',
  authenticate,
  validatePlayCards,
  asyncHandler(gameController.playCards)
);

/**
 * @route   POST /api/games/:roomId/pass
 * @desc    过牌
 * @access  Private
 */
router.post(
  '/:roomId/pass',
  authenticate,
  asyncHandler(gameController.passTurn)
);

/**
 * @route   POST /api/games/:roomId/double
 * @desc    加倍/反加倍/三倍操作
 * @access  Private
 */
router.post(
  '/:roomId/double',
  authenticate,
  validateDoubleAction,
  asyncHandler(gameController.doubleAction)
);

/**
 * @route   GET /api/games/:roomId/state
 * @desc    获取游戏当前状态
 * @access  Private
 */
router.get(
  '/:roomId/state',
  authenticate,
  asyncHandler(gameController.getGameState)
);

/**
 * @route   POST /api/games/:roomId/hint
 * @desc    获取出牌提示
 * @access  Private
 */
router.post(
  '/:roomId/hint',
  authenticate,
  asyncHandler(gameController.getHint)
);

/**
 * @route   POST /api/games/:roomId/surrender
 * @desc    认输
 * @access  Private
 */
router.post(
  '/:roomId/surrender',
  authenticate,
  asyncHandler(gameController.surrender)
);

/**
 * @route   GET /api/games/history/my
 * @desc    获取我的游戏历史
 * @access  Private
 */
router.get(
  '/history/my',
  authenticate,
  validatePagination,
  asyncHandler(gameController.getMyGameHistory)
);

/**
 * @route   GET /api/games/history/:userId
 * @desc    获取指定用户的游戏历史
 * @access  Public
 */
router.get(
  '/history/:userId',
  validatePagination,
  asyncHandler(gameController.getUserGameHistory)
);

/**
 * @route   GET /api/games/replay/:gameId
 * @desc    获取游戏回放数据
 * @access  Private
 */
router.get(
  '/replay/:gameId',
  authenticate,
  asyncHandler(gameController.getGameReplay)
);

/**
 * @route   POST /api/games/puzzle/verify
 * @desc    验证残局解法
 * @access  Public
 */
router.post(
  '/puzzle/verify',
  asyncHandler(gameController.verifyPuzzleSolution)
);

/**
 * @route   GET /api/games/puzzle/daily
 * @desc    获取每日残局
 * @access  Public
 */
router.get(
  '/puzzle/daily',
  asyncHandler(gameController.getDailyPuzzle)
);

/**
 * @route   GET /api/games/puzzle/list
 * @desc    获取残局列表
 * @access  Public
 */
router.get(
  '/puzzle/list',
  validatePagination,
  asyncHandler(gameController.getPuzzleList)
);

/**
 * @route   GET /api/games/statistics/global
 * @desc    获取全局游戏统计
 * @access  Public
 */
router.get(
  '/statistics/global',
  asyncHandler(gameController.getGlobalStatistics)
);

/**
 * @route   POST /api/games/:roomId/vote/restart
 * @desc    投票重新开始游戏
 * @access  Private
 */
router.post(
  '/:roomId/vote/restart',
  authenticate,
  asyncHandler(gameController.voteRestart)
);

/**
 * @route   POST /api/games/:roomId/vote/draw
 * @desc    投票和局
 * @access  Private
 */
router.post(
  '/:roomId/vote/draw',
  authenticate,
  asyncHandler(gameController.voteDraw)
);

/**
 * @route   GET /api/games/achievements/my
 * @desc    获取我的成就
 * @access  Private
 */
router.get(
  '/achievements/my',
  authenticate,
  asyncHandler(gameController.getMyAchievements)
);

module.exports = router;