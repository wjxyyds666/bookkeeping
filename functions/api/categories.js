// 获取分类列表
export async function onRequestGet(context) {
  const { env, data } = context;
  const userId = data.user.id;

  try {
    // 查询系统默认分类+用户自定义分类
    const categories = await env.DB.prepare(
      'SELECT id, name, is_income FROM categories WHERE user_id = 0 OR user_id = ? ORDER BY is_income DESC, id ASC'
    ).bind(userId).all();

    return new Response(JSON.stringify({ code: 200, data: categories.results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ code: 500, message: '获取分类失败', error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 新增自定义分类
export async function onRequestPost(context) {
  const { request, env, data } = context;
  const userId = data.user.id;

  try {
    const { name, is_income } = await request.json();
    if (!name) {
      return new Response(JSON.stringify({ code: 400, message: '分类名称不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await env.DB.prepare(
      'INSERT INTO categories (user_id, name, is_income) VALUES (?, ?, ?)'
    ).bind(userId, name, is_income ? 1 : 0).run();

    return new Response(JSON.stringify({ code: 200, message: '分类添加成功', data: { id: result.meta.last_row_id } }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return new Response(JSON.stringify({ code: 400, message: '该分类名称已存在' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ code: 500, message: '添加分类失败', error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
