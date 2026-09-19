/**
 * 槽位（票 42 / T3）：**标记驱动、就近作用域**。
 *
 * 两侧都用同一个标记（HTML 的 `slot` 属性）：
 * - 结构侧：组件自己的结构里，带 `slot="x"` 的元素就是 `x` 槽位（默认内容 = 它自己的孩子）；
 * - 内容侧：`child()` 进来的、带 `slot="x"` 的元素是"信封"——它本身不进 DOM，
 *   子节点与同名属性合并进槽位元素（默认内容被替换，与 HTML 的 fallback 一致）。
 *
 * 作用域只到**直接父组件实例**：遍历结构时遇到嵌套组件就停（它的槽位归它自己），
 * 因此嵌套同名互不影响；找不到槽位的内容不 mount（HTML 语义）并给开发期提示。
 */

export const SLOT_ATTRIBUTE = 'slot';

/** 读节点自己的槽位标记（空字符串 = 未标记）。 */
export function slotNameOf(node) {
  if (!node || typeof node.attr !== 'function') {
    return null;
  }

  const name = node.attr(SLOT_ATTRIBUTE);
  return typeof name === 'string' && name.length > 0 ? name : null;
}

/**
 * 收集组件**自身结构**里的槽位：同名重复声明 → 报错；遇到嵌套组件即停（就近作用域）。
 */
export function collectSlots(root) {
  const slots = new Map();

  const visit = (node) => {
    if (!node || typeof node.children !== 'function') {
      return;
    }

    const name = slotNameOf(node);
    if (name) {
      const existing = slots.get(name);
      if (existing && existing !== node) {
        throw new TypeError(
          `Duplicate slot "${name}" in one component: a slot name may only be declared once.`
        );
      }
      slots.set(name, node);
    }

    // 嵌套组件是另一个作用域：不往下走（它的槽位归它自己解析）
    if (node._component !== undefined) {
      return;
    }

    node.children().forEach(visit);
  };

  visit(root);
  return slots;
}

/**
 * 把内容"信封"合并进槽位元素：默认内容被替换、同名属性覆盖写入、子节点按顺序放入。
 * 一个槽位只接受一份内容，第二次投递 → 报错。
 */
export function fillSlot(slotElement, carrier) {
  if (slotElement._slotFilled === true) {
    throw new TypeError(
      `Slot "${slotNameOf(slotElement) ?? ''}" already received content: one slot accepts one carrier.`
    );
  }
  slotElement._slotFilled = true;

  const attributes = carrier._attrs;
  if (attributes) {
    Object.entries(attributes).forEach(([name, value]) => {
      if (name !== SLOT_ATTRIBUTE) {
        slotElement.attr(name, value);
      }
    });
  }

  // 类名走的是 _classText（不占属性快照）：信封的类名与槽位元素的类名取并集，
  // 这样"信封不进 DOM"也不会把作者写在根上的样式类丢掉。
  if (carrier._classText) {
    const own = slotElement._classText ? slotElement._classText.split(/\s+/) : [];
    const incoming = carrier._classText.split(/\s+/).filter((name) => name && !own.includes(name));
    if (incoming.length > 0) {
      slotElement.className(incoming.join(' '));
    }
  }

  slotElement.children().forEach((child) => child.destroy());
  slotElement._children = [];
  slotElement._childrenDirty = true;

  if (typeof carrier.children === 'function') {
    slotElement.child(carrier.children());
  }

  return slotElement;
}
