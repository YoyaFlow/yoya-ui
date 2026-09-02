import { toast, vPagination, vstack } from '@yoyaflow/yoya-ui';
import MembersPageState from '../api/member.state.js';
import { MemberToolbar } from '../components/member-toolbar.js';
import { MemberTable } from '../components/member-table.js';
import { MemberFormDialog } from '../components/member-form-dialog.js';

// 页面只做编排：组合工具栏、表格、弹窗与分页，逻辑在组件 / service / state 中
export function MemberListPage() {
  const state = new MembersPageState();
  const dialog = MemberFormDialog({ onSubmit: saveMember });
  const toolbar = MemberToolbar({ onSearch: applyFilters, onAdd: () => dialog.open(null) });
  const table = MemberTable({
    rows: () => state.items(),
    onEdit: (member) => dialog.open(member),
    onRemove: removeMemberAction
  });
  const pagination = vPagination({
    pageSize: 5,
    pageSizes: [5, 10, 20],
    onChange({ page: nextPage, pageSize: nextSize }) {
      state.setPage(nextPage);
      state.setPageSize(nextSize);
      state.load();
    }
  });

  state.subscribe(() => {
    table.refresh();
    syncPagination();
  });
  state.load();

  function syncPagination() {
    pagination.update({
      page: state.page(),
      pageSize: state.pageSize(),
      total: state.total(),
      totalPages: Math.max(1, Math.ceil(state.total() / state.pageSize()))
    });
  }

  function applyFilters(values) {
    state.setKeyword(values.keyword ?? '');
    state.setStatus(values.status ?? '');
    state.setPage(1);
    state.load();
  }

  async function removeMemberAction(member) {
    await state.remove(member.id);
    toast.success(`已删除 ${member.name}`);
  }

  async function saveMember(editingId, payload) {
    if (editingId === null) {
      await state.add(payload);
      toast.success('已创建成员');
    } else {
      await state.edit(editingId, payload);
      toast.success('已更新成员');
    }
  }

  return {
    render() {
      return vstack({ gap: '16px' }, (stack) => {
        stack.h2('成员管理');
        stack.vCard((card) => {
          card.vCardHeader('成员列表');
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
    },
    refresh() {
      return state.load();
    }
  };
}
