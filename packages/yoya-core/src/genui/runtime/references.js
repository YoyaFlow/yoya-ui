import { BIND_KEY, FROM_KEY } from '../protocol/constants.js';
import { ERROR_CODES, GenUIError } from '../protocol/errors.js';
import { parseReference, referenceToBindExpr } from '../protocol/references.js';
import { isBindExpr, joinPath, normalizePath } from '../protocol/values.js';

/**
 * 数据引用的运行时作用域解析。
 *
 * 作用域链：repeat 行（可命名）→ 父行 → … → 数据根兜底。
 * `$from` 是引用文法归一化后的内部标记，不出现在公开 schema。
 */
export function resolveReferencePath(raw, ctx) {
  const path = raw[BIND_KEY];
  const from = raw[FROM_KEY];

  if (from === undefined) {
    return resolveScopePath(path, ctx);
  }

  if (from === '#row') {
    if (path === '$index') return ctx.scope?.index;
    if (path === '$key') return ctx.scope?.key;
    return resolveScopePath(path, ctx);
  }

  if (typeof from === 'string' && from.startsWith('#parent:')) {
    const level = Number(from.slice('#parent:'.length)) || 1;
    let scope = ctx.scope;

    for (let i = 0; i < level && scope; i += 1) {
      scope = scope.parent;
    }

    return scope ? joinPath(scope.path, stripSlash(path)) : normalizePath(path);
  }

  const namedScope = findScopeByAlias(ctx, from);
  if (namedScope) {
    return joinPath(namedScope.path, stripSlash(path));
  }

  return resolveScopePath(path, ctx);
}

/** 相对路径按「最近有值的行作用域」解析，最后落到数据根。 */
export function resolveScopePath(path, ctx) {
  const text = String(path ?? '');

  if (text.startsWith('/')) {
    return normalizePath(text);
  }

  let scope = ctx.scope;
  while (scope) {
    const candidate = joinPath(scope.path, text);

    if (ctx.data?.has(candidate)) {
      return candidate;
    }

    scope = scope.parent;
  }

  return normalizePath(text);
}

/** repeat.$each 可以是旧路径字符串，也可以是归一化后的引用表达式。 */
export function resolveRepeatSource(source, ctx) {
  return isBindExpr(source) ? resolveReferencePath(source, ctx) : resolveScopePath(source, ctx);
}

export function findScopeByAlias(ctx, alias) {
  if (typeof alias !== 'string') {
    return null;
  }

  let scope = ctx.scope;
  while (scope) {
    if (scope.alias === alias) {
      return scope;
    }

    scope = scope.parent;
  }

  return null;
}

function stripSlash(path) {
  return String(path ?? '').replace(/^\//, '');
}

/** 行伪字段不是数据树路径：直接读当前 row scope。 */
export function readRowPseudo(raw, ctx) {
  if (raw[FROM_KEY] !== '#row') {
    return undefined;
  }

  if (raw[BIND_KEY] === '$index') {
    return ctx.scope?.index;
  }

  if (raw[BIND_KEY] === '$key') {
    return ctx.scope?.key;
  }

  return undefined;
}

/** 赋值目标只允许落在 data 作用域（含 repeat 行作用域）；组件与宿主保管者只读。 */
export function resolveWritableReference(text, ctx) {
  const reference = parseReference(text);

  if (!reference) {
    throw new GenUIError(`赋值目标必须是引用，得到 ${String(text)}`, {
      code: ERROR_CODES.action,
      path: String(text)
    });
  }

  if (
    reference.domain === 'component' ||
    reference.path === '$index' ||
    reference.path === '$key' ||
    (reference.custodian !== null &&
      reference.custodian !== 'data' &&
      findScopeByAlias(ctx, reference.custodian) === null)
  ) {
    throw new GenUIError(`赋值目标 "${text}" 只支持写入数据域（@ / @data / repeat 行作用域）`, {
      code: ERROR_CODES.action,
      path: text
    });
  }

  return resolveReferencePath(referenceToBindExpr(text), ctx);
}
