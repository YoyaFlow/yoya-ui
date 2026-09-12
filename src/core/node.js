// HTML 布尔属性序列化时只需要属性名即可表示启用。
import { currentAccess, parseAccessSpec, withAccess } from './access.js';
import { snapshotContext, withContext } from './context.js';
import { isSignal } from './signals/handle.js';
import { currentSignals } from './signals/contract.js';
import { beginCollect, endCollect } from './signals/deps.js';
import { createReactiveTarget } from './signals/runtime.js';
import { trackedSubscribe } from './signals/observe.js';

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

// 值绑定的数据来源只有两种：signal 句柄（推荐）与零参闭包。闭包自己闭住外部数据，
// 需要重新求值时用 flush() / flushAll()。带参函数只服务过节点级状态，已一并移除。
function registerNodeBinding(owner, kind, key, read, commit) {
  if (read.length > 0) {
    throw new TypeError(parameterizedValueError(kind, key));
  }

  const scope = bindingScopeFor(owner);
  let binding = null;
  const target = createReactiveTarget({
    run: () => read(),
    onChange: (value) => commitBindingValue(binding, value)
  });

  binding = {
    commit,
    committed: false,
    evaluate: () => target.evaluate(),
    key,
    kind,
    last: undefined,
    list: scope.bindings,
    owner,
    activate: () => target.activate(),
    release: () => target.release()
  };

  bindingSerial += 1;
  scope.bindings.push(binding);

  if (owner && Array.isArray(owner._bindings)) {
    owner._bindings.push(binding);
  }

  // 构建之外的登记（链式写法、挂载后追加）：立刻求值一次，让首屏与紧随其后的读取都有值；
  // 构建期登记的绑定由构建结束时统一刷（见 setup()）。
  if (setupStack.length === 0 && regionBuildStack.length === 0) {
    flushBindingsIn(owner);
  }
}

/**
 * 绑定归属：区域构建期登记的绑定归区域所有（重跑时统一释放），
 * 其余挂到节点自己名下。零参闭包自带数据，只需要一个归属挂载点。
 */
function bindingScopeFor(owner) {
  const region = activeRegion();
  if (region && region._regionScope) {
    return region._regionScope;
  }

  if (!owner._ownBindingScope) {
    owner._ownBindingScope = { bindings: [] };
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
 * 值位置既接受读函数，也接受 signal 句柄；统一归一成读函数。
 * 句柄自带数据来源，因此按零参绑定处理，不需要 scope()。
 */
function toBindingRead(value) {
  if (isSignal(value)) {
    return () => value.value;
  }

  return value;
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
  if (node._rebuildable && !isBuildingRegion(node)) {
    throw new TypeError(
      'region children must come from the region builder; call rebuild() to rebuild the region'
    );
  }
}

/** 收集节点及其子树名下的绑定。 */
function collectRegionBindings(node, out = []) {
  node._bindings.forEach((binding) => out.push(binding));
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

/** 解除给定绑定：从所属列表与 owner 名下同时移除。 */
function releaseBindings(bindings) {
  bindings.forEach((binding) => {
    if (typeof binding.release === 'function') {
      binding.release();
    }

    if (binding.list) {
      const index = binding.list.indexOf(binding);
      if (index !== -1) {
        binding.list.splice(index, 1);
      }
    }

    const owner = binding.owner;
    if (owner && Array.isArray(owner._bindings)) {
      const ownerIndex = owner._bindings.indexOf(binding);
      if (ownerIndex !== -1) {
        owner._bindings.splice(ownerIndex, 1);
      }
    }
  });
}

/** 写回一次绑定值；值未变化时不触碰 DOM。 */
function commitBindingValue(binding, next) {
  if (!binding.committed || !Object.is(next, binding.last)) {
    binding.committed = true;
    binding.last = next;
    binding.commit(next);
  }
}

/** 节点及其子树的绑定进入 DOM 后开始订阅依赖（服务端只求值不订阅）。 */
function activateBindings(node) {
  node._bindings.forEach((binding) => {
    if (typeof binding.activate === 'function') {
      binding.activate();
    }
  });

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

/** 区域进入 DOM 后订阅自己读到的 signal；服务端不订阅。 */
function activateRegion(node) {
  if (!node._rebuildable || node._regionActive) {
    return;
  }

  node._regionActive = true;
  subscribeRegion(node);
}

function releaseRegionSubscriptions(node) {
  (node._regionSubs || []).forEach((dispose) => dispose());
  node._regionSubs = [];
}

/** 按当前依赖重订区域订阅；每次重建后依赖集会变化，必须重订。 */
function subscribeRegion(node) {
  if (!node._regionActive || !node._regionAdapter) {
    return;
  }

  releaseRegionSubscriptions(node);
  node._regionSubs = (node._regionSources || []).map((source) =>
    trackedSubscribe(node._regionAdapter, source, () => node.rebuild({ trigger: 'signal' }))
  );
}

/** 区域销毁 / 离开 DOM 时退订。 */
function releaseRegion(node) {
  node._regionActive = false;
  releaseRegionSubscriptions(node);
}

/** 求值并写回节点及其子树名下的绑定；值未变化时不触碰 DOM。 */
function flushBindingsIn(node) {
  node._bindings.forEach((binding) => {
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

  if (!Array.isArray(region._regionRunCleanups)) {
    region._regionRunCleanups = [];
  }

  region._regionRunCleanups.push(cleanup);
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
  return Object.entries(styles)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([name, value]) => `${toKebabStyleName(name)}:${escapeHtml(value)}`)
    .join('; ');
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
    this._children = [];
    this._childKeys = new Map();
    this._events = new Map();
    this._domAdapters = new Map();
    this._cleanup = [];
    this._pendingRemovals = new Set();
    this._childrenDirty = false;
    this._deleted = false;
    this._access = null;
    this._accessContext = currentAccess(); // 构建时捕获的权限上下文
    this._builders = []; // 区域重建时按顺序重跑的构建函数
    this._bindings = []; // 本节点登记的函数值绑定（owner 归属）
    this._rebuildable = false;
    this._regionScope = null; // 区域自持的绑定作用域
    this._regionCaptureToken = null; // 区域内联捕获：rebuildable() 声明后开始收集依赖
    this._regionSources = []; // 区域读到的 signal 依赖
    this._regionAdapter = null; // 区域依赖所属引擎
    this._regionActive = false; // 区域是否已进入 DOM 并订阅
    this._regionSubs = [];
    this._ownBindingScope = null; // 节点自己的绑定归属：零参闭包登记在这里
    this._regionGuard = null;
    this._rebuildPending = false;
    this._regionRunning = false;
    this._regionEnv = null; // 构建期环境快照：access / context / i18n
    this._inheritedScope = null; // 最近一次渲染时继承到的权限声明

    if (isDevtoolsEnabled()) {
      captureDevtoolsNodeScope(this);
    }

    if (setup !== null) {
      this.setup(setup);
    }
  }

  /**
   * 统一初始化入口，支持函数、文本和对象配置三种写法。
   */
  setup(setup) {
    if (typeof setup === 'function') {
      this._builders.push(setup);
      const serialBefore = bindingSerial;
      setupStack.push(this);
      try {
        setup(this);
      } finally {
        setupStack.pop();
        closeRegionCapture(this);
      }

      // 首屏求值：只有本次构建登记过绑定、且已回到构建栈最外层时才刷一次，
      // 避免每一层都遍历整棵子树（深树会退化成 O(深度 × 绑定数)）。
      if (setupStack.length === 0 && bindingSerial !== serialBefore) {
        flushBindingsIn(this);
      }
    } else if (setup instanceof ViewNode) {
      this.child(setup);
    } else if (typeof setup === 'string' || typeof setup === 'number') {
      this.text(setup);
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

    if (this._builders.length === 0) {
      throw new TypeError('rebuildable() requires a setup builder on this node');
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
      this._regionScope = { bindings: [] };
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
    return this._rebuildPending;
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
    this._regionRunCleanups = [];

    this._children = [];
    this._childKeys = new Map();
    this._childrenDirty = true;
    previousChildren.forEach((child) => this._pendingRemovals.add(child));

    this._regionRunning = true;
    const regionToken = beginCollect();
    const previousSources = this._regionSources;
    try {
      this._runInRegionEnvironment(() => this._builders.forEach((builder) => builder(this)));
    } catch (error) {
      endCollect(regionToken);
      this._regionSources = previousSources;
      releaseBindings(
        collectRegionBindings(this).filter((binding) => !previousBindings.has(binding))
      );
      this._children.forEach((child) => child.destroy());
      this._regionRunCleanups.forEach((cleanup) => cleanup());
      this._regionRunCleanups = previousCleanups;
      previousChildren.forEach((child) => this._pendingRemovals.delete(child));
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
      this._pendingRemovals.add(child);
    });
    this._children = [];
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
    if (this._childKeys.has(rawKey)) {
      throw new TypeError(`duplicate key "${rawKey}"`);
    }

    const viewNode = normalizeChildWithContext(this, child);
    this._childKeys.set(rawKey, viewNode);
    if (typeof viewNode.attr === 'function') {
      viewNode.attr('data-row-key', rawKey);
    }
    this._pendingRemovals.delete(viewNode);
    this._children.push(viewNode);
    this._childrenDirty = true;

    if (this._el) {
      const childElement = withRenderScope(this._access ?? currentInheritedScope(), () =>
        viewNode.renderDom()
      );
      if (childElement && childElement.parentNode !== this._el) {
        this._el.appendChild(childElement);
      }
      if (isDevtoolsEnabled() && !this._devtoolsRendering) {
        notifyDevtoolsMutation(this, 'child', { added: [ensureDevtoolsNodeId(viewNode)] });
      }
    }

    return this;
  }

  /** 按 key 读取子节点；不存在返回 null。 */
  getChild(key) {
    return this._childKeys.get(String(key)) || null;
  }

  /** 按 key 移除并销毁子节点。 */
  removeChild(key) {
    const rawKey = String(key);
    const viewNode = this._childKeys.get(rawKey);
    if (!viewNode) {
      return this;
    }

    this._childKeys.delete(rawKey);
    const index = this._children.indexOf(viewNode);
    if (index !== -1) {
      this._children.splice(index, 1);
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
    this._childKeys.forEach((child, key) => {
      if (doomed.has(child)) {
        this._childKeys.delete(key);
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
      this._pendingRemovals.delete(viewNode);
      this._children.push(viewNode);
      this._childrenDirty = true;
    });

    return this;
  }

  text(content) {
    return this.child(new VTextNode(content));
  }

  /**
   * 注册事件。同一节点同一事件只保留最新 handler；
   * 真实 DOM 上每个事件最多挂一个转发 adapter。
   */
  on(eventName, handler, options) {
    if (typeof handler !== 'function') {
      throw new TypeError('ViewNode event handler must be a function');
    }

    const previous = this._events.get(eventName);
    this._events.set(eventName, { handler, options });

    if (this._el) {
      this._bindDomAdapter(eventName, previous?.options, options);
    }

    return this;
  }

  off(eventName) {
    this._events.delete(eventName);
    const entry = this._domAdapters.get(eventName);
    if (entry) {
      entry.cleanup();
      this._removeCleanup(entry.cleanup);
      this._domAdapters.delete(eventName);
    }
    return this;
  }

  _bindDomAdapter(eventName, previousOptions, nextOptions) {
    const existing = this._domAdapters.get(eventName);
    if (existing) {
      if (sameEventListenerOptions(previousOptions, nextOptions)) {
        return;
      }
      existing.cleanup();
      this._removeCleanup(existing.cleanup);
      this._domAdapters.delete(eventName);
    }

    const adapter = (event) => {
      const current = this._events.get(eventName);
      if (!current || typeof current.handler !== 'function') {
        return;
      }
      current.handler.call(this, event);
      if (current.options?.once) {
        this.off(eventName);
      }
    };
    const cleanup = () => {
      if (this._el) {
        this._el.removeEventListener(eventName, adapter, nextOptions);
      }
    };

    this._el.addEventListener(eventName, adapter, nextOptions);
    this._domAdapters.set(eventName, { cleanup });
    this._cleanup.push(cleanup);
  }

  _removeCleanup(cleanup) {
    const index = this._cleanup.indexOf(cleanup);
    if (index !== -1) {
      this._cleanup.splice(index, 1);
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
    this._pendingRemovals.forEach((child) => child.destroy());
    this._pendingRemovals.clear();
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
    }

    return this;
  }

  /**
   * 销毁节点：清理事件、递归销毁子节点，并从 DOM 中移除自身。
   */
  destroy() {
    if (isDevtoolsEnabled()) {
      emitDevtools({ type: 'destroy', node: this });
      unregisterDevtoolsNode(this);
    }
    this._deleted = true;
    releaseBindings(collectRegionBindings(this));
    releaseRegion(this);
    if (Array.isArray(this._regionRunCleanups)) {
      this._regionRunCleanups.forEach((cleanup) => cleanup());
      this._regionRunCleanups = [];
    }
    this._cleanup.forEach((cleanup) => cleanup());
    this._cleanup = [];
    this._children.forEach((child) => child.destroy());
    this._pendingRemovals.forEach((child) => child.destroy());
    this._pendingRemovals.clear();
    this._children = [];
    this._childKeys.clear();

    if (this._el?.parentNode) {
      this._el.parentNode.removeChild(this._el);
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
      registerNodeBinding(this, 'text', null, toBindingRead(content), (next) =>
        this.textContent(next)
      );
      return;
    }

    this._content = String(content);
  }

  textContent(value) {
    if (value === undefined) {
      return this._content;
    }

    if (typeof value === 'function' || isSignal(value)) {
      registerNodeBinding(this, 'text', null, toBindingRead(value), (next) =>
        this.textContent(next)
      );
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
    this._resolved = null; // 第一个根，供外部兼容读取
    this._resolvedList = null; // 全部根
    this._roots = null; // 多根模式时非 null
    this._fragmentDom = null; // 多根模式已落实的 DOM 节点
  }

  _resolve() {
    if (this._resolvedList) {
      return this._resolved;
    }

    const build = () =>
      typeof this._component === 'function' ? this._component() : this._component.render();
    const resolved = withAccess(this._accessContext || currentAccess(), build);
    const list = Array.isArray(resolved) ? resolved.slice() : [resolved];
    const componentInfo = describeComponent(this._component);
    const ownerInfo = this._owner
      ? ` It was added as a child of ${describeValue(this._owner)}.`
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
    if (
      this._component &&
      typeof this._component === 'object' &&
      typeof this._component._attachHost === 'function'
    ) {
      this._component._attachHost(this);
    }
    return this._resolved;
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
        const element = withRenderScope(this._access ?? inherited, () => root.renderDom());
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
      const element = resolved.renderDom();
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
      list.map((root) => root.toHTML()).join('')
    );
  }

  destroy() {
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
    const viewNode = normalizeChild(child);
    if (viewNode._owner === undefined) {
      viewNode._owner = parent;
    }
    return viewNode;
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

  if (
    typeof child === 'function' ||
    (child && typeof child === 'object' && typeof child.render === 'function')
  ) {
    return new ComponentNode(child);
  }

  if (typeof child === 'string' || typeof child === 'number') {
    return new VTextNode(child);
  }

  throw new TypeError('ViewNode child must be a ViewNode, component, string, or number');
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
 * ElementNode 表示可渲染成真实 DOM Element 的视图节点。
 * 它负责属性、类名、样式、事件和子节点到 DOM 的同步。
 */
export class ElementNode extends ViewNode {
  constructor(tagName, setup = null) {
    super(null);
    this._tagName = tagName;
    this._attrs = {};
    this._styles = {};
    this._classes = new Set();
    this._el = null;

    if (setup !== null) {
      this.setup(setup);
    }
  }

  /**
   * 对象 setup 支持 class/style/children/onXxx 和普通属性配置。
   */
  _setupObject(config) {
    Object.entries(config).forEach(([key, value]) => {
      if (key === 'class' || key === 'className') {
        this.className(value);
        return;
      }

      if (key === 'attrs') {
        this.attr(value);
        return;
      }

      if (key === 'style') {
        this.styles(value);
        return;
      }

      if (key === 'children') {
        this.child(value);
        return;
      }

      if (key.startsWith('on') && typeof value === 'function') {
        this.on(key.slice(2).toLowerCase(), value);
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
      return this._attrs[name];
    }

    if (name && typeof name === 'object') {
      Object.entries(name).forEach(([key, nextValue]) => this.attr(key, nextValue));
      return this;
    }

    if (typeof value === 'function' || isSignal(value)) {
      registerNodeBinding(this, 'attr', name, toBindingRead(value), (next) =>
        this.attr(name, next)
      );
      return this;
    }

    const previous = this._attrs[name];
    if (value === null || value === undefined || value === false) {
      delete this._attrs[name];
    } else {
      this._attrs[name] = value;
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
      return [...this._classes].join(' ');
    }

    classes.flat(Infinity).forEach((value) => {
      if (!value) {
        return;
      }

      String(value)
        .split(/\s+/)
        .filter(Boolean)
        .forEach((className) => this._classes.add(className));
    });

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

    if (!this._classes.has(old)) {
      return tolerate ? this.className(next) : this;
    }

    this._classes.delete(old);
    return this.className(next);
  }

  /**
   * 把布尔值（或信号）绑定到类名的有无。
   * 动态类名不能走 attr('class', …)：className() 是累加集合，_syncClassName() 会回写 class。
   */
  toggleClass(name, value) {
    if (typeof value === 'function' || isSignal(value)) {
      registerNodeBinding(this, 'class', name, toBindingRead(value), (next) =>
        this.toggleClass(name, Boolean(next))
      );
      return this;
    }

    if (value) {
      return this.className(name);
    }

    this._classes.delete(name);
    this._syncClassName();
    return this;
  }

  /**
   * 读写单个样式；传入对象时转给 styles() 批量处理。
   */
  style(name, value) {
    if (value === undefined && typeof name === 'string') {
      return this._styles[name];
    }

    if (name && typeof name === 'object') {
      return this.styles(name);
    }

    if (typeof value === 'function' || isSignal(value)) {
      registerNodeBinding(this, 'style', name, toBindingRead(value), (next) =>
        this.style(name, next)
      );
      return this;
    }

    const previous = this._styles[name];
    if (value === null || value === undefined || value === '') {
      delete this._styles[name];
    } else {
      this._styles[name] = value;
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
      this._pendingRemovals.delete(viewNode);
      this._children.push(viewNode);
      this._childrenDirty = true;

      if (this._el) {
        const childElement = withRenderScope(this._access ?? currentInheritedScope(), () =>
          viewNode.renderDom()
        );
        if (childElement && childElement.parentNode !== this._el) {
          this._el.appendChild(childElement);
        }
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
    if (isDevtoolsEnabled()) {
      this._devtoolsRendering = true;
    }
    try {
      if (!this._el) {
        this._el = this._createElement();
        withRenderScope(inherited, () => this._applySnapshotToElement());
      }

      this._applyAccessState(state);
      activateBindings(this);
      this._commitChildren();
      this._children.forEach((child) => {
        withRenderScope(inherited, () => {
          const childElement = child.renderDom();
          if (childElement && childElement.parentNode !== this._el) {
            this._el.appendChild(childElement);
          } else if (!childElement && child._el && child._el.parentNode === this._el) {
            this._el.removeChild(child._el);
          }
        });
      });

      if (isDevtoolsEnabled()) {
        commitDevtoolsNode(this);
      }
      return this._el;
    } finally {
      this._devtoolsRendering = false;
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

      return `${startTag}${this._children.map((child) => child.toHTML()).join('')}</${this._tagName}>`;
    });
  }

  /**
   * DOM 首次创建时，把之前记录的属性、样式、事件和子节点一次性同步。
   */
  _applyBindingsToElement() {
    Object.entries(this._attrs).forEach(([name, value]) => applyAttribute(this._el, name, value));
    this._syncClassName();
    Object.entries(this._styles).forEach(([name, value]) => {
      this._el.style[name] = value;
    });
    this._events.forEach((descriptor, eventName) => {
      this._bindDomAdapter(eventName, undefined, descriptor.options);
    });
  }

  _applySnapshotToElement() {
    this._applyBindingsToElement();
    this._children.forEach((child) => {
      const childElement = child.renderDom();
      if (childElement) {
        this._el.appendChild(childElement);
      }
    });
  }

  /**
   * 同步 class 集合到属性快照和真实 DOM。
   */
  _syncClassName() {
    const previous = this._attrs.class;
    const className = [...this._classes].join(' ');

    if (className) {
      this._attrs.class = className;
    } else {
      delete this._attrs.class;
    }

    if (this._el) {
      if (className) {
        this._el.className = className;
      } else {
        this._el.removeAttribute('class');
      }
      if (isDevtoolsEnabled() && !this._devtoolsRendering && !Object.is(previous, className)) {
        notifyDevtoolsMutation(this, 'attr', {
          name: 'class',
          previous,
          next: className || undefined
        });
      }
    }
  }

  /**
   * 序列化属性快照，供 toHTML 使用。
   */
  _serializeAttributes() {
    const attrs = { ...this._attrs };
    const styleText = this._serializeStyles();

    if (styleText) {
      attrs.style = attrs.style ? `${attrs.style}; ${styleText}` : styleText;
    }

    return Object.entries(attrs)
      .filter(([, value]) => value !== null && value !== undefined && value !== false)
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
    const args = normalizeSetupArguments(first, second, third);
    const node = new NodeClass(tagName, args.first);
    applyElementOptions(node, args.options);
    if (typeof args.callback === 'function') {
      node.setup(args.callback);
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

    NodeClass.prototype[name] = function childFactory(...args) {
      return this.child(factory(...args));
    };
  });
}

export { VTextNode as TextNode, VTextNode as ViewTextNode, vText as text };
