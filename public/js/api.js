// API基础配置
const API_BASE_URL = '';
const TOKEN_KEY = 'account_book_token';

// 请求封装
const request = async (url, options = {}) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (data.code === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login.html';
      throw new Error('登录已过期，请重新登录');
    }

    if (data.code !== 200) {
      throw new Error(data.message || '请求失败');
    }

    return data;
  } catch (err) {
    alert(err.message);
    throw err;
  }
};

// 认证相关API
export const authAPI = {
  login: (username, password) => request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }),
  register: (username, password) => request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }),
  getMe: () => request('/api/auth/me', { method: 'GET' }),
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = '/login.html';
  },
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
};

// 分类API
export const categoryAPI = {
  getList: () => request('/api/categories', { method: 'GET' }),
  add: (data) => request('/api/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// 记录API
export const recordAPI = {
  getList: (params = {}) => {
    const searchParams = new URLSearchParams(params);
    return request(`/api/records?${searchParams.toString()}`, { method: 'GET' });
  },
  add: (data) => request('/api/records', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => request(`/api/records?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => request(`/api/records?id=${id}`, { method: 'DELETE' }),
  getStats: (month) => request(`/api/records/stats?month=${month}`, { method: 'GET' }),
};

// 管理员API
export const adminAPI = {
  getUsers: () => request('/api/admin/users', { method: 'GET' }),
};
