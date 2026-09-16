import { computed, vTable, vText, vTr } from '@yoyaflow/yoya-ui';
import { RowActionButton } from '../../../../shared/ui.buttons.js';
import { statusText } from '../utils/options.js';

/**
 * 成员表格：rows 是状态里的 ref 句柄，写入即按 key 对账——
 * 能复用的行不重建，行内热字段只刷自己那一格，组件不需要对外暴露 refresh()。
 */
export function MemberTable({ rows, onEdit, onRemove }) {
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
      body.keyed(
        rows,
        (member) => member.id,
        (member) => buildRow(member)
      );
    });
  });

  function buildRow(member) {
    return vTr((row) => {
      row.vTd(vText(member.name));
      row.vTd(vText(member.email));
      row.vTd(vText(member.role));
      row.vTd(vText(computed(() => statusText[member.status.value] ?? member.status.value)));
      row.vTd((cell) => {
        cell.hstack({ gap: '8px' }, (actions) => {
          actions.child(
            RowActionButton('编辑', (btn) => {
              btn.access('system:member:update');
              btn.on('click', () => onEdit(member));
            })
          );
          actions.child(
            RowActionButton('删除', (btn) => {
              btn.variant('danger');
              btn.access('system:member:remove');
              btn.on('click', () => onRemove(member));
            })
          );
        });
      });
    });
  }
}
