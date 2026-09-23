/**
 * 中性夹具：**快捷名调用点**（票 15 §Q4「快捷名索引」）。
 *
 * - `VThing` 是定义（薄工厂，单一基础元素块），`vThing` 是快捷名；
 * - `Widget` 用**快捷名**调用它——注册表按定义名登记单元，调用点却写快捷名，
 *   所以要有别名条目把两者对上；
 * - `WidgetWithArgs` 用快捷名 + **setup 实参**：定义没有形参，实参是调用方 setup 值，
 *   内联无处安放 → 应保持回落（交给运行期按组件语义应用）。
 *
 * 只存在于测试里、中性命名（AGENTS「双向隔离」）。
 */
import { div } from '../../yoya.core.js';
import { createComponentShortcut } from '../../components/shared.js';

export function VThing() {
  return div({ vn: 'VThing' });
}

export const vThing = createComponentShortcut(VThing);

export function Widget() {
  return div({ vn: 'VWidget' }, (root) => {
    root.child('前');
    root.child(vThing());
    root.child('后');
  });
}

export function WidgetWithArgs() {
  return div({ vn: 'VWidgetWithArgs' }, (root) => {
    root.child(vThing({ 'data-x': '1' }));
  });
}

/** 认不出的实参（变量）→ 不摊平，回落。 */
export function WidgetWithDynamicArgs(props = {}) {
  return div({ vn: 'VWidgetWithDynamicArgs' }, (root) => {
    root.child(vThing(props.extra));
  });
}
