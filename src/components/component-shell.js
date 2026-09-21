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
 * 5. 节点类型上的**公开方法自动补齐**到命令面：构造函数里挂的开关（`booleanMethod` 产出的
 *    `disabled()` / `error()`）不在原型上，手工清单漏一个就会静默失效（迁移表单控件时踩到：
 *    `vTimer().disabled()` 直接不存在）。清单仍是文档口径，自动补齐是兜底。
 */
import { ComponentNode, applySetupValue, componentNameOf } from '../core/node.js';
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

/** 节点类型上有、组件节点上还没有的公开方法名（内部 `_xxx` 与节点既有 API 之外）。 */
function missingCommandNames(api, element) {
  const names = [];
  const seen = new Set();

  const collect = (source) => {
    if (!source) {
      return;
    }

    Object.getOwnPropertyNames(source).forEach((name) => {
      if (seen.has(name) || name === 'constructor' || name.startsWith('_')) {
        return;
      }

      seen.add(name);
      if (name in api || name in ComponentNode.prototype || typeof element[name] !== 'function') {
        return;
      }

      names.push(name);
    });
  };

  collect(element);
  let prototype = Object.getPrototypeOf(element);
  while (prototype && prototype !== Object.prototype) {
    collect(prototype);
    prototype = Object.getPrototypeOf(prototype);
  }

  return names;
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
  let element = null;
  const node = vNode((api) => {
    element = createNode(deferredCallback ? null : first);
    delegateCommands(api, element, commands);
    delegateCommands(api, element, missingCommandNames(api, element));
    if (childFactories.length > 0) {
      delegateChildFactories(api, element, childFactories);
    }
    return element;
  });

  // 回调 / 事件里要把"组件句柄"交回使用方时，节点类型上的 `this` 得让位给组件节点
  // （旧类组件里两者是同一个对象）。
  element._componentHandle = node;

  if (deferredCallback) {
    applySetupValue(node, deferredCallback);
  }

  // 其余参数按旧 `createComponentFactory` 的口径落到**节点类型**上（元素配置 / 子节点），
  // 函数仍是构建回调、拿到的是组件节点（对外句柄）。
  [second, third, ...rest].forEach((value) => {
    applySetupValue(typeof value === 'function' ? node : element, value);
  });

  // 外壳的根在构造里就已经建好，"懒解析"没有收益：反而会让"先搭后查"的用法查不到内容
  // （`form.child(item); form.validate()` 在旧类组件上是查得到的，见 SSR 示例页）。
  node._resolve();
  return node;
}
