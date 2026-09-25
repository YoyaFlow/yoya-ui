import { isPlainObject } from '../../components/shared.js';
import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import { createComponentShortcut } from '../../components/shared.js';
import { vInput } from './input.js';

const SUPPORTED_MODES = new Set(['date', 'datetime-local', 'time']);

/** VTimer = VInput 的透传命令（模式相关的命令另写下面）。 */
const INPUT_COMMANDS = [
  'attr',
  'className',
  'id',
  'name',
  'textContent',
  'inputUnit',
  'value',
  'text',
  'content',
  'placeholder',
  'disabled',
  'readonly',
  'required',
  'error',
  'isDisabled',
  'isReadonly',
  'isError',
  'clearable',
  'clear'
];

/**
 * 时间输入（形态 B，包装型）：**它就是一个 `VInput`**——旧 `class VTimer extends VInput` 的语义
 * 改成身份多值 `vn: 'VTimer VInput'`（同一个元素，不另起包装层），再加 `mode` / `type` 两个命令。
 */
export function VTimer() {
  return vNode((api) => {
    const node = vInput();

    // 多值身份：既是 VTimer 也是 VInput（按空格拆名判定）
    node.setup({ vn: 'VTimer VInput' });

    INPUT_COMMANDS.forEach((key) => {
      api[key] = (...args) => {
        const result = node[key](...args);
        return result === node ? api : result;
      };
    });

    api.mode = (value) => {
      if (value === undefined) {
        return node.type();
      }

      node.type(SUPPORTED_MODES.has(value) ? value : 'date');
      return api;
    };

    api.type = (value) => api.mode(value);

    /** 字符串 / 数字 = 值（旧 `_setupTimer` 的兜底分支）。 */
    api.setupString = (value) => api.value(value);

    /** props：`mode` / `type` 归时间输入，其余按输入框的 props 分派（与旧 `_setupTimer` 同口径）。 */
    api.setupObject = (options) => {
      if (!isPlainObject(options)) {
        return api;
      }

      const { mode, type, ...inputSetup } = options;

      node.setup(inputSetup);

      if (mode !== undefined) {
        api.mode(mode);
      } else if (type !== undefined) {
        api.mode(type);
      }

      return api;
    };

    api.mode('date');
    return node;
  });
}

export const vTimer = createComponentShortcut(VTimer);
