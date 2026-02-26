import jwt from 'jsonwebtoken';

// 不需要认证的路由白名单
const whiteList = [
  '/api/auth/login',
  '/api/auth/register',
  '/login.html',
  '/register.html',
  '/css/style.css',
  '/js/api.js',
  '/js/auth.js',
  '/'
];

export async function onRequest(context) {
  const { request, env, next, data } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 处理CORS跨域
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // 静态资源和白名单接口直接放行
  if (whiteList.includes(pathname) || pathname.startsWith('/js/') || pathname.startsWith('/css/')) {
    const response = await next();
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    return new Response(response.body, { ...response, headers: newHeaders });
  }

  // 验证JWT令牌
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // 未登录跳转到登录页
    if (pathname === '/index.html' || pathname === '/admin.html') {
      return Response.redirect(new URL('/login.html', request.url), 302);
    }
    return new Response(JSON.stringify({ code: 401, message: '未登录，请先登录' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);
    // 将用户信息存入上下文，供后续接口使用
    data.user = decoded;

    // 管理员路由权限校验
    if (pathname.startsWith('/api/admin/') && !decoded.is_admin) {
      return new Response(JSON.stringify({ code: 403, message: '无管理员权限' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return await next();
  } catch (err) {
    return new Response(JSON.stringify({ code: 401, message: '令牌无效，请重新登录' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
