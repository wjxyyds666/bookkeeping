// 获取记录列表
export async function onRequestGet(context) {
  const { request, env, data } = context;
  const userId = data.user.id;
  const { searchParams } = new URL(request.url);

  // 筛选参数
  const page = parseInt(searchParams.get('page') || 1);
  const pageSize = parseInt(searchParams.get('pageSize') || 20);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const categoryId = searchParams.get('categoryId');
  const type = searchParams.get('type'); // income/expense

  try {
    let sql = `
      SELECT r.id, r.amount, r.description, r.record_date, c.name as category_name, c.is_income
      FROM records r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.user_id = ?
    `;
    let params = [userId];

    // 拼接筛选条件
    if (startDate && endDate) {
      sql += ' AND r.record_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    if (categoryId) {
      sql += ' AND r.category_id = ?';
      params.push(categoryId);
    }
    if (type === 'income') {
      sql += ' AND c.is_income = 1';
    } else if (type === 'expense') {
      sql += ' AND c.is_income = 0';
    }

    // 排序+分页
    sql += ' ORDER BY r.record_date DESC, r.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, (page - 1) * pageSize);

    // 查询记录
    const records = await env.DB.prepare(sql).bind(...params).all();

    // 查询总条数
    let countSql = 'SELECT COUNT(*) as total FROM records r LEFT JOIN categories c ON r.category_id = c.id WHERE r.user_id = ?';
    let countParams = [userId];
    if (startDate && endDate) {
      countSql += ' AND r.record_date BETWEEN ? AND ?';
      countParams.push(startDate, endDate);
    }
    if (categoryId) {
      countSql += ' AND r.category_id = ?';
      countParams.push(categoryId);
    }
    if (type === 'income') {
      countSql += ' AND c.is_income = 1';
    } else if (type === 'expense') {
      countSql += ' AND c.is_income = 0';
    }
    const countResult = await env.DB.prepare(countSql).bind(...countParams).first();

    return new Response(JSON.stringify({
      code: 200,
      data: {
        records: records.results,
        total: countResult.total,
        page,
        pageSize
      }
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ code: 500, message: '获取记录失败', error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 新增记账记录
export async function onRequestPost(context) {
  const { request, env, data } = context;
  const userId = data.user.id;

  try {
    const { amount, category_id, description, record_date } = await request.json();

    if (!amount || !category_id) {
      return new Response(JSON.stringify({ code: 400, message: '金额和分类不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await env.DB.prepare(
      'INSERT INTO records (user_id, amount, category_id, description, record_date) VALUES (?, ?, ?, ?, ?)'
    ).bind(userId, amount, category_id, description || '', record_date || new Date().toISOString().split('T')[0]).run();

    return new Response(JSON.stringify({ code: 200, message: '记录添加成功', data: { id: result.meta.last_row_id } }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ code: 500, message: '添加记录失败', error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 修改记账记录
export async function onRequestPut(context) {
  const { request, env, data } = context;
  const userId = data.user.id;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    const { amount, category_id, description, record_date } = await request.json();

    if (!id || !amount || !category_id) {
      return new Response(JSON.stringify({ code: 400, message: '参数不全' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 校验记录归属
    const record = await env.DB.prepare('SELECT id FROM records WHERE id = ? AND user_id = ?').bind(id, userId).first();
    if (!record) {
      return new Response(JSON.stringify({ code: 403, message: '无权限修改该记录' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await env.DB.prepare(
      'UPDATE records SET amount = ?, category_id = ?, description = ?, record_date = ? WHERE id = ? AND user_id = ?'
    ).bind(amount, category_id, description || '', record_date, id, userId).run();

    return new Response(JSON.stringify({ code: 200, message: '记录修改成功' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ code: 500, message: '修改记录失败', error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 删除记账记录
export async function onRequestDelete(context) {
  const { request, env, data } = context;
  const userId = data.user.id;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    if (!id) {
      return new Response(JSON.stringify({ code: 400, message: '记录ID不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 校验记录归属
    const record = await env.DB.prepare('SELECT id FROM records WHERE id = ? AND user_id = ?').bind(id, userId).first();
    if (!record) {
      return new Response(JSON.stringify({ code: 403, message: '无权限删除该记录' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await env.DB.prepare('DELETE FROM records WHERE id = ? AND user_id = ?').bind(id, userId).run();

    return new Response(JSON.stringify({ code: 200, message: '记录删除成功' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ code: 500, message: '删除记录失败', error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
