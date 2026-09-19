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
export function collectSlots(root, host = null) {
  const slots = new Map();
  const regionStack = [];

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
      node._slotHost = host;
      node._slotName = name;
      // 含槽位的**区域祖先**也要记住宿主：祖先重建时同样要"收回 → 重建 → 重新投影"
      regionStack.forEach((region) => {
        region._slotHost = host;
      });
    }

    // 嵌套组件是另一个作用域：不往下走（它的槽位归它自己解析）
    if (node._component !== undefined) {
      return;
    }

    if (node._rebuildable) {
      regionStack.push(node);
      node.children().forEach(visit);
      regionStack.pop();
      return;
    }

    node.children().forEach(visit);
  };

  visit(root);
  return slots;
}

/**
 * 槽位登记表（挂在**组件实例**上）：槽名 → { carrier, nodes }。
 * 内容归宿主所有，槽位元素只是**投影点**：区域重建 / 槽位替换只重造投影点，登记表与内容不受影响。
 */
export function createSlotRegistry() {
  return new Map();
}

/** 登记一份投递：一个槽位只接受一份内容（语义在实例上，重建后依然有效）。 */
export function registerSlotContent(registry, name, carrier) {
  if (registry.has(name)) {
    throw new TypeError(`Slot "${name}" already received content: one slot accepts one carrier.`);
  }
  registry.set(name, { carrier, nodes: null });
  return registry;
}

/** 把登记的内容投影进槽位元素：默认内容被替换、同名属性合并、子节点按顺序挂入。 */
export function projectSlot(registry, name, slotElement, append = null) {
  const entry = registry.get(name);
  if (!entry) {
    return null;
  }

  const nodes = entry.nodes ?? (entry.nodes = entry.carrier.children());
  if (slotElement._projectedNodes === nodes) {
    return nodes;
  }

  const carrier = entry.carrier;
  if (carrier._attrs) {
    Object.entries(carrier._attrs).forEach(([attrName, value]) => {
      if (attrName !== SLOT_ATTRIBUTE) {
        slotElement.attr(attrName, value);
      }
    });
  }

  // 类名走 _classText（不占属性快照）：信封的类名与槽位元素取并集
  if (carrier._classText) {
    const own = slotElement._classText ? slotElement._classText.split(/\s+/) : [];
    const incoming = carrier._classText.split(/\s+/).filter((item) => item && !own.includes(item));
    if (incoming.length > 0) {
      slotElement.className(incoming.join(' '));
    }
  }

  slotElement.children().forEach((child) => child.destroy());
  slotElement._children = [];
  slotElement._childrenDirty = true;
  if (append) {
    append(slotElement, nodes);
  } else {
    slotElement.child(nodes);
  }
  slotElement._projectedNodes = nodes;
  return nodes;
}

/**
 * 收回投影：把内容从槽位元素里摘出来（**不销毁**），留给下一次投影。
 * 区域重建 / 槽位元素销毁前调用，内容因此不会跟着投影点一起消失。
 */
export function reclaimSlot(slotElement) {
  const nodes = slotElement?._projectedNodes;
  if (!nodes) {
    return null;
  }

  slotElement._projectedNodes = null;
  if (Array.isArray(slotElement._children) && slotElement._children.length > 0) {
    slotElement._children = slotElement._children.filter((child) => !nodes.includes(child));
    slotElement._childrenDirty = true;
  }
  nodes.forEach((node) => node?._el?.remove?.());
  return nodes;
}
