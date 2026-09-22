import { registerChildFactories, vText } from '../core/node.js';
import { vNode } from '../core/v-node.js';
import { bindDocumentEvent, bindWindowEvent } from '../core/document-events.js';
import {
  HtmlElementNode,
  button as buttonTag,
  div,
  input as inputTag,
  span
} from '../html/index.js';
import {
  createComponentShortcut,
  isPlainObject,
  replaceChildren,
  themeValue
} from '../components/shared.js';

const DEFAULT_PALETTE = [
  '#f8fafc',
  '#f1f5f9',
  '#e2e8f0',
  '#cbd5e1',
  '#94a3b8',
  '#64748b',
  '#334155',
  '#0f172a',
  '#fee2e2',
  '#fed7aa',
  '#fef3c7',
  '#dcfce7',
  '#ccfbf1',
  '#cffafe',
  '#dbeafe',
  '#e0e7ff',
  '#f3e8ff',
  '#fce7f3',
  '#f87171',
  '#fb923c',
  '#facc15',
  '#4ade80',
  '#2dd4bf',
  '#22d3ee',
  '#60a5fa',
  '#818cf8',
  '#a78bfa',
  '#f472b6',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#b91c1c',
  '#b45309',
  '#a16207',
  '#15803d',
  '#0f766e',
  '#0891b2',
  '#1d4ed8',
  '#4338ca',
  '#7e22ce',
  '#be185d'
];

/**
 * 颜色选择器（形态 B，票 15 §4）：视图根是外壳 `div` + 触发按钮 + 弹窗。
 *
 * - 身份写在结构里：根 `vn: 'VColorPicker'`、触发按钮与里面的预览 / 文本
 *   （`VColorPickerTrigger` / `VColorPickerTriggerPreview` / `VColorPickerTriggerText`）、
 *   已选行（`VColorPickerSelected` / `VColorPickerSelectedPreview` / `VColorPickerSelectedText` /
 *   `VColorPickerClearSelected`）、色板 `VColorPickerPalette`（色块 `VColorPickerSwatch`）、
 *   侧栏 `VColorPickerSide`（效果 `VColorPickerEffect` / 透明度文本 `VColorPickerAlphaText`）、
 *   弹窗 `VColorPickerPopup`；
 * - 状态与命令收进 `vNode` 闭包；`change` 回调第二、三参照旧（alpha、组件句柄 `self.node()`）；
 * - 元素级时机：旧 `renderDom()` / `destroy()` 猴补换 `whenMount` / `whenDestroy`
 *   （弹窗定位与文档 / 窗口监听），读元素只读 `_el` 判定"建没建"；
 * - props 分派：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupColorPicker` 同口径）。
 */
export function VColorPicker() {
  return vNode((api, self) => {
    const state = {
      alpha: 100,
      changeHandlers: [],
      open: false,
      presetColors: DEFAULT_PALETTE.slice(),
      value: null
    };
    let outsideUnbind = null;
    let repositionUnbind = null;

    const triggerPreview = span({ vn: 'VColorPickerTriggerPreview' })
      .attr('data-vcolor-trigger-preview', 'true')
      .styles({
        border: '1px solid var(--yoya-color-border, #d8dee8)',
        borderRadius: '4px',
        boxSizing: 'border-box',
        display: 'inline-block',
        height: '16px',
        width: '16px'
      });
    const triggerTextNode = vText('');
    const triggerText = span({ vn: 'VColorPickerTriggerText' })
      .attr('data-vcolor-trigger-text', 'true')
      .child(triggerTextNode);
    const trigger = buttonTag({ vn: 'VColorPickerTrigger' })
      .attr({
        'aria-expanded': 'false',
        'aria-haspopup': 'true',
        'data-vcolor-trigger': 'true',
        title: '选择颜色',
        type: 'button'
      })
      .styles({
        alignItems: 'center',
        background: 'var(--yoya-color-surface, #ffffff)',
        border: '1px solid var(--yoya-color-border, #d8dee8)',
        borderRadius: '6px',
        color: 'inherit',
        cursor: 'pointer',
        display: 'inline-flex',
        gap: '8px',
        padding: '5px 10px'
      })
      .child(triggerPreview, triggerText);

    const selectedPreview = span({ vn: 'VColorPickerSelectedPreview' })
      .attr('data-vcolor-selected-preview', 'true')
      .styles({
        border: '1px solid var(--yoya-color-border, #d8dee8)',
        borderRadius: '4px',
        boxSizing: 'border-box',
        display: 'inline-block',
        height: '18px',
        width: '18px'
      });
    const selectedTextNode = vText('');
    const selectedText = span({ vn: 'VColorPickerSelectedText' })
      .attr('data-vcolor-selected-text', 'true')
      .child(selectedTextNode);
    const clearSelectedButton = buttonTag({ vn: 'VColorPickerClearSelected' })
      .attr({
        'aria-label': '清除已选颜色',
        'data-vcolor-clear-selected': 'true',
        title: '清除已选颜色',
        type: 'button'
      })
      .styles({
        background: 'transparent',
        border: '0',
        color: themeValue('color-text-muted', '#64748b'),
        cursor: 'pointer',
        fontSize: '12px',
        padding: '0'
      })
      .child('清除');
    const selected = div({ vn: 'VColorPickerSelected' })
      .attr('data-vcolor-selected', 'true')
      .styles({
        alignItems: 'center',
        background: 'var(--yoya-color-surface-hover, #f3f3f3)',
        borderRadius: '6px',
        display: 'flex',
        gap: '8px',
        justifyContent: 'space-between',
        padding: '6px 8px'
      });

    selected.child(selectedPreview, selectedText, clearSelectedButton);

    const paletteBox = div({ vn: 'VColorPickerPalette' })
      .attr('data-vcolor-palette', 'true')
      .styles({
        display: 'grid',
        gap: '5px',
        gridTemplateColumns: 'repeat(8, 18px)'
      });

    const alphaTextNode = vText('100%');
    const alphaInput = inputTag()
      .attr({
        'data-vcolor-alpha': 'true',
        max: '100',
        min: '0',
        type: 'range',
        value: '100'
      })
      .styles({
        direction: 'rtl',
        height: '84px',
        margin: '0',
        writingMode: 'vertical-lr'
      });
    const alphaText = span({ vn: 'VColorPickerAlphaText' })
      .attr('data-vcolor-alpha-text', 'true')
      .styles({
        color: themeValue('color-text-muted', '#64748b'),
        fontSize: '12px',
        minWidth: '34px',
        textAlign: 'right'
      })
      .child(alphaTextNode);

    const effectFill = div({ 'data-vcolor-effect-fill': 'true' }).styles({
      borderRadius: '5px',
      height: '100%',
      width: '100%'
    });
    const effectBox = div({ vn: 'VColorPickerEffect' })
      .attr('data-vcolor-effect', 'true')
      .styles({
        backgroundImage: 'conic-gradient(#d3d3d3 25%, #ffffff 0 50%, #d3d3d3 0 75%, #ffffff 0)',
        backgroundSize: '12px 12px',
        border: '1px solid var(--yoya-color-border, #d8dee8)',
        borderRadius: '6px',
        boxSizing: 'border-box',
        height: '28px',
        width: '28px'
      })
      .child(effectFill);
    const sidePanel = div({ vn: 'VColorPickerSide' })
      .styles({
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minWidth: '28px'
      })
      .child(effectBox, alphaInput, alphaText);
    const panel = div({ vn: 'VColorPickerPopup' })
      .attr('data-vcolor-popup', 'true')
      .styles({
        background: 'var(--yoya-color-surface, #ffffff)',
        border: '1px solid var(--yoya-color-border, #d8dee8)',
        borderRadius: '8px',
        boxShadow: 'var(--yoya-shadow-md, 0 8px 18px rgba(15, 23, 42, 0.1))',
        boxSizing: 'border-box',
        display: 'none',
        left: '0',
        minWidth: '250px',
        padding: '10px',
        position: 'absolute',
        top: 'calc(100% + 6px)',
        zIndex: '110'
      })
      .child(
        selected,
        div({
          style: { display: 'flex', gap: '12px', marginTop: '10px' }
        }).child(paletteBox, sidePanel)
      );
    const node = div({ vn: 'VColorPicker' }).styles({ position: 'relative' });

    node.child(trigger, panel);

    const createSwatch = (color) =>
      buttonTag({ vn: 'VColorPickerSwatch' })
        .attr({
          'aria-label': `选择颜色 ${color}`,
          'data-vcolor-swatch': color,
          title: color,
          type: 'button'
        })
        .styles({
          background: color,
          border: '1px solid var(--yoya-color-border, #d8dee8)',
          borderRadius: '4px',
          boxSizing: 'border-box',
          cursor: 'pointer',
          height: '18px',
          padding: '0',
          width: '18px'
        })
        .on('click', () => api.value(color));

    const renderPalette = () => {
      replaceChildren(
        paletteBox,
        state.presetColors.map((color) => createSwatch(color))
      );
    };

    const bindOutsideClose = (enabled) => {
      if (enabled && !outsideUnbind) {
        outsideUnbind = bindDocumentEvent('mousedown', (event) => {
          if (!node._el || !node._el.contains(event.target)) {
            api.close();
          }
        });
        return;
      }

      if (!enabled && outsideUnbind) {
        outsideUnbind();
        outsideUnbind = null;
      }
    };

    const bindReposition = (enabled) => {
      if (enabled && !repositionUnbind) {
        const reposition = () => positionPanel();
        const unbindScroll = bindWindowEvent('scroll', reposition, true);
        const unbindResize = bindWindowEvent('resize', reposition);

        repositionUnbind = () => {
          unbindScroll();
          unbindResize();
        };
        return;
      }

      if (!enabled && repositionUnbind) {
        repositionUnbind();
        repositionUnbind = null;
      }
    };

    /** 弹窗以 fixed 定位在触发器下方，避免被父容器 overflow 裁剪。 */
    const positionPanel = () => {
      if (typeof window === 'undefined' || !node._el || !trigger._el) {
        return;
      }

      const rect = trigger._el.getBoundingClientRect();
      const panelElement = panel._el;

      if (!panelElement) {
        return;
      }

      const panelWidth = panelElement.offsetWidth || 250;
      const panelHeight = panelElement.offsetHeight || 280;
      const margin = 8;
      let left = rect.left;

      if (left + panelWidth > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - panelWidth - margin);
      }

      let top = rect.bottom + 6;

      if (top + panelHeight > window.innerHeight - margin) {
        top = Math.max(margin, rect.top - panelHeight - 6);
      }

      panel.styles({
        left: `${left}px`,
        position: 'fixed',
        top: `${top}px`
      });
    };

    /** 带透明度的 rgba() 颜色串；未选择颜色时为 null。 */
    const rgba = () => {
      if (!state.value) {
        return null;
      }

      const hex = state.value.slice(1);
      const red = parseInt(hex.slice(0, 2), 16);
      const green = parseInt(hex.slice(2, 4), 16);
      const blue = parseInt(hex.slice(4, 6), 16);
      const alpha = Math.round((state.alpha / 100) * 1000) / 1000;

      return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    };

    const sync = () => {
      const color = state.value;
      const colorValue = rgba();
      const label = color ? `${color} ${state.alpha}%` : '选择颜色';

      triggerPreview.style('background', colorValue || 'transparent');
      triggerTextNode.textContent(label);
      selectedPreview.style('background', colorValue || 'transparent');
      selectedTextNode.textContent(color ? label : '未选择');
      alphaInput.attr('value', String(state.alpha));
      alphaTextNode.textContent(`${state.alpha}%`);
      effectFill.style('background', colorValue || 'transparent');
    };

    /** 句柄交给使用方的是组件节点（与旧外壳的 `_componentHandle` 同一口径） */
    const notifyChange = () => {
      state.changeHandlers.forEach((handler) => handler(state.value, state.alpha, self.node()));
    };

    trigger.on('click', () => api.toggle());
    clearSelectedButton.on('click', () => api.clearValue());
    alphaInput.on('input', (event) => api.alpha(Number(event.target.value)));

    /** 读写当前颜色（#rgb / #rrggbb）；null 表示未选择。 */
    api.value = (next) => {
      if (next === undefined) {
        return state.value;
      }

      if (next === null) {
        return api.clearValue();
      }

      const normalized = normalizeColor(next);

      if (!normalized) {
        return api;
      }

      state.value = normalized;
      sync();
      notifyChange();
      return api;
    };

    /** 读写透明度（0-100）。 */
    api.alpha = (next) => {
      if (next === undefined) {
        return state.alpha;
      }

      const value = Number(next);

      state.alpha = Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 100;
      sync();
      notifyChange();
      return api;
    };

    api.rgba = () => rgba();

    /** 清除已选颜色。 */
    api.clearValue = () => {
      state.value = null;
      sync();
      notifyChange();
      return api;
    };

    /** 打开/关闭弹窗。 */
    api.open = (value = true) => {
      state.open = Boolean(value);
      trigger.attr('aria-expanded', state.open ? 'true' : 'false');

      if (state.open) {
        panel.style('display', null);
        positionPanel();
      } else {
        panel.style('display', 'none');
      }

      bindOutsideClose(state.open);
      bindReposition(state.open);
      return api;
    };

    api.close = () => api.open(false);

    api.toggle = () => api.open(!state.open);

    /** 读写预设色板。 */
    api.palette = (next) => {
      if (next === undefined) {
        return [...state.presetColors];
      }

      state.presetColors = normalizeFavorites(next);
      renderPalette();
      return api;
    };

    /** 注册颜色变化回调（color, alpha, picker）；后一次注册替换前一次。 */
    api.change = (handler) => {
      if (handler === undefined) {
        return state.changeHandlers.slice();
      }

      state.changeHandlers = [handler];
      return api;
    };

    /** change 的别名。 */
    api.onChange = (handler) => api.change(handler);

    /** 字符串 = 初始颜色（旧 `_setupColorPicker` 的兜底分支）。 */
    api.setupString = (next) => api.value(next);

    /** props：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupColorPicker` 同口径）。 */
    api.setupObject = (setup) => {
      if (!isPlainObject(setup)) {
        return api;
      }

      const { alpha, change, color, onChange, open, palette, value, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        node.setup(elementConfig);
      }

      if (palette !== undefined) {
        api.palette(palette);
      }
      if (value !== undefined) {
        api.value(value);
      } else if (color !== undefined) {
        api.value(color);
      }
      if (alpha !== undefined) {
        api.alpha(alpha);
      }
      if (change !== undefined) {
        api.change(change);
      } else if (onChange !== undefined) {
        api.onChange(onChange);
      }
      if (open !== undefined) {
        api.open(open);
      }

      return api;
    };

    // 旧 `renderDom()` 猴补的等价物：落地时若已展开，补一次弹窗定位
    api.whenMount = () => {
      if (state.open) {
        positionPanel();
      }
    };

    // 旧 `destroy()` 猴补的等价物：解绑文档 / 窗口监听
    api.whenDestroy = () => {
      bindOutsideClose(false);
      bindReposition(false);
    };

    renderPalette();
    sync();
    return node;
  });
}

export const vColorPicker = createComponentShortcut(VColorPicker);

registerChildFactories(HtmlElementNode, { vColorPicker });

function normalizeColor(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  const short = /^#([0-9a-f]{3})$/i.exec(text);

  if (short) {
    return `#${short[1]
      .split('')
      .map((char) => char + char)
      .join('')
      .toLowerCase()}`;
  }

  return /^#[0-9a-f]{6}$/i.test(text) ? text.toLowerCase() : null;
}

function normalizeFavorites(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((color) => normalizeColor(color)).filter((color) => color !== null);
}
