import { vDialog } from '@yoyaflow/yoya-ui';
import { statusOptions } from '../utils/options.js';

const rowStyle = {
  alignItems: 'center',
  display: 'grid',
  gap: '12px',
  gridTemplateColumns: '88px minmax(0, 1fr)',
  minWidth: '0'
};

export function RoleFormDialog({ onSubmit }) {
  const dialog = vDialog();
  let editingId = null;

  function open(role = null) {
    editingId = role?.id ?? null;
    dialog.content((content) => {
      content.vForm((form) => {
        form.styles({
          border: '1px solid var(--yoya-color-border, #d8dee8)',
          borderRadius: '8px',
          display: 'grid',
          gap: '16px',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          padding: '16px'
        });
        form.vFormItem((item) => {
          item.styles(rowStyle);
          item.label('名称').name('name').required({ message: '请填写名称' });
          item.control((editor) => editor.vInput({ name: 'name', value: role?.name ?? '' }));
        });
        form.vFormItem((item) => {
          item.styles(rowStyle);
          item.label('角色标识').name('code').required({ message: '请填写角色标识' });
          item.control((editor) => editor.vInput({ name: 'code', value: role?.code ?? '' }));
        });
        form.vFormItem((item) => {
          item.styles(rowStyle);
          item.label('描述').name('description');
          item.control((editor) =>
            editor.vInput({ name: 'description', value: role?.description ?? '' })
          );
        });
        form.vFormItem((item) => {
          item.styles(rowStyle);
          item.label('状态').name('status');
          item.control((editor) =>
            editor.vSelect({ name: 'status', options: statusOptions, value: role?.status ?? 'active' })
          );
        });
        form.vFormItem((item) => {
          item.styles(rowStyle);
          item.label('排序').name('sort');
          item.control((editor) =>
            editor.vInput({ name: 'sort', value: String(role?.sort ?? 0) })
          );
        });
        form.vButton('保存', (btn) => {
          btn.variant('primary');
          btn.style({ gridColumn: '1 / -1', justifySelf: 'end', marginTop: '16px' });
          btn.on('click', () => save(form));
        });
      });
    });
    dialog.open(true);
  }

  async function save(form) {
    if (!form.validate()) {
      return;
    }
    await onSubmit(editingId, form.values());
    dialog.close();
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
