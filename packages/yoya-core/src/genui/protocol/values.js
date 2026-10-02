import { referenceToBindExpr } from './references.js';
import { normalizePath } from '../../core/json-path.js';
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

// 路径原语住在 core（句柄的路径下钻也用同一份实现）；这里按原名转出，历史引用面不变。
export {
  isPathPrefix,
  joinPath,
  normalizePath,
  readPath,
  splitPath,
  writePath
} from '../../core/json-path.js';
