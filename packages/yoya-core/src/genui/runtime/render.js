import { computed, isSignal, ref, vNode, vText } from '../../index.js';
import { span } from '../../html/index.js';
import {
  ACTION_KEY,
  ARG_KEY,
  BIND_KEY,
  CALL_ARGS_KEY,
  CALL_KEY,
  EVENT_KEY,
  FROM_KEY,
  TEMPLATE_KEY,
  TEXT_NODE_TYPE
} from '../protocol/constants.js';
import { ERROR_CODES, GenUIError, toGenUIError } from '../protocol/errors.js';
import {
  formatTemplate,
  isActionExpr,
  isArgExpr,
  isBindExpr,
  isCallExpr,
  isEventExpr,
  isPathPrefix,
  isPlainObject,
  isTemplateExpr,
  normalizeRepeat,
  readPath
} from '../protocol/values.js';
import { SLOT_KEY, TO_SLOT_KEY } from '../protocol/constants.js';
import { createPlaceholder, markDelivery } from './slot-compat.js';
import {
  findScopeByAlias,
  readRowPseudo,
  resolveReferencePath,
  resolveRepeatSource,
  resolveScopePath,
  resolveWritableReference
} from './references.js';

const UNKNOWN_STYLE = {
  background: 'repeating-linear-gradient(45deg, #fde68a 0 8px, #fef3c7 8px 16px)',
  border: '1px dashed #b45309',
  borderRadius: '4px',
  color: '#92400e',
  font: '12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace',
  padding: '6px 10px'
};

/** 渲染上下文：一次渲染共享的注册表 / 数据 / 动作 / 作用域。 */
export function createRenderContext(config) {
  const {
    actions,
    custodians = null,
    data,
    options = {},
    registry,
    scope = null,
    surfaceId = 'main'
  } = config;

  if (!registry || !data || !actions) {
    throw new GenUIError('渲染上下文需要 registry / data / actions', { code: ERROR_CODES.render });
  }

  return {
    actions,
    custodians,
    data,
    functions: options.functions ?? {},
    exposures: options.exposures ?? new Map(),
    exposureStack: options.exposureStack ?? [],
    onUnknown: options.onUnknown ?? 'placeholder',
    onNode: options.onNode ?? null,
    registry,
    scope,
    surfaceId,
    track: options.track ?? (() => {}),
    warned: options.warned ?? new Set(),
    warn: options.onWarn ?? defaultWarn
  };
}

/** 进入列表行作用域：`scope = { item, path, key, index }`。 */
export function withScope(ctx, scope) {
  return { ...ctx, scope: { ...scope, parent: ctx.scope } };
}

/** 把 yoya-ui 认得的纯值（含信号句柄）取成当前值。 */
export function snapshotValue(value) {
  return isSignal(value) ? value.value : value;
}

/**
 * 值表达式求值：
 *
 * - `{ "$bind": "/path" }` → 数据模型的**活值句柄**（写进 yoya 值位置即建立绑定）
 * - `{ "$template": "共 {count} 条" }` → 派生 `computed`
 * - 数组 / 对象 → 逐项求值（数组内出现句柄时取当次快照——列表请用 `repeat`）
 */
export function resolveValue(raw, ctx) {
  // 动作表达式出现在 props 位置 = 回调型 prop（`vTabs` 的 change），包成可调用函数
  if (isActionExpr(raw)) {
    return createActionCallback(raw, ctx);
  }

  if (isBindExpr(raw)) {
    const exposed = ctx.exposures.get(raw[BIND_KEY]);

    if (exposed !== undefined) {
      return exposed;
    }

    const from = raw[FROM_KEY];

    if (from === '#nearest') {
      const nearest = ctx.exposureStack.at(-1)?.[raw[BIND_KEY]];

      if (nearest === undefined) {
        throw new GenUIError(
          `最近组件没有暴露 "${raw[BIND_KEY]}"（@genui.expose / registry.expose 声明）`,
          { code: ERROR_CODES.render, path: raw[BIND_KEY] }
        );
      }

      return nearest;
    }

    if (from === '#row' && raw[BIND_KEY].startsWith('$')) {
      return readRowPseudo(raw, ctx);
    }

    if (isScopeFrom(from, ctx)) {
      return ctx.data.cell(resolveReferencePath(raw, ctx));
    }

    if (from !== undefined) {
      if (from === '#nearest') {
        throw new GenUIError(
          '`#:/<prop>` 最近组件引用需要组件数据暴露（@genui.expose）支持——随后续增量落地',
          { code: ERROR_CODES.render, path: raw[BIND_KEY] }
        );
      }

      if (!ctx.custodians) {
        throw new GenUIError(
          `引用了保管者 "${from}"，但宿主没有注册任何保管者（options.custodians）`,
          { code: ERROR_CODES.render, path: raw[BIND_KEY] }
        );
      }

      return ctx.custodians.read(from, raw[BIND_KEY]);
    }

    return ctx.data.cell(resolveReferencePath(raw, ctx));
  }

  if (isTemplateExpr(raw)) {
    return computed(() => readTemplate(raw[TEMPLATE_KEY], ctx));
  }

  if (isCallExpr(raw)) {
    return callFunction(raw, ctx);
  }

  if (Array.isArray(raw)) {
    return raw.map((item) => snapshotValue(resolveValue(item, ctx)));
  }

  if (isPlainObject(raw)) {
    const resolved = {};
    Object.entries(raw).forEach(([key, value]) => {
      resolved[key] = resolveValue(value, ctx);
    });
    return resolved;
  }

  return raw;
}

/**
 * 函数调用：`{ "$call": "multiply", "args": { … } }`。
 *
 * - **函数体不在 schema 里**：按名字去 `ctx.functions`（宿主 `fromJson(..., { functions })`）查，
 *   查不到就告警一次并给 `undefined`（不崩、也不执行提交过来的代码）；
 * - **参数里有活值就自动重算**：任一参数是 `$bind` / `$template` / 依赖活值的 `$call`，
 *   整次调用就是 `computed`——数据一变，结果跟着变（"总价"不用宿主自己订阅）。
 */
function callFunction(expr, ctx) {
  const impl = ctx.functions?.[expr[CALL_KEY]];
  const raw = expr[CALL_ARGS_KEY];

  if (typeof impl !== 'function') {
    warnOnce(
      ctx,
      `call:${expr[CALL_KEY]}`,
      `未注册的函数 "${expr[CALL_KEY]}"（宿主用 functions 选项注册）`
    );
    return undefined;
  }

  const resolved = resolveCallArgs(raw, ctx);

  if (!resolved.live) {
    return impl(resolved.value);
  }

  return computed(() => impl(resolved.read()));
}

/**
 * 参数求值：对象按 key、数组按位（都是值表达式）。
 *
 * 静态参数只求一次；出现活值（信号句柄）时给出 `read()`——每次重算都重新取当次值。
 */
function resolveCallArgs(raw, ctx) {
  if (Array.isArray(raw)) {
    const values = raw.map((item) => resolveValue(item, ctx));

    return {
      live: values.some((value) => isSignal(value)),
      read: () => values.map((value) => snapshotValue(value)),
      value: values.map((handle) => snapshotValue(handle))
    };
  }

  if (isPlainObject(raw)) {
    const entries = Object.entries(raw).map(([key, value]) => [key, resolveValue(value, ctx)]);

    return {
      live: entries.some(([, value]) => isSignal(value)),
      read: () => Object.fromEntries(entries.map(([key, value]) => [key, snapshotValue(value)])),
      value: Object.fromEntries(entries.map(([key, value]) => [key, snapshotValue(value)]))
    };
  }

  const value = resolveValue(raw, ctx);

  return {
    live: isSignal(value),
    read: () => snapshotValue(value),
    value: snapshotValue(value)
  };
}

/**
 * 回调型 prop：组件调用时把载荷交给动作参数里的 `$arg`。
 *
 * **载荷 = 第一个参数**（不是整个参数数组）：yoya-ui 的回调常见签名是
 * `change(value, self.node())`——值在前、句柄在后。按数组传会让 `{$arg: ''}` 收到
 * `[value, node]`，写进数据模型的就是个数组（真踩过）。
 */
function createActionCallback(expr, ctx) {
  return (...args) =>
    ctx.actions.dispatch({
      event: null,
      name: expr[ACTION_KEY],
      params: resolveActionParams(expr.params, ctx, {
        arg: args[0]
      }),
      source: {
        componentId: ctx.scope?.key === undefined ? '' : String(ctx.scope.key),
        surfaceId: ctx.surfaceId,
        type: ''
      },
      target: null
    });
}

/** 相对路径（列表行内）与绝对路径（数据模型根）的统一口径。 */
export function resolvePath(path, ctx) {
  return resolveScopePath(path, ctx);
}

/**
 * 模板串求值：`"共 {count} 条 / {user.name}"`。
 * 占位符里的路径两种写法都认——`user.name` 与 `user/name` 等价
 * （模板是展示层写法，点号更顺手；数据模型的规范路径仍是 `/`）。
 */
export function readTemplate(template, ctx) {
  return formatTemplate(template, (path) =>
    ctx.data.read(resolvePath(path.replace(/\./g, '/'), ctx))
  );
}

/**
 * 协议节点 → yoya-ui 视图节点。
 *
 * 分工：本函数只做「协议 → 工厂调用」；值绑定、内容投递、列表对账、事件接线各自独立。
 */
export function renderNode(node, ctx, path = '') {
  const descriptor = describeNode(node, ctx, path);

  // 占位声明：`{ "vn_slot": "aa" }`（不带 type）= 零布局占位；`""` = 默认位
  if (descriptor.placeholder !== null) {
    return createPlaceholder(descriptor.placeholder);
  }

  if (descriptor.type === TEXT_NODE_TYPE) {
    return vText(resolveValue(descriptor.text ?? '', ctx));
  }

  const entry = ctx.registry.resolve(descriptor.type);

  if (!entry) {
    return renderUnknown(descriptor, ctx);
  }

  descriptor.entry = entry;
  // 普通容器要当槽位宿主时必须包一层 vNode（只有组件节点会按标记路由槽位）。
  // vNode 不产生占位元素，DOM 结构不变；判断放在浅层：直接子节点里有占位或投递才包。
  descriptor.wrapAsComponent = entry.kind === 'element' && hasSlotChildren(descriptor);
  // 回调型事件必须在**构建期**当 props 传进去（`vTabs` 的 change / `vCheckboxes` 的 change）
  const callbackProps = planEvents(descriptor, ctx, entry);
  descriptor.options = buildOptions(descriptor.raw, ctx, descriptor.bindings, entry, callbackProps);

  // childrenProp 模式：内容在工厂调用之前就要备好（`vDialog` 的 content / `vBadge` 的 children）
  if (entry.childrenProp) {
    const content = renderContentNodes(descriptor, ctx);
    if (content !== null) {
      descriptor.options[entry.childrenProp] = content;
    }
  }

  const host = createHost(entry, descriptor, ctx, path);
  // 投递要等宿主**建好之后**再做：普通容器要包一层透明 vNode 才有按标记路由的能力，
  // 而元素工厂的 setup 是构建期就执行的——包装层那时还没拿到手（`wrapper` 还是 null）。
  // 所以 `children` 里的投递先记下来，宿主到手后按顺序投。
  descriptor.deliveries.forEach((node) => {
    resolveForDelivery(host).child(node);
  });
  // 投递标记：当前 yoya 版本读 `vn_slot`，所以这里由兼容层决定写哪个属性
  if (descriptor.delivery !== null) {
    markDelivery(host, descriptor.delivery);
  }

  applyLiveBindings(host, descriptor, ctx);
  decorateHost(host, descriptor, ctx);
  return host;
}

function describeNode(node, ctx, path) {
  if (!isPlainObject(node)) {
    throw new GenUIError('节点必须是 JSON 对象', { code: ERROR_CODES.render, path });
  }

  const type = typeof node.type === 'string' ? node.type.trim() : '';
  const isPlaceholder = type === '' && typeof node[SLOT_KEY] === 'string';

  if (type === '' && !isPlaceholder) {
    throw new GenUIError('节点缺少字符串 type', { code: ERROR_CODES.render, path });
  }

  const repeat = node.repeat === undefined ? null : normalizeRepeat(node.repeat);

  if (node.repeat !== undefined && repeat === null) {
    throw new GenUIError('repeat 需要 $each（数据路径）', { code: ERROR_CODES.render, path });
  }

  if (repeat !== null) {
    repeat.source = resolveRepeatSource(repeat.source, ctx);

    if (node.template === undefined) {
      throw new GenUIError('声明 repeat 时必须给 template', { code: ERROR_CODES.render, path });
    }
  }

  const descriptor = {
    access: typeof node.access === 'string' ? node.access : null,
    bindings: [],
    children: Array.isArray(node.children) ? node.children : [],
    deliveries: [],
    delivery: isPlaceholder ? null : resolveDelivery(node),
    entry: null,
    id: node.id === undefined || node.id === null ? '' : String(node.id),
    on: isPlainObject(node.on) ? node.on : null,
    options: {},
    path,
    placeholder: isPlaceholder ? node[SLOT_KEY] : null,
    repeat,
    raw: node,
    template: node.template ?? null,
    text: node.text,
    type,
    when: node.when
  };

  return descriptor;
}

/** 浅层判断：直接子节点里出现占位（无 type + `vn_slot`）或投递（`to_slot`）。 */
function hasSlotChildren(descriptor) {
  return descriptor.children.some(
    (child) =>
      isPlainObject(child) &&
      ((child.type === undefined && typeof child[SLOT_KEY] === 'string') ||
        typeof child[TO_SLOT_KEY] === 'string')
  );
}

/**
 * 投递前先让宿主**解析**。
 *
 * yoya 的组件节点是懒解析的：解析之前 `child()` 只把内容攒着，不经过 `_placeContent`，
 * `to_slot` 标记不会被路由——内容会平铺在根上（看起来像"投递没生效"）。
 * 强制解析的现成手段就是渲染一次（`toHTML()`），解析过一次之后 `child()` 就按标记路由了。
 */
export function resolveForDelivery(host) {
  if (typeof host?.toHTML === 'function') {
    host.toHTML();
  }

  return host;
}

/** 投递标记：内容节点上的 `to_slot`（`""` = 投默认位）。 */
function resolveDelivery(node) {
  return typeof node[TO_SLOT_KEY] === 'string' ? node[TO_SLOT_KEY] : null;
}

function buildOptions(node, ctx, bindings = null, entry = null, callbackProps = null) {
  const options = {};

  if (isPlainObject(node.props)) {
    Object.entries(node.props).forEach(([key, value]) => {
      const mapping = resolvePropMapping(entry, key);
      const resolved = applyTransform(resolveValue(value, ctx), mapping.transform);

      collectBinding(value, key, mapping, ctx, bindings);
      // props 一律落**当次值**：句柄在 yoya-ui 各组件里的支持并不一致（有的登记绑定，
      // 有的直接当状态写，`computed` 甚至会被当只读句柄而报错），活值统一由
      // `applyLiveBindings` 的数据订阅驱动。
      if (mapping.channel === 'attr') {
        options.attrs = { ...(options.attrs ?? {}), [mapping.name]: deepSnapshot(resolved) };
        return;
      }

      if (mapping.channel === 'style') {
        options.style = { ...(options.style ?? {}), [mapping.name]: deepSnapshot(resolved) };
        return;
      }

      // `live: true` = 组件自己吃活值句柄（直传）；否则落当次值，由数据订阅负责更新
      options[mapping.name] = mapping.live === true ? resolved : deepSnapshot(resolved);
    });
  }

  if (node.class !== undefined) {
    options.class = snapshotValue(resolveValue(node.class, ctx));
  }

  if (isPlainObject(node.style)) {
    options.style = resolveValue(node.style, ctx);
  }

  if (isPlainObject(node.attrs)) {
    options.attrs = resolveValue(node.attrs, ctx);
  }

  if (node.slot !== undefined && node.slot !== null) {
    options.slot = String(node.slot);
  }

  Object.assign(options, callbackProps ?? {});
  return options;
}

/** 协议属性名 → 组件侧通道（`prop:` / `command:` / `attr:` / `style:` / `class:`）。 */
function resolvePropMapping(entry, key) {
  const declared = entry?.props ? entry.props[key] : undefined;

  if (typeof declared === 'string') {
    return { ...splitChannel(declared), key, live: false, read: null, transform: null };
  }

  if (isPlainObject(declared)) {
    return {
      ...splitChannel(declared.to ?? key),
      key,
      live: declared.live === true,
      read: declared.read ?? null,
      transform: typeof declared.transform === 'function' ? declared.transform : null
    };
  }

  return { ...splitChannel(key), key, live: false, read: null, transform: null };
}

/** 通道前缀解析；认不出的前缀按普通 prop 处理（不吞掉名字里的冒号）。 */
function splitChannel(target) {
  const text = String(target);
  const colon = text.indexOf(':');

  if (colon === -1) {
    return { channel: 'prop', name: text };
  }

  const channel = text.slice(0, colon);

  if (['prop', 'command', 'attr', 'style', 'class'].includes(channel)) {
    return { channel, name: text.slice(colon + 1) };
  }

  return { channel: 'prop', name: text };
}

function applyTransform(value, transform) {
  if (typeof transform !== 'function') {
    return value;
  }

  return isSignal(value) ? computed(() => transform(value.value)) : transform(value);
}

/** 把解析结果里的句柄取成当次值（props 落的是快照，不是句柄）。 */
function deepSnapshot(value) {
  const plain = snapshotValue(value);

  if (Array.isArray(plain)) {
    return plain.map(deepSnapshot);
  }

  if (isPlainObject(plain)) {
    const copy = {};
    Object.entries(plain).forEach(([key, item]) => {
      copy[key] = deepSnapshot(item);
    });
    return copy;
  }

  return plain;
}

/**
 * 记录「props 上的活值」。
 *
 * yoya-ui 各组件对句柄 props 的支持并不一致：`vInput` / `vSelect` / `vTextarea` 走
 * `applyPropValue` 登记绑定（活值），而 `vRadios` / `vCheckboxes` / `vSlider` /
 * `vTabs.active` 只取构建期那一份。协议层统一补一条数据订阅：数据写入后按**同名命令**
 * 重放（没有同名命令就退回属性），静态组件也跟着动。
 */
function collectBinding(raw, prop, mapping, ctx, bindings) {
  if (bindings === null || !isPlainObject(raw)) {
    return;
  }

  const target = mapping?.name ?? prop;
  const transform = mapping?.transform ?? null;

  if (isBindExpr(raw)) {
    bindings.push({ kind: 'path', path: resolvePath(raw[BIND_KEY], ctx), prop, target, transform });
    return;
  }

  if (isTemplateExpr(raw)) {
    bindings.push({
      kind: 'any',
      path: null,
      prop,
      target,
      template: raw[TEMPLATE_KEY],
      transform
    });
  }
}

function applyLiveBindings(host, descriptor, ctx) {
  descriptor.bindings.forEach((binding) => {
    const read = () =>
      applyTransform(
        binding.kind === 'path' ? ctx.data.read(binding.path) : readTemplate(binding.template, ctx),
        binding.transform
      );

    setComponentValue(host, binding.target, read());

    const exposed = descriptor.exposedByTarget?.[binding.target];
    if (exposed !== undefined) {
      exposed.value = read();
    }

    const dispose = ctx.data.subscribe((change) => {
      if (binding.kind === 'any' || affectsPath(binding.path, change.path)) {
        setComponentValue(host, binding.target, read());

        const exposed = descriptor.exposedByTarget?.[binding.target];
        if (exposed !== undefined) {
          exposed.value = read();
        }
      }
    });

    ctx.track(dispose);
  });
}

function affectsPath(bindingPath, changedPath) {
  return isPathPrefix(bindingPath, changedPath) || isPathPrefix(changedPath, bindingPath);
}

/** 按通道落位：`attr:` / `style:` / `class:` 走元素面；其余按命令名优先、属性兜底。 */
function setComponentValue(host, target, value) {
  const { channel, name } = splitChannel(target);

  if (channel === 'attr') {
    host.attr?.(name, value === undefined || value === null ? null : String(value));
    return;
  }

  if (channel === 'style') {
    host.style?.(name, value === undefined || value === '' ? null : value);
    return;
  }

  if (channel === 'class') {
    host.toggleClass?.(name, Boolean(value));
    return;
  }

  if (typeof value !== 'function' && typeof host[name] === 'function') {
    host[name](value);
    return;
  }

  if (typeof host.attr === 'function') {
    host.attr(name, value === undefined || value === null ? null : String(value));
  }
}

function createHost(entry, descriptor, ctx, path) {
  try {
    if (descriptor.wrapAsComponent) {
      // 普通容器没有"按标记路由"的能力，包一层透明 vNode 交给 yoya 的内容分派。
      // 注意：元素工厂的 setup 在构建期就执行，那时包装层还没到手，所以投递走
      // `descriptor.deliveries` 延后（见 renderNode 里的 flush）。
      return vNode(() => {
        const host = entry.factory(descriptor.options, (element) =>
          placeContent(element, descriptor, ctx, entry)
        );

        popExposure(descriptor, ctx);
        return host;
      });
    }

    const host = entry.factory(descriptor.options, (view) => {
      placeContent(view, descriptor, ctx, entry);
    });

    popExposure(descriptor, ctx);
    return host;
  } catch (error) {
    throw toGenUIError(error, {
      code: ERROR_CODES.render,
      componentId: descriptor.id,
      path
    });
  }
}

function placeContent(view, descriptor, ctx, entry) {
  exposeComponent(view, descriptor, ctx, entry);

  // 文本短写：有 textProp 的组件走命令（`vButton` 的 label），其余落文本子节点
  if (descriptor.text !== undefined && !entry.childrenProp) {
    const text = resolveValue(descriptor.text, ctx);

    if (entry.textProp && typeof view[entry.textProp] === 'function') {
      view[entry.textProp](text);
    } else {
      view.child(vText(text));
    }
  }

  if (!entry.childrenProp) {
    placeChildren(view, descriptor, ctx, entry);
  }

  if (descriptor.repeat) {
    mountRepeat(view, descriptor, ctx);
  }

  if (descriptor.eventPlans) {
    descriptor.eventPlans.forEach((plan) => {
      if (plan.channel === 'dom') {
        view.on(plan.event, (event) => plan.run(selectPayload(event, plan.payload), event));
        return;
      }

      if (typeof view[plan.command] === 'function') {
        view[plan.command](plan.run);
      }
    });
  }
}

function placeChildren(view, descriptor, ctx, entry) {
  const host = resolveChildHost(view, descriptor, entry);

  descriptor.children.forEach((child, index) => {
    const childPath = `${descriptor.path}.children[${index}]`;

    if (entry.itemBridge && matchesItem(entry.itemBridge, child)) {
      placeItem(view, child, ctx, entry.itemBridge, childPath);
      return;
    }

    const rendered = renderNode(child, ctx, childPath);

    if (rendered === null) {
      return;
    }

    const childId =
      isPlainObject(child) && child.id !== undefined && child.id !== null ? String(child.id) : '';

    if (childId !== '') {
      registerNode(ctx, childId, rendered, host, descriptor.id);
    }

    if (isPlainObject(child) && child.key !== undefined && child.key !== null) {
      rendered.attr('data-genui-key', String(child.key));
    }

    // 带投递标记的子节点**不能**走 addChild：那条路不经过组件的内容分派（`_placeContent`），
    // 槽位不会生效；它必须走 child()，由 yoya 按标记投进同名占位。
    const hasDelivery = isPlainObject(child) && typeof child[TO_SLOT_KEY] === 'string';

    if (hasDelivery) {
      descriptor.deliveries.push(rendered);
      return;
    }

    // 有 id 的子节点用 addChild 落位：增量更新时用 replaceChild(id, 新节点) 原地换掉
    if (childId !== '' && typeof host.addChild === 'function') {
      host.addChild(childId, rendered);
      return;
    }

    host.child(rendered);
  });
}

/**
 * 匿名子节点该落到哪个节点上：
 * 普通元素语义 = 自己；`childCommand` = 命令给的容器（组件自己的内容入口，如 `vField.control`）。
 *
 * 没有"默认部件"这条路：要给部件就在 JSON 里写部件组件（`vCardBody` 这类），
 * 落点由组件结构声明、由内容上的 `to_slot` 决定。
 */
function resolveChildHost(view, descriptor, entry) {
  if (entry.childrenProp || descriptor.children.length === 0) {
    return view;
  }

  if (entry.childCommand && typeof view[entry.childCommand] === 'function') {
    let host = view;
    view[entry.childCommand]((target) => {
      host = target;
    });
    return host;
  }

  return view;
}

/** 登记 `id → 节点 + 父节点`（增量更新靠它定点替换；列表行内不登记，避免重复 id）。 */
function registerNode(ctx, id, node, parent, parentId) {
  if (typeof ctx.onNode === 'function' && ctx.scope === null) {
    ctx.onNode(id, node, parent, parentId);
  }
}

function matchesItem(itemBridge, node) {
  return (
    isPlainObject(node) &&
    typeof node.type === 'string' &&
    node.type.toLowerCase() === String(itemBridge.itemType).toLowerCase()
  );
}

/** 容器 + 项的组合（`vTabs` 的 `vTab`）：项自己的 props 走容器命令，内容进项的 content 位。 */
function placeItem(view, node, ctx, itemBridge, path) {
  const options = buildOptions(node, ctx);
  const content = renderContentNodes(describeNode(node, ctx, path), ctx);

  if (content !== null && itemBridge.contentProp) {
    options[itemBridge.contentProp] = content;
  }

  if (typeof view[itemBridge.command] !== 'function') {
    throw new GenUIError(`容器缺少项命令 ${itemBridge.command}()`, {
      code: ERROR_CODES.component,
      path
    });
  }

  view[itemBridge.command](options);
}

/** 子节点渲染成一个内容节点（多个时包一层多根 fragment）。 */
function renderContentNodes(descriptor, ctx) {
  const rendered = descriptor.children
    .map((child, index) => {
      const content = renderNode(child, ctx, `${descriptor.path}.children[${index}]`);
      return content;
    })
    .filter((node) => node !== null);

  if (rendered.length === 0) {
    return null;
  }

  return rendered.length === 1 ? rendered[0] : vNode(() => rendered);
}

function mountRepeat(view, descriptor, ctx) {
  const collectionPath = descriptor.repeat.source;
  const records = new Map();
  const rows = computed(() =>
    normalizeRows(ctx.data.cell(collectionPath).value, descriptor.repeat, collectionPath, records)
  );
  const template = descriptor.template;

  view.keyed(
    rows,
    (row) => row.key,
    (row) => {
      const rowCtx = withScope(ctx, {
        alias: descriptor.repeat.alias,
        index: row.index,
        item: row.data,
        key: row.key,
        path: row.path
      });

      return renderNode(template, rowCtx, `${descriptor.path}.template`) ?? emptyRow();
    }
  );
}

function emptyRow() {
  return span({ attrs: { 'data-genui-empty': 'true', hidden: true } });
}

/**
 * 列表行归一：数组按下标、对象按 key（A2UI 的模板数据就是邻接表形式的 map）。
 *
 * 行记录按 `(key, 数据引用, 行路径)` 复用同一份对象——`keyed()` 用行引用判「要不要重建」，
 * 每次都新建记录会让所有行无条件重建。行路径变了（数组重排）就换新记录：行内绑定按路径
 * 建立，路径一变换新记录才对得上数据。
 */
function normalizeRows(value, repeat, collectionPath, cache) {
  const next = new Map();
  const rows = [];

  const push = (key, data, index, path) => {
    const existing = cache.get(key);
    const record =
      existing && existing.data === data && existing.path === path
        ? existing
        : { data, index, key, path };

    record.index = index;
    record.path = path;
    next.set(key, record);
    rows.push(record);
  };

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      const key = repeat.key ? String(readPath(entry, repeat.key) ?? index) : String(index);
      push(key, entry, index, `${collectionPath}/${index}`);
    });
  } else if (isPlainObject(value)) {
    Object.entries(value).forEach(([key, entry], index) => {
      push(String(key), entry, index, `${collectionPath}/${key}`);
    });
  }

  cache.clear();
  next.forEach((record, key) => cache.set(key, record));
  return rows;
}

/**
 * 事件接线：按描述符的 `events` 声明选通道（DOM 事件 / 回调 prop / 订阅命令），
 * 并把载荷归一成协议层稳定的形状（`$arg` 只认归一后的载荷）。
 *
 * 回调型必须在**构建期**当 props 传进去，所以这里返回 `callbackProps` 交给 `buildOptions`。
 */
function planEvents(descriptor, ctx, entry) {
  const callbackProps = {};

  if (!descriptor.on) {
    return callbackProps;
  }

  descriptor.eventPlans = [];

  Object.entries(descriptor.on).forEach(([eventName, expr]) => {
    if (!isActionExpr(expr)) {
      warnOnce(ctx, `on.${eventName}`, '事件处理器必须是 $action 表达式，已忽略');
      return;
    }

    const run = (arg, event = null) => {
      const wiring = { arg, event };

      return ctx.actions.dispatch({
        event,
        name: expr[ACTION_KEY],
        params:
          expr[ACTION_KEY] === 'assign'
            ? resolveAssignmentParams(expr.params, ctx, wiring, descriptor)
            : resolveActionParams(expr.params, ctx, wiring),
        source: { componentId: descriptor.id, surfaceId: ctx.surfaceId, type: descriptor.type },
        target: null
      });
    };
    const wiring = resolveEventWiring(entry, eventName);

    if (wiring.channel === 'callback') {
      const prop = wiring.prop ?? wiring.command ?? normalizeEventName(eventName);
      callbackProps[prop] = (...args) => run(normalizePayload(args, wiring.payload), null);
      return;
    }

    if (wiring.channel === 'command') {
      descriptor.eventPlans.push({
        channel: 'command',
        command: wiring.command ?? normalizeEventName(eventName),
        run: (...args) => run(normalizePayload(args, wiring.payload), null)
      });
      return;
    }

    descriptor.eventPlans.push({
      channel: 'dom',
      event: wiring.event ?? normalizeEventName(eventName),
      payload: wiring.payload ?? null,
      run
    });
  });

  return callbackProps;
}

function resolveEventWiring(entry, eventName) {
  const key = normalizeEventName(eventName);
  const declared = entry?.events ?? null;

  if (declared) {
    const found = declared[key] ?? declared[eventName] ?? findEventWiring(declared, key);

    if (found !== undefined) {
      return normalizeWiring(found);
    }
  }

  return { channel: 'dom', event: key };
}

function findEventWiring(declared, key) {
  const match = Object.keys(declared).find((name) => normalizeEventName(name) === key);
  return match === undefined ? undefined : declared[match];
}

function normalizeWiring(wiring) {
  if (typeof wiring === 'string') {
    return { channel: 'dom', event: normalizeEventName(wiring) };
  }

  return {
    ...wiring,
    channel: wiring.channel ?? 'dom',
    event: wiring.event === undefined ? undefined : normalizeEventName(wiring.event)
  };
}

function isScopeFrom(from, ctx) {
  return (
    from === '#row' ||
    (typeof from === 'string' && from.startsWith('#parent:')) ||
    findScopeByAlias(ctx, from) !== null
  );
}

/** @genui.expose：把组件读命令挂进 /@<id>/** 只读命名空间，并供 #:/ 最近引用。 */
function exposeComponent(view, descriptor, ctx, entry) {
  if (descriptor.exposed || !entry.expose) {
    return;
  }

  descriptor.exposed = true;
  descriptor.exposureCells = {};
  descriptor.exposedByTarget = {};

  Object.entries(entry.expose).forEach(([name, command]) => {
    const reader = typeof view[command] === 'function' ? view[command] : null;

    if (!reader) {
      warnOnce(
        ctx,
        `expose:${descriptor.type}:${name}`,
        `组件 ${descriptor.type} 缺少暴露命令 ${command}()`
      );
      return;
    }

    const value = reader();
    const cell = isSignal(value) ? value : ref(value);

    descriptor.exposureCells[name] = cell;
    descriptor.exposedByTarget[command] = cell;
    if (descriptor.id !== '') {
      ctx.exposures.set(`/@${descriptor.id}/${name}`, cell);
    }
  });

  if (Object.keys(descriptor.exposureCells).length > 0) {
    ctx.exposureStack.push(descriptor.exposureCells);
  }
}

function popExposure(descriptor, ctx) {
  if (!descriptor.exposureCells) {
    return;
  }

  const index = ctx.exposureStack.lastIndexOf(descriptor.exposureCells);
  if (index >= 0) {
    ctx.exposureStack.splice(index, 1);
  }
}

function resolveAssignmentParams(raw, ctx, wiring, descriptor) {
  const assignments = raw?.assignments;

  if (!Array.isArray(assignments)) {
    throw new GenUIError('赋值映射需要 assignments 数组', {
      code: ERROR_CODES.action
    });
  }

  return {
    assignments: assignments.map(({ target, value }) => ({
      path: resolveWritableReference(target, ctx),
      value:
        value === undefined ? undefined : resolveAssignmentValue(value, ctx, wiring, descriptor)
    }))
  };
}

function resolveAssignmentValue(value, ctx, wiring, descriptor) {
  if (isBindExpr(value) && value[FROM_KEY] === '#nearest') {
    const cell = descriptor.exposureCells?.[value[BIND_KEY]];

    if (cell !== undefined) {
      return snapshotValue(cell);
    }
  }

  return resolveActionParams(value, ctx, wiring);
}

/** 事件名归一：`onClick` / `onclick` / `click` 都认。 */
function normalizeEventName(name) {
  const text = String(name).trim();
  return text.length > 2 && text.slice(0, 2).toLowerCase() === 'on'
    ? text.slice(2).toLowerCase()
    : text.toLowerCase();
}

function normalizePayload(args, payload) {
  return selectPayload(args.length === 1 ? args[0] : args, payload);
}

function selectPayload(value, payload) {
  if (payload === undefined || payload === null || payload === '') {
    return value;
  }

  return typeof payload === 'function' ? payload(value) : readAccessor(value, payload);
}

/**
 * 动作参数求值：`$bind` 取当次快照，`$event` 取 DOM 事件字段，`$arg` 取回调载荷字段；
 * `path` 键按当前作用域补全（列表行里的相对路径）。
 */
export function resolveActionParams(raw, ctx, { arg = undefined, event = null } = {}) {
  if (raw === undefined || raw === null) {
    return {};
  }

  return walkParams(raw, ctx, { arg, event });
}

function walkParams(raw, ctx, wiring, key = '') {
  // 显式类型收敛：`{ "$number": { "$event": "target.value" } }`（range / 表单控件取到的都是字符串）
  if (isPlainObject(raw) && Object.keys(raw).length === 1) {
    if ('$number' in raw) {
      return Number(walkParams(raw.$number, ctx, wiring));
    }

    if ('$boolean' in raw) {
      return Boolean(walkParams(raw.$boolean, ctx, wiring));
    }
  }

  if (isArgExpr(raw)) {
    return snapshotValue(readAccessor(wiring.arg, raw[ARG_KEY]));
  }

  if (isEventExpr(raw)) {
    return snapshotValue(readAccessor(wiring.event, raw[EVENT_KEY]));
  }

  if (isBindExpr(raw)) {
    const exposed = ctx.exposures.get(raw[BIND_KEY]);

    if (exposed !== undefined) {
      return exposed;
    }

    const from = raw[FROM_KEY];

    if (from === '#nearest') {
      const nearest = ctx.exposureStack.at(-1)?.[raw[BIND_KEY]];

      if (nearest === undefined) {
        throw new GenUIError(
          `最近组件没有暴露 "${raw[BIND_KEY]}"（@genui.expose / registry.expose 声明）`,
          { code: ERROR_CODES.render, path: raw[BIND_KEY] }
        );
      }

      return nearest;
    }

    if (from === '#row' && raw[BIND_KEY].startsWith('$')) {
      return readRowPseudo(raw, ctx);
    }

    if (from !== undefined && !isScopeFrom(from, ctx) && from !== '#nearest') {
      return ctx.custodians?.read(from, raw[BIND_KEY]);
    }

    return ctx.data.read(resolveReferencePath(raw, ctx));
  }

  if (isTemplateExpr(raw)) {
    return readTemplate(raw[TEMPLATE_KEY], ctx);
  }

  if (Array.isArray(raw)) {
    return raw.map((item) => walkParams(item, ctx, wiring));
  }

  if (isPlainObject(raw)) {
    const resolved = {};
    Object.entries(raw).forEach(([childKey, value]) => {
      resolved[childKey] = walkParams(value, ctx, wiring, childKey);
    });
    return resolved;
  }

  // 数据路径参数按当前作用域补全：列表行里的 `{ $action: 'set', params: { path: 'done' } }`
  return key === 'path' && typeof raw === 'string' ? resolvePath(raw, ctx) : raw;
}

/**
 * 事件 / 回调载荷的字段读取：`target.value` / `target/checked` 两种写法都认
 * （DOM 事件与组件回调的载荷都不是数据模型，不走协议的 `/` 路径口径）。
 */
function readAccessor(source, path) {
  let current = source;

  for (const segment of String(path ?? '').split(/[./]/)) {
    if (segment === '') {
      continue;
    }

    if (current === null || current === undefined) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

function decorateHost(host, descriptor, ctx) {
  if (descriptor.access && typeof host.access === 'function') {
    host.access(descriptor.access);
  }

  if (descriptor.when !== undefined) {
    const condition =
      typeof descriptor.when === 'boolean' ? descriptor.when : resolveValue(descriptor.when, ctx);
    host.mountable(condition);
  }

  if (descriptor.id !== '' && typeof host.attr === 'function') {
    host.attr('data-genui-id', descriptor.id);
    // 来源可查：DOM 上直接写清这个节点来自哪个组件库（不影响写 schema 时的短名体验）
  }

  if (descriptor.id !== '' && descriptor.entry?.source && typeof host.attr === 'function') {
    host.attr('data-genui-lib', String(descriptor.entry.source));
  }
}

function renderUnknown(descriptor, ctx) {
  const mode = ctx.onUnknown;

  if (mode === 'throw') {
    throw new GenUIError(`未注册的组件类型 "${descriptor.type}"`, {
      code: ERROR_CODES.component,
      componentId: descriptor.id,
      path: descriptor.path
    });
  }

  warnOnce(ctx, `unknown:${descriptor.type}`, `未注册的组件类型 "${descriptor.type}"`);

  if (mode === 'skip') {
    return null;
  }

  return span(
    {
      attrs: { 'data-genui-unknown': descriptor.type },
      style: UNKNOWN_STYLE
    },
    (box) => box.child(vText(`未知组件：${descriptor.type}`))
  );
}

function warnOnce(ctx, key, message) {
  if (ctx.warned.has(key)) {
    return;
  }

  ctx.warned.add(key);
  ctx.warn(`[yoya-genui] ${message}`);
}

function defaultWarn(message) {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(message);
  }
}
