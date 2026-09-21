import { HtmlElementNode } from '../html/index.js';
import { applySetupValue } from '../core/node.js';
import { registerChildFactories } from '../core/node.js';
import { PART_ATTRIBUTE } from '../core/slot.js';
import {
  componentClass,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  resolveTextValue
} from '../components/shared.js';

/**
 * VSlot —— **零布局占位**（形态 A 薄工厂）：给组件在自己的结构里留一个"位置标记"，
 * 内容作为它的**子节点**插入，占位本身不生成盒子（`display: contents`）。
 *
 * 它**不是**公开的槽位机制（那是 `slot="x"` 属性 + `child()` 投影）：VSlot 不带 `slot`
 * 属性，因此不进 `collectSlots` 的槽位名单，两者互不干扰。
 *
 * ```js
 * // 结构侧：留三个位置标记
 * return div((root) => {
 *   root.child(vSlot({ name: 'header' }), vSlot({ name: 'body' }), vSlot({ name: 'footer' }));
 * });
 *
 * // 组件侧：把 part 作为子节点放进对应占位（part 自己的类与样式照常渲染）
 * api.vCardHeader = (setup) => { replaceChildren(vSlotOf(root, 'header'), [vCardHeader(setup)]); return api; };
 * ```
 */
export function VSlot(options = null) {
  const node = new HtmlElementNode('span')
    .className(componentClass, 'yoya-vslot')
    .style('display', 'contents')
    .setup({ vn: 'VSlot' });

  if (options === null || options === undefined) {
    return node;
  }

  if (typeof options === 'string' || typeof options === 'number') {
    return node.attr('vn_slot', resolveTextValue(options) || null);
  }

  if (isPlainObject(options)) {
    const { name, ...rest } = options;
    if (name !== undefined) {
      node.attr('vn_slot', resolveTextValue(name) || null);
    }
    if (Object.keys(rest).length > 0) {
      applySetupValue(node, rest);
    }
    return node;
  }

  return node;
}

/** 快捷名（形态 A：同一个函数）。 */
export const vSlot = VSlot;

/** 按占位名取节点：`vSlotOf(root, 'header')`。 */
export function vSlotOf(root, name) {
  if (!root || typeof root.children !== 'function') {
    return null;
  }

  return (
    root.children().find((child) => child?.attr?.('vn_slot') === resolveTextValue(name)) ?? null
  );
}

/**
 * 外部插入：把内容放进同名 `vn_slot` 占位（内容作为占位的子节点，占位自身不生成盒子）。
 * 只认 `vn_slot` 属性——公开的 `slot="x"` 内容投影机制完全不受影响。
 */
export function vSlotInsert(root, name, content) {
  const slot = vSlotOf(root, name);
  if (!slot) {
    return null;
  }

  const nodes = normalizeChildren(content);
  // 标记只是路由指令：进占位后就摘掉（否则占位与内容会同名重复）
  nodes.forEach((node) => node?.attr?.(PART_ATTRIBUTE, null));
  replaceChildren(slot, nodes);
  return slot;
}

// 父节点快捷方法：`page.vSlot({ name: 'header' })`（与其它布局工厂同一口径）
registerChildFactories(HtmlElementNode, { vSlot });
