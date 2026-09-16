import { computed, toast, vConfirm, vPagination, vText, vTr, vstack } from '@yoyaflow/yoya-ui';
import { RowActionButton } from '../../../../shared/ui.buttons.js';
import DictsPageState from '../api/dict.state.js';
import { DictEditorDialog } from '../components/dict-editor-dialog.js';
import { statusText } from '../utils/options.js';

export function DictListPage() {
  const state = new DictsPageState();
  const editorDialog = DictEditorDialog({ state, onSubmit: saveType });
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
    await state.loadTypes();
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

  async function askRemoveType(type) {
    const ok = await vConfirm({
      title: '删除字典',
      content: `确定删除字典「${type.name.value}」及其所有字典值？`,
      danger: true,
      confirmText: '删除'
    });
    if (!ok) {
      return;
    }
    await state.removeType(type.id);
    toast.success(`已删除 ${type.name.value}`);
  }

  async function saveType(editingId, payload) {
    if (editingId === null) {
      await state.addType(payload);
      toast.success('已新增字典');
    } else {
      await state.editType(editingId, payload);
      toast.success('已更新字典');
    }
  }

  function buildTypeRow(type) {
    return vTr((row) => {
      row.vTd(vText(type.name));
      row.vTd(vText(type.code));
      row.vTd(vText(computed(() => statusText[type.status.value] ?? type.status.value)));
      row.vTd(vText(computed(() => type.remark.value || '—')));
      row.vTd((cell) => {
        cell.hstack({ gap: '8px' }, (actions) => {
          actions.child(
            RowActionButton('编辑', (btn) => btn.on('click', () => editorDialog.open(type)))
          );
          actions.child(
            RowActionButton('删除', (btn) => {
              btn.variant('danger');
              btn.on('click', () => askRemoveType(type));
            })
          );
        });
      });
    });
  }

  return {
    render() {
      return vstack({ gap: '16px' }, (stack) => {
        stack.h2('字典管理');
        stack.vCard((card) => {
          card.vCardHeader((header) => {
            header.hstack({ alignItems: 'center', gap: '10px' }, (toolbar) => {
              toolbar.vButton('新增字典', (btn) => {
                btn.variant('primary');
                btn.on('click', () => editorDialog.open(null));
              });
              toolbar.spacer();
              toolbar.span((hint) => {
                hint.style('color', 'var(--yoya-color-text-muted, #64748b)');
                hint.child('点击「编辑」可在弹窗中维护基本信息与字典值');
              });
            });
          });
          card.vCardBody((body) => {
            body.vstack({ gap: '12px' }, (content) => {
              content.vTable((table) => {
                table.vThead((head) => {
                  head.vTr((row) => {
                    row.vTh('名称');
                    row.vTh('编码');
                    row.vTh('状态');
                    row.vTh('备注');
                    row.vTh('操作');
                  });
                });
                table.vTbody((tbody) => {
                  tbody.keyed(
                    state.types,
                    (type) => type.id,
                    (type) => buildTypeRow(type)
                  );
                });
              });
              content.child(pagination);
            });
          });
        });
        stack.child(editorDialog);
      });
    },
    refresh() {
      return load();
    }
  };
}
