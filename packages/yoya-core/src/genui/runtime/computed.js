import { computed } from '../../index.js';
import { ERROR_CODES, GenUIError } from '../protocol/errors.js';
import { normalizeComputed } from '../protocol/computed.js';
import { BIND_KEY } from '../protocol/constants.js';
import { isBindExpr, isPlainObject } from '../protocol/values.js';

/**
 * 安装顶层 computed 声明。
 *
 * 输入已经过糖归一化：`@:/path` 参数是 `$bind` 表达式。
 * 这里按 DAG 拓扑排序建立 computed cell；函数体只按名字来自宿主 / 库注册表。
 */
export function installComputed(declarations, data, functions = {}) {
  const entries = normalizeComputed(declarations);
  const pending = new Map(
    [...entries].map(([target, { dependencies }]) => [
      target,
      new Set([...dependencies].filter((dependency) => entries.has(dependency)))
    ])
  );
  const installed = [];
  const readArg = (value) => {
    if (isBindExpr(value)) {
      return data.cell(value[BIND_KEY]).value;
    }

    if (Array.isArray(value)) {
      return value.map(readArg);
    }

    if (isPlainObject(value)) {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, readArg(item)]));
    }

    return value;
  };

  while (pending.size > 0) {
    const ready = [...pending].filter(([, dependencies]) => dependencies.size === 0);

    if (ready.length === 0) {
      throw new GenUIError('computed 依赖形成环', {
        code: ERROR_CODES.schema,
        detail: [...pending.keys()]
      });
    }

    ready.forEach(([target]) => {
      pending.delete(target);

      const { declaration } = entries.get(target);
      const impl = functions[declaration.call];

      if (typeof impl !== 'function') {
        throw new GenUIError(`未注册的 computed 函数 "${declaration.call}"`, {
          code: ERROR_CODES.schema,
          path: target
        });
      }

      const transform =
        declaration.transform === undefined ? null : functions[declaration.transform];

      if (declaration.transform !== undefined && typeof transform !== 'function') {
        throw new GenUIError(`未注册的 computed transform "${declaration.transform}"`, {
          code: ERROR_CODES.schema,
          path: target
        });
      }

      const handle = computed(() => {
        const value = impl(readArg(declaration.args));

        return transform === null ? value : transform(value);
      });

      installed.push(data.defineComputed(target, handle));

      pending.forEach((dependencies) => dependencies.delete(target));
    });
  }

  return () => installed.splice(0).forEach((dispose) => dispose());
}
