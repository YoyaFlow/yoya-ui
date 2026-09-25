// 演示用内存 mock（接入真实后端后删除本文件）。
import { mockRequest } from '../../../../api/domain.api.js';

let members = [
  { id: 1, name: '张伟', email: 'zhangwei@example.com', role: 'admin', status: 'active' },
  { id: 2, name: '李娜', email: 'lina@example.com', role: 'editor', status: 'active' },
  { id: 3, name: '王强', email: 'wangqiang@example.com', role: 'viewer', status: 'disabled' },
  { id: 4, name: '赵敏', email: 'zhaomin@example.com', role: 'editor', status: 'active' },
  { id: 5, name: '刘洋', email: 'liuyang@example.com', role: 'viewer', status: 'active' },
  { id: 6, name: '陈静', email: 'chenjing@example.com', role: 'editor', status: 'disabled' },
  { id: 7, name: '杨帆', email: 'yangfan@example.com', role: 'admin', status: 'active' },
  { id: 8, name: '黄磊', email: 'huanglei@example.com', role: 'viewer', status: 'active' },
  { id: 9, name: '周婷', email: 'zhouting@example.com', role: 'editor', status: 'active' },
  { id: 10, name: '吴迪', email: 'wudi@example.com', role: 'viewer', status: 'disabled' },
  { id: 11, name: '徐静', email: 'xujing@example.com', role: 'editor', status: 'active' },
  { id: 12, name: '孙鹏', email: 'sunpeng@example.com', role: 'admin', status: 'active' },
  { id: 13, name: '马丽', email: 'mali@example.com', role: 'viewer', status: 'active' }
];

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

function filterMembers({ keyword = '', status = '' } = {}) {
  const text = String(keyword).trim().toLowerCase();
  return members.filter((member) => {
    const matchKeyword =
      !text ||
      member.name.toLowerCase().includes(text) ||
      member.email.toLowerCase().includes(text);
    const matchStatus = !status || member.status === status;
    return matchKeyword && matchStatus;
  });
}

mockRequest('GET', '/members', async (req) => {
  await delay();
  const { page = 1, pageSize = 5 } = req.params();
  const filtered = filterMembers(req.params());
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

mockRequest('GET', '/members/available', async () => {
  await delay();
  return { ok: true, code: '0', data: members.filter((member) => member.status === 'active') };
});

mockRequest('POST', '/members', async (req) => {
  await delay();
  const member = { id: Math.max(0, ...members.map((item) => item.id)) + 1, ...req.body() };
  members = [member, ...members];
  return { ok: true, code: '0', data: member };
});

mockRequest('PUT', /^\/members\/\d+$/, async (req) => {
  await delay();
  const id = Number(req.address().split('/').pop());
  const member = { ...members.find((item) => item.id === id), ...req.body(), id };
  members = members.map((item) => (item.id === id ? member : item));
  return { ok: true, code: '0', data: member };
});

mockRequest('DELETE', /^\/members\/\d+$/, async (req) => {
  await delay();
  const id = Number(req.address().split('/').pop());
  members = members.filter((item) => item.id !== id);
  return { ok: true, code: '0', data: null };
});
