// 角色演示用内存 mock（接入真实后端后删除本文件）。
import { mockRequest } from '../../../../api/domain.api.js';

let roles = [
  { id: 1, name: '超级管理员', code: 'super_admin', description: '拥有全部权限', status: 'active', sort: 1 },
  { id: 2, name: '管理员', code: 'admin', description: '后台管理操作', status: 'active', sort: 2 },
  { id: 3, name: '运维', code: 'ops', description: '运维与部署', status: 'active', sort: 3 },
  { id: 4, name: '审计员', code: 'auditor', description: '只读审计', status: 'disabled', sort: 4 },
  { id: 5, name: '访客', code: 'guest', description: '只读访客', status: 'active', sort: 5 },
  { id: 6, name: '开发者', code: 'developer', description: '开发调试', status: 'active', sort: 6 },
  { id: 7, name: '测试', code: 'qa', description: '测试执行', status: 'disabled', sort: 7 },
  { id: 8, name: '客服', code: 'support', description: '客户支持', status: 'active', sort: 8 },
  { id: 9, name: '财务', code: 'finance', description: '财务操作', status: 'active', sort: 9 },
  { id: 10, name: '人事', code: 'hr', description: '人事管理', status: 'active', sort: 10 },
  { id: 11, name: '安全', code: 'security', description: '安全审计', status: 'disabled', sort: 11 },
  { id: 12, name: '数据', code: 'analyst', description: '数据分析', status: 'active', sort: 12 }
];

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

function filterRoles({ keyword = '', status = '' } = {}) {
  const text = String(keyword).trim().toLowerCase();
  return roles.filter((role) => {
    const matchKeyword =
      !text ||
      role.name.toLowerCase().includes(text) ||
      role.code.toLowerCase().includes(text);
    const matchStatus = !status || role.status === status;
    return matchKeyword && matchStatus;
  });
}

mockRequest('GET', '/roles', async (req) => {
  await delay();
  const { page = 1, pageSize = 10 } = req.params();
  const filtered = filterRoles(req.params());
  const start = (page - 1) * pageSize;
  return {
    ok: true,
    code: '0',
    data: filtered.slice(start, start + pageSize),
    pageNum: page,
    pageSize,
    total: filtered.length
  };
});

mockRequest('POST', '/roles', async (req) => {
  await delay();
  const role = { id: Math.max(0, ...roles.map((item) => item.id)) + 1, ...req.body() };
  roles = [role, ...roles];
  return { ok: true, code: '0', data: role };
});

mockRequest('PUT', /^\/roles\/\d+$/, async (req) => {
  await delay();
  const id = Number(req.address().split('/').pop());
  const role = { ...roles.find((item) => item.id === id), ...req.body(), id };
  roles = roles.map((item) => (item.id === id ? role : item));
  return { ok: true, code: '0', data: role };
});

mockRequest('DELETE', /^\/roles\/\d+$/, async (req) => {
  await delay();
  const id = Number(req.address().split('/').pop());
  roles = roles.filter((item) => item.id !== id);
  return { ok: true, code: '0', data: null };
});
