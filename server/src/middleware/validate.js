// server/src/middleware/validate.js
const validator = require('validator');
const { body, query, param, validationResult } = require('express-validator');

/**
 * 创建房间参数验证
 */
const validateCreateRoom = [
  body('roomName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('房间名称长度为1-20个字符'),
  
  body('password')
    .optional()
    .isLength({ min: 4, max: 6 })
    .withMessage('房间密码长度为4-6位数字')
    .isNumeric()
    .withMessage('房间密码必须为数字'),
  
  body('gameMode')
    .isIn(['normal', 'competitive', 'friendly'])
    .withMessage('游戏模式无效'),
  
  body('baseScore')
    .optional()
    .isInt({ min: 100, max: 10000 })
    .withMessage('底分范围100-10000'),
  
  validateRequest
];

/**
 * 加入房间参数验证
 */
const validateJoinRoom = [
  body('roomId')
    .notEmpty()
    .withMessage('房间ID不能为空')
    .isMongoId()
    .withMessage('房间ID格式无效'),
  
  body('password')
    .optional()
    .isLength({ min: 4, max: 6 })
    .withMessage('房间密码长度为4-6位数字')
    .isNumeric()
    .withMessage('房间密码必须为数字'),
  
  validateRequest
];

/**
 * 出牌参数验证
 */
const validatePlayCards = [
  body('roomId')
    .notEmpty()
    .withMessage('房间ID不能为空')
    .isMongoId()
    .withMessage('房间ID格式无效'),
  
  body('cards')
    .isArray()
    .withMessage('cards必须为数组')
    .custom((cards) => {
      if (cards.length === 0) {
        throw new Error('出牌不能为空');
      }
      return true;
    }),
  
  body('cards.*.value')
    .isInt({ min: 3, max: 17 })
    .withMessage('牌值范围3-17'),
  
  body('cards.*.suit')
    .isIn(['spades', 'hearts', 'clubs', 'diamonds', 'joker'])
    .withMessage('花色无效'),
  
  validateRequest
];

/**
 * 加倍参数验证
 */
const validateDoubleAction = [
  body('roomId')
    .notEmpty()
    .withMessage('房间ID不能为空')
    .isMongoId()
    .withMessage('房间ID格式无效'),
  
  body('action')
    .isIn(['none', 'double', 'triple'])
    .withMessage('加倍动作为none/double/triple'),
  
  validateRequest
];

/**
 * 用户注册/登录参数验证
 */
const validateUserRegister = [
  body('nickname')
    .trim()
    .notEmpty()
    .withMessage('昵称不能为空')
    .isLength({ min: 2, max: 12 })
    .withMessage('昵称长度2-12个字符')
    .matches(/^[\u4e00-\u9fa5a-zA-Z0-9_]+$/)
    .withMessage('昵称只能包含中文、英文、数字和下划线'),
  
  body('avatarUrl')
    .optional()
    .isURL()
    .withMessage('头像URL格式无效'),
  
  validateRequest
];

/**
 * 充值参数验证
 */
const validateRecharge = [
  body('amount')
    .isInt({ min: 100, max: 100000 })
    .withMessage('充值金额范围100-100000金币'),
  
  body('paymentMethod')
    .isIn(['wechat', 'alipay'])
    .withMessage('支付方式为wechat或alipay'),
  
  validateRequest
];

/**
 * 分页参数验证
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须为正整数')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量1-100')
    .toInt(),
  
  (req, res, next) => {
    req.query.page = req.query.page || 1;
    req.query.limit = req.query.limit || 20;
    next();
  }
];

/**
 * 搜索参数验证
 */
const validateSearch = [
  query('keyword')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('关键词长度1-20个字符'),
  
  query('type')
    .optional()
    .isIn(['room', 'user', 'game'])
    .withMessage('搜索类型无效'),
  
  validateRequest
];

/**
 * 统一验证处理函数
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }));
    
    return res.status(400).json({
      code: 400,
      message: '参数验证失败',
      errors: errorMessages
    });
  }
  
  next();
}

/**
 * 文件上传验证
 */
const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      code: 400,
      message: '请选择要上传的文件'
    });
  }
  
  // 验证文件类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      code: 400,
      message: '只支持上传JPEG、PNG、GIF格式的图片'
    });
  }
  
  // 验证文件大小（最大2MB）
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (req.file.size > maxSize) {
    return res.status(400).json({
      code: 400,
      message: '文件大小不能超过2MB'
    });
  }
  
  next();
};

/**
 * 自定义验证规则
 */
const customValidators = {
  /**
   * 验证是否为有效的牌数组
   */
  isValidCardArray: (cards) => {
    if (!Array.isArray(cards)) return false;
    
    const validValues = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    const validSuits = ['spades', 'hearts', 'clubs', 'diamonds', 'joker'];
    
    return cards.every(card => {
      return validValues.includes(card.value) && 
             validSuits.includes(card.suit);
    });
  },
  
  /**
   * 验证是否为有效的时间范围
   */
  isValidDateRange: (dateRange) => {
    if (!dateRange || typeof dateRange !== 'object') return false;
    
    const { start, end } = dateRange;
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    return !isNaN(startDate.getTime()) && 
           !isNaN(endDate.getTime()) && 
           startDate <= endDate;
  }
};

module.exports = {
  validateCreateRoom,
  validateJoinRoom,
  validatePlayCards,
  validateDoubleAction,
  validateUserRegister,
  validateRecharge,
  validatePagination,
  validateSearch,
  validateFileUpload,
  validateRequest,
  customValidators
};