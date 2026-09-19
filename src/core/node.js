// HTML 布尔属性序列化时只需要属性名即可表示启用。
import { currentAccess, parseAccessSpec, withAccess } from './access.js';
import { snapshotContext, withContext, withProviderScope } from './context.js';
import { isSignal, ref } from './signals/handle.js';
import { optionKindOf } from './setup-keys.js';
import {
  COMPONENT_HOOK_NAMES,
  fireWhenDestroy,
  fireWhenMount,
  rearmWhenMount,
  registerComponentHooks
} from './hooks.js';
import {
  collectSlots,
  createSlotRegistry,
  projectSlot,
  reclaimSlot,
  registerSlotContent,
  slotNameOf
} from './slot.js';
import { isKeySet } from './key-set.js';
import { currentSignals } from './signals/contract.js';
import { beginCollect, endCollect, setReadObserver } from './signals/deps.js';
import { createReactiveTarget } from './signals/runtime.js';
import { trackedSubscribe, trackRegionOwner } from './signals/observe.js';
import {
  cancelScheduledRegionRebuild,
  isSignalsBatchActive,
  scheduleRegionRebuild
} from './signals/schedule.js';

// 区域环境恢复需要读取/恢复字符串快捷写法实例；i18n.js 依赖本模块，
// 因此用注册方式桥接，避免循环引用。
let i18nScopeBridge = null;

/** 由 i18n.js 注册：区域重建时读取与恢复字符串快捷写法实例。 */
export function registerI18nScopeBridge(bridge) {
  i18nScopeBridge = bridge;
}

// Devtools 运行时通过 globalThis 上的共享 bridge 接入，保证主入口与独立
// devtools 子路径各自打包时仍共享同一开关/事件流；未导入 devtools 时全部 no-op。
const devtoolsBridgeKey = Symbol.for('yoya.devtools.bridge');

function currentDevtoolsBridge() {
  return typeof globalThis === 'undefined' ? null : globalThis[devtoolsBridgeKey] || null;
}

function isDevtoolsEnabled() {
  const bridge = currentDevtoolsBridge();
  return bridge ? bridge.enabled() : false;
}

function emitDevtools(event) {
  const bridge = currentDevtoolsBridge();
  if (bridge) {
    bridge.emit(event);
  }
}

function unregisterDevtoolsNode(node) {
  const bridge = currentDevtoolsBridge();
  if (bridge) {
    bridge.unregister(node);
  }
}

function captureDevtoolsNodeScope(node) {
  const bridge = currentDevtoolsBridge();
  if (bridge) {
    bridge.captureScope(node);
  }
}

function ensureDevtoolsNodeId(node) {
  const bridge = currentDevtoolsBridge();
  return bridge ? bridge.ensureId(node) : undefined;
}

function notifyDevtoolsMutation(node, type, details) {
  const bridge = currentDevtoolsBridge();
  if (bridge) {
    bridge.notify(node, type, details);
  }
}

function commitDevtoolsNode(node) {
  const bridge = currentDevtoolsBridge();
  if (bridge) {
    bridge.commit(node);
  }
}

const booleanAttributes = new Set(['checked', 'disabled', 'readonly', 'selected']);

// access 写锁会禁用的可交互标签；readonly 仅对 input / textarea 生效。
const accessDisabledTags = new Set([
  'input',
  'select',
  'textarea',
  'button',
  'fieldset',
  'option',
  'optgroup',
  'keygen'
]);
const accessReadOnlyTags = new Set(['input', 'textarea']);

// 渲染期作用域栈：自上而下携带“最近声明的权限”，供子元素继承（就近覆盖）。
const renderScopeStack = [];

function currentInheritedScope() {
  return renderScopeStack.length > 0 ? renderScopeStack[renderScopeStack.length - 1] : null;
}

function withRenderScope(spec, build) {
  renderScopeStack.push(spec);
  try {
    return build();
  } finally {
    renderScopeStack.pop();
  }
}

/**
 * 值绑定：字段只放构造期就能定的量，方法走原型。
 * 绑定是「每行都有一两个」的对象，实例闭包（evaluate/activate/release 转发）
 * 会让开销按行累加，这里全部收进原型方法。
 */
class NodeBinding {
  constructor(owner, kind, key, commit, list) {
    this.commit = commit;
    this.committed = false;
    this.key = key;
    this.kind = kind;
    this.last = undefined;
    this.list = list;
    this.owner = owner;
    this.target = null;
  }

  evaluate() {
    return this.target.evaluate();
  }

  activate() {
    this.target.activate();
  }

  release() {
    this.target.release();
  }

  /** 响应式目标的提交点：值变化时写回 DOM（值未变化时 commitBindingValue 会跳过）。 */
  onValue(value) {
    commitBindingValue(this, value);
  }
}

// 值绑定的数据来源只有两种：signal 句柄（推荐）与零参闭包。闭包自己闭住外部数据，
// 需要重新求值时用 flush() / flushAll()。带参函数只服务过节点级状态，已一并移除。
function registerNodeBinding(owner, kind, key, read, commit) {
  if (typeof read === 'function' && read.length > 0) {
    throw new TypeError(parameterizedValueError(kind, key));
  }

  // 归属：区域构建期登记的绑定归区域所有（重跑时统一释放），其余直接挂在节点自己的
  // 绑定数组上——不再为每个有绑定的节点多建一层 { bindings: [] } 作用域对象。
  const scope = bindingScopeFor(owner);
  const binding = new NodeBinding(owner, kind, key, commit, null);
  binding.target = createReactiveTarget({ read, sink: binding });
  bindingSerial += 1;

  // 名单首次写入走统一写入口（字面量数组，见 appendNodeEntry）。
  if (scope) {
    // 区域绑定除了区域名单，还要留在所属节点名下：区域按名单整体释放，
    // 节点销毁 / 区域换子时按自身名单收集。
    scope.bindings = appendNodeEntry(scope.bindings, binding);
    binding.list = scope.bindings;
    if (owner instanceof ViewNode) {
      owner._bindings = appendNodeEntry(owner._bindings, binding);
    }
  } else {
    owner._bindings = appendNodeEntry(owner._bindings, binding);
    binding.list = owner._bindings;
  }

  afterRegisterBinding(owner);
  return binding;
}

/** 构建之外的登记（链式写法、挂载后追加）立刻求值一次；构建期由 setup() 统一刷。 */
function afterRegisterBinding(owner) {
  if (setupStack.length === 0 && regionBuildStack.length === 0) {
    flushBindingsIn(owner);
  }
}

/**
 * 绑定归属：区域构建期登记的绑定归区域所有（重跑时统一释放）。
 * 其余节点不需要额外的作用域对象——直接用自己的绑定数组，返回 null。
 * 非节点 owner（组件对象）保留一个兜底名单，保证仍能被释放。
 */
function bindingScopeFor(owner) {
  const region = activeRegion();
  if (region && region._regionScope) {
    return region._regionScope;
  }

  if (owner instanceof ViewNode) {
    return null;
  }

  if (!owner._ownBindingScope) {
    owner._ownBindingScope = { bindings: null };
  }

  return owner._ownBindingScope;
}

function parameterizedValueError(kind, key) {
  return (
    `parameterized value is no longer supported (${kind}${key ? ` "${key}"` : ''}); ` +
    'pass a ref/computed handle or use a zero-argument closure'
  );
}

/**
 * 读取节点的挂载条件：布尔常量、句柄或零参闭包都在这里求值。
 * 值单元与句柄的读取都发生在绑定的收集上下文里，因此替换条件 / 句柄写入都会重算。
 */
function resolveMountCondition(node) {
  const current = node._mountConditionRef ? node._mountConditionRef.value : true;

  if (typeof current === 'function') {
    return Boolean(current());
  }

  if (isSignal(current)) {
    return Boolean(current.value);
  }

  return Boolean(current);
}

/**
 * 组件 props 分发：值是 signal 句柄时登记只读绑定，否则按普通值落地。
 * 只拦截句柄——函数值仍是既有语义（回调型 prop 不受影响）；写回由显式事件处理器负责。
 */
export function applyPropValue(owner, value, setter) {
  if (isSignal(value)) {
    registerNodeBinding(owner, 'prop', null, () => value.value, setter);
    return owner;
  }

  setter(value);
  return owner;
}

// 区域构建上下文：区域构建/重跑期间登记的绑定归该区域所有。
const regionBuildStack = [];
const setupStack = [];
let bindingSerial = 0; // 构建期绑定登记序号：用于判断一次构建是否产出了待求值的绑定

function activeRegion() {
  if (regionBuildStack.length > 0) {
    return regionBuildStack[regionBuildStack.length - 1];
  }

  // 首次构建时，区域声明发生在 setup 执行过程中：向外找最近的已声明区域。
  for (let index = setupStack.length - 1; index >= 0; index -= 1) {
    const node = setupStack[index];
    if (node._rebuildable && node._regionScope) {
      return node;
    }
  }

  return null;
}

function withRegionBuild(region, run) {
  regionBuildStack.push(region);
  try {
    return run();
  } finally {
    regionBuildStack.pop();
  }
}

/** 当前是否正在该区域自己的 builder 内构建。 */
function isBuildingRegion(region) {
  if (regionBuildStack.includes(region)) {
    return true;
  }

  return region._rebuildable === true && setupStack.includes(region);
}

/** 区域节点的子节点只能由它自己的 builder 产出。 */
function assertRegionChildAllowed(node) {
  // 槽位投影是例外：投影的内容归**宿主**所有，区域只是它的投影点（否则区域重建会把外部内容一起销毁）。
  if (node._rebuildable && !isBuildingRegion(node) && slotProjectionDepth === 0) {
    throw new TypeError(
      'region children must come from the region builder; call rebuild() to rebuild the region'
    );
  }
}

/** 槽位投影期间允许向区域节点挂入外部内容（见 assertRegionChildAllowed）。 */
let slotProjectionDepth = 0;

/** 把宿主登记的内容挂进槽位元素（区域也允许）。 */
export function appendProjectedNodes(slotElement, nodes) {
  slotProjectionDepth += 1;
  try {
    slotElement.child(nodes);
  } finally {
    slotProjectionDepth -= 1;
  }
}

/** 收集节点及其子树名下的绑定。 */
function collectRegionBindings(node, out = []) {
  node._bindings?.forEach((binding) => out.push(binding));
  childTraversalRoots(node).forEach((child) => collectRegionBindings(child, out));
  return out;
}

/** 子树遍历口径：组件节点给出它的解析结果，父级据此发现子树里的区域与绑定。 */
export function childTraversalRoots(node) {
  if (!(node instanceof ComponentNode)) {
    return node._children;
  }

  return node._resolveList();
}

/** 摘掉名单里的一个绑定；列表顺序参与语义（刷新顺序）时用 splice，否则末位补位。 */
function dropBinding(list, binding, keepOrder) {
  const index = list.indexOf(binding);
  if (index === -1) {
    return;
  }

  if (keepOrder) {
    list.splice(index, 1);
    return;
  }

  const last = list.pop();
  if (last !== binding) {
    list[index] = last;
  }
}

/** 解除给定绑定：从所属名单与 owner 名下同时移除。 */
function releaseBindings(bindings) {
  bindings.forEach((binding) => {
    binding.release();

    const owner = binding.owner;
    const ownerBindings = owner instanceof ViewNode ? owner._bindings : null;
    const list = binding.list;

    if (list === ownerBindings) {
      if (list) {
        dropBinding(list, binding, true);
      }
      return;
    }

    // 区域名单只用于释放（顺序不参与语义），节点自身名单保持登记顺序
    if (list) {
      dropBinding(list, binding, false);
    }
    if (ownerBindings) {
      dropBinding(ownerBindings, binding, true);
    }
  });
}

/**
 * 销毁路径专用：一次释放本节点名下的全部绑定。
 * 节点名单整体丢弃（不再逐条 indexOf + splice），只有区域名单需要摘掉——
 * 它的顺序不参与语义，用 O(1) 的末位补位。
 */
function releaseOwnBindings(node) {
  const bindings = node._bindings;
  if (!bindings || bindings.length === 0) {
    return;
  }

  bindings.forEach((binding) => {
    binding.release();
    const list = binding.list;
    if (list && list !== bindings) {
      dropBinding(list, binding, false);
    }
    binding.list = null;
  });
  bindings.length = 0;
}

/**
 * 整棵子树的 DOM 是否已经（或正在）随某个祖先元素离开文档。
 * 大于 0 时逐节点的 removeChild 没有意义（元素不再可达），直接跳过。
 */
let detachedDestroyDepth = 0;

/**
 * 库自己发起的「整批摘除」（keyed 清空整表等）的深度。
 * 大于 0 时子树内的元素级监听退订也可以整段跳过：元素随整批一起离开文档，
 * 标签页里也没有任何引用能再派发事件给它。
 * 只由库的批量路径进入——用户调用 destroy() 时仍逐条退订（既有契约与用例依赖它）。
 */
let batchDestroyDepth = 0;

/** 在「DOM 已随祖先摘除」的语境里销毁一个节点：委托公开 destroy()，保留子类覆写。 */
function destroyInDetached(node) {
  detachedDestroyDepth += 1;
  try {
    node.destroy();
  } finally {
    detachedDestroyDepth -= 1;
  }
}

/** 整批摘除的入口节点：DOM 与元素级监听都整段处理。 */
function destroyDetached(node) {
  batchDestroyDepth += 1;
  try {
    destroyInDetached(node);
  } finally {
    batchDestroyDepth -= 1;
  }
}

/** 写回一次绑定值；值未变化时不触碰 DOM。 */
function commitBindingValue(binding, next) {
  if (!binding.committed || !Object.is(next, binding.last)) {
    binding.committed = true;
    binding.last = next;
    try {
      binding.commit(next);
    } catch (error) {
      const phase = setupStack.length > 0 || regionBuildStack.length > 0 ? 'build' : 'update';
      captureNodeError(binding.owner, error, phase);
    }
  }
}

/** 节点及其子树的绑定进入 DOM 后开始订阅依赖（服务端只求值不订阅）。 */
function activateBindings(node) {
  const bindings = node._bindings;
  if (bindings) {
    // 索引循环：绑定激活是每节点一次的热路径，不为它建闭包
    for (let index = 0; index < bindings.length; index += 1) {
      const binding = bindings[index];
      if (typeof binding.activate === 'function') {
        binding.activate();
      }
    }
  }

  activateRegion(node);
}

/** 收口区域内联捕获：builder 结束后记录本次依赖。 */
function closeRegionCapture(node) {
  const token = node._regionCaptureToken;
  if (!token) {
    return;
  }

  node._regionCaptureToken = null;
  node._regionSources = endCollect(token);
  node._regionAdapter = node._regionAdapter || currentSignals();
}

/**
 * dev 护栏：区域 builder 里「rebuildable() 之前」读到的信号不会成为依赖
 * （语义是「声明之后读到的才算」），这类写法今天会静默失效——数据变了界面不动。
 * 只在 devtools 开启时记账，生产路径一次布尔判断即返回。
 */
const preRegionReads = new WeakMap();

setReadObserver((_source) => {
  if (!isDevtoolsEnabled()) {
    return;
  }

  const node = setupStack[setupStack.length - 1];
  if (!node || node._regionCaptureToken || node._deleted) {
    return;
  }

  const record = preRegionReads.get(node) || { count: 0, stack: null };
  record.count += 1;
  // 只留第一处：护栏的价值在定位，不在计数
  record.stack = record.stack || new Error('[yoya] 区域声明前的读取').stack;
  preRegionReads.set(node, record);
});

/** 收口护栏记账：只有真的声明的区域才报（普通节点读快照是合法写法）。 */
function reportPreRegionReads(node) {
  const record = preRegionReads.get(node);
  if (!record) {
    return;
  }

  preRegionReads.delete(node);

  if (!node._rebuildable) {
    return;
  }

  console.warn(
    `[yoya] rebuildable() 之前的 ${record.count} 次读取不会成为区域依赖：` +
      '把 rebuildable() 提到 builder 第一行，或改用 handle.peek() 表示「只读不订阅」。' +
      (record.stack ? `\n${record.stack}` : '')
  );
}

/** 区域进入 DOM 后订阅自己读到的 signal；服务端不订阅。 */
function activateRegion(node) {
  if (!node._rebuildable || node._regionActive) {
    return;
  }

  node._regionActive = true;
  subscribeRegion(node);
}

function releaseRegionSubscriptions(node) {
  if (!node._regionSubs) {
    return;
  }

  node._regionSubs.forEach((entry) => entry.dispose());
  node._regionSubs = null;
}

/**
 * 按当前依赖重订区域订阅：只动变化的部分。
 * 在通知回调里整体退订再重订，会让 store 形态引擎（zustand 那种
 * `listeners.forEach`）在遍历中反复访问新监听器，直至自激。
 */
function subscribeRegion(node) {
  if (!node._regionActive || !node._regionAdapter) {
    return;
  }

  const adapter = node._regionAdapter;
  const pending = new Map((node._regionSubs || []).map((entry) => [entry.source, entry]));
  let next = null;

  (node._regionSources || []).forEach((source) => {
    const existing = pending.get(source);
    if (existing) {
      pending.delete(source);
      next = appendNodeEntry(next, existing);
      return;
    }

    const disposeSubscription = trackedSubscribe(adapter, source, () =>
      scheduleRegionRebuild(node)
    );
    const untrackOwner = trackRegionOwner(source, node);
    next = appendNodeEntry(next, {
      source,
      dispose: () => {
        untrackOwner();
        disposeSubscription();
      }
    });
  });

  pending.forEach((entry) => entry.dispose());
  node._regionSubs = next;
}

/** 区域销毁 / 离开 DOM 时退订。 */
function releaseRegion(node) {
  // 绝大多数节点没碰过区域：直接返回，省掉每节点一次 Set.delete 与一次空数组分配
  if (!node._regionActive && !node._regionScheduled && !node._regionSubs) {
    return;
  }

  node._regionActive = false;
  cancelScheduledRegionRebuild(node);
  releaseRegionSubscriptions(node);
}

/** 求值并写回节点及其子树名下的绑定；值未变化时不触碰 DOM。 */
function flushBindingsIn(node) {
  node._bindings?.forEach((binding) => {
    commitBindingValue(binding, binding.evaluate());
  });
  childTraversalRoots(node).forEach((child) => flushBindingsIn(child));
}

/**
 * 登记「本轮区域构建」的清理函数（文档/窗口监听、定时器等）。
 * 区域重跑时上一轮的清理函数会被执行，避免累加。
 */
export function registerRegionCleanup(cleanup) {
  if (typeof cleanup !== 'function') {
    return;
  }

  const region = activeRegion();
  if (!region) {
    return;
  }

  region._regionRunCleanups = appendNodeEntry(region._regionRunCleanups, cleanup);
}

/** 找最近边界并处理；无边界时原样重抛（fail fast）。返回降级替换节点或 null。 */
function captureNodeError(node, error, phase) {
  const boundary = findErrorBoundary(node);
  if (!boundary) {
    throw error;
  }

  return boundary._handleError(error, node, phase);
}

/**
 * 沿父链上溯找最近的错误边界：本节点设了 whenFailed 就地处理，否则交给父节点继续上溯。
 * 位置在出错时才解析，所以与声明顺序、子树深度、运行时插入无关；搬走的子树跟着新父走。
 */
function findErrorBoundary(node) {
  let current = node;

  while (current) {
    if (current._errorHandler) {
      return current;
    }

    current = current._parent;
  }

  return null;
}

const DOCUMENT_FRAGMENT_NODE = 11;

/**
 * 节点内部集合按需创建：空节点不该为 5 个 Map / Set 付固定开销
 * （实测每个 Map/Set 约 150~200 B，1000 行 1 万个节点就是十几 MB）。
 * 读取一律走 `?.`，写入走下面的取用函数。
 */
function nodeChildKeys(node) {
  return node._childKeys ?? (node._childKeys = new Map());
}

/**
 * 共享的只读空子节点列表：没有子节点的节点不为空数组付一份开销
 * （V8 实测 `[]` 40 B/个；官方 keyed 条目一行 10 个节点里有 4 个是叶子）。
 * 冻结是刻意的：漏掉一处「就地写入」会立刻抛错，而不是悄悄写进被所有节点共用的数组。
 */
export const EMPTY_CHILDREN = Object.freeze([]);

/** 可写的子节点列表：首次写入时才把共享空数组换成真数组。 */
export function nodeChildren(node) {
  if (node._children === EMPTY_CHILDREN) {
    const next = [];
    node._children = next;
    return next;
  }

  return node._children;
}

/**
 * 节点级名单的统一写入口：名单还空着时一次字面量落地，之后才走 push。
 * 引擎对空数组的首次 push 会按 16 个槽预分配（单元素数组 Node 约 182 B、浏览器约 96 B；
 * 字面量分别是 64 B / 32 B），而「先字面量再 push」反而更贵（约 208 B / 104 B），
 * 所以只吃首次写入这份收益，第 2 个元素起保持 push（多元素容量见票 22）。
 * 空名单有两种表示：未创建（null / undefined）与共享的 EMPTY_CHILDREN 哨兵。
 */
function appendNodeEntry(list, value) {
  if (list === undefined || list === null || list === EMPTY_CHILDREN) {
    return [value];
  }

  list.push(value);
  return list;
}

/** 子节点名单走同一写入口；供 node.js 之外的节点模块（tree 等）复用。 */
export function appendNodeChild(node, child) {
  node._children = appendNodeEntry(node._children, child);
}

/** 头插同样可能是一次首次写入（父节点还没有子节点）。 */
function prependNodeChild(node, child) {
  if (node._children === EMPTY_CHILDREN) {
    node._children = [child];
    return;
  }

  node._children.unshift(child);
}

function nodeEvents(node) {
  return node._events ?? (node._events = new Map());
}

function nodeDomAdapters(node) {
  return node._domAdapters ?? (node._domAdapters = new Map());
}

function nodeMountStates(node) {
  return node._childMountStates ?? (node._childMountStates = new Map());
}

function nodePendingRemovals(node) {
  return node._pendingRemovals ?? (node._pendingRemovals = new Set());
}

/**
 * 记录本节点的构建闭包：**单槽**，只有同一节点被 setup 多次时才升级成数组。
 *
 * 原实现每次 setup 都建一个数组（`node._builders = []` 再 push），官方行里 8 个元素节点
 * 就是每行 8 个数组——10k 行构建要分配约 8 万个数组（浏览器侧单个约 96 B），纯瞬态垃圾。
 * 保留槽位（不用 delete、也不跳过建槽）以免隐藏类分叉，只把「数组」换成「一个闭包引用」。
 */
function addNodeBuilder(node, builder) {
  const current = node._builders;
  if (current === undefined || current === null) {
    node._builders = builder;
    return;
  }

  if (Array.isArray(current)) {
    current.push(builder);
    return;
  }

  node._builders = [current, builder];
}

/** 重跑构建闭包（区域专用）：单闭包直接调，多闭包按登记顺序。 */
function runNodeBuilders(node) {
  const builders = node._builders;
  if (builders === undefined || builders === null) {
    return;
  }

  if (Array.isArray(builders)) {
    builders.forEach((builder) => builder(node));
    return;
  }

  builders(node);
}

// ---- keyed 段内事件委托 ------------------------------------------------------
/**
 * keyed 行构建期注册的事件不再往每行元素上挂监听器：handler 存进节点的单个描述符槽，
 * 元素登记到段根的 WeakMap，段根按事件类型挂一个监听器统一派发。省下的是每行
 * 「一个 Map + 一个条目对象 + 一个真实 DOM 监听器」（实测约 387 B/行）。
 *
 * 只对「冒泡的标准事件 + 无 once/capture/passive + 元素节点 + 在行构建期注册」生效，
 * 其余一律回落逐元素绑定；派发时逐事件伪造 currentTarget 与包装 stopPropagation，
 * 使 .on() 的可观察语义与原来一致（差异见 docs/component-authoring）。
 */
const delegatedEventTypes = new Set([
  'beforeinput',
  'change',
  'click',
  'contextmenu',
  'copy',
  'cut',
  'dblclick',
  'dragend',
  'dragenter',
  'dragleave',
  'dragover',
  'dragstart',
  'drop',
  'input',
  'keydown',
  'keypress',
  'keyup',
  'mousedown',
  'mousemove',
  'mouseout',
  'mouseover',
  'mouseup',
  'paste',
  'pointercancel',
  'pointerdown',
  'pointermove',
  'pointerout',
  'pointerover',
  'pointerup',
  'reset',
  'submit',
  'touchend',
  'touchmove',
  'touchstart',
  'wheel'
]);

const keyedBuildStack = [];

/**
 * 元素 → 行内节点的反查用展开属性，而不是 WeakMap：
 * WeakMap 的键被回收后内部表不还堆（实测 200 万条残留 64 MB，约 32 B/条），
 * 列表反复建/清会留下与峰值规模同量级的常驻；展开属性随元素一起回收，没有这份水位。
 * 用 Symbol 键：不出现在 Object.keys / for…in / DOM 属性里，第三方也看不到。
 */
const delegateNodeKey = Symbol('yoyaDelegateNode');

function activeKeyedBuild() {
  return keyedBuildStack.length > 0 ? keyedBuildStack[keyedBuildStack.length - 1] : null;
}

function canDelegateEvent(eventName, options) {
  if (!delegatedEventTypes.has(eventName)) {
    return false;
  }

  if (!options) {
    return true;
  }

  return options.once !== true && options.capture !== true && options.passive !== true;
}

/** 段根的委托状态：元素 → 节点的弱映射 + 已挂监听器的事件名。 */
function delegateOwnerFor(parent) {
  if (!parent._delegates) {
    parent._delegates = {
      boundElement: null,
      events: null,
      listeners: null,
      parent
    };
  }

  return parent._delegates;
}

function delegatedDescriptorFor(node, eventName) {
  const current = node._delegate;
  if (current === undefined) {
    return null;
  }

  if (Array.isArray(current)) {
    return current.find((item) => item.event === eventName) ?? null;
  }

  return current.event === eventName ? current : null;
}

/** 注销一个委托事件；返回是否命中（未命中时调用方走原路径）。 */
function removeDelegatedEvent(node, eventName) {
  const current = node._delegate;
  if (current === undefined) {
    return false;
  }

  if (Array.isArray(current)) {
    const index = current.findIndex((item) => item.event === eventName);
    if (index === -1) {
      return false;
    }

    const [removed] = current.splice(index, 1);
    if (current.length === 1) {
      node._delegate = current[0];
    }
    void removed;
    return true;
  }

  if (current.event !== eventName) {
    return false;
  }

  if (node._el) {
    delete node._el[delegateNodeKey];
  }
  node._delegate = undefined;
  return true;
}

/**
 * 段根监听器：从事件目标沿 DOM 链走到段根，按内→外顺序调用行内 handler。
 * currentTarget / stopPropagation 逐事件伪造，调用完删掉自有属性，
 * 让事件对象回到原生语义（同一事件对象被重放时不会读到上一次的节点）。
 */
function dispatchDelegatedEvent(owner, eventName, event) {
  const root = owner.parent._el;
  if (!root) {
    return;
  }

  const chain = [];
  let element = event.target;
  while (element && element !== root) {
    if (element.nodeType === 1) {
      const node = element[delegateNodeKey];
      const descriptor = node ? delegatedDescriptorFor(node, eventName) : null;
      if (descriptor) {
        chain.push({ node, descriptor });
      }
    }
    element = element.parentNode;
  }

  if (chain.length === 0) {
    return;
  }

  const nativeStopPropagation = event.stopPropagation;
  let stopped = false;
  Object.defineProperty(event, 'stopPropagation', {
    configurable: true,
    value() {
      stopped = true;
      nativeStopPropagation.call(this);
    }
  });

  try {
    for (const { node, descriptor } of chain) {
      Object.defineProperty(event, 'currentTarget', {
        configurable: true,
        get: () => node._el
      });

      try {
        descriptor.handler.call(node, event);
      } catch (error) {
        captureNodeError(node, error, 'event');
      }

      if (descriptor.options?.once) {
        node.off(eventName);
      }

      if (stopped) {
        break;
      }
    }
  } finally {
    delete event.currentTarget;
    delete event.stopPropagation;
  }
}

/** 段根元素就绪后挂监听器；元素换了（重挂载）要重新挂。 */
function bindDelegatedEvents(owner) {
  const root = owner.parent._el;
  if (!root || !owner.events) {
    return;
  }

  if (owner.boundElement !== root) {
    owner.boundElement = root;
    owner.listeners = null;
  }

  if (!owner.listeners) {
    owner.listeners = new Map();
  }

  owner.events.forEach((eventName) => {
    if (owner.listeners.has(eventName)) {
      return;
    }

    const listener = (event) => dispatchDelegatedEvent(owner, eventName, event);
    root.addEventListener(eventName, listener);
    owner.listeners.set(eventName, listener);
  });
}

/** 行构建期的事件登记：同事件只留最新，元素就绪时登记进段根的弱映射。 */
function registerDelegatedEvent(parent, node, eventName, handler, options) {
  const owner = delegateOwnerFor(parent);
  const descriptor = { event: eventName, handler, options, owner };
  const current = node._delegate;

  if (current === undefined) {
    node._delegate = descriptor;
  } else if (Array.isArray(current)) {
    const existing = current.find((item) => item.event === eventName);
    if (existing) {
      existing.handler = handler;
      existing.options = options;
    } else {
      current.push(descriptor);
    }
  } else if (current.event === eventName) {
    current.handler = handler;
    current.options = options;
  } else {
    node._delegate = [current, descriptor];
  }

  if (!owner.events) {
    owner.events = new Set();
  }
  owner.events.add(eventName);

  // 元素已经存在（挂载后再注册 / 区域重跑）就直接登记；否则等 renderDom 收口。
  if (node._el) {
    node._el[delegateNodeKey] = node;
    bindDelegatedEvents(owner);
  }
}

/** 子节点自己的 DOM 组：单根是 `[_el]`，多根组件是 `_fragmentDom`（文档顺序）。 */
function nodeDomGroup(node) {
  if (node?._fragmentDom?.length) {
    return node._fragmentDom;
  }

  return node?._el ? [node._el] : [];
}

/** 子节点已经挂在给定父元素下的 DOM 组。 */
function nodeAttachedGroup(parent, node) {
  return nodeDomGroup(node).filter((element) => element.parentNode === parent._el);
}

/** 解析插入锚点：从 fromNode 起向后找第一个已挂载的兄弟；找不到返回 null（追加）。 */
function resolveInsertAnchor(parent, fromNode) {
  if (!fromNode) {
    return null;
  }

  for (let i = parent._children.indexOf(fromNode) + 1; i < parent._children.length; i += 1) {
    const element = nodeAttachedGroup(parent, parent._children[i])[0];
    if (element) {
      return element;
    }
  }

  return null;
}

/**
 * 把子节点插到锚点之前。
 * 多根组件的渲染结果是一次性 fragment，直接插入即可；已在别处渲染好的多根子树按元素顺序补插。
 * 挂载条件为假时不落地——节点已经渲染（状态保留），条件转真时由 `_syncChildMounted()` 插回槽位。
 */
function attachChildDom(parent, node, rendered, anchor) {
  if (parent._childMountStates?.get(node) === false) {
    return;
  }

  if (rendered && rendered.nodeType === DOCUMENT_FRAGMENT_NODE) {
    parent._el.insertBefore(rendered, anchor ?? null);
    fireWhenMount(node);
    return;
  }

  const elements = rendered ? [rendered] : nodeDomGroup(node);
  elements.forEach((element) => {
    if (element.parentNode !== parent._el) {
      parent._el.insertBefore(element, anchor ?? null);
    }
  });
  fireWhenMount(node);
}

function describeKeyedRowKey(rawKey) {
  return typeof rawKey === 'string' ? rawKey : 'row reference';
}

/**
 * 一次交付整批移除：段内成员正好是父元素里剩下的全部子节点时（clear 的常见形态），
 * 用一次 `replaceChildren()` 代替每行一次 removeChild——官方 09_clear 里后者占四成以上。
 * 还有非成员子节点时返回 false，走原本的逐行摘除。
 */
function detachKeyedMembers(parent, nodes) {
  const element = parent._el;
  if (!element || element.childNodes.length === 0) {
    return false;
  }

  const doomed = new Set();
  nodes.forEach((node) => {
    nodeDomGroup(node).forEach((child) => {
      if (child.parentNode === element) {
        doomed.add(child);
      }
    });
  });

  if (doomed.size === 0 || doomed.size !== element.childNodes.length) {
    return false;
  }

  element.replaceChildren();
  return true;
}

/** 摘除 keyed 成员：整批 DOM 一起走时，销毁走「已摘除」路径。 */
function removeKeyedMembers(parent, entries) {
  const nodes = new Set(entries.map((entry) => entry.node));
  const detached = detachKeyedMembers(parent, nodes);
  // 一次对账视图树：逐行 indexOf + splice 在清空整表时是 O(n²)
  parent._children = parent._children.filter((child) => !nodes.has(child));

  entries.forEach((entry) => {
    if (detached) {
      destroyDetached(entry.node);
    } else {
      entry.node.destroy();
    }
  });

  parent._childrenDirty = true;
}

/** 段尾锚点：段内最后一个成员（或登记锚点）之后第一个非成员子节点；无则 null（追加）。 */
function keyedSegmentTailNode(parent, segment, memberNodes) {
  let last = segment.anchorNode ? parent._children.indexOf(segment.anchorNode) : -1;
  parent._children.forEach((child, index) => {
    if (memberNodes.has(child) && index > last) {
      last = index;
    }
  });

  for (let i = last + 1; i < parent._children.length; i += 1) {
    if (!memberNodes.has(parent._children[i])) {
      return parent._children[i];
    }
  }

  return null;
}

/**
 * 成员在父元素里的 DOM 组：单根是一元素，多根组件是一组元素。
 * 不可见（惰性挂载 / 未渲染 / 元素不在本段）时返回空数组。
 */
function keyedMemberElements(parent, node) {
  return nodeAttachedGroup(parent, node);
}

/** 段尾锚点元素：段内成员都排在它前面；段尾自己不可见时退回到它之后第一个可见兄弟。 */
function keyedSegmentTailElement(parent, tailNode) {
  if (!tailNode) {
    return null;
  }

  return keyedMemberElements(parent, tailNode)[0] ?? resolveInsertAnchor(parent, tailNode);
}

/**
 * 目标顺序里「原本就按旧顺序排列」的最长递增子序列——这些成员留在原地即可，
 * 其余成员才需要挪到后继之前。交换两行因此只搬换位的行，而不是把后继之后的
 * 每个兄弟逐个挪一遍（旧的相邻比较会退化成整表重排）。
 * 新增成员不参与判定：插入路径一次就把它们放到正确位置。
 */
function collectKeyedMovedNodes(next, previousPosition) {
  const tails = [];
  const tailIndexes = [];
  const previous = new Array(next.length).fill(-1);

  next.forEach((item, index) => {
    const position = previousPosition.get(item.node);
    if (position === undefined) {
      return;
    }

    let low = 0;
    let high = tails.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (tails[middle] < position) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }

    tails[low] = position;
    tailIndexes[low] = index;
    previous[index] = low > 0 ? tailIndexes[low - 1] : -1;
  });

  const stable = new Set();
  for (
    let cursor = tailIndexes[tailIndexes.length - 1] ?? -1;
    cursor !== -1;
    cursor = previous[cursor]
  ) {
    stable.add(next[cursor].node);
  }

  const moved = new Set();
  next.forEach((item) => {
    if (!stable.has(item.node)) {
      moved.add(item.node);
    }
  });
  return moved;
}

function placeKeyedMember(parent, entry, beforeNode, tailNode, anchorElement) {
  parent._pendingRemovals?.delete(entry.node);
  // 惰性挂载声明由父节点收养（与 child() 路径一致）：条件为假时本行不落地，
  // 但节点照常渲染，条件转真时按槽位插回。
  parent._adoptPendingMount(entry.node);
  parent._linkChild(entry.node);
  const anchorNode = beforeNode ?? tailNode;
  const beforeIndex = anchorNode ? parent._children.indexOf(anchorNode) : -1;
  if (beforeIndex === -1) {
    parent._children = appendNodeEntry(parent._children, entry.node);
  } else {
    nodeChildren(parent).splice(beforeIndex, 0, entry.node);
  }
  parent._childrenDirty = true;

  if (parent._el) {
    const rendered = parent._renderChildForInsert(entry.node);
    const anchor = anchorElement ?? resolveInsertAnchor(parent, anchorNode);
    attachChildDom(parent, entry.node, rendered, anchor);
    if (isDevtoolsEnabled() && !parent._devtoolsRendering) {
      notifyDevtoolsMutation(parent, 'child', { added: [ensureDevtoolsNodeId(entry.node)] });
    }
  }
}

/** 需要换位的成员：视图树里挪到后继之前，DOM 里整组（多根组件是一组）搬到锚点之前。 */
function reorderKeyedMember(parent, node, beforeNode, tailNode, anchorElement) {
  const currentIndex = parent._children.indexOf(node);
  if (currentIndex !== -1) {
    nodeChildren(parent).splice(currentIndex, 1);
  }

  const anchorNode = beforeNode ?? tailNode;
  const target = anchorNode ? parent._children.indexOf(anchorNode) : -1;
  nodeChildren(parent).splice(target === -1 ? parent._children.length : target, 0, node);
  parent._childrenDirty = true;

  const elements = keyedMemberElements(parent, node);
  if (elements.length > 0 && elements[elements.length - 1].nextSibling !== anchorElement) {
    elements.forEach((element) => parent._el.insertBefore(element, anchorElement));
  }
}

/** keyed() 的 options 只接受普通对象（数组、句柄、函数一律拒绝）。 */
function isKeyedOptions(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function syncKeyedSegment(parent, segment, rows) {
  const list = Array.isArray(rows) ? rows : [];
  const members = segment.members;

  members.forEach((entry, rawKey) => {
    if (entry.node._deleted) {
      members.delete(rawKey);
    }
  });

  const desired = [];
  const seen = new Set();
  const removedMembers = [];
  list.forEach((row, index) => {
    const rawKey = segment.keyFn ? segment.keyFn(row, index) : row;
    if (seen.has(rawKey)) {
      throw new TypeError(`keyed() duplicate row key: ${describeKeyedRowKey(rawKey)}`);
    }
    seen.add(rawKey);
    desired.push({ rawKey, row, index });

    // 复用判定与目标名单生成合并成一趟（顺序不变：行引用没变 → equals → update），
    // 这样「保留名单」不必再建一份 N 规模的集合，也不再产生 filter / map 两个临时数组。
    const existing = members.get(rawKey);
    if (!existing) {
      return;
    }

    // keySet 源的元素是 KeyItem：元素对象按 key 复用（`item.data` 会被原地换成新引用），
    // 所以成员表记的是**行数据**而不是元素；其它源记的就是行本身。
    // equals / update 一律收「行」（keySet 源即 item.data）。
    const nextRow = segment.itemSource ? row.data : row;
    if (existing.row === nextRow) {
      return;
    }

    // 行引用变了：先问等价比较（内容等价就当没变），再问原地更新入口。
    // 两者都没有时保持旧行为——销毁该行并原位换新。
    if (segment.equals && segment.equals(existing.row, nextRow)) {
      existing.row = nextRow;
      return;
    }

    if (segment.update) {
      segment.update(existing.node, existing.row, nextRow);
      existing.row = nextRow;
      return;
    }

    members.delete(rawKey);
    removedMembers.push(existing);
  });

  // 目标名单里不再出现的成员：按 members 的既有顺序收口（与上一步合起来仍是同一批移除）。
  members.forEach((entry, rawKey) => {
    if (!seen.has(rawKey)) {
      removedMembers.push(entry);
      members.delete(rawKey);
    }
  });
  if (removedMembers.length > 0) {
    removeKeyedMembers(parent, removedMembers);
  }

  // 目标名单原地补 node：不再为每行建一份 `{...item, node}` 副本。
  for (let index = 0; index < desired.length; index += 1) {
    const item = desired[index];
    const existing = members.get(item.rawKey);
    if (existing) {
      item.node = existing.node;
      continue;
    }

    let node;
    keyedBuildStack.push(segment);
    try {
      node = normalizeChildWithContext(parent, segment.build(item.row, item.index));
    } finally {
      keyedBuildStack.pop();
    }
    const entry = {
      rawKey: item.rawKey,
      row: segment.itemSource ? item.row.data : item.row,
      node
    };
    members.set(item.rawKey, entry);
    if (
      typeof node.attr === 'function' &&
      (typeof item.rawKey === 'string' || typeof item.rawKey === 'number')
    ) {
      node.attr('data-row-key', String(item.rawKey));
    }
    item.node = node;
  }
  const next = desired;

  const children = parent._children;

  // 无移动快路径（票 30）：
  // 1. 清空（next 为空）——成员已经全部移除，搬运判定与锚点计算都没有意义。
  // 2. 目标顺序与现有子节点逐节点一致（含「重新赋值同一批行」）——没有新增成员、也没有成员需要
  //    搬动：一般路径会算出 movedNodes 为空、placeKeyedMember / reorderKeyedMember 一次都不调用，
  //    只剩 keyedMemberElements 的空转。逐节点比较是一趟 O(n) 读，省掉旧序 Map 与
  //    最长递增子序列的 4 个集合/数组。
  if (next.length === 0) {
    return;
  }

  if (next.length === children.length) {
    let aligned = true;
    for (let index = 0; index < children.length; index += 1) {
      if (children[index] !== next[index].node) {
        aligned = false;
        break;
      }
    }

    if (aligned) {
      return;
    }
  }

  const memberNodes = new Set();
  members.forEach((entry) => memberNodes.add(entry.node));
  const tailNode = keyedSegmentTailNode(parent, segment, memberNodes);

  // 旧顺序快照 + 目标顺序：只搬不在最长递增子序列里的成员，
  // 交换两行因此只动换位的两行，而不是把后续兄弟逐个挪一遍。
  const previousPosition = new Map();
  children.forEach((child, index) => previousPosition.set(child, index));
  const movedNodes = collectKeyedMovedNodes(next, previousPosition);
  let anchorElement = keyedSegmentTailElement(parent, tailNode);

  for (let i = next.length - 1; i >= 0; i -= 1) {
    const { node, rawKey } = next[i];
    const beforeNode = i + 1 < next.length ? next[i + 1].node : null;

    if (!previousPosition.has(node)) {
      placeKeyedMember(parent, members.get(rawKey), beforeNode, tailNode, anchorElement);
    } else if (movedNodes.has(node)) {
      reorderKeyedMember(parent, node, beforeNode, tailNode, anchorElement);
    }

    const elements = keyedMemberElements(parent, node);
    if (elements.length > 0) {
      anchorElement = elements[0];
    }
  }
}

/** 上报区域重建事件，便于 devtools 回答「这块为什么重建 / 为什么只是刷值」。 */
function emitRegionEvent(node, action, trigger) {
  if (!isDevtoolsEnabled()) {
    return;
  }

  emitDevtools({ type: 'region', node, action, trigger });
}

// 无闭合标签的 HTML 元素，toHTML 时不能追加结束标签。
const voidElements = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
]);

/**
 * 支持用 CSS 选择器或真实 DOM 元素作为挂载目标。
 */
export function resolveTarget(target) {
  if (typeof target === 'string') {
    return document.querySelector(target);
  }

  return target;
}

/**
 * toHTML 输出时使用的最小 HTML 转义。
 */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isBooleanAttribute(name) {
  return booleanAttributes.has(name);
}

/**
 * 把属性写入真实 DOM，并尽量同步同名 DOM property。
 */
export function applyAttribute(element, name, value) {
  if (value === null || value === undefined || value === false) {
    element.removeAttribute(name);
    if (name in element) {
      try {
        element[name] = false;
      } catch {
        // 某些 DOM property 是只读的，忽略即可。
      }
    }
    return;
  }

  if (value === true || isBooleanAttribute(name)) {
    element.setAttribute(name, name);
    if (name in element) {
      try {
        element[name] = true;
      } catch {
        // 某些 DOM property 是只读的，忽略即可。
      }
    }
    return;
  }

  const text = String(value);
  element.setAttribute(name, text);

  if (name in element) {
    try {
      // 已经是目标值就不再写 property：输入类元素上重复写 value 会把光标/选区顶到末尾。
      if (element[name] === value || element[name] === text) {
        return;
      }

      element[name] = value;
    } catch {
      // 某些 DOM property 是只读的，忽略即可。
    }
  }
}

/**
 * 序列化 style 快照，保证 toHTML 和真实 DOM 渲染保持一致。
 */
export function serializeStyles(styles) {
  // 按序列化后的属性名（kebab）排序：样式文本与写入顺序无关，编译器/SSR/客户端 DOM 三者
  // 因此能产出同一份结果（票：编译产物不许手写片段的前提）。
  return Object.entries(styles ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([name, value]) => `${toKebabStyleName(name)}:${escapeHtml(value)}`)
    .sort()
    .join('; ');
}

/** 属性名排序：键序与写入顺序无关（同上，供 toHTML 与真实 DOM 首帧落盘共用）。 */
function sortedKeys(snapshot) {
  return snapshot ? Object.keys(snapshot).sort() : [];
}

export function toKebabStyleName(name) {
  return String(name).replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function sameEventListenerOptions(a, b) {
  if (a === b) {
    return true;
  }
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  return (
    Boolean(a.capture) === Boolean(b.capture) &&
    Boolean(a.once) === Boolean(b.once) &&
    Boolean(a.passive) === Boolean(b.passive)
  );
}

/**
 * ViewNode 是 yoya-ui 的基础视图节点。
 * 它只管理视图树通用能力：子节点、事件清理、状态和生命周期。
 */
export class ViewNode {
  constructor(setup = null) {
    this._children = EMPTY_CHILDREN;
    // 其余字段一律不预置：集合按需创建（见 nodeChildKeys 等），布尔 / 引用字段缺省即假值。
    // 挂载条件与权限上下文也在写入时才产生——缺省值与原来的 null / true 在所有读取处等价
    // （isMounted() 用 `!== false`，_adoptPendingMount() 用 `?? null`），
    // 每个省下的字段槽在 1000 行（约 1 万节点）的表里就是 80 KB。
    const access = currentAccess(); // 构建时捕获的权限上下文
    if (access) {
      this._accessContext = access;
    }

    if (isDevtoolsEnabled()) {
      captureDevtoolsNodeScope(this);
    }

    if (setup !== null) {
      this.setup(setup);
    }
  }

  /**
   * 统一初始化入口：回调、节点、文本 / 句柄、对象配置四种写法。
   */
  setup(setup) {
    if (typeof setup === 'function') {
      addNodeBuilder(this, setup);
      const serialBefore = bindingSerial;
      setupStack.push(this);
      try {
        withProviderScope(this, () => setup(this));
      } finally {
        setupStack.pop();
        closeRegionCapture(this);
        reportPreRegionReads(this);
        // 构建闭包到此为止：非区域节点不会再有第二次构建，就地清引用，让闭包连同它捕获的
        // 环境在构建返回后一起可回收（官方条目一行 8 个 builder，常驻约 1.9 KB/行）。
        // 只清值、保留字段槽位：不用 delete（会把对象打成字典模式，实测反涨），
        // 也不跳过建槽（会分叉出两种隐藏类）。区域节点要重跑 builder，引用继续留着。
        if (this._rebuildable !== true) {
          this._builders = null;
        }
      }

      // 首屏求值：只有本次构建登记过绑定、且已回到构建栈最外层时才刷一次，
      // 避免每一层都遍历整棵子树（深树会退化成 O(深度 × 绑定数)）。
      if (setupStack.length === 0 && bindingSerial !== serialBefore) {
        flushBindingsIn(this);
      }
    } else if (setup instanceof ViewNode) {
      this.child(setup);
    } else if (isSignal(setup)) {
      // 值位置传句柄：等价 child(vText(handle))，写入即原地刷文本
      this.child(setup);
    } else if (typeof setup === 'string' || typeof setup === 'number') {
      this.child(setup);
    } else if (setup && typeof setup === 'object') {
      this._setupObject(setup);
    }

    return this;
  }

  /**
   * 声明当前节点为「区域」：内容由它自己的 setup 产出，可在需要时重新执行。
   * 可选参数是时机谓词，返回 false 时跳过本次重建并记录待重建。
   */
  rebuildable(predicate = null) {
    if (predicate !== null && predicate !== undefined && typeof predicate !== 'function') {
      throw new TypeError('rebuildable() predicate must be a function');
    }

    // 契约：声明区域必须发生在该节点自己的 setup builder 内。非区域节点的构建闭包在构建
    // 返回处即释放，出了 builder 再声明既拿不到 builder 重跑，也拿不到构建期信号捕获窗口。
    // 已声明的区域仍可再次调用（此时 builder 仍在），用于替换谓词。
    if (this._builders === undefined || this._builders === null) {
      throw new TypeError(
        'rebuildable() requires a setup builder on this node; declare the region inside its own ' +
          'setup builder (non-region build closures are released when the build returns)'
      );
    }

    this._rebuildable = true;
    this._regionGuard = predicate || null;

    // 区域在自己 builder 中途声明：从此刻起捕获后续读取的 signal，
    // builder 返回时由 setup() 收口（约定：先 rebuildable()，再读数据）。
    if (setupStack[setupStack.length - 1] === this && !this._regionCaptureToken) {
      this._regionAdapter = currentSignals();
      this._regionCaptureToken = beginCollect();
    }

    if (!this._regionScope) {
      // 绑定作用域与构建期环境只捕获一次，重跑复用同一份，避免作用域被替换后失联。
      this._regionScope = { bindings: null };
      this._regionEnv = {
        access: this._accessContext || currentAccess(),
        context: snapshotContext(),
        i18n: i18nScopeBridge ? i18nScopeBridge.current() : null
      };
    }

    return this;
  }

  /** 区域是否有被谓词跳过、等待补齐的重建。 */
  rebuildPending() {
    return this._rebuildPending === true;
  }

  /** 区域是否有已排队、尚未执行的信号触发重建（batch 合并 / 运行中排队）。 */
  rebuildScheduled() {
    return this._regionScheduled === true;
  }

  /**
   * 值级刷新：只把本节点子树里已登记的绑定求值写回，不重建结构、不触发谓词。
   * 幂等——值未变化时不会写 DOM；节点已销毁时安全返回。
   */
  flush() {
    if (this._deleted) {
      return this;
    }

    flushBindingsIn(this);
    return this;
  }

  /**
   * 重新执行区域 builder：先构建成功，再替换旧子节点；构建失败则保留原内容。
   */
  rebuild(options = {}) {
    if (!this._rebuildable) {
      throw new TypeError('rebuild() requires rebuildable() on this node');
    }

    const trigger = (options && options.trigger) || 'manual';

    if (this._deleted || this._regionRunning) {
      this._regionLastRun = 'skip';
      return this;
    }

    if (this._regionGuard && !(options && options.force) && !this._regionGuard()) {
      // 谓词拒绝结构重建：只刷新值绑定，DOM 与焦点保持原样，重建留待补齐。
      this._rebuildPending = true;
      flushBindingsIn(this);
      this._regionLastRun = 'flush';
      emitRegionEvent(this, 'flush', trigger);
      return this;
    }

    const previousChildren = this._children;
    const previousKeys = this._childKeys;
    const previousBindings = new Set(collectRegionBindings(this));
    const previousCleanups = Array.isArray(this._regionRunCleanups) ? this._regionRunCleanups : [];
    this._regionRunCleanups = null;

    // 槽位元素是投影点：先把投影进来的内容收回宿主登记表，避免被下面的销毁带走
    this._slotHost?._reclaimSlot(this);

    this._children = EMPTY_CHILDREN;
    this._childKeys = null; // 新的一段用新的 key 表，按需创建
    this._childrenDirty = true;
    previousChildren.forEach((child) => nodePendingRemovals(this).add(child));

    this._regionRunning = true;
    const regionToken = beginCollect();
    const previousSources = this._regionSources;
    try {
      this._runInRegionEnvironment(() =>
        withProviderScope(this, () => runNodeBuilders(this), {
          reset: true
        })
      );
    } catch (error) {
      endCollect(regionToken);
      this._regionSources = previousSources;
      releaseBindings(
        collectRegionBindings(this).filter((binding) => !previousBindings.has(binding))
      );
      this._children.forEach((child) => child.destroy());
      this._regionRunCleanups?.forEach((cleanup) => cleanup());
      this._regionRunCleanups = previousCleanups;
      previousChildren.forEach((child) => this._pendingRemovals?.delete(child));
      this._children = previousChildren;
      this._childKeys = previousKeys;
      this._childrenDirty = false;
      throw error;
    } finally {
      this._regionRunning = false;
    }
    this._regionSources = endCollect(regionToken);

    releaseBindings([...previousBindings]);
    previousCleanups.forEach((cleanup) => cleanup());
    flushBindingsIn(this);
    this._rebuildPending = false;
    this._regionLastRun = 'rebuild';
    emitRegionEvent(this, 'rebuild', trigger);
    subscribeRegion(this);
    if (this._el) {
      this._runInRegionEnvironment(() => this.renderDom());
    }
    // 重建完成：把宿主寄存的内容重新投影回（全新的）槽位子节点
    this._slotHost?._projectSlots();

    // 构建期间依赖又变化时补跑一次，而不是丢弃；batch 内留给作用域结束统一合并。
    if (this._regionScheduled && !this._deleted && !isSignalsBatchActive()) {
      this._regionScheduled = false;
      this._regionRequeueDepth = (this._regionRequeueDepth ?? 0) + 1;
      if (this._regionRequeueDepth > 100) {
        throw new Error('Region rebuild cycle detected');
      }

      try {
        return this.rebuild({ trigger: 'signal' });
      } finally {
        this._regionRequeueDepth = Math.max(0, this._regionRequeueDepth - 1);
      }
    }

    return this;
  }

  /**
   * 在区域构建期捕获的环境（权限 / context / i18n 快捷写法 + 继承的权限声明）中执行，
   * 使重跑产出的节点与首次构建处于同一环境。
   */
  _runInRegionEnvironment(run) {
    const env = this._regionEnv;
    const build = () => withRegionBuild(this, run);

    if (!env) {
      return build();
    }

    const withI18n = () => (i18nScopeBridge ? i18nScopeBridge.runWith(env.i18n, build) : build());
    const withEnvironment = () => withAccess(env.access, () => withContext(env.context, withI18n));

    if (this._inheritedScope) {
      return withRenderScope(this._inheritedScope, withEnvironment);
    }

    return withEnvironment();
  }

  /**
   * 声明当前节点的权限：只写裸资源码（如 "system:member"）。
   * 无读不渲染，有读无写则只读/禁用；作用域就近覆盖。
   */
  access(spec) {
    const parsed = parseAccessSpec(spec);
    this._access = parsed ? { code: parsed.code, level: 'write' } : null;
    return this;
  }

  /**
   * 计算本节点（在当前作用域下）的权限状态。
   * 规则：自身声明覆盖继承作用域，无声明则继承最近的祖先声明。
   * @returns {'active' | 'readonly' | 'hidden'}
   */
  _permissionState() {
    const spec = this._access ?? currentInheritedScope();
    if (!spec) {
      return 'active';
    }

    const access = this._accessContext || currentAccess();
    if (!access) {
      return 'active';
    }

    if (!access.canRead(spec.code)) {
      return 'hidden';
    }

    if (spec.level === 'write' && !access.canWrite(spec.code)) {
      return 'readonly';
    }

    return 'active';
  }

  /**
   * 把权限状态落位到组件自身：只读/禁用由组件按自身语义处理；
   * hidden 由渲染管线统一拒绝挂载，本方法无需处理 hidden。
   * 基类 ViewNode 无操作；ElementNode 处理可交互标签，vInput / vButton 等重写。
   */
  _applyAccessState(_state) {
    // 基类默认无操作
  }

  _setupObject(config) {
    if (config.children) {
      this.child(config.children);
    }
  }

  /**
   * 返回子节点快照，避免外部直接修改内部数组。
   */
  children() {
    return [...this._children];
  }

  clearChildren() {
    const removedIds =
      this._el && isDevtoolsEnabled() && !this._devtoolsRendering
        ? this._children.map((child) => ensureDevtoolsNodeId(child))
        : [];
    this._dropChildKeys(this._children);
    this._children.forEach((child) => {
      nodePendingRemovals(this).add(child);
      child._parent = null; // 脱离视图树：不再把错误交给旧父
    });
    this._children = EMPTY_CHILDREN;
    this._childrenDirty = true;
    if (removedIds.length > 0 && !this._devtoolsRendering) {
      notifyDevtoolsMutation(this, 'child', { removed: removedIds });
    }
    return this;
  }

  /**
   * 带显式 key 添加子节点；key 在同一父节点内必须唯一。
   * 元素子节点会把 key 镜像为 data-row-key，便于 SSR 与调试。
   */
  addChild(key, child) {
    assertRegionChildAllowed(this);

    const rawKey = String(key);
    if (this._childKeys?.has(rawKey)) {
      throw new TypeError(`duplicate key "${rawKey}"`);
    }

    const viewNode = normalizeChildWithContext(this, child);
    nodeChildKeys(this).set(rawKey, viewNode);
    if (typeof viewNode.attr === 'function') {
      viewNode.attr('data-row-key', rawKey);
    }
    this._pendingRemovals?.delete(viewNode);
    this._children = appendNodeEntry(this._children, viewNode);
    this._childrenDirty = true;
    this._adoptPendingMount(viewNode);
    this._linkChild(viewNode);

    if (this._el) {
      const childElement = this._renderChildForInsert(viewNode);
      attachChildDom(this, viewNode, childElement, null);
      if (isDevtoolsEnabled() && !this._devtoolsRendering) {
        notifyDevtoolsMutation(this, 'child', { added: [ensureDevtoolsNodeId(viewNode)] });
      }
    }

    return this;
  }

  /** 在 beforeKey 对应子节点之前插入 keyed 子节点；beforeKey 为空时追加到末尾。 */
  insertBefore(key, child, beforeKey = null) {
    assertRegionChildAllowed(this);

    const rawKey = String(key);
    if (this._childKeys?.has(rawKey)) {
      throw new TypeError(`duplicate key "${rawKey}"`);
    }

    const hasBefore = beforeKey !== null && beforeKey !== undefined;
    const beforeNode = hasBefore ? (this._childKeys?.get(String(beforeKey)) ?? null) : null;
    if (hasBefore && !beforeNode) {
      throw new TypeError(`insertBefore() requires an existing beforeKey "${String(beforeKey)}"`);
    }

    const viewNode = normalizeChildWithContext(this, child);
    nodeChildKeys(this).set(rawKey, viewNode);
    if (typeof viewNode.attr === 'function') {
      viewNode.attr('data-row-key', rawKey);
    }
    this._pendingRemovals?.delete(viewNode);
    this._adoptPendingMount(viewNode);
    this._linkChild(viewNode);

    const beforeIndex = beforeNode ? this._children.indexOf(beforeNode) : -1;
    if (beforeIndex === -1) {
      this._children = appendNodeEntry(this._children, viewNode);
    } else {
      nodeChildren(this).splice(beforeIndex, 0, viewNode);
    }
    this._childrenDirty = true;

    if (this._el) {
      const childElement = this._renderChildForInsert(viewNode);
      attachChildDom(this, viewNode, childElement, nodeAttachedGroup(this, beforeNode)[0] ?? null);
      if (isDevtoolsEnabled() && !this._devtoolsRendering) {
        notifyDevtoolsMutation(this, 'child', { added: [ensureDevtoolsNodeId(viewNode)] });
      }
    }

    return this;
  }

  /** 在 afterKey 对应子节点之后插入 keyed 子节点；afterKey 为空时插入到开头。 */
  insertAfter(key, child, afterKey = null) {
    assertRegionChildAllowed(this);

    const rawKey = String(key);
    if (this._childKeys?.has(rawKey)) {
      throw new TypeError(`duplicate key "${rawKey}"`);
    }

    const hasAfter = afterKey !== null && afterKey !== undefined;
    const afterNode = hasAfter ? (this._childKeys?.get(String(afterKey)) ?? null) : null;
    if (hasAfter && !afterNode) {
      throw new TypeError(`insertAfter() requires an existing afterKey "${String(afterKey)}"`);
    }

    const viewNode = normalizeChildWithContext(this, child);
    nodeChildKeys(this).set(rawKey, viewNode);
    if (typeof viewNode.attr === 'function') {
      viewNode.attr('data-row-key', rawKey);
    }
    this._pendingRemovals?.delete(viewNode);
    this._adoptPendingMount(viewNode);
    this._linkChild(viewNode);

    const afterIndex = afterNode ? this._children.indexOf(afterNode) : -1;
    if (afterIndex === -1) {
      prependNodeChild(this, viewNode);
    } else {
      nodeChildren(this).splice(afterIndex + 1, 0, viewNode);
    }
    this._childrenDirty = true;

    if (this._el) {
      const childElement = this._renderChildForInsert(viewNode);
      let anchor = null;
      if (afterNode) {
        for (let i = this._children.indexOf(afterNode) + 1; i < this._children.length; i += 1) {
          const sibling = this._children[i];
          const element = sibling === viewNode ? null : nodeAttachedGroup(this, sibling)[0];
          if (element) {
            anchor = element;
            break;
          }
        }
      } else {
        const first = this._children.find(
          (sibling) => sibling !== viewNode && nodeAttachedGroup(this, sibling).length > 0
        );
        anchor = first ? nodeAttachedGroup(this, first)[0] : null;
      }
      attachChildDom(this, viewNode, childElement, anchor);
      if (isDevtoolsEnabled() && !this._devtoolsRendering) {
        notifyDevtoolsMutation(this, 'child', { added: [ensureDevtoolsNodeId(viewNode)] });
      }
    }

    return this;
  }

  /** 把已有 keyed 子节点移动到 beforeKey 之前；beforeKey 为空时移动到末尾。 */
  moveBefore(key, beforeKey = null) {
    assertRegionChildAllowed(this);

    const rawKey = String(key);
    const viewNode = this._childKeys?.get(rawKey);
    if (!viewNode) {
      throw new TypeError(`moveBefore() requires an existing key "${rawKey}"`);
    }

    const hasBefore = beforeKey !== null && beforeKey !== undefined;
    const beforeNode = hasBefore ? (this._childKeys?.get(String(beforeKey)) ?? null) : null;
    if (hasBefore && !beforeNode) {
      throw new TypeError(`moveBefore() requires an existing beforeKey "${String(beforeKey)}"`);
    }
    if (viewNode === beforeNode) {
      return this;
    }

    const currentIndex = this._children.indexOf(viewNode);
    if (currentIndex !== -1) {
      nodeChildren(this).splice(currentIndex, 1);
    }
    const targetIndex = beforeNode ? this._children.indexOf(beforeNode) : this._children.length;
    nodeChildren(this).splice(
      targetIndex === -1 ? this._children.length : targetIndex,
      0,
      viewNode
    );
    this._childrenDirty = true;

    if (this._el) {
      const anchor = nodeAttachedGroup(this, beforeNode)[0] ?? null;
      nodeAttachedGroup(this, viewNode).forEach((element) =>
        this._el.insertBefore(element, anchor)
      );
    }

    return this;
  }

  /** 把已有 keyed 子节点移动到 afterKey 之后；afterKey 为空时移动到开头。 */
  moveAfter(key, afterKey = null) {
    assertRegionChildAllowed(this);

    const rawKey = String(key);
    const viewNode = this._childKeys?.get(rawKey);
    if (!viewNode) {
      throw new TypeError(`moveAfter() requires an existing key "${rawKey}"`);
    }

    const hasAfter = afterKey !== null && afterKey !== undefined;
    const afterNode = hasAfter ? (this._childKeys?.get(String(afterKey)) ?? null) : null;
    if (hasAfter && !afterNode) {
      throw new TypeError(`moveAfter() requires an existing afterKey "${String(afterKey)}"`);
    }
    if (viewNode === afterNode) {
      return this;
    }

    const currentIndex = this._children.indexOf(viewNode);
    if (currentIndex !== -1) {
      nodeChildren(this).splice(currentIndex, 1);
    }
    const afterIndex = afterNode ? this._children.indexOf(afterNode) : -1;
    if (afterIndex === -1) {
      prependNodeChild(this, viewNode);
    } else {
      nodeChildren(this).splice(afterIndex + 1, 0, viewNode);
    }
    this._childrenDirty = true;

    if (this._el) {
      let anchor = null;
      if (afterNode) {
        for (let i = this._children.indexOf(afterNode) + 1; i < this._children.length; i += 1) {
          const sibling = this._children[i];
          const element = sibling === viewNode ? null : nodeAttachedGroup(this, sibling)[0];
          if (element) {
            anchor = element;
            break;
          }
        }
      } else {
        const first = this._children.find(
          (sibling) => sibling !== viewNode && nodeAttachedGroup(this, sibling).length > 0
        );
        anchor = first ? nodeAttachedGroup(this, first)[0] : null;
      }
      nodeAttachedGroup(this, viewNode).forEach((element) =>
        this._el.insertBefore(element, anchor)
      );
    }

    return this;
  }

  /** 同 key 原位换新：旧节点销毁、新节点占据同一槽位，邻居不受影响。 */
  replaceChild(key, child) {
    assertRegionChildAllowed(this);

    const rawKey = String(key);
    const previous = this._childKeys?.get(rawKey);
    if (!previous) {
      throw new TypeError(`replaceChild() requires an existing key "${rawKey}"`);
    }

    const viewNode = normalizeChildWithContext(this, child);
    if (typeof viewNode.attr === 'function') {
      viewNode.attr('data-row-key', rawKey);
    }

    nodeChildKeys(this).set(rawKey, viewNode);
    this._pendingRemovals?.delete(viewNode);
    this._adoptPendingMount(viewNode);
    this._linkChild(viewNode);
    const index = this._children.indexOf(previous);
    if (index === -1) {
      this._children = appendNodeEntry(this._children, viewNode);
    } else {
      nodeChildren(this).splice(index, 1, viewNode);
    }
    this._childrenDirty = true;

    if (this._el) {
      const newElement = this._renderChildForInsert(viewNode);
      const anchor = nodeAttachedGroup(this, previous)[0] ?? resolveInsertAnchor(this, previous);
      attachChildDom(this, viewNode, newElement, anchor);
      if (isDevtoolsEnabled() && !this._devtoolsRendering) {
        notifyDevtoolsMutation(this, 'child', { added: [ensureDevtoolsNodeId(viewNode)] });
      }
    }

    this._childMountStates?.delete(previous);
    previous.destroy();

    return this;
  }

  /**
   * keyed 子项绑定：source 是 ref/computed 句柄，或 keySet 容器。
   * 同 key 且行引用未变时复用节点（build 不重跑）；行引用变化原位换新；
   * 顺序变化 insertBefore 保身份。keyFn 缺省时用行引用身份做 key。
   *
   * source 是 keySet 时（`isKeySet(source)`）：传给 build 的行是容器的**元素**
   * （KeyItem `{ data, api }`，第二参数仍是下标），key 由容器自己的 `keyOf(item.data)` 得到；
   * 元素按 key 复用，所以「同 key 同 api」，而内容是否变了看 `item.data` 的引用——
   * `replace` / `merge` 换了数据引用就原位换新，重排只搬元素不动状态。
   * equals / update 收的也是行数据（`item.data`），与 ref 源同口径。
   *
   * options 可声明行级更新协议（可选，不传就是上面的旧行为）：
   * - equals(prevRow, nextRow)：同 key 且引用变化时做内容等价比较，为真则复用节点（不重建）。
   * - update(node, prevRow, nextRow)：同 key 且引用变化且不等价时原地更新节点（不重建）。
   * 两者同时给出时 equals 优先；判定为「确实变了」的行仍然原位换新。
   */
  keyed(source, keyOrBuild, maybeBuild = null, maybeOptions = null) {
    const sourceIsKeySet = isKeySet(source);
    const withKeyFn = typeof maybeBuild === 'function';
    const build = withKeyFn ? maybeBuild : keyOrBuild;
    // keySet 源缺省用容器自己的身份：元素是 KeyItem，键取自 item.data（不缓存 key，只有一个真源）。
    const keyFn = withKeyFn
      ? keyOrBuild
      : sourceIsKeySet
        ? (item) => source.keyOf(item.data)
        : null;
    const options = withKeyFn ? maybeOptions : maybeBuild;

    if (!isSignal(source) && !sourceIsKeySet) {
      throw new TypeError('keyed() requires a signal handle or a keySet as its source');
    }
    if (typeof build !== 'function') {
      throw new TypeError('keyed() requires a build function');
    }
    if (options !== null && options !== undefined && !isKeyedOptions(options)) {
      throw new TypeError('keyed() options must be a plain object');
    }
    for (const hook of ['equals', 'update']) {
      if (options?.[hook] !== undefined && typeof options[hook] !== 'function') {
        throw new TypeError(`keyed() ${hook} must be a function`);
      }
    }

    assertRegionChildAllowed(this);
    const segment = {
      anchorNode: this._children[this._children.length - 1] ?? null,
      equals: options?.equals ?? null,
      itemSource: sourceIsKeySet,
      keyFn,
      build,
      members: new Map(),
      parent: this,
      update: options?.update ?? null
    };
    // 段只在本次 keyed() 的绑定闭包里使用（syncKeyedSegment(this, segment, rows)）；此前的
    // _keyedSegments 名单只写不读，还会在每次区域重跑时追加、从不清理，把上一轮的
    // members（行与节点引用）一直留在树上。名单已删除。
    registerNodeBinding(
      this,
      'keyed',
      null,
      () => source.value,
      (rows) => {
        syncKeyedSegment(this, segment, rows);
      }
    );

    return this;
  }

  /**
   * 条件挂载声明：把条件（句柄或零参闭包）惰性存放在本节点上，
   * 入树时由父节点收养建绑定。已被收养后再次调用属于重复声明，直接抛错。
   */
  mountable(condition) {
    const next = condition === undefined ? true : condition;
    if (!isSignal(next) && typeof next !== 'function' && typeof next !== 'boolean') {
      throw new TypeError(
        'mountable() requires a signal handle, a boolean or a zero-argument function'
      );
    }

    // 已入树：改写内部值单元，父节点的绑定立即重算（随时替换）
    if (this._mountConditionRef) {
      this._mountConditionRef.value = next;
      return this;
    }

    // 未入树：惰性声明，入树时由父节点收养
    this._mountCondition = next;
    return this;
  }

  /**
   * 自身挂载条件的最近提交状态（父节点单向镜像写入，默认 true）。
   * 元素此刻是否在文档里另查 _el?.isConnected——受祖先挂载与渲染时机影响。
   */
  isMounted() {
    // 缺省（字段未写入）即「已挂载」：父节点单向镜像写入 false 时才不挂载
    return this._isMounted !== false;
  }

  /**
   * 子树错误边界：影响范围 = 本节点子树。handler(error, info) 返回节点则
   * 替换子树降级；返回空仅上报并保持现状。捕获永不静默（console.error 必发）。
   */
  whenFailed(handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('whenFailed() requires a handler function');
    }

    this._errorHandler = handler;
    return this;
  }

  /**
   * 插入路径统一入口：把子节点链接到当前父节点。
   * 错误边界在出错时沿 _parent 上溯解析，这里只维护父子单向关系。
   * 重新挂载（插入 / 换新 / 区域重建）同时清掉上一次的失败标记，允许再试一次。
   */
  _linkChild(viewNode) {
    viewNode._parent = this;
    // 只有真的失败过的节点才清标记：读点全是真值判断，缺省（undefined）与 false 等价，
    // 因此健康路径不再预写这个槽位（票 22 候选二：约 −80 B/行），
    // 同时保留「失败过的节点重新链接后可以再试一次」的既有行为。
    if (viewNode._failed === true) {
      viewNode._failed = false;
    }
  }

  /**
   * 插入路径的即时渲染：失败交给最近边界（与其它渲染路径一致）。
   * 返回要挂载的元素——正常是子节点自己的元素，降级时是 fallback 的元素。
   */
  _renderChildForInsert(viewNode) {
    try {
      return withRenderScope(this._access ?? currentInheritedScope(), () => viewNode.renderDom());
    } catch (error) {
      const replacement = captureNodeError(viewNode, error, 'render');
      return replacement?._el ?? null;
    }
  }

  /** 边界处理入口：通知 → handler → 降级替换 / 保持现状。返回降级节点或 null。 */
  _handleError(error, source, phase) {
    const info = {
      phase,
      message: String(error?.message ?? error),
      source,
      boundary: this
    };
    console.error('[yoya] whenFailed captured an error', error, info);
    if (isDevtoolsEnabled()) {
      emitDevtools({ type: 'error', phase, source, boundary: this, error });
    }

    let fallback = null;
    if (typeof this._errorHandler === 'function') {
      // handler 自身抛错 = 边界故障：标记该错误已由本边界处理过，再向外抛，
      // 避免父级渲染循环把它重新送回同一个边界造成重复处理 / 死循环。
      fallback = this._errorHandler(error, info);
    }

    if (fallback) {
      return this._replaceBoundaryContent(fallback);
    }

    // handler 返回空：仅上报 + 保持现状，不再向外（最近的边界独占这次捕获）。
    // render / build 阶段的失败节点留在树里会反复失败：标记后跳过后续尝试，
    // 重新挂载（插入 / 换新 / 区域重建）会清掉标记，允许再试一次。
    if ((phase === 'render' || phase === 'build') && source) {
      source._failed = true;
    }
    return null;
  }

  /** 降级替换：先构建成功（含渲染），再原子替换子树。 */
  _replaceBoundaryContent(fallback) {
    const viewNode = normalizeChildWithContext(this, fallback);
    if (this._el) {
      withRenderScope(this._access ?? currentInheritedScope(), () => viewNode.renderDom());
    }

    const swap = () => {
      this.clearChildren();
      this.child(viewNode);
      if (this._el) {
        this._commitChildren();
      }
    };

    // 区域节点的子节点只能由区域构建产出：降级替换按一次区域构建执行
    if (this._rebuildable) {
      withRegionBuild(this, swap);
    } else {
      swap();
    }

    return viewNode;
  }

  /** 插入路径统一入口：子节点带惰性挂载条件时由本节点收养。 */
  _adoptPendingMount(viewNode) {
    const declared = viewNode._mountCondition ?? null;
    if (declared === null && !viewNode._mountConditionRef) {
      return; // 没有声明条件 → 默认常挂
    }

    viewNode._mountCondition = null;
    this._adoptMountCondition(viewNode, declared);
  }

  /**
   * 插入路径专用：收养子节点的挂载条件，在父节点登记绑定。
   * 条件存进子节点自己的值单元，父节点订阅它——替换条件时无需父指针，父节点自动重算。
   */
  _adoptMountCondition(node, condition) {
    if (!node._mountConditionRef) {
      node._mountConditionRef = ref(condition === null ? true : condition);
    } else if (condition !== null) {
      node._mountConditionRef.value = condition;
    }

    const binding = registerNodeBinding(
      this,
      'mount',
      node,
      () => resolveMountCondition(node),
      (next) => {
        const mounted = Boolean(next);
        nodeMountStates(this).set(node, mounted);
        node._isMounted = mounted; // 单向镜像：父写子读，isMounted() 无需父指针
        this._syncChildMounted(node, mounted);
      }
    );

    // 子节点销毁时释放父节点为它登记的挂载绑定与挂载状态：列表容器通常长命，
    // 残留绑定会把已经销毁的行一直钉在内存里（keyed 行增删频繁时尤其明显）。
    if (typeof node._parentMountCleanup === 'function') {
      node._parentMountCleanup();
    }
    node._parentMountCleanup = () => {
      releaseBindings([binding]);
      this._childMountStates?.delete(node);
    };

    // 渲染后收养：登记时只求值未激活订阅，这里手动补上
    if (this._el && setupStack.length === 0 && regionBuildStack.length === 0) {
      binding.activate();
    }
  }

  _syncChildMounted(node, mounted) {
    if (this._deleted || node._deleted || !this._el) {
      return;
    }

    // membership 校验：clearChildren / 区域换子后的残留绑定安全 no-op，
    // 不需要父指针，也没有双向同步问题。
    if (!this._children.includes(node)) {
      return;
    }

    if (mounted) {
      const elements = nodeDomGroup(node);
      const anchor = resolveInsertAnchor(this, node);
      elements.forEach((element) => {
        if (element.parentNode !== this._el) {
          this._el.insertBefore(element, anchor);
        }
      });
      fireWhenMount(node);
      return;
    }

    nodeAttachedGroup(this, node).forEach((element) => {
      if (element.parentNode === this._el) {
        this._el.removeChild(element);
      }
    });
    rearmWhenMount(node);
  }

  /** 按 key 读取子节点；不存在返回 null。 */
  getChild(key) {
    return this._childKeys?.get(String(key)) || null;
  }

  /** 按 key 移除并销毁子节点。 */
  removeChild(key) {
    const rawKey = String(key);
    const viewNode = this._childKeys?.get(rawKey);
    if (!viewNode) {
      return this;
    }

    this._childKeys?.delete(rawKey);
    const index = this._children.indexOf(viewNode);
    if (index !== -1) {
      nodeChildren(this).splice(index, 1);
    }
    this._childrenDirty = true;
    const removedId =
      this._el && isDevtoolsEnabled() && !this._devtoolsRendering
        ? ensureDevtoolsNodeId(viewNode)
        : null;
    viewNode.destroy();
    if (removedId !== null) {
      notifyDevtoolsMutation(this, 'child', { removed: [removedId] });
    }
    return this;
  }

  _dropChildKeys(nodes) {
    const doomed = new Set(nodes);
    this._childKeys?.forEach((child, key) => {
      if (doomed.has(child)) {
        this._childKeys?.delete(key);
      }
    });
  }

  /**
   * 添加子节点；字符串和数字会自动转成 VTextNode。
   * 区域节点的子节点只能由它自己的 builder 产出，外部追加即违规。
   */
  child(...children) {
    assertRegionChildAllowed(this);

    children.flat(Infinity).forEach((child) => {
      if (child === null || child === undefined) {
        return;
      }

      const viewNode = normalizeChildWithContext(this, child);
      this._pendingRemovals?.delete(viewNode);
      this._children = appendNodeEntry(this._children, viewNode);
      this._childrenDirty = true;
      this._adoptPendingMount(viewNode);
      this._linkChild(viewNode);
    });

    return this;
  }

  /**
   * 注册事件。同一节点同一事件只保留最新 handler；
   * 真实 DOM 上每个事件最多挂一个转发 adapter。
   *
   * 在 keyed 行构建期注册的、可委托的事件（冒泡标准事件 + 无 once/capture/passive）
   * 不收进节点自己的 _events，而是登记到段根由它统一派发；其余情况走下面的逐元素绑定。
   */
  on(eventName, handler, options) {
    if (typeof handler !== 'function') {
      throw new TypeError('ViewNode event handler must be a function');
    }

    const segment = activeKeyedBuild();
    if (
      segment &&
      this instanceof ElementNode &&
      canDelegateEvent(eventName, options) &&
      !this._events?.has(eventName)
    ) {
      registerDelegatedEvent(segment.parent, this, eventName, handler, options);
      return this;
    }

    // 同一个事件从委托切回逐元素绑定（例如挂载后又注册了一次）：先把委托描述符摘掉，
    // 否则派发时会拿着旧 handler 再调一次。
    removeDelegatedEvent(this, eventName);
    const previous = this._events?.get(eventName);
    nodeEvents(this).set(eventName, { handler, options });

    if (this._el) {
      this._bindDomAdapter(eventName, previous?.options, options);
    }

    return this;
  }

  off(eventName) {
    removeDelegatedEvent(this, eventName);
    this._events?.delete(eventName);
    const entry = this._domAdapters?.get(eventName);
    if (entry) {
      entry.cleanup();
      this._removeCleanup(entry.cleanup);
      this._domAdapters?.delete(eventName);
    }
    return this;
  }

  /**
   * 显式归属到本节点的 window 级监听：destroy() 时自动卸载。
   * 在区域构建期调用时，监听随每轮重建重置（与独立 bindWindowEvent 语义一致）；
   * 需要提前解绑时仍使用独立函数并自行保存返回的 unbind。
   */
  bindWindowEvent(type, handler, options = undefined) {
    if (typeof window !== 'undefined') {
      window.addEventListener(type, handler, options);
      const unbind = () => window.removeEventListener(type, handler, options);
      registerRegionCleanup(unbind);
      this._cleanup = appendNodeEntry(this._cleanup, unbind);
    }

    return this;
  }

  /** document 级同类入口：显式归属本节点，destroy() 自动卸载。 */
  bindDocumentEvent(type, handler, options = undefined) {
    if (typeof document !== 'undefined') {
      document.addEventListener(type, handler, options);
      const unbind = () => document.removeEventListener(type, handler, options);
      registerRegionCleanup(unbind);
      this._cleanup = appendNodeEntry(this._cleanup, unbind);
    }

    return this;
  }

  /**
   * 下一个动画帧执行一次 callback；节点 destroy() 时若还没执行会自动取消。
   * 需要多处调度就多次调用，每次独立登记、互不影响（SSR 下为空操作）。
   */
  bindAnimationFrame(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('bindAnimationFrame(callback) requires a function');
    }

    if (this._deleted || typeof requestAnimationFrame !== 'function') {
      return this;
    }

    let frameId = requestAnimationFrame((time) => {
      frameId = null;
      callback(time);
    });
    const cancel = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
    };

    this._cleanup = appendNodeEntry(this._cleanup, cancel);
    return this;
  }

  /**
   * 每帧执行 callback，直到节点 destroy() 或显式 stopAnimationFrameLoop()。
   * 同一节点只保留一条循环：重复调用会先停掉上一条再启动新的。
   */
  bindAnimationFrameLoop(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('bindAnimationFrameLoop(callback) requires a function');
    }

    if (this._deleted || typeof requestAnimationFrame !== 'function') {
      return this;
    }

    this.stopAnimationFrameLoop();

    let frameId = null;
    const step = (time) => {
      frameId = null;
      callback(time);

      // 回调里停掉或重启过循环：这一轮不再续帧
      if (this._frameLoopStop !== stop) {
        return;
      }

      frameId = requestAnimationFrame(step);
    };
    const stop = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }

      if (this._frameLoopStop === stop) {
        this._frameLoopStop = null;
      }
    };

    this._frameLoopStop = stop;
    frameId = requestAnimationFrame(step);
    this._cleanup = appendNodeEntry(this._cleanup, stop);
    return this;
  }

  /** 停止 bindAnimationFrameLoop() 启动的循环；没有循环时为空操作。 */
  stopAnimationFrameLoop() {
    this._frameLoopStop?.();
    return this;
  }

  _bindDomAdapter(eventName, previousOptions, nextOptions) {
    const existing = this._domAdapters?.get(eventName);
    if (existing) {
      if (sameEventListenerOptions(previousOptions, nextOptions)) {
        return;
      }
      existing.cleanup();
      this._removeCleanup(existing.cleanup);
      this._domAdapters?.delete(eventName);
    }

    const adapter = (event) => {
      const current = this._events?.get(eventName);
      if (!current || typeof current.handler !== 'function') {
        return;
      }
      try {
        current.handler.call(this, event);
      } catch (error) {
        captureNodeError(this, error, 'event');
      }
      if (current.options?.once) {
        this.off(eventName);
      }
    };
    const cleanup = () => {
      if (this._el) {
        this._el.removeEventListener(eventName, adapter, nextOptions);
      }
    };
    // 标记为「元素级监听」：整棵子树离开文档时，逐条 removeEventListener 没有意义
    // （元素不再可达），销毁路径据此整段跳过；文档 / window 级 cleanup 不做标记。
    cleanup._domListener = true;

    this._el.addEventListener(eventName, adapter, nextOptions);
    nodeDomAdapters(this).set(eventName, { cleanup });
    this._cleanup = appendNodeEntry(this._cleanup, cleanup);
  }

  _removeCleanup(cleanup) {
    const index = this._cleanup?.indexOf(cleanup) ?? -1;
    if (index !== -1) {
      this._cleanup?.splice(index, 1);
    }
  }

  /** 值级更新的统一入口：区域按谓词重建，普通节点只刷绑定。 */
  flushAll() {
    if (this._deleted) {
      return this;
    }

    return this._rebuildable ? this.rebuild() : this.flush();
  }

  renderDom() {
    return null;
  }

  /** 将当前 ViewNode 树提交到真实 DOM。 */
  commit() {
    return this.renderDom();
  }

  _commitChildren() {
    const pending = this._pendingRemovals;
    if (pending) {
      // for..of 迭代 Set：与 forEach 同为实时迭代语义，但不为每个待移除节点建闭包
      for (const child of pending) {
        child.destroy();
      }
    }
    this._pendingRemovals = null;
    this._childrenDirty = false;
  }

  /**
   * 将当前节点挂载到选择器或 DOM 元素。
   */
  bindTo(target) {
    const parent = resolveTarget(target);
    const element = this.renderDom();

    if (parent && element) {
      parent.appendChild(element);
      // 根节点自己落地：组件钩子在这里触发（子节点由父级挂载路径负责）
      if (this._whenHooks !== undefined) {
        fireWhenMount(this);
      }
    }

    return this;
  }

  /**
   * 销毁节点：清理事件、递归销毁子节点，并从 DOM 中移除自身。
   *
   * 单趟完成：本节点只释放自己名下的绑定，不再对整棵子树做一遍
   * `collectRegionBindings()` 收集（子节点各自负责自己那一层，原先每个节点
   * 都要把后代遍历一遍，是 O(节点数 × 深度)）。摘掉自己的元素后，子节点的
   * 元素随它一起离开文档，因此子节点走「已摘除」路径：跳过逐条 removeChild
   * 与元素级监听退订（清空整表时这两项占了七成以上）。
   */
  destroy() {
    const inheritedDetached = detachedDestroyDepth > 0;
    const element = this._el;
    const parentNode = inheritedDetached ? null : (element?.parentNode ?? null);
    const domGone = inheritedDetached || parentNode !== null;

    // 槽位元素（投影点）被销毁：先把投影的内容收回宿主登记表，别把外部内容一起销毁
    this._slotHost?._reclaimSlot(this);

    // 组件级钩子：在子树销毁**之前**触发（此时自己的 DOM / 子节点还读得到）
    fireWhenDestroy(this);

    if (isDevtoolsEnabled()) {
      emitDevtools({ type: 'destroy', node: this });
      unregisterDevtoolsNode(this);
    }
    if (typeof this._parentMountCleanup === 'function') {
      const cleanup = this._parentMountCleanup;
      this._parentMountCleanup = null;
      cleanup(); // 释放父节点为它登记的挂载绑定，父节点可能远比它长命
    }
    this._deleted = true;
    this._parent = null;
    releaseOwnBindings(this);
    releaseRegion(this);
    if (Array.isArray(this._regionRunCleanups)) {
      this._regionRunCleanups.forEach((cleanup) => cleanup());
      this._regionRunCleanups = [];
    }
    if (batchDestroyDepth > 0) {
      // 库自己发起的整批摘除：子树内元素级监听不再可达，整段跳过；
      // 文档 / window 级 cleanup（bindDocumentEvent / bindWindowEvent / 动画帧）
      // 与元素在不在文档里无关，仍然执行。
      this._cleanup?.forEach((cleanup) => {
        if (cleanup._domListener !== true) {
          cleanup();
        }
      });
    } else {
      this._cleanup?.forEach((cleanup) => cleanup());
    }
    this._cleanup = null;
    this._childMountStates = null;

    const children = this._children;
    const pendingRemovals = this._pendingRemovals;
    this._children = EMPTY_CHILDREN;
    this._childKeys = null;
    this._pendingRemovals = null;

    if (parentNode) {
      parentNode.removeChild(element);
    }

    if (domGone) {
      children.forEach(destroyInDetached);
      pendingRemovals?.forEach(destroyInDetached);
    } else {
      children.forEach((child) => child.destroy());
      pendingRemovals?.forEach((child) => child.destroy());
    }

    return this;
  }

  toHTML() {
    return '';
  }

  /**
   * hydration 后同步钩子：子类可在此从真实 DOM 回读状态（如表单控件值）。
   */
  hydrateSnapshot() {
    return this;
  }
}

/**
 * VTextNode 表示视图树中的文本节点，渲染时对应真实 Text 节点。
 * 外部可以继续传入原始字符串，内部统一包装为 VTextNode。
 */
export class VTextNode extends ViewNode {
  constructor(content = '') {
    super(null);
    this._content = '';
    this._textNode = null;

    if (typeof content === 'function' || isSignal(content)) {
      registerNodeBinding(this, 'text', null, content, (next) => this.textContent(next));
      return;
    }

    this._content = String(content);
  }

  textContent(value) {
    if (value === undefined) {
      return this._content;
    }

    if (typeof value === 'function' || isSignal(value)) {
      registerNodeBinding(this, 'text', null, value, (next) => this.textContent(next));
      return this;
    }

    const previous = this._content;
    this._content = String(value);
    if (this._textNode) {
      this._textNode.textContent = this._content;
    }
    if (this._textNode && isDevtoolsEnabled() && !Object.is(previous, this._content)) {
      notifyDevtoolsMutation(this, 'text', { from: previous, to: this._content });
    }
    return this;
  }

  renderDom() {
    if (this._deleted || this._permissionState() === 'hidden') {
      return null;
    }

    if (!this._textNode) {
      this._textNode = document.createTextNode(this._content);
      this._el = this._textNode;
    }

    activateBindings(this);

    return this._textNode;
  }

  toHTML() {
    return this._deleted || this._permissionState() === 'hidden' ? '' : escapeHtml(this._content);
  }
}

/**
 * ComponentNode 延迟解析函数 Factory 或带 render() 的组件对象。
 * render 返回单个 ViewNode 时按普通组件处理；返回 ViewNode 数组时按
 * 多根 fragment 处理：不产生包装元素，父元素直接落实全部根节点。
 */
export class ComponentNode extends ViewNode {
  constructor(component) {
    super(null);
    this._component = component;
    registerComponentHooks(this, component);
    if (component && typeof component === 'object' && typeof component.whenFailed === 'function') {
      this.whenFailed(component.whenFailed.bind(component));
    }
    this._resolved = null; // 第一个根，供外部兼容读取
    this._resolvedList = null; // 全部根
    this._roots = null; // 多根模式时非 null
    this._fragmentDom = null; // 多根模式已落实的 DOM 节点
    // render() 是懒解析：解析时刻可能已经离开构建作用域，所以在这里把
    // 构建期环境存下来（与区域节点的 _regionEnv 同一套语义）。
    this._contextSnapshot = snapshotContext();
    this._i18nSnapshot = i18nScopeBridge ? i18nScopeBridge.current() : null;
  }

  _resolve() {
    if (this._resolvedList) {
      return this._resolved;
    }

    const build = () =>
      withProviderScope(this, () =>
        typeof this._component === 'function' ? this._component() : this._component.render()
      );
    const withEnvironment = () =>
      withContext(this._contextSnapshot, () =>
        i18nScopeBridge ? i18nScopeBridge.runWith(this._i18nSnapshot, build) : build()
      );
    const resolved = withAccess(this._accessContext || currentAccess(), withEnvironment);
    const list = Array.isArray(resolved) ? resolved.slice() : [resolved];
    const componentInfo = describeComponent(this._component);
    const ownerInfo = this._parent
      ? ` It was added as a child of ${describeValue(this._parent)}.`
      : '';
    list.forEach((item) => {
      if (!(item instanceof ViewNode)) {
        throw new TypeError(
          'Component render must return a ViewNode or an array of ViewNodes. ' +
            `render() of ${componentInfo} returned ${describeValue(item)}.` +
            `${ownerInfo} If render() returns a component object (for example ` +
            'vPagination({ ... })), attach it with parent.child(...) instead of ' +
            'returning it directly.'
        );
      }
    });

    this._resolvedList = list;
    this._resolved = list[0] || null;
    this._roots = Array.isArray(resolved) ? list : null;
    list.forEach((root) => this._linkChild(root));
    // 槽位表在解析时无条件建：同名重复声明即便没有内容也要立刻报错（就近作用域，不进嵌套组件）
    if (!this._roots) {
      this._slots = collectSlots(this._resolved);
    }
    this._adoptContentIntoRoot();
    if (
      this._component &&
      typeof this._component === 'object' &&
      typeof this._component._attachHost === 'function'
    ) {
      this._component._attachHost(this);
    }
    return this._resolved;
  }

  /**
   * 内容侧收编：`root.child(...)` 之前挂在这个组件节点上的孩子，在解析出根之后
   * 搬进根元素内部（普通元素的语义：组件根的孩子就是孩子）。
   * 多根组件没有单一容器 → 明确报错，不静默丢弃。
   */
  _adoptContentIntoRoot() {
    if (this._children.length === 0) {
      return;
    }

    if (this._roots) {
      throw new TypeError(
        'Component with multiple roots cannot take children: ' +
          'declare a named slot for the content or return a single root.'
      );
    }

    const content = this._children;
    this._children = EMPTY_CHILDREN;
    this._childrenDirty = true;
    this._slots = collectSlots(this._resolved, this);
    content.forEach((child) => this._placeContent(child));
  }

  /**
   * 内容投递：带 `slot="x"` 标记的内容进同名槽位（信封不进 DOM），未标记的进根元素
   * （普通元素语义）；标记找不到槽位 → 不 mount + 开发期提示（HTML 语义）。
   */
  _placeContent(content) {
    const name = slotNameOf(content);
    if (!name) {
      this._resolved.child(content);
      return;
    }

    registerSlotContent((this._slotRegistry ??= createSlotRegistry()), name, content);

    const slotElement = this._slots?.get(name);
    if (!slotElement) {
      if (typeof console !== 'undefined') {
        console.warn(
          `[yoya] <${this._resolved.tagName?.() ?? 'component'}> has no slot "${name}": ` +
            'the content was not mounted (a slot only resolves on its direct parent component).'
        );
      }
      return;
    }

    projectSlot(this._slotRegistry, name, slotElement, appendProjectedNodes);
  }

  /** 重新收集槽位并重新投影（区域重建后会走这里）。 */
  _projectSlots() {
    if (!this._slotRegistry || !this._resolved || this._roots) {
      return;
    }

    this._slots = collectSlots(this._resolved, this);
    this._slots.forEach((element, name) =>
      projectSlot(this._slotRegistry, name, element, appendProjectedNodes)
    );
  }

  /** 槽位元素销毁 / 重建前把投影的内容收回登记表（不销毁内容）。 */
  _reclaimSlot(slotElement) {
    reclaimSlot(slotElement);
  }

  /**
   * 组件节点的 child() = 往根元素里加内容（普通元素语义）。
   * 解析之前先攒着（保持 render() 的懒解析），解析后直接挂进根。
   */
  child(...children) {
    if (!this._resolvedList) {
      return super.child(...children);
    }

    if (this._roots) {
      throw new TypeError(
        'Component with multiple roots cannot take children: ' +
          'declare a named slot for the content or return a single root.'
      );
    }

    children.flat(Infinity).forEach((child) => {
      if (child === null || child === undefined) {
        return;
      }
      this._placeContent(normalizeChildWithContext(this, child));
    });
    return this;
  }

  _resolveList() {
    this._resolve();
    return this._resolvedList || [];
  }

  /**
   * 组件主动替换解析结果：支持单个根或一组根；已挂载时原位换 DOM。
   */
  _replaceResolved(nextView) {
    const previousList = this._resolvedList || [];
    const nextList = Array.isArray(nextView) ? nextView.slice() : [nextView];
    nextList.forEach((item) => {
      if (!(item instanceof ViewNode)) {
        throw new TypeError('Component render must return a ViewNode or an array of ViewNodes');
      }
    });

    if (
      previousList.length === nextList.length &&
      previousList.every((root, index) => root === nextList[index])
    ) {
      return;
    }

    const oldNodes = [];
    if (this._fragmentDom && this._fragmentDom.length > 0) {
      oldNodes.push(...this._fragmentDom);
    } else if (previousList.length > 0) {
      const previousElement = previousList[0]._el;
      if (previousElement && previousElement.parentNode) {
        oldNodes.push(previousElement);
      }
    }

    this._resolvedList = nextList;
    this._resolved = nextList[0] || null;
    this._roots = Array.isArray(nextView) ? nextList : null;
    this._fragmentDom = null;
    nextList.forEach((root) => this._linkChild(root));

    if (oldNodes.length === 0) {
      previousList.forEach((root) => root.destroy());
      return;
    }

    const inherited = currentInheritedScope();
    const parentNode = oldNodes[0].parentNode;
    const nextNodes = [];

    nextList.forEach((root) => {
      const element = withRenderScope(this._access ?? inherited, () => root.renderDom());
      if (element) {
        nextNodes.push(element);
      }
    });

    if (nextNodes.length > 0 && parentNode) {
      nextNodes.forEach((element) => parentNode.insertBefore(element, oldNodes[0]));
    }
    oldNodes.forEach((element) => {
      if (element.parentNode === parentNode) {
        parentNode.removeChild(element);
      }
    });

    if (this._roots) {
      this._fragmentDom = nextNodes;
    } else {
      this._el = nextNodes[0] || null;
    }

    previousList.forEach((root) => root.destroy());
  }

  /** 组件边界降级：销毁旧根，替换为降级节点。 */
  _replaceBoundaryContent(fallback) {
    const viewNode = normalizeChildWithContext(this, fallback);
    const previousList = this._resolvedList || [];
    const inherited = this._access ?? currentInheritedScope();
    const element = withRenderScope(inherited, () => viewNode.renderDom());
    const firstOld = previousList[0]?._el;
    if (element && firstOld?.parentNode) {
      firstOld.parentNode.insertBefore(element, firstOld);
    }

    this._resolvedList = [viewNode];
    this._resolved = viewNode;
    this._roots = null;
    this._fragmentDom = null;
    this._linkChild(viewNode);
    previousList.forEach((root) => root.destroy());
    return viewNode;
  }

  children() {
    if (!this._resolvedList) {
      return [];
    }

    if (!this._roots) {
      return this._resolvedList[0] ? this._resolvedList[0].children() : [];
    }

    return this._resolvedList.flatMap((root) => root.children());
  }

  textContent() {
    return this._resolveList()
      .map((root) => (typeof root.textContent === 'function' ? root.textContent() : ''))
      .join('');
  }

  renderDom() {
    if (this._deleted || this._permissionState() === 'hidden') {
      return null;
    }

    const inherited = currentInheritedScope();
    const list = this._resolveList();

    if (this._roots) {
      if (this._fragmentDom) {
        return null;
      }

      const nodes = [];
      list.forEach((root) => {
        if (root._failed) {
          return;
        }

        const element = withRenderScope(this._access ?? inherited, () => {
          try {
            return root.renderDom();
          } catch (error) {
            const replacement = captureNodeError(root, error, 'render');
            return replacement?._el ?? null;
          }
        });
        if (element) {
          nodes.push(element);
        }
      });
      this._fragmentDom = nodes;
      const fragment = document.createDocumentFragment();
      nodes.forEach((element) => fragment.appendChild(element));
      return fragment;
    }

    const resolved = list[0];
    return withRenderScope(this._access ?? inherited, () => {
      let element;
      if (resolved._failed) {
        this._el = null;
        return null;
      }

      try {
        element = resolved.renderDom();
      } catch (error) {
        const replacement = captureNodeError(resolved, error, 'render');
        element = replacement?._el ?? null;
      }
      this._el = element;
      return element;
    });
  }

  toHTML() {
    if (this._deleted || this._permissionState() === 'hidden') {
      return '';
    }

    const inherited = currentInheritedScope();
    const list = this._resolveList();
    return withRenderScope(this._access ?? inherited, () =>
      list
        .filter((root) => !root._failed)
        .map((root) => root.toHTML())
        .join('')
    );
  }

  destroy() {
    // 先触发组件钩子（子树销毁之前），再拆解析出来的根与内容侧
    fireWhenDestroy(this);

    // 内容归宿主：随组件一起销毁（不能留在登记表里泄漏）
    this._slotRegistry?.forEach((entry) => entry.carrier?.destroy?.());
    this._slotRegistry = null;

    if (
      this._component &&
      typeof this._component === 'object' &&
      typeof this._component.destroy === 'function'
    ) {
      this._component.destroy();
    }

    (this._resolvedList || []).forEach((root) => root.destroy());
    this._fragmentDom = null;

    return super.destroy();
  }
}

/**
 * 创建文本节点的工厂函数。
 */
export function vText(content = '') {
  return new VTextNode(content);
}

function describeValue(value) {
  if (value === null || value === undefined || typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return `${typeof value} ${JSON.stringify(value)}`;
  }

  if (typeof value === 'function') {
    return `function ${value.name || '(anonymous)'}`;
  }

  if (value instanceof ViewNode) {
    const tag = typeof value._tagName === 'string' ? ` <${value._tagName}>` : '';
    return `${value.constructor.name}${tag}`;
  }

  if (value && typeof value.render === 'function') {
    const ctor =
      value.constructor && value.constructor !== Object ? ` ${value.constructor.name}` : '';
    return `component object${ctor} with render()`;
  }

  const ctor =
    value && value.constructor && value.constructor !== Object ? value.constructor.name : 'Object';
  return `${ctor} instance`;
}

function describeComponent(component) {
  if (typeof component === 'function') {
    return `function ${component.name || '(anonymous)'}`;
  }

  if (component && typeof component === 'object') {
    const renderName =
      typeof component.render === 'function' && component.render.name
        ? ` (render ${component.render.name})`
        : '';
    return `component object${renderName}`;
  }

  return String(component);
}

/**
 * 与父节点上下文一起规范化子节点：输入不合法时立即抛出可定位的错误。
 */
function normalizeChildWithContext(parent, child) {
  try {
    // 父链接由各插入路径的 _linkChild() 统一维护（含搬家覆盖与移除清理）
    return normalizeChild(child);
  } catch (error) {
    if (error instanceof TypeError && String(error.message).startsWith('ViewNode child must')) {
      throw new TypeError(
        `Invalid child for ${describeValue(parent)}: ${error.message} ` +
          `(received ${describeValue(child)}). child() accepts a ViewNode, a component ` +
          'object with render(), a function, a string, or a number.',
        { cause: error }
      );
    }

    throw error;
  }
}

/**
 * 统一子节点输入，保证内部树只保存 ViewNode 实例。
 */
export function normalizeChild(child) {
  if (child instanceof ViewNode) {
    return child;
  }

  // 句柄作为子节点时按文本绑定处理，等价于 child(vText(handle))
  if (isSignal(child)) {
    return new VTextNode(child);
  }

  if (
    typeof child === 'function' ||
    (child && typeof child === 'object' && typeof child.render === 'function')
  ) {
    return new ComponentNode(child);
  }

  if (typeof child === 'string' || typeof child === 'number') {
    return new VTextNode(child);
  }

  throw new TypeError(
    'ViewNode child must be a ViewNode, component, string, number, or signal handle'
  );
}

export function normalizeSetupArguments(first = null, second = null, third = null) {
  if (typeof second === 'function' && (third === null || third === undefined)) {
    return {
      first,
      options: null,
      callback: second
    };
  }

  return {
    first,
    options: second,
    callback: third
  };
}

/**
 * 值分派：所有工厂参数（首参之后、以及尾部的变参）共用这一条。
 *
 * - 函数 → 构建回调（`node.setup` 内部登记 builder，支持区域重建）；
 * - 字符串 / 数字 / 节点 / 句柄 → `node.setup` 各自处理；
 * - 数组 → 子节点列表（机位无关：`div(['a','b'])` 与 `div(null, ['a','b'])` 同义）；
 * - 对象 → options 分派（`_setupObject`）；
 * - null / undefined → 忽略（便于条件参数）。
 */
export function applySetupValue(node, value) {
  if (value === null || value === undefined) {
    return node;
  }

  // render-backed 组件 API（返回的是带 render() 的对象，不是节点）：语义与
  // applyComponentArguments 的旧行为一致——对象选项落到 render() 的结果上，函数当作 builder。
  if (typeof node.setup !== 'function') {
    if (typeof value === 'function') {
      value(node);
      return node;
    }
    if (typeof value === 'object') {
      applyElementOptions(typeof node.render === 'function' ? node.render() : node, value);
    }
    return node;
  }

  if (Array.isArray(value)) {
    node.child(value);
    return node;
  }

  node.setup(value);
  return node;
}

/** 子工厂包装函数的标记：options 分派用它区分「子工厂」与「组件自有方法」。 */
const CHILD_FACTORY = Symbol('yoya.childFactory');

export function isChildFactoryMethod(fn) {
  return typeof fn === 'function' && fn[CHILD_FACTORY] === true;
}

export function applyElementOptions(node, options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    return node;
  }

  if (options.attrs && typeof node.attr === 'function') {
    node.attr(options.attrs);
  }

  if (options.style && typeof node.styles === 'function') {
    node.styles(options.style);
  }

  return node;
}

/**
 * 元素样式表按需创建。
 * 空集合按元素累加：V8 实测 `{}` 64 B、`[]` 40 B、`new Set()` 160 B，
 * 一行 8 个元素就是 1.8 KB——没写过样式的元素不该付这份固定开销。
 */
export function elementStyles(node) {
  return node._styles ?? (node._styles = {});
}

/** 元素属性快照按需创建（同上：没写过属性的元素不建空对象）。 */
export function elementAttrs(node) {
  return node._attrs ?? (node._attrs = {});
}

/**
 * 把类名同步进属性快照——只在快照已经存在时写。
 * 不为了类名创建快照（那正是本票要省的内存），也不改变属性顺序：
 * 快照里没有 class 时，序列化把类名排在其它属性之前，与「先 className() 后 attr()」一致。
 */
function storeClassName(node, className) {
  if (!node._attrs) {
    return;
  }

  if (className) {
    node._attrs.class = className;
  } else {
    delete node._attrs.class;
  }
}

/** 拆类名文本：兼容空格分隔与多参数写法。 */
function splitClassNames(value) {
  const text = String(value);
  // 单个类名（绝大多数）不做 split，省一次数组与字符串分配
  return /\s/.test(text) ? text.split(/\s+/).filter(Boolean) : [text];
}

/** 合并类名文本：保序去重。 */
function mergeClassNames(current, names) {
  if (!current) {
    // 单个类名直接把入参文本存下来，不 join（join 会新建字符串）
    return names.length === 1 ? names[0] : names.join(' ');
  }

  const merged = current.split(' ');
  names.forEach((name) => {
    if (!merged.includes(name)) {
      merged.push(name);
    }
  });
  return merged.join(' ');
}

/** 删除一个类名；删空后回到 undefined，不再持有字符串。 */
function dropClassName(current, name) {
  if (!current) {
    return undefined;
  }

  const next = current.split(' ').filter((item) => item !== name);
  return next.length > 0 ? next.join(' ') : undefined;
}

/** 元素当前的类名列表（只读口径，供布局 / devtools 这类外部读取）。 */
export function elementClassNames(node) {
  const text = node?._classText;
  return text ? text.split(' ') : [];
}

/** 元素是否带某个类名。 */
export function elementHasClass(node, name) {
  const text = node?._classText;
  return Boolean(text) && (text === name || text.split(' ').includes(name));
}

/**
 * 组件身份属性：组件**视图根**元素上写 `vn: 'VCard'`（值 = 组件导出名，空格分隔可多值）。
 *
 * 身份跟着视图根走，而不是跟着某个运行时标记，于是三种组件形态是同一条判定：
 * 形态 A 的成员本身就是元素节点（读它自己），形态 B / vNode 的成员是 `child()` 包出来的
 * `ComponentNode`（展开到视图根再读）。值走属性（快照优先、再回读 DOM），所以编译片段克隆、
 * adopt / hydrate 进来的节点一样认；也支持直接传真实 DOM 元素（devtools / 调试）。
 */
export const COMPONENT_IDENTITY_ATTR = 'vn';

/** 树成员（元素节点 / 组件节点 / 真实元素）的组件身份；没有就是 null，多值以空格分隔。 */
export function componentNameOf(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  // 快照优先（还没 mount），再回读真实 DOM（adopt / hydrate 进来的节点、传进来的真实元素）
  const own =
    value._attrs?.[COMPONENT_IDENTITY_ATTR] ??
    value._el?.getAttribute?.(COMPONENT_IDENTITY_ATTR) ??
    (value.nodeType === 1 ? value.getAttribute(COMPONENT_IDENTITY_ATTR) : undefined);

  if (typeof own === 'string' && own !== '') {
    return own;
  }

  if (!(value instanceof ComponentNode)) {
    return null;
  }

  // 组件节点：展开到视图根（多根任一）。解析失败（组件自己出错）不算命中——判定不炸。
  try {
    const roots = value._resolvedList ?? (value._resolve(), value._resolvedList);
    for (const root of roots ?? []) {
      const name = componentNameOf(root);
      if (name) {
        return name;
      }
    }
  } catch {
    return null;
  }

  return null;
}

/** 成员是不是某个组件：`vn` 的值按空格拆，多个身份都算命中（包装型组件共用根）。 */
export function hasComponentIdentity(value, name) {
  const found = componentNameOf(value);
  return Boolean(found) && found.split(/\s+/).includes(name);
}

/**
 * 给组件定义装身份判定：`member instanceof definition` 先走身份（视图根上的 `vn`），
 * 原型链判定作为兜底保留（形态 C 组件 / `new` 出来的实例照旧成立）。
 */
export function defineComponentIdentity(definition, name) {
  if (typeof definition !== 'function' || typeof name !== 'string' || name === '') {
    throw new TypeError(
      'defineComponentIdentity(definition, name) requires a component factory function ' +
        'and a non-empty component name.'
    );
  }

  const prototypeHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(definition, Symbol.hasInstance, {
    value: (value) =>
      hasComponentIdentity(value, name) || prototypeHasInstance.call(definition, value)
  });

  return definition;
}

/**
 * ElementNode 表示可渲染成真实 DOM Element 的视图节点。
 * 它负责属性、类名、样式、事件和子节点到 DOM 的同步。
 */
export class ElementNode extends ViewNode {
  constructor(tagName, setup = null) {
    super(null);
    this._tagName = tagName;
    // _attrs（属性快照）、_styles（样式表）、_classText（类名文本）都不预置：
    // 空集合按元素累加开销很大（V8 实测 new Set() 160 B、{} 64 B/个，一行 8 个元素
    // 就是 1.8 KB）。类名走 _classText，不再借道 _attrs.class——只有真的写过
    // 属性的元素才建属性快照。

    if (setup !== null) {
      this.setup(setup);
    }
  }

  /**
   * 对象 setup 支持 class/style/children/onXxx 和普通属性配置。
   */
  _setupObject(config) {
    Object.entries(config).forEach(([key, value]) => {
      const optionKind = optionKindOf(key);

      if (optionKind === 'class') {
        this.className(value);
        return;
      }

      if (optionKind === 'attrs') {
        this.attr(value);
        return;
      }

      if (optionKind === 'style') {
        this.styles(value);
        return;
      }

      if (optionKind === 'children') {
        this.child(value);
        return;
      }

      if (key.startsWith('on') && typeof value === 'function') {
        this.on(key.slice(2).toLowerCase(), value);
        return;
      }

      if (
        key === 'mountable' &&
        (isSignal(value) || typeof value === 'function' || typeof value === 'boolean')
      ) {
        this._mountCondition = value;
        return;
      }

      // 协议钩子放错位置（options 对象）→ 直接报错：既不是事件简写，也不是普通属性
      // 只拦组件级钩子：whenFailed 是节点方法，options 里写它是既有合法用法
      if (COMPONENT_HOOK_NAMES.has(key)) {
        throw new TypeError(
          `${key} is a component hook, not an option: declare it on the vNode api or on the ` +
            'component object returned by render(), not in an options object.'
        );
      }

      // 子工厂不参与 options 分派：同名键按属性写。
      // `div({ slot: 't-head' })` 是 slot 属性，不是创建一个 <slot> 子元素；`div({ title: 't' })`
      // 同理。要建子元素请用链式写法（`root.slot(...)` / `root.title(...)`）。
      if (isChildFactoryMethod(this[key])) {
        this.attr(key, value);
        return;
      }

      if (typeof this[key] === 'function') {
        if (isSignal(value)) {
          registerNodeBinding(
            this,
            'prop',
            key,
            () => value.value,
            (next) => this[key](next)
          );
          return;
        }

        this[key](value);
        return;
      }

      if (typeof value !== 'function') {
        this.attr(key, value);
      }
    });
  }

  tagName() {
    return this._tagName;
  }

  /**
   * 获取当前元素及其子节点的聚合文本。
   */
  textContent() {
    return this._children
      .map((child) => (typeof child.textContent === 'function' ? child.textContent() : ''))
      .join('');
  }

  /**
   * 读写属性。传入 null/undefined/false 时移除属性。
   */
  attr(name, value) {
    if (value === undefined && typeof name === 'string') {
      // 类名的真身在 _classText，不再借道 _attrs.class
      return name === 'class' ? this._classText : this._attrs?.[name];
    }

    if (name && typeof name === 'object') {
      Object.entries(name).forEach(([key, nextValue]) => this.attr(key, nextValue));
      return this;
    }

    if (typeof value === 'function' || isSignal(value)) {
      registerNodeBinding(this, 'attr', name, value, (next) => this.attr(name, next));
      return this;
    }

    // 类名写进 _classText 而不是属性快照：只有真的写过属性的元素才建 _attrs，
    // 类名与 attr('class', …) / className() 共用同一份真身，读写不会互相打架。
    if (name === 'class') {
      const next =
        value === null || value === undefined || value === false || value === ''
          ? undefined
          : String(value);
      const previousClass = this._classText;
      this._classText = next;
      storeClassName(this, next);

      if (this._el) {
        applyAttribute(this._el, 'class', next);
      }
      if (
        this._el &&
        isDevtoolsEnabled() &&
        !this._devtoolsRendering &&
        !Object.is(previousClass, next)
      ) {
        notifyDevtoolsMutation(this, 'attr', { name: 'class', previous: previousClass, next });
      }
      return this;
    }

    const previous = this._attrs?.[name];
    if (value === null || value === undefined || value === false) {
      if (this._attrs) {
        delete this._attrs[name];
      }
    } else {
      elementAttrs(this)[name] = value;
    }

    if (this._el) {
      applyAttribute(this._el, name, value);
    }
    if (
      this._el &&
      isDevtoolsEnabled() &&
      !this._devtoolsRendering &&
      !Object.is(previous, value)
    ) {
      notifyDevtoolsMutation(this, 'attr', { name, previous, next: value });
    }

    return this;
  }

  id(value) {
    return value === undefined ? this.attr('id') : this.attr('id', value);
  }

  name(value) {
    return value === undefined ? this.attr('name') : this.attr('name', value);
  }

  /**
   * 添加类名，支持空格分隔、数组和多参数。
   */
  className(...classes) {
    if (classes.length === 0) {
      return this._classText ?? '';
    }

    const names = classes.flat(Infinity).filter(Boolean).flatMap(splitClassNames);
    if (names.length > 0) {
      this._classText = mergeClassNames(this._classText, names);
    }

    this._syncClassName();
    return this;
  }

  class(...classes) {
    return this.className(...classes);
  }
  /**
   * 替换预设类名：移除 old 并添加 next（支持空格分隔多个）。
   * old 不存在时，tolerate 为 true 则仅添加 next；默认 false 为无操作。
   */
  replaceClassName(old, next, tolerate = false) {
    if (!old || !next || old === next) {
      return this;
    }

    if (!this._classText || !this._classText.split(' ').includes(old)) {
      return tolerate ? this.className(next) : this;
    }

    this._classText = dropClassName(this._classText, old);
    return this.className(next);
  }

  /**
   * 把布尔值（或信号）绑定到类名的有无。
   * 动态类名不能走 attr('class', …)：className() 是累加集合，_syncClassName() 会回写 class。
   */
  toggleClass(name, value) {
    if (typeof value === 'function' || isSignal(value)) {
      registerNodeBinding(this, 'class', name, value, (next) =>
        this.toggleClass(name, Boolean(next))
      );
      return this;
    }

    if (value) {
      return this.className(name);
    }

    this._classText = dropClassName(this._classText, name);
    this._syncClassName();
    return this;
  }

  /**
   * 读写单个样式；传入对象时转给 styles() 批量处理。
   */
  style(name, value) {
    if (value === undefined && typeof name === 'string') {
      return this._styles?.[name];
    }

    if (name && typeof name === 'object') {
      return this.styles(name);
    }

    if (typeof value === 'function' || isSignal(value)) {
      registerNodeBinding(this, 'style', name, value, (next) => this.style(name, next));
      return this;
    }

    const previous = this._styles?.[name];
    if (value === null || value === undefined || value === '') {
      if (this._styles) {
        delete this._styles[name];
      }
    } else {
      elementStyles(this)[name] = value;
    }

    if (this._el) {
      this._el.style[name] = value || '';
    }
    if (
      this._el &&
      isDevtoolsEnabled() &&
      !this._devtoolsRendering &&
      !Object.is(previous, value)
    ) {
      notifyDevtoolsMutation(this, 'style', { name, previous, next: value });
    }

    return this;
  }

  styles(styles) {
    Object.entries(styles || {}).forEach(([name, value]) => this.style(name, value));
    return this;
  }

  /**
   * 添加子节点。如果当前 DOM 已创建，立即追加对应 DOM。
   */
  child(...children) {
    assertRegionChildAllowed(this);

    const addedIds = this._el && isDevtoolsEnabled() && !this._devtoolsRendering ? [] : null;
    children.flat(Infinity).forEach((child) => {
      if (child === null || child === undefined) {
        return;
      }

      const viewNode = normalizeChildWithContext(this, child);
      this._pendingRemovals?.delete(viewNode);
      this._children = appendNodeEntry(this._children, viewNode);
      this._childrenDirty = true;
      this._adoptPendingMount(viewNode);
      this._linkChild(viewNode);

      if (this._el) {
        const childElement = this._renderChildForInsert(viewNode);
        attachChildDom(this, viewNode, childElement, null);
        if (addedIds) {
          addedIds.push(ensureDevtoolsNodeId(viewNode));
        }
      }
    });

    if (addedIds && addedIds.length > 0) {
      notifyDevtoolsMutation(this, 'child', { added: addedIds });
    }
    return this;
  }

  /**
   * 把只读/禁用落到原生元素：readonly 给可交互标签加属性，active 撤销，
   * 支持权限热切换时原树复用。复合组件（vInput / vButton 等）各自重写。
   */
  _applyAccessState(state) {
    if (state === 'readonly') {
      this._accessAttrsApplied = true;
      const tag = this._tagName;
      if (accessDisabledTags.has(tag)) {
        this.attr('disabled', true);
      }
      if (accessReadOnlyTags.has(tag)) {
        this.attr('readonly', true);
      }
      this.attr('aria-disabled', 'true');
      return;
    }

    if (this._accessAttrsApplied) {
      this._accessAttrsApplied = false;
      this.attr('disabled', null);
      this.attr('readonly', null);
      this.attr('aria-disabled', null);
    }
  }

  /**
   * 创建或复用真实 DOM 元素。
   */
  renderDom() {
    if (this._deleted) {
      return null;
    }

    const state = this._permissionState();
    if (state === 'hidden') {
      return null;
    }

    const inherited = this._access ?? currentInheritedScope();
    this._inheritedScope = inherited;
    // devtools 每节点只查一次（原来开头 / 收口 / finally 各一次）
    const devtools = isDevtoolsEnabled();
    if (devtools) {
      this._devtoolsRendering = true;
    }
    try {
      if (!this._el) {
        this._el = this._createElement();
        // 新鲜元素的类名属性必为空——除非属性快照里显式写过 class（那时 DOM 类名来自 attr，
        // 不能假定为空、必须回读）。有了这个前提，首次落盘可以省掉一次 className getter 读。
        const freshClass = this._attrs?.class === undefined;
        // 就地压栈：首次落盘不为一个闭包付钱
        renderScopeStack.push(inherited);
        try {
          this._applyBindingsToElement(freshClass);
        } finally {
          renderScopeStack.pop();
        }
      }

      this._applyAccessState(state);
      activateBindings(this);
      this._commitChildren();

      // 子节点遍历：作用域整趟压栈（原来每个子节点两个闭包），索引循环不建闭包
      const children = this._children;
      const element = this._el;
      renderScopeStack.push(inherited);
      try {
        for (let index = 0; index < children.length; index += 1) {
          const child = children[index];
          if (child._failed) {
            continue;
          }

          let childElement;
          try {
            childElement = child.renderDom();
          } catch (error) {
            const replacement = captureNodeError(child, error, 'render');
            if (replacement?._el && replacement._el.parentNode !== element) {
              element.appendChild(replacement._el);
            }
            continue;
          }
          if (
            childElement &&
            childElement.parentNode !== element &&
            this._childMountStates?.get(child) !== false
          ) {
            element.appendChild(childElement);
            // 首屏单趟建树：这里才是子节点真正落地的位置（挂载条件为假时不会走到这支）
            if (child._whenHooks !== undefined) {
              fireWhenMount(child);
            }
          } else if (!childElement && child._el && child._el.parentNode === element) {
            element.removeChild(child._el);
          }
        }
      } finally {
        renderScopeStack.pop();
      }

      if (devtools) {
        commitDevtoolsNode(this);
      }
      return this._el;
    } finally {
      if (devtools) {
        this._devtoolsRendering = false;
      }
    }
  }

  /** 真实元素创建钩子：HTML 走 createElement，SVG 子类覆写为 createElementNS。 */
  _createElement() {
    return document.createElement(this._tagName);
  }

  /**
   * 将视图树序列化为 HTML 字符串，主要用于服务端模板或测试断言。
   */
  toHTML() {
    if (this._deleted) {
      return '';
    }

    const state = this._permissionState();
    if (state === 'hidden') {
      return '';
    }

    this._applyAccessState(state);
    const inherited = this._access ?? currentInheritedScope();
    this._inheritedScope = inherited;

    return withRenderScope(inherited, () => {
      const attrs = this._serializeAttributes();
      const startTag = attrs ? `<${this._tagName} ${attrs}>` : `<${this._tagName}>`;

      if (voidElements.has(this._tagName)) {
        return startTag;
      }

      const mountedChildren = this._children.filter(
        (child) => this._childMountStates?.get(child) !== false && !child._failed
      );

      const childHTML = mountedChildren
        .map((child) => {
          try {
            return child.toHTML();
          } catch (error) {
            const replacement = captureNodeError(child, error, 'render');
            return replacement ? replacement.toHTML() : '';
          }
        })
        .join('');
      return `${startTag}${childHTML}</${this._tagName}>`;
    });
  }

  /**
   * DOM 首次创建时，把之前记录的属性、样式、事件和子节点一次性同步。
   *
   * 只做「本节点自己」的落盘：子节点由 renderDom 的遍历统一处理（原先这里再遍历一遍子节点，
   * renderDom 又遍历一遍，整棵树被渲染两次——activateBindings / _commitChildren /
   * 挂载条件判定都在第二遍里重跑）。freshClass 表示本元素是刚建出来的、类名必为空。
   */
  _applyBindingsToElement(freshClass = false) {
    const attrs = this._attrs;
    if (attrs) {
      // 首帧按属性名排序落盘：此后同名 setAttribute 只改值、保持位置，DOM 属性顺序因此
      // 与 toHTML() 的序列化顺序一致（类名走 _syncClassName，不在快照里循环）。
      const names = sortedKeys(attrs);
      for (let index = 0; index < names.length; index += 1) {
        const name = names[index];
        applyAttribute(this._el, name, attrs[name]);
      }
    }
    this._syncClassName(freshClass);
    const styles = this._styles;
    if (styles) {
      const names = sortedKeys(styles);
      for (let index = 0; index < names.length; index += 1) {
        const name = names[index];
        this._el.style[name] = styles[name];
      }
    }

    // 段根：委托监听器必须先于本节点自己的 adapter 挂上——DOM 同元素按注册顺序触发，
    // 这样「行内 handler → 段根自己的 handler」与逐元素绑定时的冒泡顺序一致。
    if (this._delegates) {
      bindDelegatedEvents(this._delegates);
    }

    // 行内被委托的节点：把元素登记进段根的弱映射，派发时才能从 DOM 反查节点。
    if (this._delegate) {
      const descriptors = Array.isArray(this._delegate) ? this._delegate : [this._delegate];
      for (let index = 0; index < descriptors.length; index += 1) {
        bindDelegatedEvents(descriptors[index].owner);
      }
      this._el[delegateNodeKey] = this;
    }

    const events = this._events;
    if (events) {
      for (const [eventName, descriptor] of events) {
        this._bindDomAdapter(eventName, undefined, descriptor.options);
      }
    }
  }

  /**
   * 同步类名文本到真实 DOM。
   * 类名不再写进属性快照：`_classText` 是类名的真身，`toHTML` / `attr('class')`
   * 都从它读，只有显式 `attr('class', …)` 的写法才落到 `_attrs`。
   */
  _syncClassName(freshClass = false) {
    const className = this._classText ?? '';
    const element = this._el;

    storeClassName(this, className || undefined);

    if (!element) {
      return;
    }

    // 新鲜元素的类名必为空，省掉一次 getter 读；其余情况先读后写——
    // 类名已经一致就不碰 DOM（重复 className() / 重渲是常见路径），
    // 也让「外部改过 class」这种漂移仍然会被写回。
    const previous = freshClass ? '' : element.className || '';
    if (previous === className && (className !== '' || !element.hasAttribute('class'))) {
      return;
    }

    if (className) {
      element.className = className;
    } else {
      element.removeAttribute('class');
    }
    if (isDevtoolsEnabled() && !this._devtoolsRendering) {
      notifyDevtoolsMutation(this, 'attr', {
        name: 'class',
        previous,
        next: className || undefined
      });
    }
  }

  /**
   * 序列化属性快照，供 toHTML 使用。
   */
  _serializeAttributes() {
    // 属性按名字排序输出：与写入顺序无关，因此 SSR、客户端首帧落盘与（将来的）编译期片段
    // 三者能产出逐字节相同的 HTML——这是「编译产物不手写片段」的前提。
    const attrs = new Map();
    if (this._attrs) {
      Object.entries(this._attrs).forEach(([name, value]) => attrs.set(name, value));
    }
    // 类名的真身在 _classText；快照里没有 class 时由它提供取值（有则沿用快照里的值）
    if (this._classText && !attrs.has('class')) {
      attrs.set('class', this._classText);
    }
    const styleText = this._serializeStyles();

    if (styleText) {
      const inline = attrs.get('style');
      attrs.set('style', inline ? `${inline}; ${styleText}` : styleText);
    }

    return [...attrs.entries()]
      .filter(([, value]) => value !== null && value !== undefined && value !== false)
      .sort(([first], [second]) => (first < second ? -1 : first > second ? 1 : 0))
      .map(([name, value]) => {
        if (value === true || isBooleanAttribute(name)) {
          return `${name}="${name}"`;
        }

        return `${name}="${escapeHtml(value)}"`;
      })
      .join(' ');
  }

  /**
   * 序列化 style 快照，保证 toHTML 和真实 DOM 渲染保持一致。
   */
  _serializeStyles() {
    return serializeStyles(this._styles);
  }
}

/**
 * 为标签创建工厂函数；默认使用 ElementNode，HTML/SVG 层可以传入自己的节点类。
 */
export function createElementFactory(tagName, NodeClass = ElementNode) {
  return function elementFactory(first = null, second = null, third = null) {
    const node = new NodeClass(tagName);
    applySetupValue(node, first);
    applySetupValue(node, second);
    applySetupValue(node, third);

    // 超过三个参数走慢路径：固定形参保证热路径（≤3 参）不分配参数数组。
    if (arguments.length > 3) {
      for (let index = 3; index < arguments.length; index += 1) {
        applySetupValue(node, arguments[index]);
      }
    }

    return node;
  };
}

/**
 * 把工厂函数注册为父节点快捷方法，使 page.h1('标题') 这类 DSL 写法成立。
 */
export function registerChildFactories(NodeClass, factories, options = {}) {
  const { override = false } = options;

  Object.entries(factories).forEach(([name, factory]) => {
    if (!override && NodeClass.prototype[name]) {
      return;
    }

    const childFactory = function yoyaChildFactory(...args) {
      return this.child(factory(...args));
    };
    childFactory[CHILD_FACTORY] = true;
    NodeClass.prototype[name] = childFactory;
  });
}
