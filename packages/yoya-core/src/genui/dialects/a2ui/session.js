import { PROTOCOL_ID, PROTOCOL_VERSION } from '../../protocol/constants.js';
import { ERROR_CODES, GenUIError } from '../../protocol/errors.js';
import { isPlainObject, normalizePath, readPath } from '../../protocol/values.js';
import { buildA2UIRoot, buildA2UISlotLayout, buildComponent } from './components.js';
import { applyDataModelUpdate, foldA2UIMessages, parseA2UIMessages } from './messages.js';
import { a2uiTheme } from './theme.js';

/**
 * A2UI 会话：把**流式**消息折叠成 schema，并把后续增量翻译成与方言无关的操作列表。
 *
 * 操作（交给 surface 执行）：
 * - `{ op: 'data', path, value }`   写数据模型（视图原地更新，不重建）
 * - `{ op: 'node', componentId, node }`  只替换某个组件对应的节点
 * - `{ op: 'root', node }`          换根（结构大改时）
 * - `{ op: 'theme', theme }`        主题变化
 * - `{ op: 'delete' }`              删除这个面
 */
export function createA2UISession(input, options = {}) {
  const warnings = [];
  const state = foldA2UIMessages(parseA2UIMessages(input));
  let cached = null;
  let version = 0;
  let cachedVersion = -1;

  return {
    get schema() {
      if (cachedVersion !== version) {
        cached = toA2UISchema(state, options, warnings);
        cachedVersion = version;
      }

      return cached;
    },

    get state() {
      return state;
    },

    ingest(next) {
      const ops = ingestMessages(state, next, { options, warnings });

      if (ops.length > 0) {
        version += 1;
      }

      return ops;
    }
  };
}

/** surface 状态 → yoya-genui schema（`convert` 与会话共用）。 */
export function toA2UISchema(state, options = {}, warnings = []) {
  const ready = !state.deleted && typeof state.root === 'string' && state.root !== '';
  // 布局：`flat`（默认：结构与内容分层，每个组件一块内容，见 buildA2UISlotLayout）
  // / `tree`（展开成嵌套树，A2UI 的 id 只留在节点上）
  const layout = options.layout === 'tree' ? 'tree' : 'flat';
  const built = ready
    ? layout === 'flat'
      ? buildA2UISlotLayout(state, { warnings })
      : { components: [], root: buildA2UIRoot(state, { warnings }) }
    : { components: [], root: null };
  const root = built.root;
  const theme = a2uiTheme(state.styles);

  if (root !== null) {
    warnOrphans(state, warnings);
  }

  // 流式会话允许"先到组件、后到 beginRendering"；一次性 convert 则要求立刻可用
  if (root === null && options.requireRoot === true) {
    throw new GenUIError('A2UI 消息里没有 beginRendering，拿不到 root 组件', {
      code: ERROR_CODES.dialect
    });
  }

  return {
    components: built.components,
    data: state.data,
    meta: {
      a2uiCatalogId: state.catalogId,
      a2uiStyles: theme.extra,
      dialect: 'a2ui',
      dialectVersion: A2UI_DIALECT_VERSION,
      warnings
    },
    protocol: PROTOCOL_ID,
    root,
    surfaceId: options.surfaceId ?? state.surfaceId ?? 'main',
    theme: theme.theme,
    version: PROTOCOL_VERSION
  };
}

const A2UI_DIALECT_VERSION = '0.8';

function ingestMessages(state, next, { options = {}, warnings }) {
  const intents = [];

  parseA2UIMessages(next).forEach((message) => {
    if (isPlainObject(message.beginRendering)) {
      const begin = message.beginRendering;
      const rootChanged = state.root !== begin.root;

      state.surfaceId = begin.surfaceId ?? state.surfaceId;
      state.root = begin.root ?? state.root;
      state.catalogId = begin.catalogId ?? state.catalogId;
      state.styles = isPlainObject(begin.styles) ? begin.styles : state.styles;

      intents.push({ rootChanged, type: 'begin' });
      return;
    }

    if (isPlainObject(message.surfaceUpdate)) {
      const changed = applyComponentUpdate(state, message.surfaceUpdate);

      if (changed.length > 0) {
        intents.push({ ids: changed, type: 'components' });
      }

      return;
    }

    if (isPlainObject(message.dataModelUpdate)) {
      applyDataModelUpdate(state, message.dataModelUpdate);
      intents.push({ path: normalizePath(message.dataModelUpdate.path ?? '/'), type: 'data' });
      return;
    }

    if (isPlainObject(message.deleteSurface)) {
      state.deleted = true;
      intents.push({ type: 'delete' });
    }
  });

  return intentsToOps(state, intents, warnings, options);
}

/**
 * 意图 → 操作：状态先折完，再统一算（同一批消息里 `beginRendering` 先到、
 * `surfaceUpdate` 后到时也不会踩空）。顺序固定为 换根 → 换节点 → 主题 → 数据。
 */
function intentsToOps(state, intents, warnings, options = {}) {
  if (intents.some((intent) => intent.type === 'delete')) {
    return [{ op: 'delete' }];
  }

  const layout = options.layout === 'tree' ? 'tree' : 'flat';
  const ops = [];
  const began = intents.some((intent) => intent.type === 'begin');

  if (began) {
    warnOrphans(state, warnings);
    const built =
      layout === 'flat'
        ? buildA2UISlotLayout(state, { warnings })
        : { components: [], root: buildA2UIRoot(state, { warnings }) };

    ops.push({ components: built.components, node: built.root, op: 'root' });
  } else {
    const changed = new Set();
    intents
      .filter((intent) => intent.type === 'components')
      .forEach((intent) => intent.ids.forEach((id) => changed.add(id)));

    if (changed.size > 0) {
      ops.push(...componentOps(state, [...changed], warnings, options));
    }
  }

  if (began) {
    ops.push({ op: 'theme', theme: a2uiTheme(state.styles).theme });
  }

  intents
    .filter((intent) => intent.type === 'data')
    .forEach((intent) =>
      ops.push({
        op: 'data',
        path: intent.path,
        value: intent.path === '/' ? state.data : readPath(state.data, intent.path)
      })
    );

  return ops;
}

function applyComponentUpdate(state, update) {
  const changed = [];

  (Array.isArray(update.components) ? update.components : []).forEach((component) => {
    if (!isPlainObject(component) || typeof component.id !== 'string') {
      return;
    }

    const previous = state.components.get(component.id);

    if (previous && JSON.stringify(previous) === JSON.stringify(component)) {
      return;
    }

    state.components.set(component.id, component);
    changed.push(component.id);
  });

  return changed;
}

/**
 * 变化的组件 → 操作：整根变了就换根；否则只换变化的那些节点
 * （祖先也变了的话跳过后代——换祖先时后代一起重建）。
 */
function componentOps(state, changed, warnings, options = {}) {
  const changedSet = new Set(changed);

  if (changedSet.has(state.root)) {
    warnOrphans(state, warnings);
    const built =
      options.layout === 'tree'
        ? { components: [], root: buildA2UIRoot(state, { warnings }) }
        : buildA2UISlotLayout(state, { warnings });

    return [{ components: built.components, node: built.root, op: 'root' }];
  }

  const parentOf = collectParentMap(state);

  // 扁平布局（默认）：变了的是"内容块"→ 按同一对 to / to_slot 重投（不重建整根）
  if (options.layout !== 'tree') {
    const { components } = buildA2UISlotLayout(state, { warnings });
    const blocks = new Map(components.map((block) => [block.id, block]));
    const ops = [];

    changed
      .filter((id) => !hasChangedAncestor(id, changedSet, parentOf))
      .forEach((id) => {
        const block = blocks.get(id);

        if (block) {
          ops.push({ node: block, op: 'attach' });
          return;
        }

        ops.push({
          fallbackIds: ancestorChain(id, parentOf),
          componentId: id,
          node: buildComponent(id, state, { stack: [], warnings }),
          op: 'node'
        });
      });

    return ops;
  }

  return changed
    .filter((id) => !hasChangedAncestor(id, changedSet, parentOf))
    .map((id) => ({
      fallbackIds: ancestorChain(id, parentOf),
      componentId: id,
      node: buildComponent(id, state, { stack: [], warnings }),
      op: 'node'
    }));
}

/** 自身 → 祖先的 id 链：被吸收的组件（如 Button 里的 Text）靠它找到最近的实体节点。 */
function ancestorChain(id, parentOf) {
  const chain = [id];
  let current = parentOf.get(id) ?? null;

  while (current !== null && current !== undefined) {
    chain.push(current);
    current = parentOf.get(current) ?? null;
  }

  return chain;
}

function hasChangedAncestor(id, changedSet, parentOf) {
  let current = parentOf.get(id) ?? null;

  while (current !== null && current !== undefined) {
    if (changedSet.has(current)) {
      return true;
    }

    current = parentOf.get(current) ?? null;
  }

  return false;
}

/** 组件树的父子关系（增量替换要靠它判断"祖先是否也变了"）。 */
function collectParentMap(state) {
  const parentOf = new Map();

  const visit = (id, parentId) => {
    if (typeof id !== 'string' || id === '' || parentOf.has(id)) {
      return;
    }

    parentOf.set(id, parentId);

    const entry = state.components.get(id);

    if (!entry || !isPlainObject(entry.component)) {
      return;
    }

    const [type, definition] = firstComponentEntry(entry.component);
    childIdsOf(type, definition).forEach((childId) => visit(childId, id));
  };

  visit(state.root, null);
  return parentOf;
}

function firstComponentEntry(component) {
  const key = Object.keys(component)[0];
  return [key, isPlainObject(component[key]) ? component[key] : {}];
}

/**
 * 没被任何父组件引用的组件（孤儿）。
 *
 * A2UI 只渲染从 `root` 可达的那棵树——位置是**父组件给的**，所以孤儿进不了译文。
 * 以前是静默忽略，现在说一声（同一条只记一次），免得生成方以为自己加的东西被渲染了。
 */
function warnOrphans(state, warnings) {
  const reachable = collectParentMap(state);

  state.components.forEach((entry, id) => {
    if (reachable.has(id)) {
      return;
    }

    const message = `A2UI 组件 "${id}" 没有被任何父组件引用（孤儿），本次没有渲染`;

    if (!warnings.includes(message)) {
      warnings.push(message);
    }
  });
}

function childIdsOf(type, definition) {
  switch (type) {
    case 'Button':
    case 'Card':
      return definition.child === undefined ? [] : [definition.child];

    case 'Column':
    case 'List':
    case 'Row': {
      const children = definition.children;

      if (isPlainObject(children?.template)) {
        return [children.template.componentId];
      }

      return Array.isArray(children?.explicitList) ? children.explicitList : [];
    }

    case 'Modal':
      return [definition.entryPointChild, definition.contentChild].filter(
        (id) => typeof id === 'string'
      );

    case 'Tabs':
      return (Array.isArray(definition.tabItems) ? definition.tabItems : [])
        .map((item) => item?.child)
        .filter((id) => typeof id === 'string');

    default:
      return [];
  }
}
