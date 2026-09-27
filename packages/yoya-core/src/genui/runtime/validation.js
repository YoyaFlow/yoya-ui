import { computed } from '../../index.js';
import { BIND_KEY, FROM_KEY } from '../protocol/constants.js';
import { ERROR_CODES, GenUIError } from '../protocol/errors.js';
import { validateDeclarations } from '../protocol/validation.js';
import { isBindExpr, isPlainObject } from '../protocol/values.js';

/** /form/name → /ui/errors/form/name。 */
function errorPath(path) {
  return path === '/' ? '/ui/errors' : `/ui/errors${path}`;
}

/**
 * 安装 validate 声明。
 *
 * 每个字段一个 computed：第一条失败规则的 message 为值，全部通过为 null。
 * 输出挂载到 /ui/errors/**，视图与提交 gate 都按普通数据引用消费。
 */
export function installValidation(validation, data, functions = {}, custodians = null) {
  const entries = validateDeclarations(validation);
  const installed = [];
  const readValue = (value) => {
    if (isBindExpr(value)) {
      return data.cell(value[BIND_KEY]).value;
    }

    if (Array.isArray(value)) {
      return value.map(readValue);
    }

    if (isPlainObject(value)) {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, readValue(item)]));
    }

    return value;
  };

  entries.forEach((rules, target) => {
    rules.forEach((rule, index) => {
      if (typeof functions[rule.call] !== 'function') {
        throw new GenUIError(`未注册的 validate 函数 "${rule.call}"`, {
          code: ERROR_CODES.schema,
          path: `${target}[${index}]`
        });
      }
    });

    const handle = computed(() => {
      for (const rule of rules) {
        const passed = Boolean(functions[rule.call](readValue(rule.args ?? {})));

        if (!passed) {
          return isBindExpr(rule.message)
            ? readMessage(rule.message, data, custodians)
            : rule.message;
        }
      }

      return null;
    });

    installed.push(data.defineComputed(errorPath(target), handle));
  });

  return () => installed.splice(0).forEach((dispose) => dispose());
}

function readMessage(message, data, custodians) {
  const from = message[FROM_KEY];

  if (from !== undefined && from !== '#nearest') {
    return custodians?.read(from, message[BIND_KEY]);
  }

  return data.cell(message[BIND_KEY]).value;
}
