import { vText } from '../../core/node.js';
import { vNode } from '../../core/v-node.js';
import { allocateId } from '../../core/id.js';
import { div, span } from '../../html/index.js';
import {
  createComponentShortcut,
  isPlainObject,
  resolveTextValue
} from '../../components/shared.js';
import { vTimer } from './timer.js';

/**
 * 时间范围输入（形态 B，票 15 §4）：视图根是外壳 `div` + 两个时间输入 + 错误提示。
 *
 * - 身份写在结构里：根 `vn: 'VTimerRange'`、两个输入写**多值身份**
 *   （`'VTimerRangeStart VTimer VInput'` / `'VTimerRangeEnd VTimer VInput'`：部件 + 复用组件，
 *   与 `VField` 的动作按钮同一口径）、错误提示 `vn: 'VTimerRangeError'`；
 * - 输入是复用 `vTimer` 的组件，`aria-label` / `name` / `aria-describedby` 仍按旧口径走 `attr`
 *   路由到内层 `<input>`；状态与命令收进 `vNode` 闭包；
 * - 合并 change：任一输入变化先 `stopPropagation`、本地校验，再从视图根派发一次带 `detail` 的
 *   合并事件（口径不变）；SSR 回读仍挂 `hydrateSnapshot` 在视图根上；
 * - props 分派：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupTimerRange` 同口径）。
 */
export function VTimerRange() {
  return vNode((api) => {
    const errorId = allocateId('yoya-timer-range-error');
    const state = { name: '' };

    const startTimer = vTimer();

    startTimer.setup({ vn: 'VTimerRangeStart VTimer VInput' });
    startTimer.attr({ 'aria-label': '开始值', 'aria-describedby': errorId });

    const endTimer = vTimer();

    endTimer.setup({ vn: 'VTimerRangeEnd VTimer VInput' });
    endTimer.attr({ 'aria-label': '结束值', 'aria-describedby': errorId });

    const errorText = vText('');
    const errorMessage = span({ vn: 'VTimerRangeError' })
      .id(errorId)
      .attr('aria-live', 'polite')
      .child(errorText);
    // 静态样式（外壳网格 / 错误提示）在 `yoya.ui.css`（R5）；这里只留状态与内容
    const node = div({ vn: 'VTimerRange' }).attr('role', 'group');

    const validate = () => {
      const { start, end } = api.value();
      const invalid = Boolean(start && end && end < start);

      node.attr('data-error', invalid ? 'true' : null);
      node.attr('data-invalid', invalid ? 'true' : null);
      node.attr('aria-invalid', invalid ? 'true' : null);
      startTimer.error(invalid);
      endTimer.error(invalid);
      startTimer.attr('aria-invalid', invalid ? 'true' : null);
      endTimer.attr('aria-invalid', invalid ? 'true' : null);
      errorText.textContent(invalid ? '结束值不能早于开始值' : '');
      return !invalid;
    };

    const handleTimerChange = (event) => {
      event.stopPropagation();
      validate();
      node.emit('change', api.value());
    };

    startTimer.on('change', (event) => handleTimerChange(event));
    endTimer.on('change', (event) => handleTimerChange(event));
    node.child(startTimer, endTimer, errorMessage);

    api.mode = (value) => {
      if (value === undefined) {
        return startTimer.mode();
      }

      startTimer.mode(value);
      endTimer.mode(value);
      return api;
    };

    api.name = (value) => {
      if (value === undefined) {
        return state.name;
      }

      state.name = resolveTextValue(value);
      startTimer.attr('name', state.name ? `${state.name}Start` : null);
      endTimer.attr('name', state.name ? `${state.name}End` : null);
      return api;
    };

    api.start = (value) => {
      if (value === undefined) {
        return startTimer.value();
      }

      startTimer.value(value);
      validate();
      return api;
    };

    api.end = (value) => {
      if (value === undefined) {
        return endTimer.value();
      }

      endTimer.value(value);
      validate();
      return api;
    };

    api.value = (value) => {
      if (value === undefined) {
        return { start: api.start(), end: api.end() };
      }

      const [start, end] = Array.isArray(value) ? value : [value?.start ?? '', value?.end ?? ''];

      api.start(start);
      api.end(end);
      return api;
    };

    api.disabled = (value) => {
      if (value === undefined) {
        return startTimer.disabled();
      }

      startTimer.disabled(value);
      endTimer.disabled(value);
      return api;
    };

    api.readonly = (value) => {
      if (value === undefined) {
        return startTimer.readonly();
      }

      startTimer.readonly(value);
      endTimer.readonly(value);
      return api;
    };

    api.required = (value) => {
      if (value === undefined) {
        return startTimer.required();
      }

      startTimer.required(value);
      endTimer.required(value);
      return api;
    };

    /** 字符串 / 数组 / { start, end } = 初始值（旧 `_setupTimerRange` 的兜底分支）。 */
    api.setupString = (next) => api.value(next);

    /** props：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupTimerRange` 同口径）。 */
    api.setupObject = (setup) => {
      if (!isPlainObject(setup)) {
        return api;
      }

      const { disabled, end, mode, name, readonly, required, start, value, ...elementConfig } =
        setup;

      if (Object.keys(elementConfig).length > 0) {
        node.setup(elementConfig);
      }
      if (mode !== undefined) {
        api.mode(mode);
      }
      if (name !== undefined) {
        api.name(name);
      }
      if (value !== undefined) {
        api.value(value);
      } else {
        api.value({ start, end });
      }
      if (required !== undefined) {
        api.required(required);
      }
      if (readonly !== undefined) {
        api.readonly(readonly);
      }
      if (disabled !== undefined) {
        api.disabled(disabled);
      }

      return api;
    };

    // SSR 回读：内层输入的元素机制随 DOM 走，这里补一次范围校验（与旧 `hydrateSnapshot` 同口径）
    node.hydrateSnapshot = () => {
      startTimer.hydrateSnapshot?.();
      endTimer.hydrateSnapshot?.();
      validate();
      return node;
    };

    return node;
  });
}

export const vTimerRange = createComponentShortcut(VTimerRange);
