// server/src/utils/response.js

// 成功响应
function successResponse(res, data = {}, message = '成功') {
  return res.status(200).json({
    code: 0,
    message,
    data
  });
}

// 错误响应
function errorResponse(res, message = '服务器错误', statusCode = 500, code = -1) {
  return res.status(statusCode).json({
    code,
    message
  });
}

// 分页响应
function paginationResponse(res, data, pagination, message = '成功') {
  return res.status(200).json({
    code: 0,
    message,
    data,
    pagination
  });
}

module.exports = {
  successResponse,
  errorResponse,
  paginationResponse
};