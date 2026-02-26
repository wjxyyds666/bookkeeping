import bcrypt from 'bcryptjs';

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { username, password } = await request.json();

    // 参数校验
    if (!username || !password) {
      return new Response(JSON.stringify({ code: 400, message: '用户名和密码不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (username.length < 3 || username.length > 20) {
      return new Response(JSON.stringify({ code: 400, message: '用户名长度需3-20位' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (password.length < 6) {
      return new Response(JSON.stringify({ code: 400, message: '密码长度至少6位' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 检查用户名是否已存在
    const existUser = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
    if (existUser) {
      return new Response(JSON.stringify({ code: 400, message: '用户名已存在' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 插入用户
    await env.DB.prepare('INSERT INTO users (username, password) VALUES (?, ?)').bind(username, hashedPassword).run();

    return new Response(JSON.stringify({ code: 200, message: '注册成功，请登录' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ code: 500, message: '服务器错误', error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
