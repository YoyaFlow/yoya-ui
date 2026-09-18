/**
 * 骨架 plan（票 27）：把一棵**已经构建好**的子树录成「结构 + 静态值 + 槽位」的纯数据描述，
 * 供票 28 的折叠建树消费。
 *
 * 纪律：
 * - 只读节点状态，不写、不订阅、不进构建热路径——录制发生在构建返回之后（走一遍树）；
 * - plan 是纯数据（JSON 可序列化），**不含节点对象与 DOM 对象**，因此可以按形状缓存而不钉住实例；
 * - 生产路径目前**没有任何自动调用点**：本模块只提供格式与录制，缓存与消费是票 28 的事。
 *
 * 形状与槽位：
 * - 「形状」= 标签、属性名与顺序、类名文本（静态部分）、子节点结构、活结点标记（绑定 / 事件）；
 *   形状签名不含**值**，所以两行内容不同但结构相同 → 同一个形状。
 * - 「槽位」= 逐实例变化的位置。两类来源：
 *   ① 绑定驱动的值（`_bindings` 里 kind = attr / class / style / prop / text）——永远是槽位；
 *   ② 字面值但在第二个实例上取到了不同的值（如 `String(row.id)`）——`promoteSkeleton()` 会把它降级成槽位。
 *
 * 不可折叠的情况（`foldable: false`，附 `reason`）：子树里有组件节点、区域、挂载条件或多根片段；
 * 这些形态的结构在实例间不保证一致，折叠交给更上层的策略决定（票 28）。
 */
import { ComponentNode, ElementNode, EMPTY_CHILDREN, VTextNode } from './node.js';

export const SKELETON_PLAN_VERSION = 1;

/** 逐实例变化的槽位标记。 */
const VAR = '*';

/** plan 是纯 JSON 数据，深拷贝走序列化（不依赖 structuredClone，jsdom 环境里不一定有）。 */
function clonePlan(plan) {
  return JSON.parse(JSON.stringify(plan));
}

function childrenOf(node) {
  const children = node._children;
  if (children === undefined || children === null || children === EMPTY_CHILDREN) {
    return [];
  }

  return Array.isArray(children) ? children : [children];
}

/** 绑定清单 → 该节点的动态位置表（属性名 / 类名 / 样式名 / 文本 / 属性 prop）。 */
function dynamicKeysOf(node) {
  const dynamic = {
    attrs: new Set(),
    classes: new Set(),
    styles: new Set(),
    props: new Set(),
    text: false
  };
  node._bindings?.forEach((binding) => {
    if (binding.kind === 'attr') {
      dynamic.attrs.add(binding.key);
    } else if (binding.kind === 'class') {
      dynamic.classes.add(binding.key);
    } else if (binding.kind === 'style') {
      dynamic.styles.add(binding.key);
    } else if (binding.kind === 'prop') {
      dynamic.props.add(binding.key);
    } else if (binding.kind === 'text') {
      dynamic.text = true;
    }
  });

  return dynamic;
}

function liveMarkersOf(node) {
  return {
    bindings: node._bindings?.length ?? 0,
    events: node._events?.size ?? 0,
    delegate: Boolean(node._delegate || node._delegates)
  };
}

/**
 * 录制一棵已构建好的子树。`root` 必须是单个元素 / 文本节点（多根请传数组由调用方展开）。
 */
export function recordSkeleton(root) {
  const nodes = [];
  const counts = { elements: 0, texts: 0, slots: 0, statics: 0 };
  let foldable = true;
  let reason = '';

  const push = (record) => {
    nodes.push(record);
    return nodes.length - 1;
  };

  const visit = (node) => {
    if (node instanceof ComponentNode) {
      foldable = false;
      reason ||= 'component';
      return -1;
    }

    if (node._rebuildable) {
      foldable = false;
      reason ||= 'region';
      return -1;
    }

    if (node._mountCondition || node._mountConditionRef) {
      foldable = false;
      reason ||= 'mountable';
      return -1;
    }

    const live = liveMarkersOf(node);

    if (node instanceof VTextNode) {
      const dynamic = dynamicKeysOf(node);
      const isVar = dynamic.text;
      if (isVar) {
        counts.slots += 1;
      } else {
        counts.statics += 1;
      }
      counts.texts += 1;
      return push({
        kind: 'text',
        content: isVar ? VAR : node._content,
        live
      });
    }

    if (!(node instanceof ElementNode)) {
      foldable = false;
      reason ||= 'unsupported-node';
      return -1;
    }

    const dynamic = dynamicKeysOf(node);
    const attrs = [];
    Object.entries(node._attrs || {}).forEach(([name, value]) => {
      const isVar = dynamic.attrs.has(name);
      attrs.push([name, isVar ? VAR : value]);
      counts[isVar ? 'slots' : 'statics'] += 1;
      void value;
    });
    dynamic.attrs.forEach((name) => {
      if (!(node._attrs && name in node._attrs)) {
        attrs.push([name, VAR]);
        counts.slots += 1;
      }
    });

    // 类名：静态部分照录，绑定驱动的类名单独作为槽位
    const classText = node._classText ?? null;
    const dynamicClasses = [...dynamic.classes];
    if (classText) {
      counts.statics += 1;
    }
    dynamicClasses.forEach(() => {
      counts.slots += 1;
    });

    const styles = [];
    Object.entries(node._styles || {}).forEach(([name, value]) => {
      const isVar = dynamic.styles.has(name);
      styles.push([name, isVar ? VAR : value]);
      counts[isVar ? 'slots' : 'statics'] += 1;
    });
    dynamic.styles.forEach((name) => {
      if (!(node._styles && name in node._styles)) {
        styles.push([name, VAR]);
        counts.slots += 1;
      }
    });

    const index = push({
      kind: 'element',
      tag: node._tagName,
      attrs,
      classText,
      styles,
      props: [...dynamic.props],
      live,
      children: []
    });
    counts.elements += 1;

    const children = childrenOf(node);
    const childIndexes = [];
    children.forEach((child) => {
      const childIndex = visit(child);
      if (childIndex !== -1) {
        childIndexes.push(childIndex);
      }
    });
    nodes[index].children = childIndexes;
    return index;
  };

  const rootIndex = visit(root);

  return {
    version: SKELETON_PLAN_VERSION,
    foldable,
    ...(foldable ? {} : { reason }),
    root: rootIndex,
    nodes,
    counts
  };
}

/** 形状签名（不含任何值）：两行内容不同但结构相同 → 同一签名。 */
export function skeletonShapeSignature(plan) {
  const shapeOf = (index) => {
    const node = plan.nodes[index];
    if (node.kind === 'text') {
      return ['t', node.content === VAR ? VAR : '=', node.live.bindings > 0 ? 'b' : ''];
    }

    return [
      'e',
      node.tag,
      node.attrs.map(([name, value]) => [name, value === VAR ? VAR : '=']),
      node.classText ? (node.classText.includes(VAR) ? VAR : '=') : null,
      node.styles.map(([name, value]) => [name, value === VAR ? VAR : '=']),
      node.props.length > 0 ? node.props.join('|') : '',
      `${node.live.bindings}/${node.live.events}/${node.live.delegate ? 1 : 0}`,
      node.children.map(shapeOf)
    ];
  };

  return JSON.stringify(shapeOf(plan.root));
}

/** 完整签名（形状 + 静态值）：用于按形状缓存时区分「同名不同值」的骨架。 */
export function skeletonSignature(plan) {
  const valueOf = (index) => {
    const node = plan.nodes[index];
    if (node.kind === 'text') {
      return ['t', node.content];
    }

    return [
      'e',
      node.tag,
      node.attrs,
      node.classText,
      node.styles,
      node.props,
      `${node.live.bindings}/${node.live.events}/${node.live.delegate ? 1 : 0}`,
      node.children.map(valueOf)
    ];
  };

  return JSON.stringify(valueOf(plan.root));
}

/**
 * 用第二个实例提升 plan：形状一致时，把「第二个实例上取值不同」的字面量降级成槽位。
 * 返回 `{ matches, plan }`；形状不一致（或第一个实例不可折叠）时 `plan` 为 null。
 */
export function promoteSkeleton(plan, root) {
  if (!plan || !plan.foldable) {
    return { matches: false, plan: null };
  }

  const next = clonePlan(plan);
  let matches = true;
  let slots = 0;

  const visit = (index, node) => {
    if (!matches || index === -1 || index === undefined || node === null || node === undefined) {
      matches = false;
      return;
    }

    const record = next.nodes[index];
    const live = liveMarkersOf(node);
    if (
      live.bindings !== record.live.bindings ||
      live.events !== record.live.events ||
      live.delegate !== record.live.delegate
    ) {
      matches = false;
      return;
    }

    if (record.kind === 'text') {
      if (!(node instanceof VTextNode)) {
        matches = false;
        return;
      }
      if (record.content !== VAR && record.content !== node._content) {
        record.content = VAR;
      }
      if (record.content === VAR) {
        slots += 1;
      }
      return;
    }

    if (!(node instanceof ElementNode) || node._tagName !== record.tag) {
      matches = false;
      return;
    }

    const attrs = Object.entries(node._attrs || {});
    if (attrs.length !== record.attrs.length) {
      matches = false;
      return;
    }
    record.attrs = record.attrs.map(([name, value], position) => {
      const [nextName, nextValue] = attrs[position] ?? [];
      if (nextName !== name) {
        matches = false;
        return [name, value];
      }
      if (value !== VAR && value !== nextValue) {
        slots += 1;
        return [name, VAR];
      }
      if (value === VAR) {
        slots += 1;
      }
      return [name, value];
    });

    if (record.classText !== null && record.classText !== (node._classText ?? null)) {
      record.classText = VAR;
    }
    if (record.classText === VAR) {
      slots += 1;
    }

    const children = childrenOf(node);
    if (children.length !== record.children.length) {
      matches = false;
      return;
    }
    record.children.forEach((childIndex, position) => visit(childIndex, children[position]));
  };

  visit(next.root, root);

  if (!matches) {
    return { matches: false, plan: null };
  }

  // 提升只增加槽位（保留录制期已经算出的绑定槽位），静态计数按新槽位下调
  next.counts = {
    ...next.counts,
    slots: next.counts.slots + slots,
    statics: Math.max(0, next.counts.statics - slots)
  };
  next.signature = skeletonSignature(next);
  next.shape = skeletonShapeSignature(next);
  return { matches: true, plan: next };
}

/**
 * 用一份实例把 plan 的槽位填满（dry-run 用）：按前序一一对应读值，返回纯数据副本。
 * 这是「plan + 位置寻址能不能完整复原这棵树」的最小验证工具，不是生产实现。
 */
export function resolveSkeleton(plan, source) {
  const resolved = clonePlan(plan);

  const visit = (index, node) => {
    const record = resolved.nodes[index];
    if (record.kind === 'text') {
      if (record.content === VAR) {
        record.content = node._content;
      }
      return;
    }

    const attrs = Object.entries(node._attrs || {});
    record.attrs = record.attrs.map(([name, value], position) => {
      if (value !== VAR) {
        return [name, value];
      }
      const nextValue = attrs[position]?.[1];
      return [name, nextValue === undefined ? value : nextValue];
    });
    if (record.classText === VAR) {
      record.classText = node._classText ?? null;
    }

    const children = childrenOf(node);
    record.children.forEach((childIndex, position) => {
      if (children[position]) {
        visit(childIndex, children[position]);
      }
    });
  };

  visit(resolved.root, source);
  return resolved;
}

/** 把解析后的 plan 还原成节点树（dry-run 用）：只为等价性验证服务。 */
export function materializeSkeleton(plan) {
  const build = (index) => {
    const record = plan.nodes[index];
    if (record.kind === 'text') {
      return new VTextNode(record.content === VAR ? '' : record.content);
    }

    const node = new ElementNode(record.tag);
    // 序列化顺序必须逐字节一致：attribute 快照里没有 class 时类名排在其它属性之前，
    // 而快照里带 class（`attr('class', …)` 或先写属性后写类名）时按快照自身的顺序写回。
    const hasAttrClass = record.attrs.some(([name]) => name === 'class');
    if (!hasAttrClass && record.classText && record.classText !== VAR) {
      node.className(record.classText);
    }
    record.attrs.forEach(([name, value]) => {
      if (value !== VAR) {
        node.attr(name, value);
      }
    });
    record.styles.forEach(([name, value]) => {
      if (value !== VAR) {
        node.style(name, value);
      }
    });
    record.children.forEach((childIndex) => {
      node.child(build(childIndex));
    });
    return node;
  };

  return build(plan.root);
}

/** plan 的体积与构成统计（探针用）。 */
export function skeletonStats(plan) {
  return {
    version: plan.version,
    foldable: plan.foldable,
    reason: plan.reason ?? null,
    nodes: plan.nodes.length,
    elements: plan.counts.elements,
    texts: plan.counts.texts,
    slots: plan.counts.slots,
    statics: plan.counts.statics,
    bytes: JSON.stringify(plan).length
  };
}
