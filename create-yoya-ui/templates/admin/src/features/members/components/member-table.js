import { vTable } from '@yoyaflow/yoya-ui';
import { RowActionButton } from '../../../ui/row-action-button.js';
import { statusText } from '../utils/options.js';

export function MemberTable({ rows, onEdit, onRemove }) {
  let tbody = null;

  function renderRows() {
    if (!tbody) {
      return;
    }

    tbody.children().forEach((child) => child.destroy());
    rows().forEach((member) => {
      tbody.vTr((row) => {
        row.vTd(member.name);
        row.vTd(member.email);
        row.vTd(member.role);
        row.vTd(statusText[member.status] ?? member.status);
        row.vTd((cell) => {
          cell.hstack({ gap: '8px' }, (actions) => {
            actions.child(RowActionButton('编辑', (btn) => btn.on('click', () => onEdit(member))));
            actions.child(
              RowActionButton('删除', (btn) => {
                btn.variant('danger');
                btn.on('click', () => onRemove(member));
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
            row.vTh('姓名');
            row.vTh('邮箱');
            row.vTh('角色');
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
