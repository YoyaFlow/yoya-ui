import { ViewNode, hasComponentIdentity } from '../core/node.js';
import { vNode } from '../core/v-node.js';
import { dd, div, dl, dt } from '../html/index.js';
import {
  createComponentShortcut,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  themeBorder,
  themeValue
} from '../components/shared.js';

/**
 * 详情列表（形态 B，票 15 §4）：`dl` 是视图根，条目是 `VDetailItem` 组件。
 *
 * - 身份写在结构里：根 `vn: 'VDetail'`；
 * - 状态与命令收进 `vNode` 闭包（`columns` / `column` / `items`）；
 * - props 分派：本组件的键走命令，其余按引擎的元素分派落根元素；**数组不再是 items**
 *   （按标准分派当子节点列表），要整批替换条目请用 `items([...])` 或 `vDetail({ items })`。
 */
export function VDetail() {
  return vNode((api) => {
    const state = { columns: 3 };
    const node = dl({ vn: 'VDetail' }).styles({
      border: themeBorder('color-border', '#d8dee8'),
      borderRadius: '8px',
      display: 'grid',
      gap: '0',
      margin: '0',
      overflow: 'hidden'
    });

    const applyColumns = () => {
      node.attr('data-columns', String(state.columns));
      node.style('gridTemplateColumns', `repeat(${state.columns}, minmax(0, 1fr))`);
    };

    api.columns = (value) => {
      if (value === undefined) {
        return state.columns;
      }

      state.columns = normalizeDetailColumns(value);
      applyColumns();
      return api;
    };

    api.column = (value) => api.columns(value);

    api.items = (value) => {
      if (value === undefined) {
        return node.children();
      }

      replaceChildren(node, []);

      if (Array.isArray(value)) {
        value.forEach((item) => {
          node.child(normalizeDetailItem(item));
        });
      }

      return api;
    };

    /** 节点 / 字符串 = 直接作为条目内容（旧 `_setupDetail` 的兜底分支）。 */
    api.setupString = (next) => {
      node.child(next);
      return api;
    };

    /** props：本组件的键走命令，其余按引擎的元素分派落根元素。 */
    api.setupObject = (setup) => {
      if (!isPlainObject(setup)) {
        return api;
      }

      const { column, columns, items, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        node.setup(elementConfig);
      }
      if (columns !== undefined) {
        api.columns(columns);
      }
      if (column !== undefined) {
        api.column(column);
      }
      if (items !== undefined) {
        api.items(items);
      }

      return api;
    };

    applyColumns();
    return node;
  });
}

export const vDetail = createComponentShortcut(VDetail);

/**
 * 详情项（形态 B，票 15 §4）：`div` 是视图根，标签位 `dt`、内容位 `dd` 各自带身份。
 *
 * - 身份写在结构里：根 `vn: 'VDetailItem'`、`VDetailLabel` / `VDetailValue`；
 * - 命令 `label` / `value` / `content`；**第二参不再被当作"值"**——两参写法
 *   `vDetailItem(label, value)` 请改 `vDetailItem({ label, value })`。
 */
export function VDetailItem() {
  return vNode((api) => {
    const labelBox = dt({ vn: 'VDetailLabel' }).styles({
      color: themeValue('color-text-secondary', '#475569'),
      fontWeight: '700',
      margin: '0',
      wordBreak: 'break-word'
    });
    const valueBox = dd({ vn: 'VDetailValue' }).styles({
      color: themeValue('color-text-strong', '#111827'),
      margin: '0',
      wordBreak: 'break-word'
    });
    const node = div({ vn: 'VDetailItem' }).styles({
      alignItems: 'start',
      display: 'grid',
      gap: '12px',
      gridTemplateColumns: 'minmax(96px, 1fr) minmax(0, 1.5fr)',
      padding: '12px 16px'
    });

    node.child(labelBox, valueBox);

    const syncLabelPresence = () => {
      const hasLabel = labelBox.children().length > 0;

      node.style(
        'gridTemplateColumns',
        hasLabel ? 'minmax(96px, 1fr) minmax(0, 1.5fr)' : 'minmax(0, 1fr)'
      );
      labelBox.style('display', hasLabel ? null : 'none');
      node.attr('data-label-visible', hasLabel ? 'true' : null);
    };

    api.label = (content) => {
      if (content === undefined) {
        return labelBox.textContent();
      }

      const hasContent = content !== null && content !== undefined && content !== '';

      replaceChildren(labelBox, hasContent ? normalizeChildren(content) : []);
      syncLabelPresence();
      return api;
    };

    api.value = (content) => {
      if (content === undefined) {
        return valueBox.textContent();
      }

      replaceChildren(valueBox, normalizeChildren(content));
      return api;
    };

    api.content = (content) => api.value(content);

    /** 字符串 / 节点 = 内容位（旧 `_setupDetailItem` 的兜底分支）。 */
    api.setupString = (content) => api.value(content);

    /** props：`label` / `value` / `content` / `text` / `children` 走内容位，其余按元素 options 写。 */
    api.setupObject = (setup) => {
      if (!isPlainObject(setup)) {
        return api;
      }

      const { children, content, label, text, value, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        node.setup(elementConfig);
      }
      if (label !== undefined) {
        api.label(label);
      }
      if (value !== undefined) {
        api.value(value);
      } else if (content !== undefined) {
        api.value(content);
      } else if (text !== undefined) {
        api.value(text);
      } else if (children !== undefined) {
        api.value(children);
      }

      return api;
    };

    syncLabelPresence();
    return node;
  });
}

export const vDetailItem = createComponentShortcut(VDetailItem);

function normalizeDetailItem(item) {
  if (hasComponentIdentity(item, 'VDetailItem')) {
    return item;
  }

  if (Array.isArray(item) && item.length >= 2) {
    return vDetailItem({ label: item[0], value: item[1] });
  }

  if (item instanceof ViewNode) {
    return vDetailItem({ value: item });
  }

  if (isPlainObject(item)) {
    return vDetailItem(item);
  }

  return vDetailItem({ value: item });
}

function normalizeDetailColumns(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric < 1) {
    return 1;
  }

  return Math.max(1, Math.floor(numeric));
}
