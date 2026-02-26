export async function onRequestGet(context) {
  const { request, env, data } = context;
  const userId = data.user.id;
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7); // 格式YYYY-MM

  try {
    // 1. 月度收支总览
    const totalResult = await env.DB.prepare(`
      SELECT
        SUM(CASE WHEN c.is_income = 1 THEN r.amount ELSE 0 END) as total_income,
        SUM(CASE WHEN c.is_income = 0 THEN r.amount ELSE 0 END) as total_expense
      FROM records r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.user_id = ? AND strftime('%Y-%m', r.record_date) = ?
    `).bind(userId, month).first();

    // 2. 支出分类统计
    const expenseCategoryStats = await env.DB.prepare(`
      SELECT c.name, SUM(r.amount) as total_amount
      FROM records r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.user_id = ? AND strftime('%Y-%m', r.record_date) = ? AND c.is_income = 0
      GROUP BY c.id, c.name
      ORDER BY total_amount DESC
    `).bind(userId, month).all();

    // 3. 收入分类统计
    const incomeCategoryStats = await env.DB.prepare(`
      SELECT c.name, SUM(r.amount) as total_amount
      FROM records r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.user_id = ? AND strftime('%Y-%m', r.record_date) = ? AND c.is_income = 1
      GROUP BY c.id, c.name
      ORDER BY total_amount DESC
    `).bind(userId, month).all();

    // 4. 每日收支趋势
    const dailyTrend = await env.DB.prepare(`
      SELECT
        r.record_date,
        SUM(CASE WHEN c.is_income = 1 THEN r.amount ELSE 0 END) as daily_income,
        SUM(CASE WHEN c.is_income = 0 THEN r.amount ELSE 0 END) as daily_expense
      FROM records r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.user_id = ? AND strftime('%Y-%m', r.record_date) = ?
      GROUP BY r.record_date
      ORDER BY r.record_date ASC
    `).bind(userId, month).all();

    return new Response(JSON.stringify({
      code: 200,
      data: {
        month,
        total_income: totalResult.total_income || 0,
        total_expense: totalResult.total_expense || 0,
        balance: (totalResult.total_income || 0) - (totalResult.total_expense || 0),
        expense_category_stats: expenseCategoryStats.results,
        income_category_stats: incomeCategoryStats.results,
        daily_trend: dailyTrend.results
      }
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ code: 500, message: '获取统计数据失败', error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
