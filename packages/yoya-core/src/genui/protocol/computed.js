import { BIND_KEY, FROM_KEY } from './constants.js';
import { parseReference } from './references.js';
import { isBindExpr, isPlainObject, normalizePath, readPath } from './values.js';

/** computed 目标只能是数据域绝对引用（@:/…；兼容旧 /… 内部路径）。 */
export function computedTarget(key) {
  const reference = parseReference(key);

  if (reference) {
    if (reference.domain !== 'data' || reference.custodian !== null) {
      return null;
    }

    return normalizePath(reference.path);
  }

  return typeof key === 'string' && key.startsWith('/') ? normalizePath(key) : null;
}

/** 从 args 里收集 $bind 依赖；模板与嵌套结构同样递归。 */
export function computedDependencies(declaration) {
  const dependencies = new Set();

  const visit = (value) => {
    if (isBindExpr(value)) {
      if (value[FROM_KEY] !== undefined) {
        throw new Error('computed 依赖只支持数据域 @:/… 引用');
      }

      dependencies.add(normalizePath(value[BIND_KEY]));
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (isPlainObject(value)) {
      Object.values(value).forEach(visit);
    }
  };

  visit(declaration.args);
  return dependencies;
}

/** 给 validateSchema 用的完整声明表：目标 → { declaration, dependencies }。 */
export function normalizeComputed(computed) {
  const entries = new Map();

  Object.entries(computed ?? {}).forEach(([key, declaration]) => {
    const target = computedTarget(key);

    if (target === null) {
      throw new Error(`computed 目标必须是数据域绝对引用，得到 ${JSON.stringify(key)}`);
    }

    if (!isPlainObject(declaration) || typeof declaration.call !== 'string') {
      throw new Error(`computed.${key} 必须是 { call, args, transform? }`);
    }

    entries.set(target, {
      declaration,
      dependencies: computedDependencies(declaration)
    });
  });

  return entries;
}

/** DAG 校验：缺依赖与环都在建立信号图之前拦截。 */
export function validateComputed(computed, data) {
  const entries = normalizeComputed(computed);
  const dependenciesByTarget = new Map();
  const visitors = new Map();

  entries.forEach(({ dependencies }, target) => {
    dependencies.forEach((dependency) => {
      if (!entries.has(dependency) && readPath(data, dependency) === undefined) {
        throw new Error(`computed 依赖不存在：${dependency}`);
      }
    });

    dependenciesByTarget.set(
      target,
      [...dependencies].filter((dependency) => entries.has(dependency))
    );
  });

  const visit = (target, path) => {
    const state = visitors.get(target);

    if (state === 'active') {
      const cycle = [...path, target].join(' -> ');
      throw new Error(`computed 依赖形成环：${cycle}`);
    }

    if (state === 'done') {
      return;
    }

    visitors.set(target, 'active');
    dependenciesByTarget.get(target)?.forEach((dependency) => visit(dependency, [...path, target]));
    visitors.set(target, 'done');
  };

  entries.forEach((_declaration, target) => visit(target, []));
  return entries;
}
