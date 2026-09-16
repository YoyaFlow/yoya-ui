import { vDialog } from '@yoyaflow/yoya-ui';
import { fieldValue } from '../../../../shared/state.rows.js';
import { statusOptions } from '../utils/options.js';

const rowStyle = {
  alignItems: 'center',
  display: 'grid',
  gap: '12px',
  gridTemplateColumns: '88px minmax(0, 1fr)',
  minWidth: '0'
};

export function DictItemFormDialog({ onSubmit }) {
  const dialog = vDialog();
  let editingId = null;

  function open(item = null) {
    editingId = item?.id ?? null;
    const label = fieldValue(item?.label) ?? '';
    const value = fieldValue(item?.value) ?? '';
    const sort = fieldValue(item?.sort) ?? 0;
    const status = fieldValue(item?.status) ?? 'active';
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
        form.vFormItem((field) => {
          field.styles(rowStyle);
          field.label('标签').name('label').required({ message: '请填写标签' });
          field.control((editor) => editor.vInput({ name: 'label', value: label }));
        });
        form.vFormItem((field) => {
          field.styles(rowStyle);
          field.label('值').name('value').required({ message: '请填写值' });
          field.control((editor) => editor.vInput({ name: 'value', value }));
        });
        form.vFormItem((field) => {
          field.styles(rowStyle);
          field.label('排序').name('sort');
          field.control((editor) => editor.vInput({ name: 'sort', value: String(sort) }));
        });
        form.vFormItem((field) => {
          field.styles(rowStyle);
          field.label('状态').name('status');
          field.control((editor) =>
            editor.vSelect({
              name: 'status',
              options: statusOptions,
              value: status
            })
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
