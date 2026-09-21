import { HtmlElementNode } from '../html/index.js';
import { registerChildFactories } from '../core/node.js';
import { PART_ATTRIBUTE } from '../core/slot.js';
import { createComponentShortcut, resolveTextValue } from '../components/shared.js';

/**
 * VSlot —— **零布局占位**（形态 A 薄工厂）：给组件在自己的结构里留一个"位置标记"，
 * 内容作为它的**子节点**插入，占位本身不生成盒子（`display: contents`）。
 *
 * 它**不是**公开的槽位机制（那是 `slot="x"` 属性 + `child()` 投影）：VSlot 不带 `slot`
 * 属性，因此不进 `collectSlots` 的槽位名单，两者互不干扰。
 *
 * 占位**只有属性、没有类名**（`yoya-component` / `yoya-vslot` 都不要）：零布局是内联样式，
 * 身份与样式钩子都走 `vn` / `vn_slot`（属性化迁移口径见票 15）。
 *
 * 落位只认标记：结构侧的占位与内容侧的 part 都写 `vn_slot`，把带标记的内容 `child()` 进组件，
 * 引擎就放进同名占位（ComponentNode 的 part 通道）——**没有手工插入的辅助函数**。
 *
 * 定义 / 快捷方法按统一口径分开：`VSlot()` 只建结构（span + `display: contents` + `vn`），
 * 调用方参数由快捷方法 `vSlot = createComponentShortcut(VSlot)` 按标准 setup 分派落位——
 * 裸值走 `setupString`（这个位置"裸值怎么解释"的入口 = 占位名），对象形式只额外收 `name`，
 * 其余键继续走 options 分派（class / style / attrs / 属性 / 事件）。
 *
 * ```js
 * // 结构侧：留三个位置标记
 * return div((root) => {
 *   root.child(vSlot('header'), vSlot('body'), vSlot({ name: 'footer' }));
 * });
 *
 * // 组件侧：part 自带 vn_slot 标记，child() 进组件即自动落位
 * api.vCardHeader = (setup) => self.node().child(vCardHeader(setup));
 * ```
 */
export function VSlot() {
  const node = new HtmlElementNode('span').style('display', 'contents').setup({ vn: 'VSlot' });

  // 字符串 / 数字 = 占位名（占位名是构建期事实，不是活值：取当前文本值即可）
  node.setupString = (value) => node.attr(PART_ATTRIBUTE, resolveTextValue(value) || null);
  // 对象 = `name` 收成占位名，其余键原样交给 options 分派（class / style / attrs / 属性 / 事件）
  node.setupObject = (config) => {
    const { name, ...rest } = config;
    if (name !== undefined) {
      node.attr(PART_ATTRIBUTE, resolveTextValue(name) || null);
    }
    node._setupObject(rest);
    return node;
  };

  return node;
}

/** 快捷方法：建 VSlot 节点 + 应用调用方参数（与其它组件同一套分派）。 */
export const vSlot = createComponentShortcut(VSlot);

// 父节点快捷方法：`root.vSlot('header')` / `page.vSlot({ name: 'header' })`（与其它布局工厂同一口径）
registerChildFactories(HtmlElementNode, { vSlot });
