import { vNode } from '../core/v-node.js';
import { div, span } from '../html/index.js';
import {
  createComponentShortcut,
  isPlainObject,
  normalizeChildren,
  themeValue
} from '../components/shared.js';

const progressStatusColors = {
  error: themeValue('color-danger', '#dc2626'),
  normal: themeValue('color-primary', '#2563eb'),
  processing: themeValue('color-info', '#0284c7'),
  success: themeValue('color-success', '#16a34a'),
  warning: themeValue('color-warning', '#f59e0b')
};

/**
 * 进度条（形态 B，票 15 §4）：视图根是外壳 `div` + 标签位 + 轨道（内含进度条）+ 文本位。
 *
 * - 身份写在结构里：根 `vn: 'VProgress'`、`VProgressLabel` / `VProgressTrack` / `VProgressBar` /
 *   `VProgressText`；
 * - 标签位与文本位是**区域**（`rebuildable`）：内容由各自的 setup 产出，命令改状态后再 `rebuild()`
 *   （与旧节点类型同口径，不引入集中 sync）；
 * - 状态与命令收进 `vNode` 闭包；indeterminate 的 keyframes 名随类名一起去掉 `yoya-v` 前缀
 *   （`yoya-progress-indeterminate`，JS 与 CSS 同刀）；
 * - props 分派：本组件的键走命令，其余按元素 options 写；数字 / 数字字符串 = value，
 *   其它字符串 = label（与旧 `_setupProgress` 同口径）。
 */
export function VProgress() {
  return vNode((api) => {
    const state = {
      ariaLabel: null,
      format: null,
      indeterminate: false,
      label: null,
      max: 100,
      percent: 0,
      showText: true,
      size: 'default',
      status: 'normal',
      strokeColor: null,
      textContent: null,
      value: 0
    };

    const labelBox = span({ vn: 'VProgressLabel' })
      .attr('aria-hidden', 'true')
      .style('display', 'none');
    const track = div({ vn: 'VProgressTrack' });
    const bar = span({ vn: 'VProgressBar' });
    const textBox = span({ vn: 'VProgressText' });
    const node = div({ vn: 'VProgress' })
      .attr({
        'aria-valuemax': '100',
        'aria-valuemin': '0',
        'aria-valuenow': '0',
        'data-percent': '0',
        'data-size': 'default',
        'data-status': 'normal',
        'data-value': '0',
        role: 'progressbar'
      })
      .child(labelBox, track, textBox);

    track.child(bar);

    /** 文本区内容：显式文本优先，其次 indeterminate 文案、format 结果与百分比。 */
    const progressText = () => {
      if (state.textContent !== null && state.textContent !== undefined) {
        return state.textContent;
      }

      if (state.indeterminate) {
        return '处理中';
      }

      if (state.format) {
        return state.format(state.value, state.percent);
      }

      return `${Math.round(state.percent)}%`;
    };

    const syncProgress = () => {
      const rawPercent = state.max > 0 ? (state.value / state.max) * 100 : 0;

      state.percent = Number.isFinite(rawPercent) ? Math.max(0, Math.min(100, rawPercent)) : 0;

      const color =
        state.strokeColor || progressStatusColors[state.status] || progressStatusColors.normal;
      const hasLabel = labelBox.children().length > 0;

      node.attr('aria-label', state.ariaLabel);
      node.attr('aria-valuemax', String(state.max));
      node.attr('aria-valuenow', state.indeterminate ? null : String(state.value));
      node.attr('data-indeterminate', state.indeterminate ? 'true' : null);
      node.attr('data-percent', String(Number(state.percent.toFixed(2))));
      node.attr('data-value', String(state.value));
      node.attr('data-has-label', hasLabel ? 'true' : null);

      labelBox.style('display', hasLabel ? 'inline-flex' : 'none');
      bar.style('background', color);

      if (state.indeterminate) {
        bar.styles({
          animation: 'yoya-progress-indeterminate 1.2s ease-in-out infinite',
          width: '100%'
        });
      } else {
        bar.styles({
          animation: null,
          width: `${state.percent}%`
        });
      }

      if (state.showText) {
        textBox.style('display', 'inline-flex');
        textBox.rebuild();
      } else {
        textBox.style('display', 'none');
      }
    };

    // 标签位 / 文本位是区域：内容由各自的 setup 产出（命令改状态后 rebuild）
    labelBox.setup((box) => {
      box.rebuildable();
      box.child(normalizeChildren(state.label));
    });
    textBox.setup((box) => {
      box.rebuildable();
      box.child(normalizeChildren(progressText()));
    });

    api.value = (value) => {
      if (value === undefined) {
        return state.value;
      }

      const nextValue = Number(value);

      if (Number.isFinite(nextValue)) {
        state.value = Math.max(0, Math.min(state.max, nextValue));
      }

      syncProgress();
      return api;
    };

    api.max = (value) => {
      if (value === undefined) {
        return state.max;
      }

      const nextValue = Number(value);

      state.max = Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 100;
      if (state.value > state.max) {
        state.value = state.max;
      }

      syncProgress();
      return api;
    };

    api.percent = (value) => {
      if (value === undefined) {
        return state.percent;
      }

      const nextValue = Number(value);

      if (Number.isFinite(nextValue)) {
        state.value = (state.max * Math.max(0, Math.min(100, nextValue))) / 100;
      }

      syncProgress();
      return api;
    };

    api.showText = (value) => {
      if (value === undefined) {
        return state.showText;
      }

      state.showText = Boolean(value);
      node.attr('data-show-text', state.showText ? 'true' : null);
      syncProgress();
      return api;
    };

    api.label = (content) => {
      if (content === undefined) {
        return labelBox.textContent();
      }

      state.label = content;
      labelBox.rebuild();
      syncProgress();
      return api;
    };

    api.text = (content) => {
      if (content === undefined) {
        return state.textContent;
      }

      state.textContent = content === null || content === undefined ? null : content;
      syncProgress();
      return api;
    };

    api.format = (handler) => {
      if (handler === undefined) {
        return state.format;
      }

      state.format = typeof handler === 'function' ? handler : null;
      syncProgress();
      return api;
    };

    api.status = (value) => {
      if (value === undefined) {
        return state.status;
      }

      state.status = ['error', 'normal', 'processing', 'success', 'warning'].includes(value)
        ? value
        : 'normal';
      node.attr('data-status', state.status);
      syncProgress();
      return api;
    };

    api.size = (value) => {
      if (value === undefined) {
        return state.size;
      }

      state.size = ['default', 'large', 'small'].includes(value) ? value : 'default';
      node.attr('data-size', state.size);
      return api;
    };

    api.strokeColor = (value) => {
      if (value === undefined) {
        return state.strokeColor;
      }

      state.strokeColor = value || null;
      syncProgress();
      return api;
    };

    api.indeterminate = (value) => {
      if (value === undefined) {
        return state.indeterminate;
      }

      state.indeterminate = Boolean(value);
      syncProgress();
      return api;
    };

    api.active = (value) => api.indeterminate(value);

    api.ariaLabel = (content) => {
      if (content === undefined) {
        return state.ariaLabel;
      }

      state.ariaLabel = content === null || content === undefined ? null : String(content);
      syncProgress();
      return api;
    };

    /** 数字 / 数字字符串 = value，其它字符串 = label（旧 `_setupProgress` 的兜底分支）。 */
    api.setupString = (value) => {
      if (
        typeof value === 'number' ||
        (typeof value === 'string' && !Number.isNaN(Number(value)))
      ) {
        return api.value(value);
      }

      return api.label(value);
    };

    /** props：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupProgress` 同口径）。 */
    api.setupObject = (setup) => {
      if (!isPlainObject(setup)) {
        return api;
      }

      const {
        active,
        ariaLabel,
        children,
        format,
        indeterminate,
        label,
        max,
        percent,
        showText,
        size,
        status,
        strokeColor,
        text,
        value,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        node.setup(elementConfig);
      }
      if (ariaLabel !== undefined) {
        api.ariaLabel(ariaLabel);
      }
      if (label !== undefined) {
        api.label(label);
      }
      if (max !== undefined) {
        api.max(max);
      }
      if (value !== undefined) {
        api.value(value);
      }
      if (percent !== undefined) {
        api.percent(percent);
      }
      if (showText !== undefined) {
        api.showText(showText);
      }
      if (status !== undefined) {
        api.status(status);
      }
      if (size !== undefined) {
        api.size(size);
      }
      if (strokeColor !== undefined) {
        api.strokeColor(strokeColor);
      }
      if (format !== undefined) {
        api.format(format);
      }
      if (text !== undefined) {
        api.text(text);
      } else if (children !== undefined) {
        api.text(children);
      }
      if (indeterminate !== undefined) {
        api.indeterminate(indeterminate);
      } else if (active !== undefined) {
        api.indeterminate(active);
      }

      return api;
    };

    syncProgress();
    return node;
  });
}

export const vProgress = createComponentShortcut(VProgress);
