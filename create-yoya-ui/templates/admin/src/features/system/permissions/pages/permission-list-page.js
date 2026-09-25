import { toast, vConfirm, vTree, vstack } from '@yoyaflow/yoya-ui';
import { RowActionButton } from '../../../../shared/ui.buttons.js';
import PermissionsPageState from '../api/permission.state.js';
import { PermissionFormDialog } from '../components/permission-form-dialog.js';

export function PermissionListPage() {
  const state = new PermissionsPageState();
  const dialog = PermissionFormDialog({ onSubmit: savePermission });
  const tree = vTree({ ariaLabel: '权限树' });

  load();

  // vTree 是命令式组件（整树重建，不做行级对账）：数据到位后由动作把 ref 值喂给它
  async function load() {
    await state.load();
    tree.nodes(buildTreeNodes(state.tree.value));
  }

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

  async function askRemove(node) {
    const ok = await vConfirm({
      title: '删除权限',
      content: `确定删除权限「${node.name}」及其子权限？`,
      danger: true,
      confirmText: '删除'
    });
    if (!ok) {
      return;
    }
    await state.remove(node.id);
    toast.success(`已删除 ${node.name}`);
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

  // 页面也是组件：没有对外命令方法 → 形态 A 薄工厂，直接返回视图节点
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
            toolbar.vButton('刷新', (btn) => btn.on('click', () => load()));
          });
          content.child(tree);
        });
      });
    });
    stack.child(dialog);
  });
}
