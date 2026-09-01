import { vDialog } from '@yoyaflow/yoya-ui';
import { roleOptions, statusOptions } from '../utils/options.js';

const rowStyle = {
  alignItems: 'center',
  display: 'grid',
  gap: '12px',
  gridTemplateColumns: '88px minmax(0, 1fr)',
  minWidth: '0'
};

export function MemberFormDialog({ onSubmit }) {
  const dialog = vDialog();
  let editingId = null;

  function buildFormFields(form, member) {
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
      item.label('姓名').name('name').required({ message: '请填写姓名' });
      item.control((editor) => editor.vInput({ name: 'name', value: member?.name ?? '' }));
    });
    form.vFormItem((item) => {
      item.styles(rowStyle);
      item.label('邮箱').name('email').required({ message: '请填写邮箱' });
      item.control((editor) => editor.vInput({ name: 'email', value: member?.email ?? '' }));
    });
    form.vFormItem((item) => {
      item.styles(rowStyle);
      item.label('角色').name('role');
      item.control((editor) =>
        editor.vSelect({ name: 'role', options: roleOptions, value: member?.role ?? 'viewer' })
      );
    });
    form.vFormItem((item) => {
      item.styles(rowStyle);
      item.label('状态').name('status');
      item.control((editor) =>
        editor.vSelect({ name: 'status', options: statusOptions, value: member?.status ?? 'active' })
      );
    });
  }

  function open(member = null) {
    editingId = member?.id ?? null;
    dialog.content((content) => {
      content.vForm((form) => {
        buildFormFields(form, member);
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
