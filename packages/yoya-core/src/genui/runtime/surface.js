import { div } from '../../index.js';
import { COMPONENTS_KEY, PROTOCOL_ID, PROTOCOL_VERSION } from '../protocol/constants.js';
import { ERROR_CODES, GenUIError, toGenUIError } from '../protocol/errors.js';
import { isPlainObject } from '../protocol/values.js';
import { assertNode, assertSchema } from '../protocol/validate.js';
import { ActionBus, installProtocolActions } from './actions.js';
import { DataModel } from './data-model.js';
import { createCustodianRegistry } from './custodians.js';
import { normalizeSugarDeep } from '../protocol/references.js';
import { createRenderContext, renderNode, resolveForDelivery } from './render.js';
import { createDefaultRegistry } from './default-registry.js';

const DEFAULT_REGISTRY = createDefaultRegistry();

/**
 * 一个 GenUI surface = 一份 yoya-genui schema + 数据模型 + 动作总线 + 活着的视图树。
 *
 * 生命周期与 yoya 的节点一致：`bindTo()` 渲染并挂到容器，`destroy()` 释放；
 * `update(schema)` 换一棵树（数据模型连同句柄保留，绑定原地更新）。
 */
export class GenUISurface {
  constructor(schema, options = {}) {
    this.options = Object.freeze({ ...options });
    this.registry = options.registry ?? DEFAULT_REGISTRY;
    this.surfaceId = resolveSurfaceId(schema, options);
    this._custodians =
      typeof options.custodians?.read === 'function'
        ? options.custodians
        : createCustodianRegistry(options.custodians);
    this._schema = normalizeSchema(normalizeSugarDeep(schema), { onUnknown: options.onUnknown });
    this._data =
      options.data instanceof DataModel ? options.data : new DataModel(this._schema.data ?? {});
    this._actions = new ActionBus();
    this._listeners = new Map();
    this._warnings = Array.isArray(this._schema.meta?.warnings)
      ? [...this._schema.meta.warnings]
      : [];
    this._rootNode = null;
    this._host = null;
    this._disposers = new Set();
    this._subtreeDisposers = new Map();
    this._nodes = new Map();
    this._delivered = new Map();
    this._deliveredJson = new Map();
    this._componentsDelivered = false;
    this._pendingAttach = [];
    this._session = options.session ?? null;
    this._target = null;
    this._destroyed = false;

    this._disposeActions = installProtocolActions(this._actions, this._data);
    this._disposeHandlers = this._actions.handleAll(options.actions);
    this._unsubscribeAction = this._actions.subscribe((event) => this._emit('action', event));
    this._unsubscribeData = this._data.subscribe((change) => this._emit('change', change));
  }

  get schema() {
    return this._schema;
  }

  get data() {
    return this._data;
  }

  get actions() {
    return this._actions;
  }

  /** 协议根的视图节点（不含 surface 包装层）。 */
  get rootNode() {
    return this._ensureRoot();
  }

  /** 挂载用的宿主节点（默认是带 `data-genui-surface` 的包装元素）。 */
  get node() {
    return this._ensureHost();
  }

  get warnings() {
    return [...this._warnings];
  }

  /** 已登记 id 的视图节点（增量更新 / 宿主直接调命令用）。 */
  nodeById(id) {
    return this._nodes.get(String(id))?.node ?? null;
  }

  renderDom() {
    this._assertLive();
    return this._ensureHost().renderDom();
  }

  toHTML() {
    this._assertLive();
    const host = this._ensureHost();
    return typeof host.toHTML === 'function' ? host.toHTML() : '';
  }

  /**
   * 当前文档：把**已经投递进来的内容**并进 schema 的内容表，得到一份可以再渲染的文档（派生视图）。
   *
   * 结构与内容各归各位：`root` 还是原来那份**结构**（只声明位置），内容进 `components` 表——
   * 每块按原样放着（自带 `to` / `to_slot`），再渲染一次落点一样，所以这份文档与眼前的界面等价
   * （`toHTML()` 对得上）。同位重复投递只留最后一份；还没落位的排队内容也在表里。
   * 用来观察"一段段长出来的界面"、存快照，或者交给别的 surface 再渲染。**不改 surface 自己**。
   */
  toSchema() {
    this._assertLive();

    const document = clonePlain(this._schema);
    const delivered = [...this._deliveredJson.values()].map((entry) => clonePlain(entry.fragment));
    // 还没投过的内容表原样留着（文档刚建、还没挂载时）
    const untouched = this._componentsDelivered ? [] : clonePlain(document[COMPONENTS_KEY] ?? []);
    const queued = this._pendingAttach.map((item) => clonePlain(item.fragment));

    return { ...document, [COMPONENTS_KEY]: [...untouched, ...delivered, ...queued] };
  }

  bindTo(target) {
    this._assertLive();

    if (target !== undefined && target !== null) {
      this._target = target;
    }

    if (this._target === null) {
      throw new GenUIError('bindTo() 需要容器（选择器或元素）', { code: ERROR_CODES.render });
    }

    try {
      this._ensureHost().bindTo(this._target);
    } catch (error) {
      this._fail(error, 'bindTo');
    }

    this._emit('mount', { surfaceId: this.surfaceId, target: this._target });
    return this;
  }

  /** 换一棵树：数据模型保留（schema 明确给了 data 才整体替换）。 */
  update(nextSchema) {
    this._assertLive();
    const schema = normalizeSchema(normalizeSugarDeep(nextSchema), this.options);
    const previous = this._host;

    this._schema = schema;
    this.surfaceId = schema.surfaceId ?? this.surfaceId;

    if (schema.data !== undefined) {
      this._data.replace(schema.data);
    }

    this._rootNode = null;
    this._host = null;
    this._disposeBindings();
    this._nodes.clear();
    // 换树之后旧的落位记录就没有意义了（节点已经不属于眼前这棵树）
    this._delivered.clear();
    this._deliveredJson.clear();
    this._componentsDelivered = false;

    if (previous) {
      previous.destroy();
    }

    this._emit('update', { schema });

    if (this._target !== null) {
      this.bindTo(this._target);
    }

    return this;
  }

  /** 宿主主动触发动作（等价于用户点了带该动作的控件）。 */
  dispatch(name, params = {}) {
    this._assertLive();
    return this._actions.dispatch({
      name,
      params,
      source: { componentId: '', surfaceId: this.surfaceId, type: '' }
    });
  }

  /**
   * 吃增量消息（方言会话解析后翻译成与方言无关的操作）。
   *
   * 只有用 `GenUI.fromJson(dialect, messages)` 建的 surface 才有会话；
   * 数据类更新走原地更新，组件类更新只替换变化的那棵子树。
   */
  ingest(messages) {
    this._assertLive();

    if (!this._session) {
      throw new GenUIError(
        '这个 surface 没有方言会话：用 GenUI.fromJson(方言名, 消息) 创建才支持 ingest(messages)',
        { code: ERROR_CODES.dialect }
      );
    }

    const ops = this._session.ingest(messages);

    ops.forEach((op) => this._applyOp(op));

    if (!this._destroyed) {
      this._schema = this._session.schema;
      this.surfaceId = this._schema.surfaceId ?? this.surfaceId;
    }

    this._emit('ingest', { ops });
    return this;
  }

  /**
   * 投一块（或几块）内容进树里——内容自带 `to` 指定宿主、`to_slot` 指定落点。
   *
   * ```js
   * const node = surface.attach({ to: 'page', to_slot: 'header', type: 'h1', text: '标题' });
   * node.on('click', …);            // 返回落位后的句柄，方便绑事件 / 调命令
   * surface.attach({ components: [ … ] }); // 也可以直接给一份带内容表的文档
   * ```
   *
   * - 内容必须写 `to_slot`（`""` = 默认位）；`to` 省略 = 投到 surface 的根；
   * - `to` 指向的宿主还没出现 → 排队，宿主一登记就自动补投；
   * - 落点名由兼容层翻译成当前 yoya 版本读的属性（`vn_slot` / `to_slot`）。
   */
  attach(fragmentOrFragments) {
    this._assertLive();

    if (Array.isArray(fragmentOrFragments)) {
      return fragmentOrFragments.map((fragment) => this.attach(fragment));
    }

    if (isPlainObject(fragmentOrFragments?.[COMPONENTS_KEY])) {
      return this.attach(fragmentOrFragments[COMPONENTS_KEY]);
    }

    return this._attachOne(fragmentOrFragments);
  }

  /** 订阅 surface 事件：`action` / `change` / `mount` / `update` / `error`。 */
  on(type, handler) {
    if (typeof handler !== 'function') {
      throw new GenUIError('surface.on(type, handler) 的 handler 必须是函数', {
        code: ERROR_CODES.protocol
      });
    }

    const bucket = this._listeners.get(type) ?? new Set();
    bucket.add(handler);
    this._listeners.set(type, bucket);

    return () => bucket.delete(handler);
  }

  destroy() {
    if (this._destroyed) {
      return this;
    }

    this._destroyed = true;
    this._host?.destroy();
    this._rootNode = null;
    this._host = null;
    this._nodes.clear();
    this._disposeAllBindings();
    this._unsubscribeAction();
    this._unsubscribeData();
    this._disposeHandlers();
    this._disposeActions();
    this._actions.destroy();
    this._data.destroy();
    this._listeners.clear();
    return this;
  }

  _ensureRoot() {
    this._assertLive();

    if (this._rootNode === null) {
      this._rootNode = this._render();
    }

    return this._rootNode;
  }

  _ensureHost() {
    this._assertLive();

    if (this._host === null) {
      this._host = this._mount(this._ensureRoot());
      this._deliverComponents();
      this._flushPendingAttach();
    }

    return this._host;
  }

  _render() {
    this._disposeAllBindings();
    this._nodes.clear();

    const root = this._renderSchemaNode(this._schema.root);
    const rootId = isPlainObject(this._schema.root) ? this._schema.root.id : undefined;

    // 根节点也要进 id 索引：`attach({ to: '<root id>' })` 才有宿主可投
    if (root && typeof rootId === 'string' && rootId !== '') {
      this._nodes.set(rootId, { node: root, parent: null, parentId: null });
    }

    return root;
  }

  /** 渲染一个协议节点（`root` 或增量替换用的子树），并把 id 索引重建到 `_nodes`。 */
  _renderSchemaNode(schemaNode, collector = null, track = null) {
    const context = this._createContext(
      collector === null
        ? (id, node, parent, parentId) => this._nodes.set(id, { node, parent, parentId })
        : collector,
      track
    );

    if (!schemaNode) {
      return null;
    }

    try {
      return renderNode(schemaNode, context, 'root');
    } catch (error) {
      return this._fail(error, 'render', null) ?? null;
    }
  }

  _createContext(onNode, track = null) {
    return createRenderContext({
      actions: this._actions,
      custodians: this._custodians,
      data: this._data,
      options: {
        functions: this.options.functions,
        onNode,
        onUnknown: this.options.onUnknown,
        onWarn: (message) => this._warn(message),
        track: track ?? ((dispose) => this._disposers.add(dispose))
      },
      registry: this.registry,
      surfaceId: this.surfaceId
    });
  }

  /** 执行一条方言会话操作（与方言无关）。 */
  _applyOp(op) {
    if (op.op === 'data') {
      this._data.write(op.path, op.value);
      return;
    }

    if (op.op === 'node') {
      this._replaceComponentNode(op);
      return;
    }

    if (op.op === 'root') {
      this._replaceRoot(op.node, op.components);
      return;
    }

    if (op.op === 'theme') {
      this._applyTheme(op.theme);
      return;
    }

    if (op.op === 'attach') {
      this.attach(op.node);
      return;
    }

    if (op.op === 'delete') {
      this.destroy();
    }
  }

  _attachOne(fragment) {
    if (!isPlainObject(fragment)) {
      throw new GenUIError('attach() 只接受节点对象（或节点数组）', { code: ERROR_CODES.render });
    }

    // 片段和 schema 走同一套校验：写错的键（含已移除的 `slots`）当场报出来，不静默忽略
    const report = assertNode(fragment, { strict: this.options.strict === true });

    report.warnings.forEach((warning) =>
      this._warn(`[yoya-genui] 片段 ${warning.path}：${warning.message}`)
    );

    const to = typeof fragment.to === 'string' ? fragment.to : '';
    const hostRecord =
      to === ''
        ? this._ensureRoot() === null
          ? null
          : { node: this._rootNode }
        : this._nodes.get(to);

    if (!hostRecord) {
      this._pendingAttach.push({ fragment, to });
      this._warn(
        to === ''
          ? 'attach：surface 还没有根节点，片段已排队'
          : `attach：宿主 "${to}" 还没进树，片段已排队（宿主出现后自动补投）`
      );
      return null;
    }

    const collected = new Map();
    const localDisposers = new Set();
    const rendered = this._renderSchemaNode(
      fragment,
      (id, node, parent, parentId) => collected.set(id, { node, parent, parentId }),
      (dispose) => localDisposers.add(dispose)
    );

    if (!rendered) {
      return null;
    }

    const fragmentId =
      typeof fragment.id === 'string' && fragment.id !== ''
        ? fragment.id
        : `attach:${this._attachSerial()}`;

    // 同一个位置重复投递 = 替换：旧节点自己先销毁（yoya 的 clearChildren 只记"待移除"，
    // DOM 要等下一次提交才清；这里显式接管，落位即可见，不依赖提交时机）
    const deliveryKey = `${to}::${typeof fragment.to_slot === 'string' ? fragment.to_slot : ''}`;
    const previous = this._delivered.get(deliveryKey);

    if (previous && previous !== rendered && typeof previous.destroy === 'function') {
      previous.destroy();
    }

    // 宿主可能还没解析过（比如 attach 早于 bindTo）：先解析，标记才会被路由
    resolveForDelivery(hostRecord.node).child(rendered);
    this._delivered.set(deliveryKey, rendered);
    // 同一份键只留最后一条（同位重复投递 = 替换）：派生视图要认当前那份
    this._deliveredJson.set(deliveryKey, { fragment, to });
    this._nodes.set(fragmentId, {
      // `delivery` 记着这块是从哪个落点投进来的：增量更新时"换一块"= 往同一个落点重投
      delivery: { key: deliveryKey, slot: fragment.to_slot, to },
      node: rendered,
      parent: hostRecord.node,
      parentId: to
    });
    collected.forEach((record, id) => this._nodes.set(id, record));
    this._swapSubtreeDisposers(fragmentId, localDisposers);

    // 投递标记还在 = 宿主里没有同名位（当前 yoya 的行为是"退回挂到根"，不报错）→ 至少说一声
    if (
      isPlainObject(fragment) &&
      typeof fragment.to_slot === 'string' &&
      isStillMarked(rendered)
    ) {
      this._warn(
        `attach：宿主 "${to || '(根)'}" 里没有名为 "${fragment.to_slot}" 的位，内容按 yoya 现有行为落到了根上`
      );
    }

    this._flushPendingAttach();

    return rendered;
  }

  _attachSerial() {
    this._serial = (this._serial ?? 0) + 1;
    return this._serial;
  }

  /** 把内容表（`components`）投一遍；一份文档只投一次，换树时重置。 */
  _deliverComponents(list = undefined) {
    if (this._componentsDelivered) {
      return;
    }

    this._componentsDelivered = true;

    const components = list ?? this._schema[COMPONENTS_KEY];

    if (Array.isArray(components)) {
      components.forEach((component) => this._attachOne(component));
    }
  }

  /** 宿主陆续登记之后，把排队的片段补投一次（顺序保持 FIFO）。 */
  _flushPendingAttach() {
    if (this._pendingAttach.length === 0) {
      return;
    }

    const queue = this._pendingAttach;
    this._pendingAttach = [];

    queue.forEach((item) => {
      if (item.to === '' ? this._rootNode !== null : this._nodes.has(item.to)) {
        this._attachOne(item.fragment);
        return;
      }

      this._pendingAttach.push(item);
    });
  }

  /** 换根：`components` 一起给时，按这份内容表投（`root` 操作就是这么用的）。 */
  _replaceRoot(schemaNode, components = undefined) {
    const previous = this._host;

    this._disposeAllBindings();
    this._nodes.clear();
    this._delivered.clear();
    this._deliveredJson.clear();
    this._componentsDelivered = false;
    this._rootNode = this._renderSchemaNode(schemaNode);
    this._host = this._mount(this._rootNode);

    if (previous) {
      previous.destroy();
    }

    if (this._target !== null) {
      this._host.bindTo(this._target);
    }

    this._deliverComponents(components);
    this._flushPendingAttach();
  }

  /**
   * 只换变化的那棵子树：找到最近的有登记节点的祖先，原位 `replaceChild`。
   * 找不到就退回整根重建（宁可贵一点，也不把界面留在错的状态）。
   */
  _replaceComponentNode(op) {
    const chain = Array.isArray(op.fallbackIds) ? op.fallbackIds : [op.componentId];
    const hit = chain
      .map((id) => [String(id), this._nodes.get(String(id))])
      .find(([, record]) => record !== undefined);

    if (!hit) {
      this._warn(`增量更新：找不到组件 ${op.componentId} 的节点，改为整根重建`);
      this._replaceRoot(this._session?.schema?.root ?? null);
      return;
    }

    const [id, record] = hit;

    // 投递进来的块（`components` / `attach`）：同一个落点重投 = 替换这一块，
    // 不需要（也不能）对宿主 `replaceChild` —— 交付语义本来就由落点管。
    if (record.delivery) {
      this._nodes.delete(id);
      this.attach(
        isPlainObject(op.node) ? { ...op.node, ...deliveryTarget(record.delivery) } : op.node
      );
      return;
    }

    const stale = this._descendantsOf(id);
    const collected = new Map();
    const localDisposers = new Set();
    const replacement = this._renderSchemaNode(
      op.node,
      (childId, node, parent, parentId) => {
        collected.set(childId, { node, parent, parentId });
      },
      (dispose) => localDisposers.add(dispose)
    );

    if (!replacement) {
      return;
    }

    stale.forEach((staleId) => this._nodes.delete(staleId));
    this._nodes.set(id, { node: replacement, parent: record.parent, parentId: record.parentId });
    collected.forEach((childRecord, childId) => this._nodes.set(childId, childRecord));
    this._swapSubtreeDisposers(id, localDisposers);

    try {
      record.parent.replaceChild(id, replacement);
    } catch (error) {
      this._fail(error, 'ingest');
    }

    this._flushPendingAttach();
  }

  /** 某个 id 及其后代在索引里的全部条目（换祖先时要把旧登记清掉）。 */
  _descendantsOf(rootId) {
    const ids = new Set([rootId]);
    let grew = true;

    while (grew) {
      grew = false;
      this._nodes.forEach((record, id) => {
        if (!ids.has(id) && record.parentId !== null && ids.has(String(record.parentId))) {
          ids.add(id);
          grew = true;
        }
      });
    }

    return ids;
  }

  /** 换掉某棵子树的绑定订阅：旧的先释放，新的按子树根 id 记账。 */
  _swapSubtreeDisposers(id, next) {
    const previous = this._subtreeDisposers.get(id);

    if (previous) {
      previous.forEach((dispose) => dispose());
    }

    if (next && next.size > 0) {
      this._subtreeDisposers.set(id, next);
      return;
    }

    this._subtreeDisposers.delete(id);
  }

  _disposeAllBindings() {
    this._disposeBindings();
    this._subtreeDisposers.forEach((set) => set.forEach((dispose) => dispose()));
    this._subtreeDisposers.clear();
  }

  _applyTheme(theme) {
    if (!isPlainObject(theme)) {
      return;
    }

    const host = this._host;

    if (host) {
      if (theme.mode) {
        host.attr('data-yoya-mode', String(theme.mode));
      }

      if (theme.density) {
        host.attr('data-yoya-density', String(theme.density));
      }

      if (isPlainObject(theme.tokens)) {
        Object.entries(theme.tokens).forEach(([token, value]) => {
          const name = String(token).startsWith('--') ? String(token) : `--yoya-${token}`;
          host.style(name, value === null || value === undefined ? null : String(value));
        });
      }
    }

    this._schema = { ...this._schema, theme };
  }

  _mount(rootNode) {
    if (this.options.wrap === false) {
      return rootNode ?? div({ attrs: { 'data-genui-surface': this.surfaceId } });
    }

    const { attrs, style } = surfaceAppearance(this._schema, this.surfaceId);

    return div({ attrs, style }, (host) => {
      if (rootNode) {
        host.child(rootNode);
      }
    });
  }

  _warn(message) {
    this._warnings.push(message);

    if (this.options.silent === true) {
      return;
    }

    if (typeof this.options.onWarn === 'function') {
      this.options.onWarn(message);
      return;
    }

    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn(message);
    }
  }

  /** 释放渲染期建立的绑定订阅（换树 / 销毁时都要收）。 */
  _disposeBindings() {
    this._disposers.forEach((dispose) => dispose());
    this._disposers.clear();
  }

  _emit(type, payload) {
    const bucket = this._listeners.get(type);

    if (!bucket) {
      return;
    }

    [...bucket].forEach((listener) => {
      try {
        listener(payload, this);
      } catch (error) {
        this._fail(error, `listener:${type}`);
      }
    });
  }

  _fail(error, phase, fallback = undefined) {
    const genuiError = toGenUIError(error, { code: ERROR_CODES.render });

    if (typeof this.options.onError === 'function') {
      this.options.onError(genuiError, { phase, surface: this });
      return fallback;
    }

    throw genuiError;
  }

  _assertLive() {
    if (this._destroyed) {
      throw new GenUIError('surface 已销毁：请重新 fromJson() 创建', {
        code: ERROR_CODES.protocol
      });
    }
  }
}

function resolveSurfaceId(schema, options) {
  const fromSchema = isPlainObject(schema) ? schema.surfaceId : undefined;
  return String(options.surfaceId ?? fromSchema ?? 'main');
}

/** 一块内容当初投到哪儿（增量更新要按同一对 `to` / `to_slot` 重投）。 */
function deliveryTarget(delivery) {
  return { to: delivery.to, to_slot: delivery.slot };
}

/** 纯数据深拷贝（schema 是 JSON，派生视图不该把原对象暴露出去）。 */
function clonePlain(value) {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(clonePlain);
  }

  const copy = {};

  Object.entries(value).forEach(([key, item]) => {
    copy[key] = clonePlain(item);
  });

  return copy;
}

/**
 * 投递标记还在（没被 yoya 摘掉）= 这一份没被任何占位接收。
 *
 * 空串不算标记：`to_slot: ""` 是**匿名位**，它本来就不写标记（见 `slot-compat` 的
 * `markDelivery`），残留的空串只可能是重跑旧实现留下的，别拿它当"没投进去"。
 */
function isStillMarked(node) {
  if (typeof node?.attr !== 'function') {
    return false;
  }

  return ['vn_slot', 'to_slot'].some((attribute) => {
    const value = node.attr(attribute);
    return value !== null && value !== undefined && value !== '';
  });
}

/** schema 归一：补协议标识与版本（校验失败即抛，错误里带路径）。 */
export function normalizeSchema(schema, options = {}) {
  const normalized = { ...(isPlainObject(schema) ? schema : {}) };
  normalized.protocol = normalized.protocol ?? PROTOCOL_ID;
  normalized.version = normalized.version ?? PROTOCOL_VERSION;

  assertSchema(normalized, { strict: options.strict === true });
  return normalized;
}

/**
 * surface 外观：主题走 yoya 的属性约定（`data-yoya-mode` / `data-yoya-density`），
 * 主题 token 走 `--yoya-*` 变量——换肤只改这一层，不动组件。
 */
function surfaceAppearance(schema, surfaceId) {
  const theme = isPlainObject(schema.theme) ? schema.theme : {};
  const attrs = { 'data-genui-surface': surfaceId };
  const style = {};

  if (theme.mode) {
    attrs['data-yoya-mode'] = String(theme.mode);
  }

  if (theme.density) {
    attrs['data-yoya-density'] = String(theme.density);
  }

  if (isPlainObject(theme.tokens)) {
    Object.entries(theme.tokens).forEach(([token, value]) => {
      if (value === null || value === undefined) {
        return;
      }

      const name = String(token).startsWith('--') ? String(token) : `--yoya-${token}`;
      style[name] = String(value);
    });
  }

  return { attrs, style };
}
