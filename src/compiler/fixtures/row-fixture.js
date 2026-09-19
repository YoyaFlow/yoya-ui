/**
 * 编译路径的测试夹具（不是演示代码，也不随包发布）：一份惯用 setupFunction DSL 写的行
 * （与官方基准条目的 buildRow 逐节点一致），同时充当**唯一真源**——编译测试读它的源码文本，
 * 等价性测试直接调用它的 buildRow，两条路径因此永远对得上，没有第二份手写的结构。
 *
 * 只被 `src/compiler/*.test.js` 读取；模块级的 selectedId / removed 是刻意模仿应用代码的
 * 写法，库内代码不允许这样写。
 */
import { computed, ref, span, td, tr, vText } from '../../yoya.core.js';

export const selectedId = ref(null);
export const removed = [];

export function removeRow(id) {
  removed.push(id);
}

export function buildRow(row) {
  return tr((line) => {
    line.attr('data-row-id', String(row.id));
    line.td((cell) => cell.className('col-md-1').child(String(row.id)));
    line.td((cell) => {
      cell.className('col-md-4');
      cell.a((link) => link.child(vText(row.label)));
    });
    line.td((cell) => {
      cell.className('col-md-1');
      cell.a((link) => {
        link.span((icon) =>
          icon.className('glyphicon glyphicon-remove').attr('aria-hidden', 'true')
        );
        link.on('click', (event) => {
          event.stopPropagation();
          removeRow(row.id);
        });
      });
    });
    line.td((cell) => cell.className('col-md-6'));
    line.toggleClass(
      'danger',
      computed(() => selectedId.value === row.id)
    );
    line.on('click', () => {
      selectedId.value = row.id;
    });
  });
}

export { computed, ref, span, td, tr, vText };
