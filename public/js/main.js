import { checkAuth } from './auth.js';
import { categoryAPI, recordAPI } from './api.js';

// 全局变量
let currentUser = null;
let categories = [];
let currentPage = 1;
let pageSize = 20;
let filterParams = {};
let currentMonth = new Date().toISOString().slice(0, 7);
let expenseChart = null;
let trendChart = null;

// 页面初始化
window.addEventListener('DOMContentLoaded', async () => {
  // 检查登录
  currentUser = await checkAuth();
  if (!currentUser) return;

  // 显示用户名
  document.getElementById('userName').textContent = `你好，${currentUser.username}`;

  // 初始化日期
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('recordDate').value = today;
  document.getElementById('monthSelect').value = currentMonth;
  document.getElementById('endDate').value = today;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  document.getElementById('startDate').value = startDate.toISOString().split('T')[0];

  // 加载分类
  await loadCategories();

  // 加载统计数据
  await loadStats();

  // 加载记录列表
  await loadRecords();

  // 绑定事件
  bindEvents();
});

// 绑定事件
function bindEvents() {
  // 记录类型切换，更新分类选项
  document.getElementById('recordType').addEventListener('change', updateCategoryOptions);

  // 月份切换
  document.getElementById('monthSelect').addEventListener('change', async (e) => {
    currentMonth = e.target.value;
    await loadStats();
  });

  // 记录表单提交
  document.getElementById('recordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = document.getElementById('recordType').value;
    const category_id = document.getElementById('categorySelect').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const description = document.getElementById('description').value;
    const record_date = document.getElementById('recordDate').value;

    if (amount <= 0) {
      alert('金额必须大于0');
      return;
    }

    try {
      await recordAPI.add({
        amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
        category_id,
        description,
        record_date
      });
      alert('添加成功');
      document.getElementById('recordForm').reset();
      document.getElementById('recordDate').value = new Date().toISOString().split('T')[0];
      await loadStats();
      await loadRecords();
    } catch (err) {
      console.error(err);
    }
  });

  // 查询按钮
  document.getElementById('searchBtn').addEventListener('click', async () => {
    filterParams = {
      startDate: document.getElementById('startDate').value,
      endDate: document.getElementById('endDate').value,
      type: document.getElementById('filterType').value,
      categoryId: document.getElementById('filterCategory').value,
    };
    currentPage = 1;
    await loadRecords();
  });

  // 重置按钮
  document.getElementById('resetBtn').addEventListener('click', async () => {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('filterType').value = '';
    document.getElementById('filterCategory').value = '';
    filterParams = {};
    currentPage = 1;
    await loadRecords();
  });

  // 分页
  document.getElementById('prevPage').addEventListener('click', async () => {
    if (currentPage > 1) {
      currentPage--;
      await loadRecords();
    }
  });

  document.getElementById('nextPage').addEventListener('click', async () => {
    const totalPage = Math.ceil(totalRecords / pageSize);
    if (currentPage < totalPage) {
      currentPage++;
      await loadRecords();
    }
  });
}

// 加载分类
async function loadCategories() {
  try {
    const res = await categoryAPI.getList();
    categories = res.data;
    updateCategoryOptions();
    updateFilterCategoryOptions();
  } catch (err) {
    console.error(err);
  }
}

// 更新新增记录的分类选项
function updateCategoryOptions() {
  const type = document.getElementById('recordType').value;
  const isIncome = type === 'income';
  const filteredCategories = categories.filter(c => c.is_income === isIncome);
  const select = document.getElementById('categorySelect');

  select.innerHTML = '';
  filteredCategories.forEach(c => {
    const option = document.createElement('option');
    option.value = c.id;
    option.textContent = c.name;
    select.appendChild(option);
  });
}

// 更新筛选分类选项
function updateFilterCategoryOptions() {
  const select = document.getElementById('filterCategory');
  select.innerHTML = '<option value="">全部</option>';
  categories.forEach(c => {
    const option = document.createElement('option');
    option.value = c.id;
    option.textContent = c.name;
    select.appendChild(option);
  });
}

// 加载统计数据
async function loadStats() {
  try {
    const res = await recordAPI.getStats(currentMonth);
    const data = res.data;

    // 更新统计卡片
    document.getElementById('totalIncome').textContent = `¥${data.total_income.toFixed(2)}`;
    document.getElementById('totalExpense').textContent = `¥${data.total_expense.toFixed(2)}`;
    document.getElementById('balance').textContent = `¥${data.balance.toFixed(2)}`;

    // 渲染支出饼图
    renderExpenseChart(data.expense_category_stats);

    // 渲染趋势图
    renderTrendChart(data.daily_trend);
  } catch (err) {
    console.error(err);
  }
}

// 渲染支出饼图
function renderExpenseChart(expenseStats) {
  const ctx = document.getElementById('expenseChart').getContext('2d');

  if (expenseChart) {
    expenseChart.destroy();
  }

  const labels = expenseStats.map(item => item.name);
  const data = expenseStats.map(item => item.total_amount);
  const backgroundColors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e', '#64748b'
  ];

  expenseChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: backgroundColors.slice(0, labels.length),
        borderWidth: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(2);
              return `${context.label}: ¥${context.parsed.toFixed(2)} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// 渲染趋势图
function renderTrendChart(dailyTrend) {
  const ctx = document.getElementById('trendChart').getContext('2d');

  if (trendChart) {
    trendChart.destroy();
  }

  const labels = dailyTrend.map(item => item.record_date);
  const incomeData = dailyTrend.map(item => item.daily_income);
  const expenseData = dailyTrend.map(item => item.daily_expense);

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '收入',
          data: incomeData,
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22, 163, 74, 0.1)',
          tension: 0.3,
          fill: true,
        },
        {
          label: '支出',
          data: expenseData,
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220, 38, 38, 0.1)',
          tension: 0.3,
          fill: true,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        }
      },
      scales: {
        y: {
          beginAtZero: true,
        }
      }
    }
  });
}

// 全局记录总数
let totalRecords = 0;

// 加载记录列表
async function loadRecords() {
  try {
    const params = {
      page: currentPage,
      pageSize,
      ...filterParams
    };
    const res = await recordAPI.getList(params);
    const data = res.data;
    totalRecords = data.total;

    // 渲染列表
    const tbody = document.getElementById('recordList');
    tbody.innerHTML = '';

    if (data.records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:24px; color:#6b7280;">暂无记录</td></tr>';
      document.getElementById('pageInfo').textContent = '第1页 / 共0页';
      return;
    }

    data.records.forEach(record => {
      const tr = document.createElement('tr');
      const isIncome = record.is_income === 1;
      tr.innerHTML = `
        <td>${record.record_date}</td>
        <td><span style="color:${isIncome ? '#16a34a' : '#dc2626'}">${isIncome ? '收入' : '支出'}</span></td>
        <td>${record.category_name}</td>
        <td style="color:${isIncome ? '#16a34a' : '#dc2626'}; font-weight:500;">¥${Math.abs(record.amount).toFixed(2)}</td>
        <td>${record.description || '-'}</td>
        <td class="table-actions">
          <button class="btn btn-small btn-danger" onclick="deleteRecord(${record.id})">删除</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // 更新分页信息
    const totalPage = Math.ceil(totalRecords / pageSize);
    document.getElementById('pageInfo').textContent = `第${currentPage}页 / 共${totalPage}页`;
    document.getElementById('prevPage').disabled = currentPage <= 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPage;
  } catch (err) {
    console.error(err);
  }
}

// 删除记录
window.deleteRecord = async (id) => {
  if (!confirm('确定要删除这条记录吗？')) return;

  try {
    await recordAPI.delete(id);
    alert('删除成功');
    await loadStats();
    await loadRecords();
  } catch (err) {
    console.error(err);
  }
};
