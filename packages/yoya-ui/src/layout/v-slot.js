import { HtmlElementNode } from '@yoyaflow/yoya-core/html';
import { registerChildFactories } from '@yoyaflow/yoya-core/internal/core/node.js';
import { PART_SLOT_ATTRIBUTE } from '@yoyaflow/yoya-core/internal/core/slot.js';
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
 * 落位走**一对属性**，两侧各写一个（分工见 core/slot.js）：
 * - **结构侧**（本文件）：占位自己带 `vn_slot="header"` = 落点，声明"这里能收哪份内容"；
 *   `vSlot()` 不带名字时是 `vn_slot=""` = **匿名落点**（收未标记的 `child()` 内容）；
 * - **内容侧**（调用方 / 部件工厂）：part 带 `to_slot="header"` = 投递，`child()` 进组件即自动
 *   投影进同名落点（ComponentNode 的 part 通道）——**没有手工插入的辅助函数**。
 *
 * 两个属性不共用：读结构只认 `vn_slot`、读内容只认 `to_slot`，内容上的标记不会被误当成
 * 结构里的落点（反之亦然）。
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
 * // 组件侧：part 自带 to_slot 标记（落点是结构里的 vn_slot），child() 进组件即自动落位
 * api.vCardHeader = (setup) => self.node().child(vCardHeader(setup));
 * ```
 */
export function VSlot() {
  // `vn_slot=""` 是**匿名落点**的标记：匿名内容（没写 `to_slot` 的 child）落进这个位置；
  // 具名落点由下面的 setupString / setupObject 覆写成落点名。
  const node = new HtmlElementNode('span')
    .style('display', 'contents')
    .setup({ vn: 'VSlot', vn_slot: '' });

  // 字符串 / 数字 = 落点名（落点名是构建期事实，不是活值：取当前文本值即可）
  // 空字符串保留（`vSlot('')` = 匿名落点，与 `vSlot()` 等价），不做成 null
  node.setupString = (value) => {
    const name = resolveTextValue(value);
    node.attr(PART_SLOT_ATTRIBUTE, name ?? null);
  };
  // 对象 = `name` 收成落点名，其余键原样交给 options 分派（class / style / attrs / 属性 / 事件）
  node.setupObject = (config) => {
    const { name, ...rest } = config;
    if (name !== undefined) {
      node.attr(PART_SLOT_ATTRIBUTE, resolveTextValue(name) || null);
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
