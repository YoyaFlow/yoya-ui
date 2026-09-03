import { createAccess, div, installAccess, vInput } from '../../index.js';

// 全局初始化权限（一次）：裸码 = 可读可写，r. = 只读。
installAccess(
  createAccess({
    permissions: [
      'system:member',
      'r.system:member:audit',
      'w.system:member:remove',
      'r.system:member:archive'
    ]
  })
);

export function AccessControlMembers() {
  return {
    render() {
      return div((panel) => {
        panel.vstack({ gap: '10px' }, (stack) => {
          stack.p('输入控件：有权限可编辑，只读禁用，无权限不显示');
          [
            ['有权限', 'system:member'],
            ['只读', 'system:member:audit'],
            ['无权限', 'system:member:export']
          ].forEach(([label, code]) => {
            stack.hstack({ alignItems: 'center', gap: '10px' }, (row) => {
              row.span(label);
              row.child(vInput({ name: code, access: code }));
            });
          });

          stack.p('操作按钮：有写可点，只读禁用，无权限不显示');
          stack.hstack({ gap: '8px' }, (row) => {
            row.vButton('删除', (b) => {
              b.variant('danger');
              b.access('system:member:remove');
            });
            row.vButton('归档', (b) => {
              b.access('system:member:archive');
            });
            row.vButton('导出', (b) => {
              b.access('system:member:export');
            });
          });
        });
      });
    }
  };
}
