import { toast, vDialog, vTree, vstack } from '@yoyaflow/yoya-ui';
import { RowActionButton } from '../../../ui/row-action-button.js';
import PermissionsPageState from '../api/permission.state.js';
import { PermissionFormDialog } from '../components/permission-form-dialog.js';

export function PermissionListPage() {
  const state = new PermissionsPageState();
  const dialog = PermissionFormDialog({ onSubmit: savePermission });
  const confirmDialog = vDialog();
  const tree = vTree({ ariaLabel: '权限树' });

  state.subscribe(() => {
    tree.nodes(buildTreeNodes(state.tree()));
  });
  state.load();

  function buildTreeNodes(nodes) {
    return nodes.map((node) => ({
      id: String(node.id),
      label: node.name,
      expanded: true,
      children: buildTreeNodes(node.children ?? []),
      actions: (actions) => {
        actions.child(
          RowActionButton('新增子权限', (btn) =>
            btn.on('click', () => dialog.open({ parentId: node.id, parentName: node.name }))
          )
        );
        actions.child(
          RowActionButton('编辑', (btn) => btn.on('click', () => dialog.open({ node })))
        );
        actions.child(
          RowActionButton('删除', (btn) => {
            btn.variant('danger');
            btn.on('click', () => askRemove(node));
          })
        );
      }
    }));
  }

  function askRemove(node) {
    confirmDialog.content((content) => {
      content.p(`确定删除权限「${node.name}」及其子权限？`);
      content.hstack({ gap: '8px' }, (row) => {
        row.spacer();
        row.vButton('取消', (btn) => btn.on('click', () => confirmDialog.close()));
        row.vButton('删除', (btn) => {
          btn.variant('danger');
          btn.on('click', async () => {
            confirmDialog.close();
            await state.remove(node.id);
            toast.success(`已删除 ${node.name}`);
          });
        });
      });
    });
    confirmDialog.open(true);
  }

  async function savePermission(editingId, parentId, payload) {
    if (editingId === null) {
      await state.add(parentId, payload);
      toast.success('已新增权限');
    } else {
      await state.edit(editingId, payload);
      toast.success('已更新权限');
    }
  }

  return {
    render() {
      return vstack({ gap: '16px' }, (stack) => {
        stack.h2('权限管理');
        stack.vCard((card) => {
          card.vCardHeader('权限树');
          card.vCardBody((body) => {
            body.vstack({ gap: '12px' }, (content) => {
              content.hstack({ gap: '10px' }, (toolbar) => {
                toolbar.vButton('新增根权限', (btn) => {
                  btn.variant('primary');
                  btn.on('click', () => dialog.open({}));
                });
                toolbar.vButton('刷新', (btn) => btn.on('click', () => state.load()));
              });
              content.child(tree);
            });
          });
        });
        stack.child(dialog);
        stack.child(confirmDialog);
      });
    },
    refresh() {
      return state.load();
    }
  };
}
