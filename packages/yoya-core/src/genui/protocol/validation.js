import { parseReference } from './references.js';
import { isBindExpr, isPlainObject, normalizePath } from './values.js';

/** validate 目标只能是数据域绝对引用（@:/…；兼容旧 /… 内部路径）。 */
export function validationTarget(key) {
  const reference = parseReference(key);

  if (reference) {
    if (reference.domain !== 'data' || reference.custodian !== null) {
      return null;
    }

    return normalizePath(reference.path);
  }

  return typeof key === 'string' && key.startsWith('/') ? normalizePath(key) : null;
}

/** 规范化 validate 声明：目标 → 规则数组。 */
export function normalizeValidation(validation) {
  const entries = new Map();

  Object.entries(validation ?? {}).forEach(([key, rules]) => {
    const target = validationTarget(key);

    if (target === null) {
      throw new Error(`validate 目标必须是数据域绝对引用，得到 ${JSON.stringify(key)}`);
    }

    if (!Array.isArray(rules) || rules.some((rule) => !isPlainObject(rule))) {
      throw new Error(`validate 规则必须是数组：${key}`);
    }

    entries.set(target, rules);
  });

  return entries;
}

/** 校验规则形状；依赖允许尚不存在（required 正是要拦 undefined）。 */
export function validateDeclarations(validation) {
  const entries = normalizeValidation(validation);

  entries.forEach((rules, target) => {
    rules.forEach((rule, index) => {
      if (typeof rule.call !== 'string' || rule.call === '') {
        throw new Error(`validate.${target}[${index}].call 必须是非空函数名`);
      }

      if (rule.args !== undefined && !isPlainObject(rule.args)) {
        throw new Error(`validate.${target}[${index}].args 必须是对象`);
      }

      if (typeof rule.message !== 'string' && !isBindExpr(rule.message)) {
        throw new Error(`validate.${target}[${index}].message 必须是字符串或数据引用`);
      }
    });
  });

  return entries;
}
