/**
 * 组件级钩子（票 42 / T5）：`whenMount` / `whenDestroy`，与 `whenFailed` 同族的协议成员。
 *
 * 纪律（内存口径，见票 42 讨论）：
 * - **惰性**：没有钩子的组件一个字段都不加（`_whenHooks` 只在有钩子时创建）；
 * - **不 bind**：调用时 `handler.call(self)`，避免每实例一个新函数（+88 B/实例）；
 * - **单属性**：一个 `_whenHooks` 记录放两个钩子，不留数组（+104 B/实例）；
 * - **销毁即放引用**：触发后置空，死节点不会通过闭包留住用户对象。
 *
 * 时机：`whenMount` 在节点真正落到 DOM 时触发（挂载条件转假再转真会再次触发）；
 * `whenDestroy` 在**子树销毁之前**触发，幂等。
 *
 * 两个钩子都**收到宿主上下文对象**（`host.element()`：单根组件的根元素，多根 / 未落地为 null）：
 * 用对象而不是裸元素，是为了以后加成员（节点、构建期上下文、阶段…）不再改签名。
 * 第三方集成不需要自己去抓节点句柄——需要真实元素就在钩子上拿，库实例存回 api / 组件对象
 * （`this` 就是它们），结构表达式保持纯声明。
 */

/** 只在组件协议（vNode 的 api / 形态 B 的返回对象）里识别的钩子名。 */
export const COMPONENT_HOOK_NAMES = new Set(['whenMount', 'whenDestroy']);

/** 正在收口的落地趟：非 null 时新触发的 `whenMount` 先登记，收口统一触发。 */
let landingDepth = 0;
let landingQueue = null;

/** 保留名：出现在 options 对象里就是放错位置，要报错而不是静默当事件 / 属性。 */
export const RESERVED_HOOK_NAMES = new Set(['whenMount', 'whenDestroy', 'whenFailed']);

/** 从组件协议对象上登记钩子（有才建字段）。 */
export function registerComponentHooks(node, source) {
  const hooks = {};

  COMPONENT_HOOK_NAMES.forEach((name) => {
    if (typeof source?.[name] === 'function') {
      hooks[name] = source[name];
    }
  });

  if (hooks.whenMount === undefined && hooks.whenDestroy === undefined) {
    return node;
  }

  hooks.self = source;
  hooks.mounted = false;
  node._whenHooks = hooks;
  return node;
}

/** 节点真正落到 DOM：每次落地触发一次。 */
export function fireWhenMount(node) {
  // 钩子归属链：元素属于**视图根**（而不是定义它的那个节点）时，事件要沿链落到内层——
  // 透明包装（`vClientOnly` 自己没有元素）与"组件嵌组件"（视图根本身是另一个组件）两种形状
  // 都会把事件吞掉，见 `viewRoots()` 的口径。
  const roots = typeof node?.viewRoots === 'function' ? node.viewRoots() : null;

  if (roots !== null) {
    for (let index = 0; index < roots.length; index += 1) {
      if (roots[index] !== node) {
        fireWhenMount(roots[index]);
      }
    }
  }

  // 落地收口（票 02）：一趟落地（`bindTo` / `mount` / `hydrate`）里先登记，收口时统一触发
  // ——那时元素已经挂进文档，第三方集成可以直接测量，不必自己补 rAF。
  if (node._whenHooks !== undefined) {
    if (landingQueue !== null) {
      landingQueue.add(node);
      return;
    }

    fireWhenMountNow(node);
  }
}

/**
 * 落地收口：`bindTo` / `mount` / `hydrate` 用它把整趟落地的钩子收成一次。
 * 可重入（收口过程中又触发一次落地会并进同一趟，直到最外层收口）。
 */
export function beginLanding() {
  landingDepth += 1;
  if (landingQueue === null) {
    landingQueue = new Set();
  }
}

export function endLanding() {
  landingDepth -= 1;
  if (landingDepth > 0) {
    return;
  }

  const queue = landingQueue;
  landingQueue = null;
  if (queue !== null) {
    queue.forEach(fireWhenMountNow);
  }
}

/** 收口与非收口共用的一次触发本体（幂等 + "确实落在树上"守卫）。 */
function fireWhenMountNow(node) {
  const hooks = node?._whenHooks;
  if (!hooks || hooks.mounted === true || typeof hooks.whenMount !== 'function') {
    return;
  }
  // 收口时节点可能已经离场（条件在落地过程中转假 / 渲染失败）：没挂上就不触发，留给下次落地
  if (!landedInTree(node)) {
    return;
  }

  hooks.mounted = true;
  try {
    hooks.whenMount.call(hooks.self, hookContext(node, hooks));
  } catch (error) {
    // 钩子抛错必须可见，但**不做渲染降级**：结构已经落地，没有"替换节点"的语义，
    // 降级会引出"fallback 自己再抛错"的回环。是否降级由组件自己决定。
    reportHookError('whenMount', error);
  }
}

/** 这个组件的 DOM 是否已经接进它的父元素（`bindTo` 的目标可以不在文档里，所以只看父链）。 */
function landedInTree(node) {
  const dom = node?._fragmentDom ?? (node?._el ? [node._el] : []);
  return dom.length > 0 && dom.some((element) => element?.parentNode);
}

/** 挂载条件把节点摘下来：允许下次落地再次触发 whenMount。 */
export function rearmWhenMount(node) {
  const hooks = node?._whenHooks;
  if (hooks) {
    hooks.mounted = false;
  }

  // 内层视图根一起重新武装（透明包装 / 组件嵌组件：真正触发的是它们）
  const roots = typeof node?.viewRoots === 'function' ? node.viewRoots() : null;
  if (roots !== null) {
    roots.forEach(rearmWhenMount);
  }
}

/** 子树销毁前触发；幂等，触发后释放引用。 */
export function fireWhenDestroy(node) {
  const hooks = node?._whenHooks;
  if (!hooks || hooks.destroyed === true) {
    return;
  }

  hooks.destroyed = true;
  const handler = hooks.whenDestroy;
  const self = hooks.self;
  const context = hookContext(node, hooks);
  node._whenHooks = null;

  if (typeof handler === 'function') {
    try {
      handler.call(self, context);
    } catch (error) {
      // 销毁期抛错绝不能中断清理链（否则就是泄漏）；同样只上报、不降级。
      reportHookError('whenDestroy', error);
    }
  }
}

/**
 * 钩子上下文：复合对象，每个带钩子的组件按需建一次（没有钩子的组件一个字段都不加）。
 * 目前只有 `element()`，以后加成员（节点、上下文…）不改钩子签名。
 */
function hookContext(node, hooks) {
  if (hooks.context === undefined) {
    hooks.context = {
      element: () => componentElement(node)
    };
  }

  return hooks.context;
}

/**
 * 宿主元素：单根组件是它的根元素，多根组件（`_fragmentDom`）没有单一元素 → null。
 * **每次读取都现取**（换根 / 重新落地不会拿到陈旧元素），未落地时同样是 null。
 */
function componentElement(node) {
  if (!node || node._fragmentDom) {
    return null;
  }

  return node._el ?? null;
}

/** 钩子错误的统一上报口径：console + devtools（走 globalThis 共享 bridge，未装 devtools 时 no-op）。 */
function reportHookError(hookName, error) {
  if (typeof console !== 'undefined') {
    console.error(`[yoya] ${hookName} hook failed`, error);
  }

  const bridge =
    typeof globalThis === 'undefined'
      ? null
      : globalThis[Symbol.for('yoya.devtools.bridge')] || null;
  if (bridge && typeof bridge.emit === 'function' && bridge.enabled?.() !== false) {
    try {
      bridge.emit({ type: 'error', phase: hookName, source: null, error });
    } catch {
      // devtools 自身失败不影响运行
    }
  }
}
