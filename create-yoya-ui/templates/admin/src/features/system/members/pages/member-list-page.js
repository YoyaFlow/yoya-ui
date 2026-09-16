import { toast, vPagination, vstack } from '@yoyaflow/yoya-ui';
import MembersPageState from '../api/member.state.js';
import { MemberToolbar } from '../components/member-toolbar.js';
import { MemberTable } from '../components/member-table.js';
import { MemberFormDialog } from '../components/member-form-dialog.js';

// 页面只做编排：状态用 ref 持有视图字段，表格绑句柄后写入即刷新，不需要订阅接线。
export function MemberListPage() {
  const state = new MembersPageState();
  const dialog = MemberFormDialog({ onSubmit: saveMember });
  const toolbar = MemberToolbar({ onSearch: applyFilters, onAdd: () => dialog.open(null) });
  const table = MemberTable({
    rows: state.items,
    onEdit: (member) => dialog.open(member),
    onRemove: removeMemberAction
  });
  const pagination = vPagination({
    pageSize: 5,
    pageSizes: [5, 10, 20],
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

  async function removeMemberAction(member) {
    await state.remove(member.id);
    toast.success(`已删除 ${member.name.value}`);
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
    // 页面也是组件：父级 / 路由可以调用实例方法刷新
    refresh() {
      return load();
    }
  };
}
