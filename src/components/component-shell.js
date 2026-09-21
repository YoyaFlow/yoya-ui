/**
 * 组件外壳工厂（波 1 迁移口径，见 `.scratch/vnode-convergence/issues/11`）。
 *
 * 有些组件族的元素机制必须留在**节点类型**里（族内互相 `new`、覆盖 `child()`、DOM 测量与事件绑定），
 * 但对外应该是 **vNode 组件**（身份判定 + 命令面 + 子工厂）。这个模块把两者的接缝固定下来：
 *
 * 1. `createNode(setup)` 建**不导出**的节点类型实例（元素机制的真源）；
 * 2. `vNode` 把它包成组件节点，`commands` 委托到节点上（返回节点时映射回 `api` → 链式）；
 * 3. 首个参数是函数时**推迟到组件节点建好之后**再调用，于是回调拿到的句柄与工厂返回值
 *    是同一个组件节点（旧类组件契约不变）；
 * 4. `childFactories` 把族内子工厂（`menu.vMenuItem(…)`）转发给根节点——组件级的 DSL 调用照旧可用。
 */
import { applySetupValue, componentNameOf } from '../core/node.js';
import { vNode } from '../core/v-node.js';

/** 复用同类组件实例（旧 `createComponentFactory` 的语义）：`vMenu(existingMenu)` 返回它自己。 */
export function reuseComponent(value, name) {
  return componentNameOf(value) === name ? value : null;
}

/** 命令委托：把节点上的同名方法挂到 api 上；节点返回自己时映射成 `api`。 */
export function delegateCommands(api, node, names) {
  names.forEach((name) => {
    api[name] = (...args) => {
      const result = node[name](...args);
      return result === node ? api : result;
    };
  });
}

/**
 * 容器组件上的子工厂调用（`menu.vMenuItem(…)`）：转发给根节点并返回 `api`。
 * 只转发该族自己的子工厂，避免把整套 DSL 复制到每个实例上。
 */
export function delegateChildFactories(api, node, names) {
  names.forEach((name) => {
    const factory = node[name];
    if (typeof factory !== 'function' || name in api) {
      return;
    }
    api[name] = (...args) => {
      factory.apply(node, args);
      return api;
    };
  });
}

export function createComponentShell({
  identity,
  createNode,
  commands = [],
  childFactories = [],
  args
}) {
  const [first = null, second = null, third = null, ...rest] = args;
  const reused = reuseComponent(first, identity);
  if (reused) {
    return reused;
  }

  const deferredCallback = typeof first === 'function' ? first : null;
  const node = vNode((api) => {
    const element = createNode(deferredCallback ? null : first);
    delegateCommands(api, element, commands);
    if (childFactories.length > 0) {
      delegateChildFactories(api, element, childFactories);
    }
    return element;
  });

  if (deferredCallback) {
    applySetupValue(node, deferredCallback);
  }
  applySetupValue(node, second);
  applySetupValue(node, third);
  rest.forEach((value) => applySetupValue(node, value));
  return node;
}
