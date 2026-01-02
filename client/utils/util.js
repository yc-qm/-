// 格式化时间
export function formatTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!date) return '';
  
  if (typeof date === 'string' || typeof date === 'number') {
    date = new Date(date);
  }
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();
  
  const pad = (n) => n < 10 ? '0' + n : n;
  
  const formats = {
    'YYYY': year,
    'MM': pad(month),
    'DD': pad(day),
    'HH': pad(hour),
    'mm': pad(minute),
    'ss': pad(second)
  };
  
  return format.replace(/YYYY|MM|DD|HH|mm|ss/g, match => formats[match]);
}

// 格式化相对时间
export function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  
  const now = Date.now();
  const diff = now - timestamp;
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  
  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    const minutes = Math.floor(diff / minute);
    return `${minutes}分钟前`;
  } else if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours}小时前`;
  } else if (diff < week) {
    const days = Math.floor(diff / day);
    return `${days}天前`;
  } else if (diff < month) {
    const weeks = Math.floor(diff / week);
    return `${weeks}周前`;
  } else if (diff < year) {
    const months = Math.floor(diff / month);
    return `${months}个月前`;
  } else {
    const years = Math.floor(diff / year);
    return `${years}年前`;
  }
}

// 格式化数字
export function formatNumber(num, options = {}) {
  if (typeof num !== 'number') {
    num = parseFloat(num) || 0;
  }
  
  const { 
    decimals = 0, 
    separator = ',',
    decimalPoint = '.'
  } = options;
  
  // 处理小数位数
  let [integer, decimal] = num.toFixed(decimals).split('.');
  
  // 千位分隔符
  integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  
  if (decimals > 0 && decimal) {
    return `${integer}${decimalPoint}${decimal}`;
  }
  
  return integer;
}

// 格式化大数字（K/M/B）
export function formatBigNumber(num) {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// 生成随机字符串
export function randomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 生成随机数字字符串
export function randomNumberString(length = 6) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

// 深拷贝
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Array) {
    return obj.reduce((arr, item, i) => {
      arr[i] = deepClone(item);
      return arr;
    }, []);
  }
  
  if (typeof obj === 'object') {
    return Object.keys(obj).reduce((newObj, key) => {
      newObj[key] = deepClone(obj[key]);
      return newObj;
    }, {});
  }
  
  return obj;
}

// 防抖函数
export function debounce(func, wait, immediate = false) {
  let timeout;
  
  return function(...args) {
    const context = this;
    const later = () => {
      timeout = null;
      if (!immediate) {
        func.apply(context, args);
      }
    };
    
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) {
      func.apply(context, args);
    }
  };
}

// 节流函数
export function throttle(func, limit) {
  let inThrottle;
  
  return function(...args) {
    const context = this;
    
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// 获取URL参数
export function getQueryParams(url) {
  const params = {};
  const queryString = url.split('?')[1];
  
  if (queryString) {
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    });
  }
  
  return params;
}

// 对象转URL参数
export function objectToQueryParams(obj) {
  const params = [];
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && obj[key] !== undefined && obj[key] !== null) {
      params.push(`${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`);
    }
  }
  
  return params.join('&');
}

// 验证手机号
export function validatePhone(phone) {
  const reg = /^1[3-9]\d{9}$/;
  return reg.test(phone);
}

// 验证邮箱
export function validateEmail(email) {
  const reg = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return reg.test(email);
}

// 验证身份证号
export function validateIdCard(idCard) {
  const reg = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
  return reg.test(idCard);
}

// 生成UUID
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 计算字符串长度（中文算2个字符）
export function stringLength(str) {
  let length = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    if (char >= 0 && char <= 128) {
      length += 1;
    } else {
      length += 2;
    }
  }
  return length;
}

// 截断字符串
export function truncateString(str, maxLength, suffix = '...') {
  if (stringLength(str) <= maxLength) {
    return str;
  }
  
  let result = '';
  let currentLength = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const charLength = str.charCodeAt(i) > 128 ? 2 : 1;
    
    if (currentLength + charLength > maxLength) {
      break;
    }
    
    result += char;
    currentLength += charLength;
  }
  
  return result + suffix;
}

// 睡眠函数
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 批量执行异步任务
export async function batchAsync(tasks, batchSize = 5) {
  const results = [];
  
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(task => task()));
    results.push(...batchResults);
    
    // 避免阻塞
    if (i + batchSize < tasks.length) {
      await sleep(10);
    }
  }
  
  return results;
}

// 计算文件大小
export function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// 检查是否为空
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0) return true;
  return false;
}

// 安全获取对象属性
export function getProp(obj, path, defaultValue = null) {
  if (!obj || typeof obj !== 'object') return defaultValue;
  
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return defaultValue;
    }
  }
  
  return result !== undefined ? result : defaultValue;
}

// 设置对象属性
export function setProp(obj, path, value) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
  return obj;
}

// 导出所有工具函数
export default {
  formatTime,
  formatRelativeTime,
  formatNumber,
  formatBigNumber,
  randomString,
  randomNumberString,
  deepClone,
  debounce,
  throttle,
  getQueryParams,
  objectToQueryParams,
  validatePhone,
  validateEmail,
  validateIdCard,
  generateUUID,
  stringLength,
  truncateString,
  sleep,
  batchAsync,
  formatFileSize,
  isEmpty,
  getProp,
  setProp
};