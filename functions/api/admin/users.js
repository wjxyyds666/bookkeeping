export async function onRequestGet(context) {
  const { env } = context;

  try {
    // 获取所有用户列表（不含密码）
    const users = await env.DB.prepare(`
      SELECT
        u.id, u.username, u.is_admin, u.created_at,
        COUNT(r.id) as record_count,
        SUM(CASE WHEN c.is_income = 1 THEN r.amount ELSE 0 END) as total_income,
        SUM(CASE WHEN c.is_income = 0 THEN r.amount ELSE 0 END) as total_expense
      FROM users u
      LEFT JOIN records r ON u.id = r.user_id
      LEFT JOIN categories c ON r.category_id = c.id
      GROUP BY u.id, u.username, u.is_admin, u.created_at
      ORDER BY u.created_at DESC
    `).all();

    return new Response(JSON.stringify({ code: 200, data: users.results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ code: 500, message: '获取用户列表失败', error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
