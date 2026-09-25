/**
 * 编译路径的**中性夹具**（不是业务代码、也不随包发布）：一个列表项组件，结构上覆盖
 * 「静态类名 / 静态属性 + 活文本 + 事件 + 类名绑定」这几类可编形状，同时充当唯一真源——
 * 编译测试读它的源码文本，等价性测试直接调用它的 `Item`，两条路径永远对得上，
 * 没有第二份手写的结构。
 *
 * 纪律（`AGENTS.md` 双向隔离）：夹具不许照抄任何应用的结构或名字，只用中性命名。
 */
import { computed, ref, i, li, span, vText } from '@yoyaflow/yoya-core';

export const selectedId = ref(null);
export const removed = [];

export function removeItem(id) {
  removed.push(id);
}

export function Item(item) {
  return li((line) => {
    line.attr('data-item-id', String(item.id));
    line.span((cell) => cell.className('item-id').child(String(item.id)));
    line.span((cell) => {
      cell.className('item-label');
      cell.a((link) => link.child(vText(item.label)));
    });
    line.span((cell) => {
      cell.className('item-action');
      cell.a((link) => {
        link.i((icon) => icon.className('icon icon-remove').attr('aria-hidden', 'true'));
        link.on('click', (event) => {
          event.stopPropagation();
          removeItem(item.id);
        });
      });
    });
    line.span((cell) => cell.className('item-note'));
    line.toggleClass(
      'active',
      computed(() => selectedId.value === item.id)
    );
    line.on('click', () => {
      selectedId.value = item.id;
    });
  });
}

export { computed, i, li, ref, span, vText };
