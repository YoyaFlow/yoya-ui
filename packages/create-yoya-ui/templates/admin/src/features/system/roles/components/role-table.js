import { computed, vTable, vText, vTr } from '@yoyaflow/yoya-ui';
import { RowActionButton } from '../../../../shared/ui.buttons.js';
import { statusText } from '../utils/options.js';

/** 角色表格：rows 是状态里的 ref 句柄，写入即按 key 对账，无需手动重建行。 */
export function RoleTable({ rows, onEdit, onRemove }) {
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
      body.keyed(
        rows,
        (role) => role.id,
        (role) => buildRow(role)
      );
    });
  });

  function buildRow(role) {
    return vTr((row) => {
      row.vTd(vText(role.name));
      row.vTd(vText(role.code));
      row.vTd(vText(role.description));
      row.vTd(vText(computed(() => statusText[role.status.value] ?? role.status.value)));
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
  }
}
