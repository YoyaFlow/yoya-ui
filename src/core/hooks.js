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
 */

/** 只在组件协议（vNode 的 api / 形态 B 的返回对象）里识别的钩子名。 */
export const COMPONENT_HOOK_NAMES = new Set(['whenMount', 'whenDestroy']);

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
  const hooks = node?._whenHooks;
  if (!hooks || hooks.mounted === true || typeof hooks.whenMount !== 'function') {
    return;
  }

  hooks.mounted = true;
  try {
    hooks.whenMount.call(hooks.self);
  } catch (error) {
    // 钩子抛错必须可见，但**不做渲染降级**：结构已经落地，没有"替换节点"的语义，
    // 降级会引出"fallback 自己再抛错"的回环。是否降级由组件自己决定。
    reportHookError('whenMount', error);
  }
}

/** 挂载条件把节点摘下来：允许下次落地再次触发 whenMount。 */
export function rearmWhenMount(node) {
  const hooks = node?._whenHooks;
  if (hooks) {
    hooks.mounted = false;
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
  node._whenHooks = null;

  if (typeof handler === 'function') {
    try {
      handler.call(self);
    } catch (error) {
      // 销毁期抛错绝不能中断清理链（否则就是泄漏）；同样只上报、不降级。
      reportHookError('whenDestroy', error);
    }
  }
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
