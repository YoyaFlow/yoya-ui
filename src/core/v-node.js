import { ComponentNode, SHADOWABLE_DEFERRED_METHOD_NAMES, ViewNode } from './node.js';
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
 * - 第二个参数 `self` 是组件自己的句柄（与 `whenMount` 收到的 `host` 同族，只有取用方法）：
 *   `self.node()` 给出**组件节点本身**。节点要等 setup 返回后才建，所以句柄放取用方法而不是字段——
 *   在 setup 里提前取会**直接报错**（时机不对就说时机不对，不静默给 null）。命令要往组件里加内容就写
 *   `self.node().child(part)`：part 自带的 `vn_slot` 标记决定它落哪个占位（自动投影见 core/slot.js
 *   的 part 通道），命令既不用自己找占位，也不用 `let root` 这类捕获。
 *
 * 句柄放在**第二个参数**而不是 api 上：api 的键归组件自己的命令所有（例如 VTree 就有 `api.node`），
 * 内部句柄占 api 的名会和真实命令撞名。
 *
 * 命令与钩子里的实例状态挂在 **api** 上（写成 `api.instance = …`，别写 `this`：api 在 setup 的
 * 词法作用域里，而 `this` 只在函数表达式下才等于 api，箭头命令里不是）。结构与状态分开写——
 * 视图表达式保持纯声明，需要真实元素时从钩子给的宿主上下文 `whenMount((host) => host.element())` 拿。
 */
export function vNode(setup) {
  if (typeof setup !== 'function') {
    throw new TypeError('vNode(setup) needs a setup function: vNode((api, self) => view)');
  }

  const api = {};
  // 组件节点句柄：节点要等 setup 返回后才建（上下文快照按建完 setup 的时机取），
  // 所以按取用方法暴露；提前取（setup 期间）直接抛错，不退化成 null。
  let instance = null;
  const self = { node: () => instance || failNodeTiming() };
  // setup 在节点存在之前就跑了：声明先收在构建帧上，建好节点后再落到它身上，
  // 这样 provide 只作用于本组件子树，不会外溢到同级。
  const frame = createProviderFrame();
  const root = withProviderScope(frame, () => setup(api, self));
  assertViewRoot(root);

  // 组件定义就是一个函数（票 07）：`ComponentNode` 只收函数，懒解析时调它拿视图。
  const node = new ComponentNode(() => root);
  instance = node;

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
        'vNode(setup) must return a ViewNode or an array of ViewNodes; got ' +
          `${Array.isArray(root) ? 'a non-node in the array' : String(root)}.`
      );
    }
  });
}

function failNodeTiming() {
  throw new Error('vNode: self.node() is for commands; the node exists after setup returns.');
}

function attachCommands(node, api) {
  Object.keys(api).forEach((key) => {
    const command = api[key];

    if (typeof command !== 'function') {
      throw new TypeError(
        `vNode api.${key} must be a function: api only collects command methods.`
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

    // 委托到视图根的元素级方法（`attr` / `id` / `name` / `style`…）允许被命令**遮蔽**：
    // `api.name = () => …` 这类命名是合法用法，命令挂到组件节点上就是同名覆盖。
    const collides = key in node && !SHADOWABLE_DEFERRED_METHOD_NAMES.has(key);
    if (RESERVED_COMMAND_KEYS.has(key) || key.startsWith('_') || collides) {
      throw new TypeError(
        `vNode command "${key}" collides with the node API: child / destroy / render ` +
          'are reserved.'
      );
    }

    node[key] = (...args) => {
      const result = command.apply(api, args);

      return result === api ? node : result;
    };
  });
}
