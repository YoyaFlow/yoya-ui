// 编译输入：一个行工厂（真编译器今天能编的形状：静态类名 + 动态属性 + 活文本 + 类名绑定）。
// 它同时被基准页当"通用路径"那一列用（同一份源码：不挂编译器就是运行期版本）。
import { div, vText } from '/src/yoya.core.js';

export function Row(row) {
  return div({ class: 'row', 'data-id': String(row.id) }, (node) => {
    node.span({ class: 'col c-label' }, (cell) => cell.child(vText(row.label)));
    node.span({ class: 'col c-a' }, (cell) => cell.child('a'));
    node.span({ class: 'col c-b' }, (cell) => cell.child('b'));
    node.span({ class: 'col c-c' }, (cell) => cell.child('c'));
    node.span({ class: 'col c-d' }, (cell) => cell.child('d'));
    node.toggleClass('selected', row.selected);
  });
}
