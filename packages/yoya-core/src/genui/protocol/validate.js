import {
  COMPONENTS_KEY,
  NODE_KEYS,
  PROTOCOL_ID,
  PROTOCOL_VERSION,
  REPEAT_EACH_KEY,
  SCHEMA_KEYS,
  TEXT_NODE_TYPE
} from './constants.js';
import { ERROR_CODES, GenUIError } from './errors.js';
import { validateComputed } from './computed.js';
import { isActionExpr, isPlainObject, isValueExpr, normalizeRepeat } from './values.js';

const NODE_KEY_SET = new Set(NODE_KEYS);

function protocolMajor(version) {
  return String(version ?? '').split('.')[0];
}

/**
 * 校验一份 yoya-genui schema（纯结构校验，不碰 DOM、不要求 yoya-ui 已加载）。
 *
 * 返回 `{ ok, errors, warnings }`：errors 是阻断性问题，warnings 是"能跑但不规范"
 * （多余键、未知版本、空 root）。`strict` 为真时 warnings 也算失败。
 */
export function validateSchema(schema, options = {}) {
  const { strict = false } = options;
  const errors = [];
  const warnings = [];
  const report = (bucket, path, message) => {
    bucket.push({ message, path });
  };

  if (!isPlainObject(schema)) {
    report(errors, '', 'schema 必须是 JSON 对象');
    return { ok: false, errors, warnings };
  }

  if (schema.protocol !== undefined && schema.protocol !== PROTOCOL_ID) {
    report(
      errors,
      'protocol',
      `protocol 必须是 "${PROTOCOL_ID}"，得到 ${JSON.stringify(schema.protocol)}`
    );
  }

  if (schema.version === undefined) {
    report(warnings, 'version', `缺少 version，按当前版本 ${PROTOCOL_VERSION} 解析`);
  } else if (protocolMajor(schema.version) !== protocolMajor(PROTOCOL_VERSION)) {
    report(
      errors,
      'version',
      `协议主版本不匹配：schema 是 ${schema.version}，本库实现 ${PROTOCOL_VERSION}`
    );
  }

  if (schema.data !== undefined && !isPlainObject(schema.data)) {
    report(errors, 'data', 'data 必须是对象（数据模型根）');
  }

  if (schema.theme !== undefined && !isPlainObject(schema.theme)) {
    report(errors, 'theme', 'theme 必须是对象');
  }

  if (schema.computed !== undefined) {
    if (!isPlainObject(schema.computed)) {
      report(errors, 'computed', 'computed 必须是对象（目标 → 派生声明）');
    } else {
      try {
        validateComputed(schema.computed, schema.data ?? {});
      } catch (error) {
        report(errors, 'computed', error instanceof Error ? error.message : String(error));
      }
    }
  }

  if (schema.root === undefined || schema.root === null) {
    report(warnings, 'root', 'root 为空：surface 会渲染成空容器');
  } else {
    validateNode(schema.root, 'root', { errors, report, warnings }, 'structure');
  }

  if (schema[COMPONENTS_KEY] !== undefined) {
    if (!Array.isArray(schema[COMPONENTS_KEY])) {
      report(errors, COMPONENTS_KEY, `${COMPONENTS_KEY} 必须是内容数组（一块内容 = 一个节点）`);
    } else {
      schema[COMPONENTS_KEY].forEach((component, index) =>
        validateNode(
          component,
          `${COMPONENTS_KEY}[${index}]`,
          { errors, report, warnings },
          'component'
        )
      );
    }
  }

  const unknownSchemaKeys = Object.keys(schema).filter((key) => !SCHEMA_KEYS.includes(key));
  unknownSchemaKeys.forEach((key) =>
    report(warnings, key, `schema 上的未知键 "${key}" 会被忽略（额外信息请放 meta）`)
  );

  return { ok: errors.length === 0 && (!strict || warnings.length === 0), errors, warnings };
}

/**
 * 校验一个节点。
 *
 * `region` 决定这个节点站在**哪一层**——两层互不混：
 *
 * - `structure`（默认）：结构里的节点（`root` 整棵树，以及任何节点的 children）。
 *   这里只声明位置（`vn_slot` 落点）；写 `to` / `to_slot` 报错——那是内容的事。
 * - `component`：`components` 表里的**顶层项**（一块内容）。它必须说去哪（`to_slot`，`""` = 默认位）。
 */
function validateNode(node, path, context, region = 'structure') {
  const { errors, report, warnings } = context;

  if (!isPlainObject(node)) {
    report(errors, path, '节点必须是 JSON 对象');
    return;
  }

  const type = node.type;
  const slotName = node.vn_slot;
  const deliveryName = node.to_slot;
  const hasSlotName = typeof slotName === 'string';
  const hasDelivery = typeof deliveryName === 'string';
  const isPlaceholder = hasSlotName && (type === undefined || type === null);

  // 两个槽位键只接受静态字符串（槽位名是构建期事实）
  ['vn_slot', 'to_slot'].forEach((key) => {
    if (node[key] !== undefined && typeof node[key] !== 'string') {
      report(errors, `${path}.${key}`, `${key} 只接受字符串（槽位名是构建期事实，不能是活值）`);
    }
  });

  if (hasSlotName && hasDelivery) {
    report(
      errors,
      `${path}.vn_slot`,
      'vn_slot 是「占位声明」、to_slot 是「投递」，同一个节点上不能同时出现（位置在结构里，内容在 components 里）'
    );
  } else if (hasSlotName && !isPlaceholder) {
    report(
      errors,
      `${path}.vn_slot`,
      'vn_slot 是「占位声明」，只能写在不带 type 的节点上；内容投递请用 to_slot'
    );
  } else if (hasDelivery && (type === undefined || type === null)) {
    report(errors, `${path}.to_slot`, 'to_slot 是「投递」，只能写在带 type 的内容节点上');
  }

  if (isPlaceholder) {
    // 占位节点：`{ "vn_slot": "aa" }`（`""` = 默认位）——它只声明位置，不装内容
    ['children', 'props', 'text', 'on', 'template', 'repeat', 'when'].forEach((key) => {
      if (node[key] !== undefined) {
        report(errors, `${path}.${key}`, `占位节点（vn_slot）只声明位置，不能带 ${key}`);
      }
    });
  } else if (typeof type !== 'string' || type.trim() === '') {
    report(errors, path, '节点缺少字符串 type（yoya-ui 工厂名，如 "vCard" / "div" / "hstack"）');
  } else if (type === TEXT_NODE_TYPE && node.text === undefined) {
    report(errors, `${path}.text`, '文本节点必须给 text');
  }

  Object.keys(node)
    .filter((key) => !NODE_KEY_SET.has(key))
    .forEach((key) => report(warnings, `${path}.${key}`, `节点上的未知键 "${key}" 会被忽略`));

  [
    ['props', isPlainObject],
    ['attrs', isPlainObject],
    ['style', isPlainObject],
    ['on', isPlainObject]
  ].forEach(([key, predicate]) => {
    if (node[key] !== undefined && !predicate(node[key])) {
      report(errors, `${path}.${key}`, `${key} 必须是对象`);
    }
  });

  if (node.children !== undefined && !Array.isArray(node.children)) {
    report(errors, `${path}.children`, 'children 必须是节点数组');
  }

  if (node.repeat !== undefined) {
    const repeat = normalizeRepeat(node.repeat);
    if (repeat === null) {
      report(
        errors,
        `${path}.repeat`,
        `repeat 需要 ${REPEAT_EACH_KEY}（数据路径），例如 { "${REPEAT_EACH_KEY}": "/items" }`
      );
    }

    if (node.template === undefined) {
      report(errors, `${path}.template`, '声明 repeat 时必须给 template（每一行的节点模板）');
    }
  }

  if (node.template !== undefined && node.repeat === undefined) {
    report(warnings, `${path}.template`, 'template 只在声明 repeat 时生效');
  }

  if (node.when !== undefined && typeof node.when !== 'boolean' && !isValueExpr(node.when)) {
    report(errors, `${path}.when`, 'when 只接受布尔值或 $bind / $template 表达式');
  }

  if (node.on !== undefined && isPlainObject(node.on)) {
    Object.entries(node.on).forEach(([event, expr]) => {
      if (!isActionExpr(expr)) {
        report(
          errors,
          `${path}.on.${event}`,
          `事件处理器必须是 $action 表达式，得到 ${describe(expr)}`
        );
      }
    });
  }

  if (node.access !== undefined && typeof node.access !== 'string') {
    report(errors, `${path}.access`, 'access 只接受权限码字符串');
  }

  if (node.to !== undefined && (typeof node.to !== 'string' || node.to === '')) {
    report(errors, `${path}.to`, 'to 是片段的目标宿主 id，必须是非空字符串');
  }

  ['vn_slot', 'to_slot'].forEach((key) => {
    if (node[key] !== undefined && typeof node[key] !== 'string') {
      report(errors, `${path}.${key}`, `${key} 只接受字符串（槽位名是构建期事实，不能是活值）`);
    }
  });

  if (node.vn_slot !== undefined && node.to_slot !== undefined) {
    report(
      errors,
      `${path}.vn_slot`,
      'vn_slot 是「占位声明」、to_slot 是「投递」，同一个节点上不能同时出现'
    );
  }

  if (node.to !== undefined && (typeof node.to !== 'string' || node.to === '')) {
    report(errors, `${path}.to`, 'to 是片段的目标宿主 id，必须是非空字符串');
  }

  if (node.slots !== undefined) {
    report(
      errors,
      `${path}.slots`,
      'slots 已移除：结构里用 vn_slot 声明落点，内容在 components 里用 to_slot 说去哪；' +
        '要部件形状就把部件当普通组件写出来（如 { "type": "vCardBody", "children": [...] }）'
    );
  }

  (node.children ?? []).forEach((child, index) =>
    validateNode(child, `${path}.children[${index}]`, context)
  );

  if (node.template !== undefined) {
    validateNode(node.template, `${path}.template`, context);
  }

  // 分层规则放在最后报：别的错（已移除的键、写错的名字）更具体，先让它们冒头
  if (region === 'component') {
    if (isPlaceholder) {
      report(errors, path, 'components 里放的是内容；落点（vn_slot）写在结构里');
    } else if (!hasDelivery) {
      report(
        errors,
        `${path}.to_slot`,
        'components 里的内容要写 to_slot 说去哪（"" = 默认位）；to 可选，指向宿主 id'
      );
    }
  } else if (node.to !== undefined || node.to_slot !== undefined) {
    report(
      errors,
      path,
      'to / to_slot 只能写在 components 的顶层项上：结构里（root 及其 children）只声明位置'
    );
  }
}

function describe(value) {
  if (value === null || value === undefined) {
    return String(value);
  }

  return Array.isArray(value) ? 'array' : typeof value;
}

/** 校验失败即抛 GenUIError（带第一个错误的 path）。 */
export function assertSchema(schema, options = {}) {
  const report = validateSchema(schema, options);

  if (!report.ok) {
    const [first] = report.errors;
    throw new GenUIError(first?.message ?? 'schema 校验失败', {
      code: ERROR_CODES.schema,
      detail: report,
      path: first?.path ?? ''
    });
  }

  return schema;
}

/**
 * 校验**一块内容**（`surface.attach()` 进来的片段）：和 schema 的 `components` 走同一套规则
 * （必须写明去向 `to_slot`，不能把落点混进来）。
 *
 * 内容是后到的，不能因为"没进过 fromJson"就被宽松放行——被移除的键（如 `slots`）、
 * 写错的名字在这里就该报出来，而不是静默忽略。
 */
export function validateNodeTree(node, options = {}) {
  const errors = [];
  const warnings = [];
  const context = {
    errors,
    report: (bucket, path, message) => bucket.push({ message, path }),
    warnings
  };

  validateNode(node, 'component', context, 'component');

  return {
    errors,
    ok: errors.length === 0 && (!options.strict || warnings.length === 0),
    warnings
  };
}

/** 片段校验失败即抛 GenUIError；warning 交给调用方（surface 会转成告警）。 */
export function assertNode(node, options = {}) {
  const report = validateNodeTree(node, options);

  if (!report.ok) {
    const [first] = report.errors;
    throw new GenUIError(first?.message ?? '片段校验失败', {
      code: ERROR_CODES.schema,
      detail: report,
      path: first?.path ?? 'fragment'
    });
  }

  return report;
}

/** 粗判：像不像一份 yoya-genui schema（给 `GenUI.fromJson` 做方言自动识别）。 */
export function isYoyaGenUISchema(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  if (value.protocol === PROTOCOL_ID) {
    return true;
  }

  if (!isPlainObject(value.root)) {
    return false;
  }

  // 根既可以是普通节点（带 type），也可以是占位节点（无 type + vn_slot）
  return (
    typeof value.root.type === 'string' ||
    (value.root.type === undefined && typeof value.root.vn_slot === 'string')
  );
}
