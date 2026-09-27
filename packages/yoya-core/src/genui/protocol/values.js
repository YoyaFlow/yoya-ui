import { referenceToBindExpr } from './references.js';
import {
  ACTION_KEY,
  ARG_KEY,
  BIND_KEY,
  CALL_KEY,
  EVENT_KEY,
  REPEAT_EACH_KEY,
  REPEAT_KEY_KEY,
  TEMPLATE_KEY
} from './constants.js';

/** 纯对象判定：数组 / null / 类实例都不算（协议里只有纯 JSON 结构）。 */
export function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** `{ "$bind": "/user/name" }`：读数据模型（活值）。 */
export function isBindExpr(value) {
  return isPlainObject(value) && typeof value[BIND_KEY] === 'string';
}

/** `{ "$template": "共 {count} 条" }`：模板串（`{}` 里是数据路径）。 */
export function isTemplateExpr(value) {
  return isPlainObject(value) && typeof value[TEMPLATE_KEY] === 'string';
}

/** `{ "$action": "submit", "params": { … } }`：动作。 */
export function isActionExpr(value) {
  return isPlainObject(value) && typeof value[ACTION_KEY] === 'string';
}

/** `{ "$event": "target.value" }`：取事件上的字段（只在动作 params 里有意义）。 */
export function isEventExpr(value) {
  return isPlainObject(value) && typeof value[EVENT_KEY] === 'string';
}

/** `{ "$arg": "active" }`：取回调型 prop 收到的载荷字段（`vTabs` 的 change 等）。 */
export function isArgExpr(value) {
  return isPlainObject(value) && typeof value[ARG_KEY] === 'string';
}

/**
 * `{ "$call": "multiply", "args": { … } }`：调用宿主注册的函数。
 *
 * schema 里只有**函数名与参数**，函数体在宿主（`fromJson(..., { functions })`）——
 * 提交过来的 UI 永远不带可执行代码（和 A2UI 的 `FunctionCall` 同一口径）。
 */
export function isCallExpr(value) {
  return isPlainObject(value) && typeof value[CALL_KEY] === 'string';
}

export function isValueExpr(value) {
  return isBindExpr(value) || isTemplateExpr(value) || isCallExpr(value);
}

/** 去掉空段与 `.`，统一成以 `/` 开头的绝对路径；`'/a//b/'` → `'/a/b'`。 */
export function normalizePath(path) {
  if (path === null || path === undefined) {
    return '/';
  }

  const text = String(path).trim();
  if (text === '' || text === '.' || text === '/') {
    return '/';
  }

  const segments = text.split('/').filter((segment) => segment !== '' && segment !== '.');
  return segments.length === 0 ? '/' : `/${segments.join('/')}`;
}

/** 路径 → 段落数组；根路径得到空数组。 */
export function splitPath(path) {
  const normalized = normalizePath(path);
  return normalized === '/' ? [] : normalized.slice(1).split('/');
}

/**
 * 拼接路径：`base` 是当前作用域（列表行），`path` 是相对 / 绝对路径。
 *
 * - `path` 以 `/` 开头 = 数据模型绝对路径（A2UI 的 `path` 就是这套口径）
 * - `path` 为空 / `'.'` = 作用域自身
 * - `../` 回退一层（模板里偶尔要跳出当前行）
 */
export function joinPath(base, path) {
  if (path === null || path === undefined) {
    return normalizePath(base);
  }

  const text = String(path).trim();
  if (text.startsWith('/')) {
    return normalizePath(text);
  }

  if (text === '' || text === '.') {
    return normalizePath(base);
  }

  const segments = splitPath(base);
  for (const part of text.split('/')) {
    if (part === '' || part === '.') {
      continue;
    }

    if (part === '..') {
      segments.pop();
      continue;
    }

    segments.push(part);
  }

  return segments.length === 0 ? '/' : `/${segments.join('/')}`;
}

/** 读路径：段缺失返回 undefined，不抛错（生成数据经常缺字段）。 */
export function readPath(source, path) {
  let current = source;

  for (const segment of splitPath(path)) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

/**
 * 写路径：**不可变**逐层复制（父容器的引用会变），
 * 这样 `keyed()` / 读值绑定才能看见变化（数组换引用 = 这一次写入被感知）。
 */
export function writePath(source, path, value) {
  const segments = splitPath(path);
  return setIn(source, segments, value);
}

function setIn(node, segments, value) {
  if (segments.length === 0) {
    return value;
  }

  const [head, ...rest] = segments;
  const current = node === null || node === undefined ? undefined : node[head];

  if (Array.isArray(node)) {
    const index = Number(head);
    const copy = node.slice();
    copy[index] = setIn(node[index], rest, value);
    return copy;
  }

  const copy = isPlainObject(node) ? { ...node } : {};
  copy[head] = setIn(current, rest, value);
  return copy;
}

/** `path` 是否在 `prefix` 之下（含相等）：数据写入后刷新哪些 cell 靠它判定。 */
export function isPathPrefix(prefix, path) {
  const prefixSegments = splitPath(prefix);
  const segments = splitPath(path);

  if (prefixSegments.length > segments.length) {
    return false;
  }

  return prefixSegments.every((segment, index) => segment === segments[index]);
}

/**
 * 模板串插值：`"共 {count} 条 / {user.name}"`。
 * `{` `}` 用 `\{\{` 转义？不需要——生成方本来就只写路径，遇不到的写法按字面保留。
 */
export function formatTemplate(text, readValue) {
  return String(text).replace(/\{([^{}]+)\}/g, (match, rawPath) => {
    const value = readValue(rawPath.trim());
    return value === null || value === undefined ? '' : String(value);
  });
}

/** 列表行模板配置的归一（`$each` 必需，`$key` 缺省按行下标）。 */
export function normalizeRepeat(repeat) {
  if (typeof repeat === 'string') {
    return { source: normalizePath(repeat), key: null, alias: null };
  }

  if (!isPlainObject(repeat)) {
    return null;
  }

  const source = repeat[REPEAT_EACH_KEY] ?? repeat.each ?? repeat.source;
  if (typeof source !== 'string') {
    return null;
  }

  // v0.2 引用文法在渲染期按当前行作用域解析；旧字符串路径维持旧语义。
  const sourceReference = referenceToBindExpr(source);

  const key = repeat[REPEAT_KEY_KEY] ?? repeat.key ?? null;

  return {
    alias: repeat.$as ?? repeat.alias ?? null,
    key: typeof key === 'string' ? key : null,
    source: sourceReference ?? normalizePath(source)
  };
}

export { ACTION_KEY, ARG_KEY, BIND_KEY, EVENT_KEY, TEMPLATE_KEY };
