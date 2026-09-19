import { ComponentNode, ViewNode } from './node.js';
import { adoptProvides, createProviderFrame, withProviderScope } from './context.js';
import { COMPONENT_HOOK_NAMES, registerComponentHooks } from './hooks.js';

/** api 上不允许出现的键：与节点语义冲突，或属于内部实现（下划线前缀）。 */
const RESERVED_COMMAND_KEYS = new Set(['render', 'methods', 'component']);

/**
 * vNode：ComponentNode 的快捷工厂——定义即得到节点，不产生占位元素。
 *
 * setup(api) 里把对外命令方法收到 api 上（`api.reload = () => …`），并返回要渲染的
 * ViewNode（或 ViewNode 数组，按多根 fragment 落实）。工厂在返回节点前把 api 上的
 * 命令挂到节点本身：撞上节点自身 API（`child` / `destroy` / `mountable` …）或内部
 * 字段直接抛错，不静默覆盖。两个约定：
 *
 * - 命令里 `return api` 等价于返回节点，链式调用两头都通；
 * - `api.whenFailed = (error, info) => 降级节点` 声明组件自带的错误边界，等价于
 *   `card.whenFailed(fn)`（与组件对象协议成员同名同义），不按命令合并。
 */
export function vNode(setup) {
  if (typeof setup !== 'function') {
    throw new TypeError('vNode(setup) requires a setup function: vNode((api) => view)');
  }

  const api = {};
  // setup 在节点存在之前就跑了：声明先收在构建帧上，建好节点后再落到它身上，
  // 这样 provide 只作用于本组件子树，不会外溢到同级。
  const frame = createProviderFrame();
  const root = withProviderScope(frame, () => setup(api));
  assertViewRoot(root);

  const node = new ComponentNode({
    render: () => root
  });

  adoptProvides(frame, node);
  // 钩子是协议成员，不挂成命令（与 api.whenFailed 同一族）
  registerComponentHooks(node, api);
  attachCommands(node, api);
  return node;
}

function assertViewRoot(root) {
  const list = Array.isArray(root) ? root : [root];

  list.forEach((item) => {
    if (!(item instanceof ViewNode)) {
      throw new TypeError(
        'vNode(setup) must return a ViewNode or an array of ViewNodes. ' +
          `Received ${describeValue(root)}. Keep command methods on the api argument ` +
          'and return the view from the setup callback.'
      );
    }
  });
}

function describeValue(value) {
  if (Array.isArray(value)) {
    return 'an array containing a non-node value';
  }

  if (value === null || value === undefined) {
    return String(value);
  }

  return `a ${typeof value}`;
}

function attachCommands(node, api) {
  Object.keys(api).forEach((key) => {
    const command = api[key];

    if (typeof command !== 'function') {
      throw new TypeError(
        `vNode api.${key} must be a function: the api object only collects command methods.`
      );
    }

    // whenFailed 是错误边界声明，不是命令：路由到节点方法，语义同组件协议成员
    if (key === 'whenFailed') {
      node.whenFailed(command);
      return;
    }

    // whenMount / whenDestroy 已在 registerComponentHooks 里登记，不再当命令挂上去
    if (COMPONENT_HOOK_NAMES.has(key)) {
      return;
    }

    if (RESERVED_COMMAND_KEYS.has(key) || key.startsWith('_') || key in node) {
      throw new TypeError(
        `vNode command "${key}" collides with the node API. Rename it ` +
          '(for example "reloadAction" / "onReload"); node members such as child / attr / ' +
          'destroy stay reserved, and error boundaries go to api.whenFailed.'
      );
    }

    node[key] = (...args) => {
      const result = command.apply(api, args);
      return result === api ? node : result;
    };
  });
}
