import { VTextNode } from '@yoyaflow/yoya-core/internal/core/node.js';
import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import {
  button,
  div,
  input,
  span,
  table,
  tbody,
  td,
  th,
  thead,
  tr
} from '@yoyaflow/yoya-core/html';
import { createComponentShortcut } from '../components/shared.js';

function normalizeColumn(value, index) {
  if (typeof value === 'string' || typeof value === 'number') {
    return { key: String(value), title: String(value), dataIndex: String(value) };
  }
  return { key: String(value?.key ?? index), ...value };
}

function readRowValue(node, column) {
  const dataIndex = column?.dataIndex ?? column?.key;
  return node?.[dataIndex];
}

function defaultRowKey(node, index) {
  return node?.id ?? index;
}

/**
 * 树形数据表格：行缩进、展开/折叠、父子选择联动、懒加载子树。
 *
 * 行常驻：所有节点都会渲染成 `<tr>`，展开/折叠只切换行的可见性（`hidden` 属性），
 * 不重建表格——因此 DOM 身份、焦点、表内滚动位置都不会丢。
 *
 * 迁移口径（票 15 §4）：class-as-component → 形态 B；结构全部走元素工厂 + `vn` 身份；
 * 行集合的对账走**公共 API**（`body.clearChildren().child(按序清单)`：留下的复用、
 * 清单外的销毁——与 `VRouterViews` 同一写法），引擎内部字段（`_children` / `_el` / insertBefore）
 * 不再直写；行归**自己造的一方**（容器自己记账，命令只写自己的快照）。
 */
export function VTreeTable({
  columns,
  expandedKeys,
  lazyLoad,
  nodes,
  rowKey,
  rowSelection,
  ...rest
} = {}) {
  const state = {
    checked: new Set(),
    columns: Array.isArray(columns) ? columns.map(normalizeColumn) : [],
    expanded: new Set(Array.isArray(expandedKeys) ? expandedKeys : []),
    lazyLoad: typeof lazyLoad === 'function' ? lazyLoad : null,
    nodes: Array.isArray(nodes) ? nodes : [],
    rowKey: typeof rowKey === 'function' ? rowKey : defaultRowKey,
    selection: Boolean(rowSelection)
  };
  let flat = [];
  let rows = new Map(); // key → { item, row, expander, symbol, checkbox }
  let bodyBox = null;
  let rootNode = null;

  const nodeKey = (node, index = 0) => state.rowKey(node, index);
  const hasChildren = (node) =>
    Boolean(node) &&
    (Boolean(node.hasChildren) || (Array.isArray(node.children) && node.children.length > 0));
  const childNodes = (node) => (Array.isArray(node.children) ? node.children : []);

  const flatten = () => {
    const out = [];
    let index = 0;
    const walk = (list, depth, ancestors) => {
      list.forEach((item) => {
        const key = String(nodeKey(item, index));
        index += 1;
        out.push({ node: item, key, depth, hasChildren: hasChildren(item), ancestors });
        // 全部节点都进 flat（行常驻），可见性由祖先的展开状态决定
        walk(childNodes(item), depth + 1, [...ancestors, key]);
      });
    };
    walk(state.nodes, 0, []);
    flat = out;
  };

  /** 祖先全部展开才可见；自身折叠不影响自己那一行。 */
  const isVisible = (item) => item.ancestors.every((key) => state.expanded.has(key));

  const descendantKeys = (node) => {
    const keys = [];
    const walk = (list) => {
      list.forEach((child) => {
        const key = String(nodeKey(child, 0));
        if (hasChildren(child)) {
          walk(childNodes(child));
        } else {
          keys.push(key);
        }
      });
    };
    walk(childNodes(node));
    return keys;
  };

  const stateForNode = (node) => {
    const descendants = descendantKeys(node);
    if (descendants.length === 0) {
      return { checked: state.checked.has(String(nodeKey(node, 0))), indeterminate: false };
    }
    const matching = descendants.filter((key) => state.checked.has(key)).length;
    return {
      checked: matching === descendants.length,
      indeterminate: matching > 0 && matching < descendants.length
    };
  };

  const syncCheckbox = (item, checkbox) => {
    const next = stateForNode(item.node);
    checkbox.attr('checked', next.checked ? true : null);
    checkbox.attr('data-indeterminate', next.indeterminate ? 'true' : null);
  };

  const syncCheckboxes = () => {
    flat.forEach((item) => {
      const entry = rows.get(item.key);
      if (entry?.checkbox) {
        syncCheckbox(item, entry.checkbox);
      }
    });
  };

  /** 展开态 → 行可见性 / 展开按钮状态；不重建任何行。 */
  const applyExpansion = () => {
    flat.forEach((item) => {
      const entry = rows.get(item.key);
      if (!entry) {
        return;
      }
      entry.row.attr('hidden', isVisible(item) ? null : true);
      if (entry.expander) {
        const open = state.expanded.has(item.key);
        entry.expander.attr('aria-expanded', open ? 'true' : 'false');
        // 展开符号是常驻文本节点：`element.child()` 是追加子节点，重复同步会越点越多
        entry.symbol.textContent(open ? '▾' : '▸');
      }
      // 懒加载出子节点后，祖先的勾选态可能从「全选」变成「半选」
      if (entry.checkbox) {
        syncCheckbox(item, entry.checkbox);
      }
    });
  };

  const renderCheckbox = (item) => {
    const next = stateForNode(item.node);
    return input({
      attrs: {
        'data-indeterminate': next.indeterminate ? 'true' : null,
        checked: next.checked ? true : null,
        type: 'checkbox'
      },
      onChange: () => toggleSelect(item),
      vn: 'VTreeTableSelect'
    });
  };

  const renderRow = (item, index) => {
    const { node, key, depth } = item;
    const row = tr({
      attrs: { 'data-row-key': key, hidden: isVisible(item) ? null : true },
      vn: 'VTreeTableRow'
    });
    // 先登记，勾选框 / 展开按钮的同步才有归属
    const entry = { item, row, expander: null, symbol: null, checkbox: null };
    rows.set(key, entry);

    const structureCell = td({ attrs: { 'data-depth': String(depth) } });
    if (state.selection) {
      entry.checkbox = renderCheckbox(item);
      structureCell.child(entry.checkbox);
    }

    if (item.hasChildren) {
      const open = state.expanded.has(key);
      entry.symbol = new VTextNode(open ? '▾' : '▸');
      entry.expander = button(
        {
          attrs: {
            'aria-expanded': open ? 'true' : 'false',
            'data-role': 'expand',
            type: 'button'
          },
          onClick: () => toggleExpand(item),
          style: { marginLeft: `${depth * 16}px` },
          vn: 'VTreeTableExpand'
        },
        (expander) => expander.child(entry.symbol)
      );
      structureCell.child(entry.expander);
    } else {
      structureCell.child(
        span({ style: { display: 'inline-block', width: `${depth * 16 + 16}px` } })
      );
    }

    row.child(structureCell);

    state.columns.forEach((column) => {
      const value = readRowValue(node, column);
      const content =
        typeof column.render === 'function'
          ? column.render(value, node, index)
          : String(value ?? '');
      row.child(td({ attrs: { 'data-key': column.key } }, (cell) => cell.child(content)));
    });

    return row;
  };

  /**
   * 数据形状变化（懒加载补子节点）时同步行集合：既有 key 复用原行节点，
   * 只为新 key 建行，并把子节点顺序对齐到展平结果——交给引擎的 `clearChildren().child(清单)`
   * （留下的复用、清单外的销毁），不再直写 `_children` / `_el`。
   */
  const syncRows = () => {
    const previous = rows;
    flatten();
    rows = new Map();

    const entries = flat.map((item, index) => {
      const existing = previous.get(item.key);
      if (existing) {
        existing.item = item;
        rows.set(item.key, existing);
        return existing;
      }
      renderRow(item, index);
      return rows.get(item.key);
    });

    if (!bodyBox) {
      return;
    }

    bodyBox.clearChildren().child(entries.map((entry) => entry.row));
  };

  const toggleExpand = (item) => {
    const { key, node, hasChildren: expandable } = item;
    if (!expandable) {
      return;
    }
    if (state.expanded.has(key)) {
      state.expanded.delete(key);
      applyExpansion();
      return;
    }
    if (childNodes(node).length === 0 && typeof state.lazyLoad === 'function') {
      Promise.resolve(state.lazyLoad(node)).then((loaded) => {
        node.children = Array.isArray(loaded) ? loaded : [];
        state.expanded.add(key);
        // 只补新子树的行走，既有行的 DOM 与焦点保持不变
        syncRows();
        applyExpansion();
      });
      return;
    }
    state.expanded.add(key);
    applyExpansion();
  };

  const toggleSelect = (item) => {
    const { node } = item;
    const key = String(nodeKey(node, 0));
    const descendants = descendantKeys(node);
    if (descendants.length === 0) {
      if (state.checked.has(key)) {
        state.checked.delete(key);
      } else {
        state.checked.add(key);
      }
    } else {
      const allChecked = descendants.every((childKey) => state.checked.has(childKey));
      descendants.forEach((childKey) => {
        if (allChecked) {
          state.checked.delete(childKey);
        } else {
          state.checked.add(childKey);
        }
      });
    }
    syncCheckboxes();
  };

  /** 表头 + 行集合整体造一份新表（列 / 数据 / 选择列变化时走它），行账同时归零。 */
  const buildTable = () => {
    flatten();
    rows = new Map();

    const headRow = tr({ vn: 'VTreeTableHeadRow' });
    const structureTh = th({ attrs: { 'data-role': 'structure' } });
    if (state.selection) {
      structureTh.child('选择');
    }
    headRow.child(structureTh);
    state.columns.forEach((column) =>
      headRow.child(
        th({ attrs: { 'data-key': column.key } }, (cell) =>
          cell.child(column.title ?? column.label ?? column.key ?? '')
        )
      )
    );

    bodyBox = tbody({ vn: 'VTreeTableBody' });
    flat.forEach((item, index) => bodyBox.child(renderRow(item, index)));

    return table({ vn: 'VTreeTableTable' }, (element) =>
      element.child(
        thead({ vn: 'VTreeTableHead' }, (head) => head.child(headRow)),
        bodyBox
      )
    );
  };

  /** 重建：整张表换新（视图根的子节点就是这一张表）。 */
  const rebuild = () => {
    if (rootNode) {
      rootNode.clearChildren().child(buildTable());
      applyExpansion();
    }
  };

  return vNode((api) => {
    api.columns = (next) => {
      if (next === undefined) {
        return state.columns.slice();
      }

      state.columns = Array.isArray(next) ? next.map(normalizeColumn) : [];
      rebuild();
      return api;
    };

    api.nodes = (next) => {
      if (next === undefined) {
        return state.nodes.slice();
      }

      state.nodes = Array.isArray(next) ? next : [];
      rebuild();
      return api;
    };

    api.rowKey = (next) => {
      if (next === undefined) {
        return state.rowKey;
      }

      state.rowKey = typeof next === 'function' ? next : defaultRowKey;
      return api;
    };

    api.rowSelection = (next) => {
      if (next === undefined) {
        return state.selection;
      }

      state.selection = Boolean(next);
      rebuild();
      return api;
    };

    api.lazyLoad = (next) => {
      if (next === undefined) {
        return state.lazyLoad;
      }

      state.lazyLoad = typeof next === 'function' ? next : null;
      return api;
    };

    api.expandedKeys = (next) => {
      if (next === undefined) {
        return Array.from(state.expanded);
      }

      state.expanded = new Set(Array.isArray(next) ? next : []);
      applyExpansion();
      return api;
    };

    api.expandKeys = (next) => api.expandedKeys(next);

    api.checkedKeys = (next) => {
      if (next === undefined) {
        return Array.from(state.checked);
      }

      state.checked = new Set(Array.isArray(next) ? next : []);
      syncCheckboxes();
      return api;
    };

    api.expandAll = () => {
      const walk = (list) => {
        list.forEach((item) => {
          const key = String(nodeKey(item));
          if (hasChildren(item)) {
            state.expanded.add(key);
            walk(childNodes(item));
          }
        });
      };
      walk(state.nodes);
      applyExpansion();
      return api;
    };

    api.collapseAll = () => {
      state.expanded.clear();
      applyExpansion();
      return api;
    };

    api.visibleRowCount = () => flat.filter((item) => isVisible(item)).length;

    // 结构（R2）：视图根就是外壳 div，里面只装这一张表；命令要换表时走 `rootNode`
    return div({ ...rest, vn: 'VTreeTable' }, (root) => {
      rootNode = root;
      root.child(buildTable());
    });
  });
}

export const vTreeTable = createComponentShortcut(VTreeTable, { props: true });
