import { toast, vConfirm, vPagination, vstack } from '@yoyaflow/yoya-ui';
import RolesPageState from '../api/role.state.js';
import { RoleToolbar } from '../components/role-toolbar.js';
import { RoleTable } from '../components/role-table.js';
import { RoleFormDialog } from '../components/role-form-dialog.js';

export function RoleListPage() {
  const state = new RolesPageState();
  const dialog = RoleFormDialog({ onSubmit: saveRole });
  const toolbar = RoleToolbar({ onSearch: applyFilters, onAdd: () => dialog.open(null) });
  const table = RoleTable({
    rows: state.items,
    onEdit: (role) => dialog.open(role),
    onRemove: askRemove
  });
  const pagination = vPagination({
    pageSize: 10,
    pageSizes: [10, 20, 50],
    onChange({ page: nextPage, pageSize: nextSize }) {
      state.setPage(nextPage);
      state.setPageSize(nextSize);
      load();
    }
  });

  load();

  // vPagination 是命令式组件（不是信号感知的）：数据到位后由动作同步一次
  async function load() {
    await state.load();
    syncPagination();
  }

  function syncPagination() {
    const total = state.total.value;
    const pageSize = state.pageSize.value;
    pagination.update({
      page: state.page.value,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    });
  }

  function applyFilters(values) {
    state.setKeyword(values.keyword ?? '');
    state.setStatus(values.status ?? '');
    state.setPage(1);
    load();
  }

  async function askRemove(role) {
    const ok = await vConfirm({
      title: '删除角色',
      content: `确定删除角色「${role.name.value}」？`,
      danger: true,
      confirmText: '删除'
    });
    if (!ok) {
      return;
    }
    await state.remove(role.id);
    toast.success(`已删除 ${role.name.value}`);
  }

  async function saveRole(editingId, payload) {
    if (editingId === null) {
      await state.add(payload);
      toast.success('已新增角色');
    } else {
      await state.edit(editingId, payload);
      toast.success('已更新角色');
    }
  }

  // 页面也是组件：没有对外命令方法 → 形态 A 薄工厂，直接返回视图节点
  return vstack({ gap: '16px' }, (stack) => {
    stack.h2('角色管理');
    stack.vCard((card) => {
      card.vCardHeader('角色列表');
      card.vCardBody((body) => {
        body.vstack({ gap: '12px' }, (content) => {
          content.child(toolbar);
          content.child(table);
          content.child(pagination);
        });
      });
    });
    stack.child(dialog);
  });
}
