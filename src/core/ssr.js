import { ComponentNode, resolveTarget, ViewNode } from './node.js';
import { createIdAllocator, withIdAllocator } from './id.js';

/**
 * 统一解析组件为 ViewNode，支持三种形态：
 * 函数工厂（接收 initialState）、带 render() 的对象组件、ViewNode 实例。
 */
function createRootNode(component, state = null) {
  if (component instanceof ViewNode) {
    return component;
  }

  if (typeof component === 'function') {
    return createRootNode(component(state), state);
  }

  if (component && typeof component.render === 'function') {
    return createRootNode(component.render(), state);
  }

  throw new TypeError(
    'renderToString/mount requires a ViewNode, a component object with render(), or a factory function'
  );
}

/**
 * 统计视图树节点数，供服务端输出上限策略使用。
 */
function countNodes(node) {
  let count = 1;

  if (typeof node.children === 'function') {
    node.children().forEach((child) => {
      count += countNodes(child instanceof ComponentNode ? child._resolve() : child);
    });
  }

  return count;
}

/**
 * 服务端把组件渲染成 HTML 字符串，并把初始状态序列化（安全内联到 script）。
 * maxNodes 超限时返回 exceeded，服务端可回退客户端渲染。
 */
export function renderToString(component, options = {}) {
  const { maxNodes = Infinity, state = null } = options || {};
  const serialized = serializeState(state);

  return withIdAllocator(createIdAllocator(), () => {
    const ownsTree = typeof component === 'function';
    const node = createRootNode(component, state);
    let result;

    try {
      if (countNodes(node) > maxNodes) {
        result = { exceeded: true, html: '', state: serialized };
      } else {
        result = { exceeded: false, html: node.toHTML(), state: serialized };
      }
    } finally {
      if (ownsTree) {
        node.destroy();
      }
    }

    return result;
  });
}

/**
 * 序列化首屏状态为 JSON 字符串，`<` 转义为 \u003c，可安全嵌入 <script>。
 */
export function serializeState(state) {
  if (state === null || state === undefined) {
    return null;
  }

  return JSON.stringify(state).replace(/</g, '\\u003c');
}

/**
 * 解析序列化状态；null/空串返回 null。
 */
export function parseState(serialized) {
  if (serialized === null || serialized === undefined || serialized === '') {
    return null;
  }

  return JSON.parse(serialized);
}

/**
 * 客户端全量重建挂载：以 initialState 创建组件树，替换目标容器内容并绑定事件。
 */
export function mount(component, target, state = null) {
  return withIdAllocator(createIdAllocator(), () => {
    const node = createRootNode(component, state);
    const parent = resolveTarget(target);

    if (parent) {
      parent.replaceChildren();
      parent.appendChild(node.renderDom());
    }

    return node;
  });
}
