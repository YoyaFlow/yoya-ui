// 字典演示用内存 mock（接入真实后端后删除本文件）。
import { mockRequest } from '../../../../api/domain.api.js';

let types = [
  { id: 1, name: '性别', code: 'gender', status: 'active', remark: '性别字典' },
  { id: 2, name: '通用状态', code: 'common_status', status: 'active', remark: '通用启停状态' },
  { id: 3, name: '通知类型', code: 'notice_type', status: 'active', remark: '消息通知类型' }
];

let items = [
  { id: 11, typeId: 1, label: '男', value: 'male', sort: 1, status: 'active' },
  { id: 12, typeId: 1, label: '女', value: 'female', sort: 2, status: 'active' },
  { id: 21, typeId: 2, label: '启用', value: 'active', sort: 1, status: 'active' },
  { id: 22, typeId: 2, label: '禁用', value: 'disabled', sort: 2, status: 'active' },
  { id: 31, typeId: 3, label: '系统通知', value: 'system', sort: 1, status: 'active' },
  { id: 32, typeId: 3, label: '告警', value: 'alert', sort: 2, status: 'active' },
  { id: 33, typeId: 3, label: '私信', value: 'message', sort: 3, status: 'disabled' }
];

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

mockRequest('GET', '/dicts/types', async () => {
  await delay();
  return { ok: true, code: '0', data: types.slice() };
});

mockRequest('POST', '/dicts/types', async (req) => {
  await delay();
  const type = { id: Math.max(0, ...types.map((item) => item.id)) + 1, ...req.body() };
  types = [...types, type];
  return { ok: true, code: '0', data: type };
});

mockRequest('PUT', /^\/dicts\/types\/\d+$/, async (req) => {
  await delay();
  const id = Number(req.address().split('/').pop());
  const type = { ...types.find((item) => item.id === id), ...req.body(), id };
  types = types.map((item) => (item.id === id ? type : item));
  return { ok: true, code: '0', data: type };
});

mockRequest('DELETE', /^\/dicts\/types\/\d+$/, async (req) => {
  await delay();
  const id = Number(req.address().split('/').pop());
  types = types.filter((item) => item.id !== id);
  items = items.filter((item) => item.typeId !== id);
  return { ok: true, code: '0', data: null };
});

mockRequest('GET', /^\/dicts\/types\/\d+\/items$/, async (req) => {
  await delay();
  const typeId = Number(req.address().split('/')[3]);
  return {
    ok: true,
    code: '0',
    data: items.filter((item) => item.typeId === typeId).sort((a, b) => a.sort - b.sort)
  };
});

mockRequest('POST', /^\/dicts\/types\/\d+\/items$/, async (req) => {
  await delay();
  const typeId = Number(req.address().split('/')[3]);
  const item = { id: Math.max(0, ...items.map((entry) => entry.id)) + 1, typeId, ...req.body() };
  items = [...items, item];
  return { ok: true, code: '0', data: item };
});

mockRequest('PUT', /^\/dicts\/items\/\d+$/, async (req) => {
  await delay();
  const id = Number(req.address().split('/').pop());
  const item = { ...items.find((entry) => entry.id === id), ...req.body(), id };
  items = items.map((entry) => (entry.id === id ? item : entry));
  return { ok: true, code: '0', data: item };
});

mockRequest('DELETE', /^\/dicts\/items\/\d+$/, async (req) => {
  await delay();
  const id = Number(req.address().split('/').pop());
  items = items.filter((entry) => entry.id !== id);
  return { ok: true, code: '0', data: null };
});
