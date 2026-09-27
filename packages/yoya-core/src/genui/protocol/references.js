/**
 * 引用文法：`<域><保管者>:<路径>`——数据语言的地基（v0.2）。
 *
 * ```
 * @:/order/price      @data 的糖（数据根，绝对路径）——唯一可写保管者
 * @:price             作用域链最近命中（相对）
 * @:^price            向上翻层（嵌套行 / 遮蔽时）
 * @item:/name         具名作用域（repeat 的 $as）
 * @actions:/orders/submit   宿主注册的可调用动作清单
 * @i18n:/buttons/ok   文案保管者（宿主注册，只读）
 * #gauge:/value       指定组件的暴露数据（→ /@gauge/value，只读）
 * #:/value            最近组件（含自身——自引用免 id 冲突）
 * ```
 *
 * 转义：`@@` → 字面 `@`、`##` → 字面 `#`。冒号是命名空间与路径的硬边界。
 */
import { ACTION_KEY, BIND_KEY, FROM_KEY } from './constants.js';
import { ERROR_CODES, GenUIError } from './errors.js';

const CUSTODIAN_PATTERN = /^[a-zA-Z_$][\w$-]*$/;

/** 解析引用字符串；不是引用形态返回 null（纯文本判定，零副作用）。 */
export function parseReference(text) {
  if (typeof text !== 'string' || text.length < 2) {
    return null;
  }

  // 转义优先：@@ / ## 开头是字面量，不是引用
  if (text.startsWith('@@') || text.startsWith('##')) {
    return null;
  }

  const domainChar = text[0];

  if (domainChar !== '@' && domainChar !== '#') {
    return null;
  }

  const colon = text.indexOf(':');

  if (colon < 1) {
    return null;
  }

  const custodian = text.slice(1, colon);
  const path = text.slice(colon + 1);

  if (custodian !== '' && !CUSTODIAN_PATTERN.test(custodian)) {
    return null;
  }

  if (path === '' || /[\s:]/.test(path)) {
    return null;
  }

  const domain = domainChar === '@' ? 'data' : 'component';

  // 组件域路径以 / 开头（prop 位）；数据域认 /abs、name、^name
  if (domain === 'component' && !path.startsWith('/')) {
    return null;
  }

  return { custodian: custodian === '' ? null : custodian, domain, path };
}

/** 字符串是否引用形态（值位置判定糖用）。 */
export function isReferenceString(text) {
  return parseReference(text) !== null;
}

/**
 * 引用糖 → 内部规范形（$bind 家族）：
 * - `@data`（默认）→ `{ $bind: path }`（既有形态，运行时零改动）
 * - 其他保管者 → `{ $bind: path, $from: <保管者> }`
 * - `#id:/prop` → `{ $bind: "/@id/prop" }`（组件数据挂载命名空间的静态糖）
 * - `#:/prop` → `{ $bind: prop, $from: '#nearest' }`（最近组件，expose 增量接运行时）
 */
export function referenceToBindExpr(text) {
  const reference = parseReference(text);

  if (!reference) {
    return null;
  }

  if (reference.domain === 'data') {
    if (reference.path === '$index' || reference.path === '$key') {
      return { [BIND_KEY]: reference.path, [FROM_KEY]: '#row' };
    }

    if (reference.custodian === null || reference.custodian === 'data') {
      const markers = /^([\^]+)(.*)$/.exec(reference.path);

      if (markers) {
        return {
          [BIND_KEY]: stripScopeSlash(markers[2]),
          [FROM_KEY]: `#parent:${markers[1].length}`
        };
      }

      return { [BIND_KEY]: reference.path };
    }

    if (reference.path === '$index' || reference.path === '$key') {
      return { [BIND_KEY]: reference.path, [FROM_KEY]: '#row' };
    }

    return { [BIND_KEY]: reference.path, [FROM_KEY]: reference.custodian };
  }

  if (reference.custodian !== null) {
    return { [BIND_KEY]: `/@${reference.custodian}${reference.path}` };
  }

  return { [BIND_KEY]: reference.path.slice(1), [FROM_KEY]: '#nearest' };
}

/** 转义还原（@@ → @、## → #）。 */
function stripScopeSlash(path) {
  return path.startsWith('/') ? path.slice(1) : path;
}

function unescapeLiteral(text) {
  if (text.startsWith('@@') || text.startsWith('##')) {
    return text[0] + text.slice(2);
  }

  return text;
}

const isPlain = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * 深度糖归一：遍历值位置，引用字符串 → $bind 规范形；转义还原。
 *
 * **跳过 `data` 子树**——那是用户数据，里面的字符串不该被当引用；
 * 只动值、不动键（key 位赋值语义是独立增量）。
 */
export function normalizeSugarDeep(value, path = []) {
  if (typeof value === 'string') {
    return referenceToBindExpr(value) ?? unescapeLiteral(value);
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => normalizeSugarDeep(item, [...path, String(index)]));
  }

  if (isPlain(value)) {
    if (path.at(-1) === 'on') {
      return normalizeEventHandlers(value);
    }

    const out = {};

    Object.entries(value).forEach(([key, item]) => {
      // repeat 的 $each 是路径位，不是普通值位；保留引用字符串给 normalizeRepeat 解析。
      out[key] =
        key === 'data' || key === '$each' ? item : normalizeSugarDeep(item, [...path, key]);
    });

    return out;
  }

  return value;
}

function normalizeEventHandlers(events) {
  const out = {};

  Object.entries(events).forEach(([eventName, handler]) => {
    assertAssignmentShape(handler, eventName);
    out[eventName] = isAssignmentMapping(handler)
      ? normalizeAssignmentMapping(handler)
      : normalizeSugarDeep(handler);
  });

  return out;
}

function assertAssignmentShape(handler, eventName) {
  if (!isPlain(handler)) {
    return;
  }

  const keys = Object.keys(handler);
  const referenceKeys = keys.filter((key) => isReferenceString(key));

  if (referenceKeys.length > 0 && referenceKeys.length !== keys.length) {
    throw new GenUIError(`事件处理器不能同时使用赋值映射和 $action`, {
      code: ERROR_CODES.schema,
      path: `on.${eventName}`
    });
  }
}

function isAssignmentMapping(value) {
  return (
    isPlain(value) &&
    Object.keys(value).length > 0 &&
    Object.keys(value).every((key) => isReferenceString(key))
  );
}

function normalizeAssignmentMapping(mapping) {
  return {
    [ACTION_KEY]: 'assign',
    params: {
      assignments: Object.entries(mapping).map(([target, value]) => ({
        target,
        value: normalizeSugarDeep(value)
      }))
    }
  };
}
