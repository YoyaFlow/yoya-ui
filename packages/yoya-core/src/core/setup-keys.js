/**
 * options 键的分派表（票 42 / T6c）：**运行期与编译期共用这一张表**。
 *
 * 为什么要有它：运行期 `_setupObject`（node.js）与编译期 `analyzeOptionsObject`（compiler/analyze.js）
 * 必须对同一个键给出同一个结论；各写一份 if 链迟早漂移，漂移的表现就是"编译产物与通用路径行为不一致"
 * 的静默误编。这里只放**分类**，具体动作各侧自己实现。
 *
 * - `class`     → 类名（`class` / `className`）
 * - `attrs`     → 属性对象（显式通道）
 * - `style`     → 样式对象（显式通道）
 * - `children`  → 子内容
 * - `attribute` → 其余键按**属性**写（子工厂不参与 options 分派，所以 `slot` / `title` 都落这里）
 */
export const OPTION_KEY_KINDS = {
  class: 'class',
  className: 'class',
  attrs: 'attrs',
  style: 'style',
  children: 'children'
};

export function optionKindOf(key) {
  return OPTION_KEY_KINDS[key] ?? 'attribute';
}
