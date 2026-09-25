import { vText } from '@yoyaflow/yoya-core/internal/core/index.js';
import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import { div, span } from '@yoyaflow/yoya-core/html';
import {
  createComponentShortcut,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  themeBorder,
  themeValue
} from '../components/shared.js';

const boardTones = {
  danger: themeValue('color-danger', '#dc2626'),
  neutral: themeValue('color-text-secondary', '#64748b'),
  primary: themeValue('color-primary', '#2563eb'),
  success: themeValue('color-success', '#16a34a'),
  warning: themeValue('color-warning', '#d97706')
};

const toneNames = new Set(Object.keys(boardTones));

/**
 * 数字看板（形态 B，票 15 §4）：响应式指标卡片网格，`div` 是视图根。
 *
 * - 身份写在结构里：根 `vn: 'VDigitalBoard'`；
 * - 状态与命令收进 `vNode` 闭包（`columns`）；
 * - props 分派：本组件的键走命令，其余按引擎的元素分派落根元素。
 */
export function VDigitalBoard() {
  return vNode((api) => {
    const state = { columns: null };
    const node = div({ vn: 'VDigitalBoard' }).styles({
      boxSizing: 'border-box',
      display: 'grid',
      gap: '16px',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
    });

    api.columns = (value) => {
      if (value === undefined) {
        return state.columns;
      }

      state.columns = value;
      const count = Number(value);

      node.style(
        'gridTemplateColumns',
        Number.isFinite(count) && count > 0
          ? `repeat(${count}, minmax(0, 1fr))`
          : 'repeat(auto-fit, minmax(220px, 1fr))'
      );
      return api;
    };

    /** 节点 / 字符串 = 直接作为看板内容（旧 `applyComponentSetup` 的兜底分支）。 */
    api.setupString = (next) => {
      node.child(next);
      return api;
    };

    /** props：`columns` 走命令，其余按引擎的元素分派落根元素。 */
    api.setupObject = (setup) => {
      if (!isPlainObject(setup)) {
        return api;
      }

      const { columns, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        node.setup(elementConfig);
      }
      if (columns !== undefined) {
        api.columns(columns);
      }

      return api;
    };

    return node;
  });
}

export const vDigitalBoard = createComponentShortcut(VDigitalBoard);

/**
 * 看板指标卡片（形态 B，票 15 §4）：标签、数值、单位、趋势与主题色。
 *
 * - 身份写在结构里：根 `vn: 'VDigitalBoardItem'` + 各部件身份
 *   （`VDigitalBoardItemAccent` / `Icon` / `Label` / `Top` / `Unit` / `ValueBox` / `Trend` / `Body`）；
 * - 状态与命令收进 `vNode` 闭包；props 键（`label` / `value` / `unit` / `trend` / `trendUp` / `tone` / `icon`）
 *   在组件上有同名命令就走命令，其余按元素 options 写（与旧 `applyComponentSetup` 同口径）。
 */
export function VDigitalBoardItem() {
  return vNode((api) => {
    const state = { tone: 'primary', trendUp: true };

    const accent = div({ vn: 'VDigitalBoardItemAccent' }).styles({
      bottom: '0',
      left: '0',
      position: 'absolute',
      top: '0',
      width: '4px'
    });
    const iconBox = div({ vn: 'VDigitalBoardItemIcon' }).styles({
      alignItems: 'center',
      display: 'none',
      flexShrink: '0',
      fontSize: '22px',
      height: '28px',
      justifyContent: 'center',
      width: '28px'
    });
    const labelNode = vText('');
    const valueNode = vText('');
    const unitNode = vText('');
    const trendNode = vText('');

    const labelBox = div({ vn: 'VDigitalBoardItemLabel' })
      .styles({
        color: themeValue('color-text-secondary', '#475569'),
        fontSize: '13px',
        lineHeight: '1.4'
      })
      .child(labelNode);
    const topRow = div({ vn: 'VDigitalBoardItemTop' })
      .styles({ alignItems: 'center', display: 'flex', gap: '10px' })
      .child(iconBox, labelBox);
    const unitBox = span({ vn: 'VDigitalBoardItemUnit' })
      .styles({
        color: themeValue('color-text-secondary', '#64748b'),
        fontSize: '13px',
        fontWeight: '400',
        lineHeight: '1'
      })
      .child(unitNode);
    const valueBox = div({ vn: 'VDigitalBoardItemValueBox' })
      .styles({
        alignItems: 'baseline',
        display: 'flex',
        gap: '6px',
        fontSize: '28px',
        fontWeight: '700',
        lineHeight: '1.2',
        marginTop: '6px'
      })
      .child(valueNode, unitBox);
    const trendBox = div({ vn: 'VDigitalBoardItemTrend' })
      .styles({
        fontSize: '13px',
        lineHeight: '1.4',
        marginTop: '8px'
      })
      .child(trendNode);
    const body = div({ vn: 'VDigitalBoardItemBody' })
      .styles({
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        minWidth: '0'
      })
      .child(topRow, valueBox, trendBox);
    const node = div({ vn: 'VDigitalBoardItem' }).styles({
      background: themeValue('color-surface', '#ffffff'),
      border: themeBorder('color-border', '#e2e8f0'),
      borderRadius: '10px',
      boxSizing: 'border-box',
      display: 'flex',
      minWidth: '0',
      overflow: 'hidden',
      padding: '16px 16px 16px 20px',
      position: 'relative'
    });

    node.child(accent, body);

    const applyTrendColor = () => {
      trendBox.style(
        'color',
        state.trendUp
          ? themeValue('color-success', '#16a34a')
          : themeValue('color-danger', '#dc2626')
      );
    };

    const applyTone = () => {
      const color = boardTones[state.tone];

      accent.style('background', color);
      iconBox.style('color', color);
      applyTrendColor();
    };

    api.label = (value) => {
      if (value === undefined) {
        return labelNode.textContent();
      }

      labelNode.textContent(value);
      return api;
    };

    api.value = (value) => {
      if (value === undefined) {
        return valueNode.textContent();
      }

      valueNode.textContent(value);
      return api;
    };

    api.unit = (value) => {
      if (value === undefined) {
        return unitNode.textContent();
      }

      unitNode.textContent(value);
      unitBox.style('display', value ? 'inline-block' : 'none');
      return api;
    };

    api.trend = (value) => {
      if (value === undefined) {
        return trendNode.textContent();
      }

      trendNode.textContent(value);
      trendBox.style('display', value ? 'block' : 'none');
      applyTrendColor();
      return api;
    };

    api.trendUp = (value) => {
      if (value === undefined) {
        return state.trendUp;
      }

      state.trendUp = Boolean(value);
      applyTrendColor();
      return api;
    };

    api.tone = (value) => {
      if (value === undefined) {
        return state.tone;
      }

      state.tone = toneNames.has(value) ? value : 'primary';
      applyTone();
      return api;
    };

    api.icon = (content) => {
      const visible = content !== null && content !== undefined && content !== '';

      iconBox.style('display', visible ? 'flex' : 'none');
      replaceChildren(iconBox, visible ? normalizeChildren(content) : []);
      return api;
    };

    /** 节点 / 字符串 = 直接作为卡片内容（旧 `applyComponentSetup` 的兜底分支）。 */
    api.setupString = (next) => {
      node.child(next);
      return api;
    };

    /** props：同名命令优先，其余按引擎的元素分派落根元素（与旧 `applyComponentSetup` 同口径）。 */
    api.setupObject = (setup) => {
      if (!isPlainObject(setup)) {
        return api;
      }

      const { icon, label, tone, trend, trendUp, unit, value, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        node.setup(elementConfig);
      }
      if (label !== undefined) {
        api.label(label);
      }
      if (value !== undefined) {
        api.value(value);
      }
      if (unit !== undefined) {
        api.unit(unit);
      }
      if (trend !== undefined) {
        api.trend(trend);
      }
      if (trendUp !== undefined) {
        api.trendUp(trendUp);
      }
      if (tone !== undefined) {
        api.tone(tone);
      }
      if (icon !== undefined) {
        api.icon(icon);
      }

      return api;
    };

    applyTone();
    return node;
  });
}

export const vDigitalBoardItem = createComponentShortcut(VDigitalBoardItem);
