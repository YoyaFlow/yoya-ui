import { vTable } from '@yoyaflow/yoya-ui';
import { RowActionButton } from '../../../../shared/ui.buttons.js';
import { statusText } from '../utils/options.js';

export function RoleTable({ rows, onEdit, onRemove }) {
  let tbody = null;

  function renderRows() {
    if (!tbody) {
      return;
    }
    tbody.children().forEach((child) => child.destroy());
    rows().forEach((role) => {
      tbody.vTr((row) => {
        row.vTd(role.name);
        row.vTd(role.code);
        row.vTd(role.description);
        row.vTd(statusText[role.status] ?? role.status);
        row.vTd((cell) => {
          cell.hstack({ gap: '8px' }, (actions) => {
            actions.child(RowActionButton('编辑', (btn) => btn.on('click', () => onEdit(role))));
            actions.child(
              RowActionButton('删除', (btn) => {
                btn.variant('danger');
                btn.on('click', () => onRemove(role));
              })
            );
          });
        });
      });
    });
  }

  return {
    render() {
      return vTable((table) => {
        table.vThead((head) => {
          head.vTr((row) => {
            row.vTh('名称');
            row.vTh('角色标识');
            row.vTh('描述');
            row.vTh('状态');
            row.vTh('操作');
          });
        });
        table.vTbody((body) => {
          tbody = body;
          renderRows();
        });
      });
    },
    refresh() {
      renderRows();
      return this;
    }
  };
}
