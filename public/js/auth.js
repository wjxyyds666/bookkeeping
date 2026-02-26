import { authAPI } from './api.js';

// 登录页逻辑
if (window.location.pathname === '/login.html') {
  const loginForm = document.getElementById('loginForm');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
      const res = await authAPI.login(username, password);
      authAPI.setToken(res.data.token);
      
      // 管理员跳转到管理员页，普通用户跳转到首页
      if (res.data.user.is_admin) {
        window.location.href = '/admin.html';
      } else {
        window.location.href = '/index.html';
      }
    } catch (err) {
      console.error(err);
    }
  });
}

// 注册页逻辑
if (window.location.pathname === '/register.html') {
  const registerForm = document.getElementById('registerForm');

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
      alert('两次输入的密码不一致');
      return;
    }

    try {
      await authAPI.register(username, password);
      alert('注册成功，即将跳转到登录页');
      window.location.href = '/login.html';
    } catch (err) {
      console.error(err);
    }
  });
}

// 检查登录状态
const checkAuth = async () => {
  const token = authAPI.getToken();
  if (!token) {
    window.location.href = '/login.html';
    return null;
  }

  try {
    const res = await authAPI.getMe();
    return res.data;
  } catch (err) {
    authAPI.logout();
    return null;
  }
};

// 退出登录
window.logout = () => {
  authAPI.logout();
};
