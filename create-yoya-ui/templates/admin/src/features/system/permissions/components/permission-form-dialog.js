import { vDialog } from '@yoyaflow/yoya-ui';

const typeOptions = [
  ['menu', '菜单'],
  ['button', '按钮']
];

const rowStyle = {
  alignItems: 'center',
  display: 'grid',
  gap: '12px',
  gridTemplateColumns: '88px minmax(0, 1fr)',
  minWidth: '0'
};

export function PermissionFormDialog({ onSubmit }) {
  const dialog = vDialog();
  let editingId = null;
  let parentId = null;

  function open({ node = null, parentId: nextParentId = null, parentName = '' } = {}) {
    editingId = node?.id ?? null;
    parentId = nextParentId;
    dialog.content((content) => {
      content.vForm((form) => {
        if (parentName) {
          form.p((p) => {
            p.style({
              color: 'var(--yoya-color-text-secondary, #475569)',
              gridColumn: '1 / -1',
              margin: '0',
              padding: '0'
            });
            p.text(`父级：${parentName}`);
          });
        }
        buildFormFields(form, node);
        form.vButton('保存', (btn) => {
          btn.variant('primary');
          btn.style({ gridColumn: '1 / -1', justifySelf: 'end', marginTop: '16px' });
          btn.on('click', () => save(form));
        });
      });
    });
    dialog.open(true);
  }

  function buildFormFields(form, node) {
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
      item.control((editor) => editor.vInput({ name: 'name', value: node?.name ?? '' }));
    });
    form.vFormItem((item) => {
      item.styles(rowStyle);
      item.label('权限标识').name('code').required({ message: '请填写权限标识' });
      item.control((editor) => editor.vInput({ name: 'code', value: node?.code ?? '' }));
    });
    form.vFormItem((item) => {
      item.styles(rowStyle);
      item.label('类型').name('type');
      item.control((editor) =>
        editor.vSelect({ name: 'type', options: typeOptions, value: node?.type ?? 'menu' })
      );
    });
    form.vFormItem((item) => {
      item.styles(rowStyle);
      item.label('排序').name('sort');
      item.control((editor) => editor.vInput({ name: 'sort', value: String(node?.sort ?? 0) }));
    });
  }

  async function save(form) {
    if (!form.validate()) {
      return;
    }
    await onSubmit(editingId, parentId, form.values());
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
