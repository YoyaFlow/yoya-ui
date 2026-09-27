import { ERROR_CODES, GenUIError } from '../../protocol/errors.js';
import { isPlainObject, normalizePath } from '../../protocol/values.js';

/** A2UI `Text.usageHint` → 语义标签。 */
const TEXT_TAGS = {
  body: 'p',
  caption: 'small',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5'
};

/** A2UI 的分布 / 对齐词表 → CSS。 */
const JUSTIFY = {
  center: 'center',
  end: 'flex-end',
  spaceAround: 'space-around',
  spaceBetween: 'space-between',
  spaceEvenly: 'space-evenly',
  start: 'flex-start'
};

const ALIGN_ITEMS = {
  center: 'center',
  end: 'flex-end',
  start: 'flex-start',
  stretch: 'stretch'
};

/** A2UI `TextField.textFieldType` → `<input type>`；`longText` 换多行控件。 */
const TEXT_FIELD_TYPES = {
  date: 'date',
  number: 'number',
  obscured: 'password',
  shortText: 'text'
};

/** v0.1 明确不映射的 A2UI 组件：占位 + 说明，不静默丢内容。 */
const UNSUPPORTED = {
  AudioPlayer: '音频播放器：等 yoya 侧媒体组件接入',
  Modal: '弹窗：entryPoint 的点击既要开弹窗又要回传服务端，需要本地动作约定'
};

const UNSUPPORTED_STYLE = {
  background: 'repeating-linear-gradient(45deg, #dbeafe 0 8px, #eff6ff 8px 16px)',
  border: '1px dashed #1d4ed8',
  borderRadius: '4px',
  color: '#1e40af',
  font: '12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace',
  padding: '6px 10px'
};

/** A2UI surface → yoya-genui 根节点。 */
export function buildA2UIRoot(state, options = {}) {
  const warnings = options.warnings ?? [];

  if (state.deleted) {
    throw new GenUIError('surface 已被 deleteSurface 删除，没有可渲染的根组件', {
      code: ERROR_CODES.dialect
    });
  }

  if (typeof state.root !== 'string' || state.root === '') {
    throw new GenUIError('A2UI 消息里没有 beginRendering，拿不到 root 组件', {
      code: ERROR_CODES.dialect
    });
  }

  try {
    return buildComponent(state.root, state, { stack: [], warnings });
  } catch (error) {
    if (error instanceof GenUIError) {
      throw error;
    }

    throw new GenUIError(`A2UI 组件树转换失败：${error.message}`, {
      cause: error,
      code: ERROR_CODES.dialect
    });
  }
}

/** 按组件 id 建 yoya-genui 节点（深度优先，环形引用当场报错）。 */
export function buildComponent(id, state, ctx) {
  if (typeof id !== 'string' || id === '') {
    throw new GenUIError('A2UI 组件引用必须是非空 id 字符串', { code: ERROR_CODES.dialect });
  }

  if (ctx.stack.includes(id)) {
    throw new GenUIError(`A2UI 组件引用成环：${[...ctx.stack, id].join(' → ')}`, {
      code: ERROR_CODES.dialect,
      componentId: id
    });
  }

  const entry = state.components.get(id);

  if (!entry) {
    throw new GenUIError(`surfaceUpdate 里没有组件 "${id}"`, {
      code: ERROR_CODES.dialect,
      componentId: id
    });
  }

  const [typeName, definition] = componentTypeOf(entry, id);
  const childCtx = { ...ctx, stack: [...ctx.stack, id] };
  const node = buildByType(typeName, definition, entry, state, childCtx);

  // A2UI 的组件 id 一路带到节点上：调试看 `data-genui-id`，动作回传看 sourceComponentId
  return applyWeight({ ...node, id: node.id ?? id }, definition);
}

/**
 * **扁平布局**：把 A2UI 的"父给位置"翻译成我们协议的"内容自带去向"。
 *
 * 做法：先按树建一遍（复用全部映射与错误处理），再把带 `children.explicitList` 的容器
 * （Column / Row / List）的子节点**换成槽位** `{ "vn_slot": "<子组件 id>" }`，每个子节点作为
 * **一块内容**进 `components`，写 `to: "<父组件 id>"` + `to_slot: "<自己 id>"`，递归下去。
 *
 * 三类引用**不槽位化**（留在骨架里）：
 *
 * - `Button.child` → Text 标签被组件吸收成 `label`（不是节点，槽位接不住）；
 * - `Card.child` → 要保留官方部件层（`VCardBody`），部件在骨架里、槽位在它内部；
 * - `List.children.template` → N 行共用一个模板，只能内联（`repeat` + `template`）。
 *
 * 返回 `{ root, components, parentRefOf }`：`parentRefOf` 告诉会话"这个组件是哪一块内容"，
 * 增量更新时按同一对 `to` / `to_slot` 重投。
 */
export function buildA2UISlotLayout(state, options = {}) {
  const warnings = options.warnings ?? [];
  const root = buildA2UIRoot(state, { warnings });
  const components = [];
  const parentRefOf = new Map();

  hoistChildren(root, state, components, parentRefOf);

  return { components, parentRefOf, root };
}

function hoistChildren(node, state, out, parentRefOf) {
  const refs = slotRefsOf(state, node.id);

  if (!Array.isArray(node.children)) {
    return;
  }

  const built = new Map(
    node.children
      .filter((child) => isPlainObject(child) && child.id)
      .map((child) => [child.id, child])
  );
  const slots = [];
  const hoisted = new Set();

  refs.forEach((id) => {
    const child = built.get(id);

    if (!child) {
      return; // 已被组件吸收（拿不到节点）：留在原地，不槽位化
    }

    child.to = node.id;
    child.to_slot = id;
    slots.push({ vn_slot: id });
    out.push(child);
    hoisted.add(id);
    parentRefOf.set(id, { to: node.id, to_slot: id });
    hoistChildren(child, state, out, parentRefOf);
  });

  // 槽位化过的子节点从 children 里摘掉，换成槽位；没槽位化的（吸收类 / 部件层）保持原样
  const kept = node.children.filter((child) => !hoisted.has(child?.id));

  node.children = [...slots, ...kept];

  // 留在骨架里的那部分也要继续往下找（如 `vCard > VCardBody > vstack` 里的容器）
  kept.forEach((child) => hoistChildren(child, state, out, parentRefOf));
}

/** 这个 A2UI 组件的哪些子引用可以变成槽位（其余留在骨架里，见 `buildA2UISlotLayout`）。 */
function slotRefsOf(state, id) {
  const entry = state.components.get(id);

  if (!entry || !isPlainObject(entry.component)) {
    return [];
  }

  const [type, definition] = componentTypeOf(entry, id);

  if (type === 'Column' || type === 'Row' || type === 'List') {
    const children = definition.children;
    return Array.isArray(children?.explicitList) ? [...children.explicitList] : [];
  }

  return [];
}

function componentTypeOf(entry, id) {
  const component = entry.component;

  if (!isPlainObject(component)) {
    throw new GenUIError(`组件 "${id}" 缺少 component 包装对象`, {
      code: ERROR_CODES.dialect,
      componentId: id
    });
  }

  const keys = Object.keys(component);

  if (keys.length !== 1) {
    throw new GenUIError(
      `组件 "${id}" 的 component 必须只含一个组件类型键，得到 ${keys.length} 个`,
      { code: ERROR_CODES.dialect, componentId: id }
    );
  }

  return [keys[0], isPlainObject(component[keys[0]]) ? component[keys[0]] : {}];
}

function buildByType(type, definition, entry, state, ctx) {
  switch (type) {
    case 'Button':
      return buttonNode(definition, state, ctx);

    case 'Card':
      return cardNode(definition, state, ctx);

    case 'CheckBox':
      return checkBoxNode(definition, entry, state);

    case 'Column':
      return containerNode('vstack', definition, state, ctx);

    case 'DateTimeInput':
      return dateTimeNode(definition, entry);

    case 'Divider':
      return { type: 'divider' };

    case 'Icon':
      return iconNode(definition);

    case 'Image':
      return imageNode(definition);

    case 'List':
      return containerNode(
        definition.direction === 'horizontal' ? 'hstack' : 'vstack',
        definition,
        state,
        ctx
      );

    case 'MultipleChoice':
      return multipleChoiceNode(definition, entry);

    case 'Row':
      return containerNode('hstack', definition, state, ctx);

    case 'Slider':
      return sliderNode(definition, entry);

    case 'Tabs':
      return tabsNode(definition, entry, state, ctx);

    case 'Text':
      return textNode(definition);

    case 'TextField':
      return textFieldNode(definition, entry);

    case 'Video':
      return mediaNode('video', definition);

    default:
      return unsupportedNode(type, entry, ctx);
  }
}

function textNode(definition) {
  return {
    text: valueExpr(definition.text),
    type: TEXT_TAGS[definition.usageHint] ?? 'span'
  };
}

function imageNode(definition) {
  const src = valueExpr(definition.url);
  const alt = valueExpr(definition.altText);

  if (definition.usageHint === 'avatar') {
    return { props: { alt, src }, type: 'vAvatar' };
  }

  if (definition.usageHint === 'icon') {
    return { attrs: { 'data-icon': src }, class: 'yoya-icon', text: src, type: 'span' };
  }

  // A2UI 的 Image 没有 lazy 语义 → 忠实映射成原生 `<img>`（不引懒加载的占位 / 重试态）。
  // 要懒加载就显式写 `vLazyImage`，或由设计系统插件 patch 这条映射。
  return {
    attrs: { alt, src, 'data-a2ui-fit': definition.fit ?? null },
    style: { display: 'block', height: 'auto', maxWidth: '100%' },
    type: 'img'
  };
}

function iconNode(definition) {
  const name = valueExpr(definition.name);
  return { attrs: { 'data-icon': name }, class: 'yoya-icon', text: name, type: 'span' };
}

function mediaNode(tag, definition) {
  return {
    attrs: { controls: '', src: valueExpr(definition.url) },
    style: { maxWidth: '100%' },
    type: tag
  };
}

/** Row / Column / List：布局词表落 CSS，`children` 的两种形态分别落 children 与 repeat。 */
function containerNode(type, definition, state, ctx) {
  const node = { children: [], type };
  const style = {};

  if (JUSTIFY[definition.distribution]) {
    style.justifyContent = JUSTIFY[definition.distribution];
  }

  if (ALIGN_ITEMS[definition.alignment]) {
    style.alignItems = ALIGN_ITEMS[definition.alignment];
  }

  if (Object.keys(style).length > 0) {
    node.style = style;
  }

  const children = definition.children;

  if (isPlainObject(children?.template)) {
    node.repeat = { $each: normalizePath(children.template.dataBinding) };
    node.template = buildComponent(children.template.componentId, state, ctx);
    return node;
  }

  node.children = (Array.isArray(children?.explicitList) ? children.explicitList : []).map(
    (childId) => buildComponent(childId, state, ctx)
  );
  return node;
}

/**
 * A2UI 的 `Card` 只有一个 child = 卡片内容 → yoya 的 `vCard` **显式包一层 `vCardBody`**。
 *
 * 这里不是"替作者补结构"，而是方言的翻译结果：翻译出来的 schema 就长这样（三段式检视的中栏能看到），
 * 译文里有什么、DOM 里就有什么。
 */
function cardNode(definition, state, ctx) {
  const node = { children: [], props: {}, type: 'vCard' };

  if (definition.child !== undefined) {
    // `vCardBody` 自己带 `to_slot: 'body'`，落点由 vCard 的结构声明
    node.children.push({
      children: [buildComponent(definition.child, state, ctx)],
      type: 'vCardBody'
    });
  }

  return node;
}

function buttonNode(definition, state, ctx) {
  const node = {
    props: {
      label: definition.child === undefined ? '' : textOfComponent(definition.child, state),
      variant: definition.primary === true ? 'primary' : 'secondary'
    },
    type: 'vButton'
  };

  const action = definition.action;

  if (isPlainObject(action) && typeof action.name === 'string' && action.name !== '') {
    node.on = { click: { $action: action.name, params: actionContext(action) } };
  } else if (action !== undefined) {
    ctx.warnings.push(`Button 的 action 缺少 name，点击不会回传（组件 id 见 surfaceUpdate）`);
  }

  return node;
}

function checkBoxNode(definition, entry) {
  const path = valuePathOf(definition.value);
  const node = {
    props: {
      checked: valueExpr(definition.value),
      label: valueExpr(definition.label),
      name: entry.id
    },
    type: 'vCheckbox'
  };

  if (path !== null) {
    node.on = {
      change: { $action: 'set', params: { path, value: { $event: 'target.checked' } } }
    };
  }

  return node;
}

function textFieldNode(definition, entry) {
  const path = valuePathOf(definition.text);
  const label = valueExpr(definition.label);

  if (definition.textFieldType === 'longText') {
    const node = {
      attrs: { 'aria-label': label },
      props: { name: entry.id, placeholder: label, value: valueExpr(definition.text) },
      type: 'vTextarea'
    };

    if (path !== null) {
      node.on = { change: { $action: 'set', params: { path, value: { $event: 'target.value' } } } };
    }

    return node;
  }

  const node = {
    attrs: { 'aria-label': label },
    props: {
      name: entry.id,
      placeholder: label,
      type: TEXT_FIELD_TYPES[definition.textFieldType] ?? 'text',
      value: valueExpr(definition.text)
    },
    type: 'vInput'
  };

  if (path !== null) {
    node.on = { change: { $action: 'set', params: { path, value: { $event: 'target.value' } } } };
  }

  return node;
}

function dateTimeNode(definition, entry) {
  const path = valuePathOf(definition.value);
  const enableTime = definition.enableTime === true;
  const enableDate = definition.enableDate !== false;
  const type = enableDate && enableTime ? 'datetime-local' : enableTime ? 'time' : 'date';
  const node = {
    props: { name: entry.id, type, value: valueExpr(definition.value) },
    type: 'vInput'
  };

  if (path !== null) {
    node.on = { change: { $action: 'set', params: { path, value: { $event: 'target.value' } } } };
  }

  return node;
}

function multipleChoiceNode(definition, entry) {
  const path = valuePathOf(definition.selections);
  const single = Number(definition.maxAllowedSelections) === 1;
  const props = {
    name: entry.id,
    options: (Array.isArray(definition.options) ? definition.options : []).map((option) => ({
      label: valueExpr(option.label),
      value: valueExpr(option.value)
    })),
    value: valueExpr(definition.selections)
  };

  if (path !== null) {
    // 描述符已把回调载荷归一（单选族取第一个参数），这里的 `$arg: ''` 读的就是归一后的值
    props.change = { $action: 'set', params: { path, value: { $arg: '' } } };
  }

  return { props, type: single ? 'vRadios' : 'vCheckboxes' };
}

function sliderNode(definition) {
  const path = valuePathOf(definition.value);
  const node = {
    attrs: { 'aria-label': valueExpr(definition.label) },
    props: {
      max: typeof definition.maxValue === 'number' ? definition.maxValue : 100,
      min: typeof definition.minValue === 'number' ? definition.minValue : 0,
      value: valueExpr(definition.value)
    },
    type: 'vSlider'
  };

  if (path !== null) {
    node.on = {
      input: {
        $action: 'set',
        params: { path, value: { $number: { $event: 'target.value' } } }
      }
    };
  }

  return node;
}

/** A2UI `Tabs` → `vTabs` + `vTab`：选中态走数据模型，切换回写由回调型 prop 承担。 */
function tabsNode(definition, entry, state, ctx) {
  const activePath = `/ui/tabs/${entry.id}/active`;
  const items = (Array.isArray(definition.tabItems) ? definition.tabItems : []).map(
    (item, index) => {
      const tab = {
        props: { label: valueExpr(item.title), value: String(index) },
        type: 'vTab'
      };

      if (item.child !== undefined) {
        tab.children = [buildComponent(item.child, state, ctx)];
      }

      return tab;
    }
  );

  return {
    children: items,
    props: {
      active: { $bind: activePath },
      change: { $action: 'set', params: { path: activePath, value: { $arg: 'active' } } }
    },
    type: 'vTabs'
  };
}

function unsupportedNode(type, entry, ctx) {
  const reason = UNSUPPORTED[type] ?? '本版还没映射';
  ctx.warnings.push(`A2UI 组件 ${type}（id=${entry.id}）${reason}`);

  return {
    attrs: { 'data-a2ui-unsupported': type },
    children: [{ text: `${type}：${reason}`, type: 'span' }],
    style: UNSUPPORTED_STYLE,
    type: 'div'
  };
}

/** A2UI 的 `weight` 只对 Row / Column 的直接子节点有意义 → flex-grow。 */
function applyWeight(node, definition) {
  if (typeof definition.weight !== 'number' || definition.weight === 0) {
    return node;
  }

  return { ...node, style: { ...(node.style ?? {}), flexGrow: definition.weight } };
}

/** A2UI 值对象 → yoya-genui 值（`{path}` → `{$bind}`，字面量原样）。 */
export function valueExpr(value) {
  if (!isPlainObject(value)) {
    return value;
  }

  // 函数调用（A2UI 0.9 的 `FunctionCall` 形状，0.8 里当扩展收）：函数名 + 参数，
  // 实现在渲染端注册（`fromJson(..., { functions })`）
  if (typeof value.call === 'string') {
    const call = { $call: value.call };

    if (value.args !== undefined) {
      call.args = isPlainObject(value.args)
        ? Object.fromEntries(Object.entries(value.args).map(([key, arg]) => [key, valueExpr(arg)]))
        : valueExpr(value.args);
    }

    return call;
  }

  if (typeof value.path === 'string') {
    return { $bind: value.path };
  }

  if (value.literalString !== undefined) {
    return value.literalString;
  }

  if (value.literalNumber !== undefined) {
    return value.literalNumber;
  }

  if (value.literalBoolean !== undefined) {
    return value.literalBoolean;
  }

  if (Array.isArray(value.literalArray)) {
    return value.literalArray.map(valueExpr);
  }

  return undefined;
}

/** 只取"数据模型路径"（写回用）：非路径绑定返回 null。 */
function valuePathOf(value) {
  return isPlainObject(value) && typeof value.path === 'string' ? value.path : null;
}

/** Text 子组件的文本（Button 的 label 来自它的 child）——保留绑定，不拍快照。 */
function textOfComponent(id, state) {
  const entry = state.components.get(id);

  if (!entry || !isPlainObject(entry.component)) {
    return '';
  }

  const definition = entry.component.Text;

  if (!isPlainObject(definition)) {
    return '';
  }

  return valueExpr(definition.text) ?? '';
}

/** A2UI `action.context`（邻接表）→ 动作 params。 */
function actionContext(action) {
  const params = {};

  (Array.isArray(action.context) ? action.context : []).forEach((entry) => {
    if (isPlainObject(entry) && typeof entry.key === 'string') {
      params[entry.key] = valueExpr(entry.value);
    }
  });

  return params;
}
