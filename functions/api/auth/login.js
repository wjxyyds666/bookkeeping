import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

    // 查询用户
    const user = await env.DB.prepare('SELECT id, username, password, is_admin FROM users WHERE username = ?').bind(username).first();
    if (!user) {
      return new Response(JSON.stringify({ code: 400, message: '用户名或密码错误' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 校验密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return new Response(JSON.stringify({ code: 400, message: '用户名或密码错误' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 生成JWT令牌，有效期7天
    const token = jwt.sign(
      { id: user.id, username: user.username, is_admin: user.is_admin },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return new Response(JSON.stringify({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: { id: user.id, username: user.username, is_admin: user.is_admin }
      }
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ code: 500, message: '服务器错误', error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
