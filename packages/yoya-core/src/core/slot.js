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

/**
 * part 占位标记（与公开槽位分名空间）：`vn_slot="header"`。
 * 结构侧的占位与内容侧的 part 都用它 → 自动投影，且不碰 `slot="x"` 那套。
 */
export const PART_ATTRIBUTE = 'vn_slot';

/** 读节点自己的槽位标记（空字符串 = 未标记）；`attribute` 可换成 part 标记。 */
export function slotNameOf(node, attribute = SLOT_ATTRIBUTE) {
  if (!node || typeof node.attr !== 'function') {
    return null;
  }

  const name = node.attr(attribute);
  return typeof name === 'string' && name.length > 0 ? name : null;
}

/** 读节点自己的 part 标记（空字符串 = **默认 part 占位**，见下）。 */
export function partNameOf(node) {
  return slotNameOf(node, PART_ATTRIBUTE);
}

/**
 * 读节点上的 part 标记原文：`null` = 没写；`''` = 写了空值 = **默认占位**（匿名内容落这里）。
 * `partNameOf` 只认具名占位（与公开槽位共用"空 = 未标记"的口径），默认占位走这一条。
 */
export function rawPartNameOf(node) {
  if (!node || typeof node.attr !== 'function') {
    return null;
  }

  const value = node.attr(PART_ATTRIBUTE);
  return typeof value === 'string' ? value : null;
}

/**
 * 收集组件**自身结构**里的槽位：同名重复声明 → 报错；遇到嵌套组件即停（就近作用域）。
 * `attribute` 决定收哪一套标记（公开槽位 `slot` / part 占位 `vn_slot`），两套各收各的。
 */
export function collectSlots(root, host = null, attribute = SLOT_ATTRIBUTE) {
  const slots = new Map();
  const regionStack = [];

  const visit = (node) => {
    if (!node || typeof node.children !== 'function') {
      return;
    }

    const name = slotNameOf(node, attribute);
    // 默认 part 占位：`vn_slot=""`（`vSlot()` 不带名字）——匿名内容落这里，只有一个
    if (attribute === PART_ATTRIBUTE && !name && rawPartNameOf(node) === '') {
      if (slots.has('') && slots.get('') !== node) {
        throw new TypeError('Duplicate default slot: one default slot per component.');
      }
      slots.set('', node);
      node._slotHost = host;
      node._slotName = '';
      regionStack.forEach((region) => {
        region._slotHost = host;
      });
    }

    if (name) {
      const existing = slots.get(name);
      if (existing && existing !== node) {
        throw new TypeError(`Duplicate slot "${name}": one declaration per component.`);
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
 * 把 part 内容放进 `vn_slot` 占位：part **作为子节点**保留自己的类与样式
 * （占位是 `display: contents`，不生成盒子，所以不能把 part 的类/样式合并到占位上）。
 */
export function projectPart(partElement, content) {
  if (!partElement || !content || typeof partElement.child !== 'function') {
    return null;
  }

  // 标记只是路由指令：进了占位就从 part 上摘掉（DOM 里只留占位自己的标记）
  content.attr?.(PART_ATTRIBUTE, null);
  partElement.clearChildren();
  partElement.child(content);
  return content;
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
    throw new TypeError(`Slot "${name}" already received content.`);
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
