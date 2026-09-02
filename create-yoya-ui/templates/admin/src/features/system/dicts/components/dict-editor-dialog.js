import { toast, vDialog, vTable } from '@yoyaflow/yoya-ui';
import { RowActionButton } from '../../../../shared/ui.buttons.js';
import { DictItemFormDialog } from './dict-item-form-dialog.js';
import { statusOptions, statusText } from '../utils/options.js';

const rowStyle = {
  alignItems: 'center',
  display: 'grid',
  gap: '12px',
  gridTemplateColumns: '88px minmax(0, 1fr)',
  minWidth: '0'
};

// 字典编辑弹窗：上半部分是字典基本信息表单，下半部分维护该字典的字典值表格。
export function DictEditorDialog({ state, onSubmit }) {
  const dialog = vDialog();
  const itemDialog = DictItemFormDialog({ onSubmit: saveItem });
  const confirmDialog = vDialog();
  let editingId = null;
  let itemsBody = null;
  let itemsCountText = null;
  let addItemButton = null;
  let form = null;

  dialog.style('maxWidth', 'min(92vw, 880px)');

  function open(type = null) {
    editingId = type?.id ?? null;
    state.selectType(editingId).then(() => renderItems());

    dialog.content((content) => {
      content.vstack({ gap: '16px' }, (stack) => {
        stack.h3(type ? `编辑字典「${type.name}」` : '新增字典');

        stack.vForm((editor) => {
          form = editor;
          editor.styles({
            border: '1px solid var(--yoya-color-border, #d8dee8)',
            borderRadius: '8px',
            display: 'grid',
            gap: '16px',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            padding: '16px'
          });
          editor.vFormItem((item) => {
            item.styles(rowStyle);
            item.label('名称').name('name').required({ message: '请填写名称' });
            item.control((control) => control.vInput({ name: 'name', value: type?.name ?? '' }));
          });
          editor.vFormItem((item) => {
            item.styles(rowStyle);
            item.label('编码').name('code').required({ message: '请填写编码' });
            item.control((control) => control.vInput({ name: 'code', value: type?.code ?? '' }));
          });
          editor.vFormItem((item) => {
            item.styles(rowStyle);
            item.label('状态').name('status');
            item.control((control) =>
              control.vSelect({
                name: 'status',
                options: statusOptions,
                value: type?.status ?? 'active'
              })
            );
          });
          editor.vFormItem((item) => {
            item.styles(rowStyle);
            item.label('备注').name('remark');
            item.control((control) =>
              control.vInput({ name: 'remark', value: type?.remark ?? '' })
            );
          });
        });

        stack.section((section) => {
          section.vstack({ gap: '10px' }, (items) => {
            items.hstack({ alignItems: 'center', gap: '10px' }, (toolbar) => {
              toolbar.vButton('新增字典值', (btn) => {
                addItemButton = btn;
                btn.variant('primary');
                btn.disabled(editingId === null);
                btn.on('click', () => itemDialog.open(null));
              });
              toolbar.spacer();
              toolbar.span((count) => {
                count.style('color', 'var(--yoya-color-text-muted, #64748b)');
                itemsCountText = count;
                syncItemsCount();
              });
            });
            items.p((hint) => {
              hint.style('color', 'var(--yoya-color-text-muted, #64748b)');
              hint.text(
                editingId === null ? '保存字典类型后即可添加字典值。' : '维护当前字典的字典值。'
              );
            });
            items.child(
              vTable((table) => {
                table.vThead((head) => {
                  head.vTr((row) => {
                    row.vTh('标签');
                    row.vTh('值');
                    row.vTh('排序');
                    row.vTh('状态');
                    row.vTh('操作');
                  });
                });
                table.vTbody((body) => {
                  itemsBody = body;
                  renderItems();
                });
              })
            );
          });
        });

        stack.hstack({ gap: '10px', justifyContent: 'flex-end' }, (footer) => {
          footer.vButton('取消', (btn) => btn.on('click', () => dialog.close()));
          footer.vButton('保存', (btn) => {
            btn.variant('primary');
            btn.on('click', () => save());
          });
        });

        stack.child(itemDialog);
        stack.child(confirmDialog);
      });
    });

    dialog.open(true);
  }

  function renderItems() {
    if (!itemsBody) {
      return;
    }
    itemsBody.children().forEach((child) => child.destroy());
    state.items().forEach((item) => {
      itemsBody.vTr((row) => {
        row.vTd(item.label);
        row.vTd(item.value);
        row.vTd(String(item.sort));
        row.vTd(statusText[item.status] ?? item.status);
        row.vTd((cell) => {
          cell.hstack({ gap: '8px' }, (actions) => {
            actions.child(
              RowActionButton('编辑', (btn) => btn.on('click', () => itemDialog.open(item)))
            );
            actions.child(
              RowActionButton('删除', (btn) => {
                btn.variant('danger');
                btn.on('click', () => askRemoveItem(item));
              })
            );
          });
        });
      });
    });
    syncItemsCount();
  }

  function syncItemsCount() {
    if (itemsCountText) {
      itemsCountText.textContent(`共 ${state.items().length} 条`);
    }
    if (addItemButton) {
      addItemButton.disabled(editingId === null);
    }
  }

  function askRemoveItem(item) {
    confirmDialog.content((content) => {
      content.p(`确定删除字典值「${item.label}」？`);
      content.hstack({ gap: '8px' }, (row) => {
        row.spacer();
        row.vButton('取消', (btn) => btn.on('click', () => confirmDialog.close()));
        row.vButton('删除', (btn) => {
          btn.variant('danger');
          btn.on('click', async () => {
            confirmDialog.close();
            await state.removeItem(item.id);
            toast.success(`已删除 ${item.label}`);
            renderItems();
          });
        });
      });
    });
    confirmDialog.open(true);
  }

  async function saveItem(itemId, payload) {
    if (itemId === null) {
      await state.addItem(payload);
      toast.success('已新增字典值');
    } else {
      await state.editItem(itemId, payload);
      toast.success('已更新字典值');
    }
    renderItems();
  }

  function save() {
    if (!form.validate()) {
      return;
    }
    onSubmit(editingId, form.values()).then(() => dialog.close());
  }

  return {
    render() {
      return dialog;
    },
    open,
    close() {
      dialog.close();
    }
  };
}
