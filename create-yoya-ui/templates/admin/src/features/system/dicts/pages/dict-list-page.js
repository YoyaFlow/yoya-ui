import { toast, vDialog, vTable, vstack } from '@yoyaflow/yoya-ui';
import { RowActionButton } from '../../../../shared/ui.buttons.js';
import DictsPageState from '../api/dict.state.js';
import { DictEditorDialog } from '../components/dict-editor-dialog.js';
import { statusText } from '../utils/options.js';

export function DictListPage() {
  const state = new DictsPageState();
  const editorDialog = DictEditorDialog({ state, onSubmit: saveType });
  const confirmDialog = vDialog();
  let typesBody = null;

  state.subscribe(render);
  state.loadTypes();

  function render() {
    renderTypes();
  }

  function renderTypes() {
    if (!typesBody) {
      return;
    }
    typesBody.children().forEach((child) => child.destroy());
    state.types().forEach((type) => {
      typesBody.vTr((row) => {
        row.vTd(type.name);
        row.vTd(type.code);
        row.vTd(statusText[type.status] ?? type.status);
        row.vTd(type.remark || '—');
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
    });
  }

  function askRemoveType(type) {
    confirmDialog.content((content) => {
      content.p(`确定删除字典「${type.name}」及其所有字典值？`);
      content.hstack({ gap: '8px' }, (row) => {
        row.spacer();
        row.vButton('取消', (btn) => btn.on('click', () => confirmDialog.close()));
        row.vButton('删除', (btn) => {
          btn.variant('danger');
          btn.on('click', async () => {
            confirmDialog.close();
            await state.removeType(type.id);
            toast.success(`已删除 ${type.name}`);
          });
        });
      });
    });
    confirmDialog.open(true);
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
                hint.text('点击「编辑」可在弹窗中维护基本信息与字典值');
              });
            });
          });
          card.vCardBody((body) => {
            body.child(
              vTable((table) => {
                table.vThead((head) => {
                  head.vTr((row) => {
                    row.vTh('名称');
                    row.vTh('编码');
                    row.vTh('状态');
                    row.vTh('备注');
                    row.vTh('操作');
                  });
                });
                table.vTbody((bodyNode) => {
                  typesBody = bodyNode;
                  renderTypes();
                });
              })
            );
          });
        });
        stack.child(editorDialog);
        stack.child(confirmDialog);
      });
    },
    refresh() {
      return state.loadTypes();
    }
  };
}
