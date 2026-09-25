/**
 * 中性夹具：options 里带 `...rest` 的形状（票 18）。
 *
 * 只存在于测试里、中性命名（AGENTS「双向隔离」：工具侧不搬业务组件）。
 * 这些函数同时是"通用路径"的实现——同一份源码，不挂编译器就这么跑。
 */
import { div, vText } from '@yoyaflow/yoya-core';

/** 前缀键 + 后缀身份：`{ 'data-tone': tone, ...rest, vn }`（后缀必须赢）。 */
export function SpreadCard({ label, tone, onPick, ...rest }) {
  return div({ 'data-tone': tone, ...rest, vn: 'SpreadCard' }, (node) => {
    // 结构里的事件用**另一个事件名**：元素通道的 options 事件走 `addEventListener`（与既有
    // `liveEvent` op 同一条），同名事件"后注册覆盖先注册"是核心 `on()` 的口径（见票 18 §口径备注）
    node.on('pointerdown', () => onPick?.());
    node.span({ class: 'label' }, (cell) => cell.child(vText(label)));
  });
}

/** 通道键在前：`{ attrs, style, class, ...rest }` —— rest 整包覆盖。 */
export function ChannelCard({ label, ...rest }) {
  return div(
    { attrs: { 'data-a': '1' }, style: { color: 'red' }, class: 'base', ...rest },
    (node) => {
      node.span({ class: 'label' }, (cell) => cell.child(vText(label)));
    }
  );
}

/** 类名在后：`{ ...rest, class: 'base' }` —— 字面量赢。 */
export function SuffixClassCard({ label, ...rest }) {
  return div({ ...rest, class: 'base' }, (node) => node.child(vText(label)));
}

/** children 从 props 解构出来（写法建议）：位置由结构决定。 */
export function ChildrenCard({ children, ...rest }) {
  return div({ ...rest, class: 'card' }, (node) => {
    node.child(children);
    node.span({ class: 'tail' }, (tail) => tail.child('tail'));
  });
}

/** children 留在 rest 里：编译器也要按通用路径的次序落位（内容在结构之前）。 */
export function RestChildrenCard({ label, ...rest }) {
  return div({ ...rest, class: 'card' }, (node) => {
    node.span({ class: 'head' }, (head) => head.child('head'));
    node.child(vText(label));
  });
}

/** 守卫用例：计算键仍然回落。 */
export function ComputedKeyCard({ label, key, ...rest }) {
  return div({ ...rest, [key]: 'x', vn: 'ComputedKeyCard' }, (node) => node.child(vText(label)));
}

/** 守卫用例：spread 源不是绑定名仍然回落。 */
export function MemberSpreadCard({ props }) {
  return div({ ...props.extra, vn: 'MemberSpreadCard' }, (node) => node.child(vText(props.label)));
}
