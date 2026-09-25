/**
 * 中性夹具：**`child(<元素工厂>(…))`**（票 21 §2.1.11）——`cell.child(span({…}, (box) => …))`
 * 与前缀写法 `cell.span({…}, …)` 同义，所以走同一套参数分析（options / 回调 / 文本 / 动态实参）。
 *
 * 只存在于测试里、中性命名（AGENTS「双向隔离」）。
 */
import { div, span, vNode, vText } from '@yoyaflow/yoya-core';

/** 形态 A（薄工厂）：三种 child 实参写法混在一棵小树里。 */
export function ChildCallCard(props = {}) {
  return div({ class: 'card', vn: 'ChildCallCard' }, (root) => {
    root.child(
      span({ class: 'badge', vn: 'ChildCallBadge' }, (box) => {
        box.child(vText(props.label));
      })
    );
    root.child(div({ class: 'line' }));
    root.child(span('静态文本'));
  });
}

/** 形态 B（vNode）：同一形状放在有行为的组件里（命令体保留）。 */
export function ChildCallWidget(props = {}) {
  return vNode((api) => {
    const view = div({ class: 'widget', vn: 'ChildCallWidget' }, (root) => {
      root.child(span({ class: 'badge' }, (box) => box.child(vText(props.label))));
    });

    api.tag = () => {
      view.attr('data-tag', 'yes');
      return api;
    };

    return view;
  });
}

/** 该仍回落：setup 回调没有形参（拿不到子节点句柄）。 */
export function NoParamChildCard() {
  return div((root) => root.child(span({ class: 'x' }, () => {})));
}

/** 该仍回落：动态实参后面还有参数（先写的静态子节点已经进片段，顺序无法保证）。 */
export function OrderUnknownCard(props = {}) {
  return div((root) => root.child(span(props.label, 'x')));
}
