// 权限演示用内存 mock（接入真实后端后删除本文件）。
import { mockRequest } from '../../../../api/domain.api.js';

let permissions = [
  { id: 1, parentId: null, name: '工作台', code: 'dashboard', type: 'menu', sort: 1 },
  { id: 11, parentId: 1, name: '数据概览', code: 'dashboard:overview', type: 'menu', sort: 1 },
  { id: 12, parentId: 1, name: '待办审批', code: 'dashboard:todos', type: 'menu', sort: 2 },
  { id: 2, parentId: null, name: '系统管理', code: 'system', type: 'menu', sort: 2 },
  { id: 21, parentId: 2, name: '成员管理', code: 'system:member', type: 'menu', sort: 1 },
  { id: 211, parentId: 21, name: '新增成员', code: 'system:member:create', type: 'button', sort: 1 },
  { id: 212, parentId: 21, name: '编辑成员', code: 'system:member:update', type: 'button', sort: 2 },
  { id: 213, parentId: 21, name: '删除成员', code: 'system:member:remove', type: 'button', sort: 3 },
  { id: 22, parentId: 2, name: '角色管理', code: 'system:role', type: 'menu', sort: 2 },
  { id: 23, parentId: 2, name: '权限管理', code: 'system:permission', type: 'menu', sort: 3 },
  { id: 24, parentId: 2, name: '字典管理', code: 'system:dict', type: 'menu', sort: 4 }
];

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

function buildTree(parentId = null) {
  return permissions
    .filter((permission) => (permission.parentId ?? null) === parentId)
    .sort((a, b) => a.sort - b.sort)
    .map((permission) => ({ ...permission, children: buildTree(permission.id) }));
}

function collectIds(id) {
  const ids = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    permissions.forEach((permission) => {
      if (ids.has(permission.parentId) && !ids.has(permission.id)) {
        ids.add(permission.id);
        changed = true;
      }
    });
  }
  return ids;
}

mockRequest('GET', '/permissions/tree', async () => {
  await delay();
  return { ok: true, code: '0', data: buildTree(null) };
});

mockRequest('POST', '/permissions', async (req) => {
  await delay();
  const permission = { id: Math.max(0, ...permissions.map((item) => item.id)) + 1, ...req.body() };
  permissions.push(permission);
  return { ok: true, code: '0', data: permission };
});

mockRequest('PUT', /^\/permissions\/\d+$/, async (req) => {
  await delay();
  const id = Number(req.address().split('/').pop());
  const permission = { ...permissions.find((item) => item.id === id), ...req.body(), id };
  permissions = permissions.map((item) => (item.id === id ? permission : item));
  return { ok: true, code: '0', data: permission };
});

mockRequest('DELETE', /^\/permissions\/\d+$/, async (req) => {
  await delay();
  const id = Number(req.address().split('/').pop());
  const ids = collectIds(id);
  permissions = permissions.filter((item) => !ids.has(item.id));
  return { ok: true, code: '0', data: null };
});
