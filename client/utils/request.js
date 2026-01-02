const app = getApp();

// 基础配置
const BASE_URL = 'https://your-api-domain.com/api'; // 替换为实际API地址
const TIMEOUT = 15000; // 15秒超时

// 请求队列
const requestQueue = [];
let isProcessingQueue = false;

// 显示加载提示
const showLoading = (title = '加载中...') => {
  wx.showLoading({
    title: title,
    mask: true
  });
};

// 隐藏加载提示
const hideLoading = () => {
  wx.hideLoading();
};

// 显示错误提示
const showError = (message) => {
  wx.showToast({
    title: message || '网络错误',
    icon: 'error',
    duration: 2000
  });
};

// 获取请求头
const getHeaders = (customHeaders = {}) => {
  const token = wx.getStorageSync('token');
  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...customHeaders
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// 处理响应
const handleResponse = async (response) => {
  const { statusCode, data } = response;
  
  // 处理HTTP状态码
  if (statusCode === 401) {
    // Token过期，跳转到登录页
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    wx.showModal({
      title: '提示',
      content: '登录已过期，请重新登录',
      showCancel: false,
      success: () => {
        wx.reLaunch({
          url: '/pages/login/login'
        });
      }
    });
    throw new Error('登录已过期');
  }
  
  if (statusCode === 403) {
    showError('没有权限访问');
    throw new Error('没有权限');
  }
  
  if (statusCode === 404) {
    showError('资源不存在');
    throw new Error('资源不存在');
  }
  
  if (statusCode === 500) {
    showError('服务器错误');
    throw new Error('服务器错误');
  }
  
  if (statusCode < 200 || statusCode >= 300) {
    showError(`请求失败，状态码：${statusCode}`);
    throw new Error(`HTTP ${statusCode}`);
  }
  
  // 处理业务逻辑
  if (data.code !== 0) {
    showError(data.message || '请求失败');
    throw new Error(data.message || '请求失败');
  }
  
  return data.data;
};

// 请求函数
const request = (method, url, data = null, options = {}) => {
  return new Promise((resolve, reject) => {
    const config = {
      url: BASE_URL + url,
      method: method,
      header: getHeaders(options.headers),
      timeout: options.timeout || TIMEOUT,
      success: async (response) => {
        try {
          const result = await handleResponse(response);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      },
      fail: (error) => {
        console.error('请求失败:', error);
        showError('网络连接失败，请检查网络');
        reject(error);
      },
      complete: () => {
        if (options.showLoading) {
          hideLoading();
        }
      }
    };
    
    if (data !== null) {
      config.data = data;
    }
    
    // 如果需要显示加载提示
    if (options.showLoading) {
      showLoading(options.loadingText);
    }
    
    // 添加到请求队列
    if (options.needQueue) {
      requestQueue.push(() => wx.request(config));
      if (!isProcessingQueue) {
        processQueue();
      }
    } else {
      wx.request(config);
    }
  });
};

// 处理请求队列
const processQueue = async () => {
  if (requestQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }
  
  isProcessingQueue = true;
  const requestFunc = requestQueue.shift();
  
  try {
    await requestFunc();
  } catch (error) {
    console.error('队列请求失败:', error);
  } finally {
    processQueue();
  }
};

// 上传文件
const uploadFile = (url, filePath, formData = {}, options = {}) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');
    
    wx.uploadFile({
      url: BASE_URL + url,
      filePath: filePath,
      name: options.name || 'file',
      formData: {
        ...formData,
        token: token
      },
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (response) => {
        try {
          const data = JSON.parse(response.data);
          if (data.code === 0) {
            resolve(data.data);
          } else {
            showError(data.message || '上传失败');
            reject(new Error(data.message));
          }
        } catch (error) {
          showError('上传失败');
          reject(error);
        }
      },
      fail: (error) => {
        showError('上传失败');
        reject(error);
      }
    });
  });
};

// 下载文件
const downloadFile = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url: BASE_URL + url,
      header: getHeaders(options.headers),
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.tempFilePath);
        } else {
          reject(new Error(`下载失败，状态码：${res.statusCode}`));
        }
      },
      fail: (error) => {
        reject(error);
      }
    });
  });
};

// GET请求
const get = (url, params = {}, options = {}) => {
  let queryString = '';
  if (Object.keys(params).length > 0) {
    queryString = '?' + Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
  }
  return request('GET', url + queryString, null, options);
};

// POST请求
const post = (url, data = {}, options = {}) => {
  return request('POST', url, data, options);
};

// PUT请求
const put = (url, data = {}, options = {}) => {
  return request('PUT', url, data, options);
};

// DELETE请求
const del = (url, data = {}, options = {}) => {
  return request('DELETE', url, data, options);
};

// 设置拦截器
const interceptor = {
  request: {
    use: (callback) => {
      // 请求拦截器
    }
  },
  response: {
    use: (callback) => {
      // 响应拦截器
    }
  }
};

// 导出
export default {
  get,
  post,
  put,
  del,
  uploadFile,
  downloadFile,
  request,
  interceptor,
  BASE_URL
};