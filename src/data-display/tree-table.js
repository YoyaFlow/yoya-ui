import { HtmlElementNode } from '../html/index.js';
import { VTextNode } from '../core/node.js';
import {
  componentClass,
  createComponentFactory,
  isPlainObject,
  replaceChildren
} from '../components/shared.js';

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
 */
export class VTreeTable extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this.className(componentClass, 'yoya-vtreetable');

    this._columns = [];
    this._nodes = [];
    this._rowKey = defaultRowKey;
    this._selection = false;
    this._expanded = new Set();
    this._checked = new Set();
    this._lazyLoad = null;
    this._flat = [];
    this._rows = new Map(); // key → { item, row, expander, symbol, checkbox }
    this._body = null;

    this._applySetup(setup);
    this._rebuild();
  }

  columns(value) {
    if (value === undefined) {
      return this._columns.slice();
    }
    this._columns = Array.isArray(value) ? value.map(normalizeColumn) : [];
    this._rebuild();
    return this;
  }

  nodes(value) {
    if (value === undefined) {
      return this._nodes.slice();
    }
    this._nodes = Array.isArray(value) ? value : [];
    this._rebuild();
    return this;
  }

  rowKey(handler) {
    if (handler === undefined) {
      return this._rowKey;
    }
    this._rowKey = typeof handler === 'function' ? handler : defaultRowKey;
    return this;
  }

  rowSelection(value) {
    if (value === undefined) {
      return this._selection;
    }
    this._selection = Boolean(value);
    this._rebuild();
    return this;
  }

  lazyLoad(handler) {
    if (handler === undefined) {
      return this._lazyLoad;
    }
    this._lazyLoad = typeof handler === 'function' ? handler : null;
    return this;
  }

  expandedKeys(value) {
    if (value === undefined) {
      return Array.from(this._expanded);
    }
    this._expanded = new Set(Array.isArray(value) ? value : []);
    this._applyExpansion();
    return this;
  }

  expandKeys(value) {
    return this.expandedKeys(value);
  }

  checkedKeys(value) {
    if (value === undefined) {
      return Array.from(this._checked);
    }
    this._checked = new Set(Array.isArray(value) ? value : []);
    this._syncCheckboxes();
    return this;
  }

  expandAll() {
    const walk = (list) => {
      list.forEach((node) => {
        const key = String(this._nodeKey(node));
        if (this._hasChildren(node)) {
          this._expanded.add(key);
          walk(this._childNodes(node));
        }
      });
    };
    walk(this._nodes);
    this._applyExpansion();
    return this;
  }

  collapseAll() {
    this._expanded.clear();
    this._applyExpansion();
    return this;
  }

  visibleRowCount() {
    return this._flat.filter((item) => this._isVisible(item)).length;
  }

  _nodeKey(node, index = 0) {
    return this._rowKey(node, index);
  }

  _hasChildren(node) {
    return (
      Boolean(node) &&
      (Boolean(node.hasChildren) || (Array.isArray(node.children) && node.children.length > 0))
    );
  }

  _childNodes(node) {
    return Array.isArray(node.children) ? node.children : [];
  }

  _applySetup(setup) {
    if (setup === null || setup === undefined) {
      return;
    }
    if (typeof setup === 'function') {
      setup(this);
      return;
    }
    if (isPlainObject(setup)) {
      const { columns, expandedKeys, lazyLoad, nodes, rowKey, rowSelection, ...rest } = setup;
      Object.keys(rest).forEach((key) => {
        if (rest[key] !== undefined) {
          this.attr(key, rest[key]);
        }
      });
      if (columns !== undefined) this.columns(columns);
      if (rowKey !== undefined) this.rowKey(rowKey);
      if (nodes !== undefined) this.nodes(nodes);
      if (rowSelection !== undefined) this.rowSelection(rowSelection);
      if (lazyLoad !== undefined) this.lazyLoad(lazyLoad);
      if (expandedKeys !== undefined) this.expandedKeys(expandedKeys);
    }
  }

  _flatten() {
    const out = [];
    let index = 0;
    const walk = (list, depth, ancestors) => {
      list.forEach((node) => {
        const key = String(this._nodeKey(node, index));
        index += 1;
        const hasChildren = this._hasChildren(node);
        out.push({ node, key, depth, hasChildren, ancestors });
        // 全部节点都进 _flat（行常驻），可见性由祖先的展开状态决定
        walk(this._childNodes(node), depth + 1, [...ancestors, key]);
      });
    };
    walk(this._nodes, 0, []);
    this._flat = out;
  }

  /** 祖先全部展开才可见；自身折叠不影响自己那一行。 */
  _isVisible(item) {
    return item.ancestors.every((key) => this._expanded.has(key));
  }

  _descendantKeys(node) {
    const keys = [];
    const walk = (list) => {
      list.forEach((child) => {
        const key = String(this._nodeKey(child, 0));
        if (this._hasChildren(child)) {
          walk(this._childNodes(child));
        } else {
          keys.push(key);
        }
      });
    };
    walk(this._childNodes(node));
    return keys;
  }

  _stateForNode(node) {
    const descendantKeys = this._descendantKeys(node);
    if (descendantKeys.length === 0) {
      const key = String(this._nodeKey(node, 0));
      return { checked: this._checked.has(key), indeterminate: false };
    }
    const matching = descendantKeys.filter((key) => this._checked.has(key)).length;
    return {
      checked: matching === descendantKeys.length,
      indeterminate: matching > 0 && matching < descendantKeys.length
    };
  }

  _toggleExpand(item) {
    const { key, node, hasChildren } = item;
    if (!hasChildren) {
      return;
    }
    if (this._expanded.has(key)) {
      this._expanded.delete(key);
      this._applyExpansion();
      return;
    }
    if (this._childNodes(node).length === 0 && typeof this._lazyLoad === 'function') {
      Promise.resolve(this._lazyLoad(node)).then((loaded) => {
        node.children = Array.isArray(loaded) ? loaded : [];
        this._expanded.add(key);
        // 只补新子树的行走，既有行的 DOM 与焦点保持不变
        this._syncRows();
        this._applyExpansion();
      });
      return;
    }
    this._expanded.add(key);
    this._applyExpansion();
  }

  _toggleSelect(item) {
    const { node } = item;
    const key = String(this._nodeKey(node, 0));
    const descendants = this._descendantKeys(node);
    if (descendants.length === 0) {
      if (this._checked.has(key)) {
        this._checked.delete(key);
      } else {
        this._checked.add(key);
      }
    } else {
      const allChecked = descendants.every((childKey) => this._checked.has(childKey));
      descendants.forEach((childKey) => {
        if (allChecked) {
          this._checked.delete(childKey);
        } else {
          this._checked.add(childKey);
        }
      });
    }
    this._syncCheckboxes();
  }

  _rebuild() {
    this._flatten();
    this._rows = new Map();
    const headRow = new HtmlElementNode('tr');
    const treeTh = new HtmlElementNode('th').attr('data-role', 'structure');
    if (this._selection) {
      treeTh.text('选择');
    }
    headRow.child(treeTh);
    this._columns.forEach((column) =>
      headRow.child(
        new HtmlElementNode('th')
          .attr('data-key', column.key)
          .text(column.title ?? column.label ?? column.key ?? '')
      )
    );

    const body = this._flat.map((item, index) => this._renderRow(item, index));
    this._body = new HtmlElementNode('tbody').child(...body);
    const table = new HtmlElementNode('table')
      .className('yoya-vtreetable-table')
      .child(new HtmlElementNode('thead').child(headRow), this._body);
    replaceChildren(this, [table]);
    this._applyExpansion();
    return this;
  }

  /** 展开态 → 行可见性 / 展开按钮状态；不重建任何行。 */
  _applyExpansion() {
    this._flat.forEach((item) => {
      const entry = this._rows.get(item.key);
      if (!entry) {
        return;
      }
      const visible = this._isVisible(item);
      if (visible) {
        entry.row.attr('hidden', null);
      } else {
        entry.row.attr('hidden', true);
      }
      if (entry.expander) {
        const open = this._expanded.has(item.key);
        entry.expander.attr('aria-expanded', open ? 'true' : 'false');
        // 展开符号是常驻文本节点：`element.text()` 是追加子节点，重复同步会越点越多
        entry.symbol.textContent(open ? '▾' : '▸');
      }
      // 懒加载出子节点后，祖先的勾选态可能从「全选」变成「半选」
      if (entry.checkbox) {
        this._syncCheckbox(item, entry.checkbox);
      }
    });
    return this;
  }

  /**
   * 数据形状变化（懒加载补子节点）时同步行集合：既有 key 复用原行节点，
   * 只为新 key 建行，并把 node 子节点顺序与真实 DOM 顺序都对齐到展平结果。
   * 与 `_rebuild()` 的区别是不销毁既有行——挂载中的焦点与 DOM 身份都保住。
   */
  _syncRows() {
    const previous = this._rows;
    this._flatten();
    this._rows = new Map();

    const entries = this._flat.map((item, index) => {
      const existing = previous.get(item.key);
      if (existing) {
        existing.item = item;
        this._rows.set(item.key, existing);
        return existing;
      }
      this._renderRow(item, index);
      return this._rows.get(item.key);
    });

    if (!this._body) {
      return this;
    }

    this._body._children = entries.map((entry) => entry.row);
    const host = this._body._el;
    if (host) {
      // 倒序处理：处理到第 i 行时，第 i+1 行已经就位，插到它前面即可保序
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        const entry = entries[index];
        const element = entry.row._el || entry.row.renderDom();
        if (!element) {
          continue;
        }
        const next = index + 1 < entries.length ? entries[index + 1].row._el : null;
        if (element.parentNode !== host || element.nextSibling !== next) {
          host.insertBefore(element, next);
        }
      }
    }

    // 数据被替换后不再存在的行：销毁并从 map 之外收尾
    previous.forEach((entry, key) => {
      if (!this._rows.has(key)) {
        entry.row.destroy();
      }
    });

    return this;
  }

  _syncCheckboxes() {
    this._flat.forEach((item) => {
      const entry = this._rows.get(item.key);
      if (entry?.checkbox) {
        this._syncCheckbox(item, entry.checkbox);
      }
    });
    return this;
  }

  _syncCheckbox(item, checkbox) {
    const state = this._stateForNode(item.node);
    checkbox.attr('checked', state.checked ? true : null);
    checkbox.attr('data-indeterminate', state.indeterminate ? 'true' : null);
    return this;
  }

  _renderRow(item, index) {
    const { node, key, depth, hasChildren } = item;
    const tr = new HtmlElementNode('tr').attr({
      'data-row-key': key,
      hidden: this._isVisible(item) ? null : true
    });
    // 先登记，勾选框 / 展开按钮的同步才有归属
    const entry = { item, row: tr, expander: null, symbol: null, checkbox: null };
    this._rows.set(key, entry);

    const structureCell = new HtmlElementNode('td').attr('data-depth', String(depth));
    if (this._selection) {
      entry.checkbox = this._renderCheckbox(item);
      structureCell.child(entry.checkbox);
    }

    if (hasChildren) {
      const open = this._expanded.has(key);
      entry.symbol = new VTextNode(open ? '▾' : '▸');
      entry.expander = new HtmlElementNode('button')
        .className('yoya-vtreetable-expand')
        .attr({ type: 'button', 'data-role': 'expand', 'aria-expanded': open ? 'true' : 'false' })
        .style('marginLeft', `${depth * 16}px`)
        .child(entry.symbol)
        .on('click', () => this._toggleExpand(item));
      structureCell.child(entry.expander);
    } else {
      structureCell.child(
        new HtmlElementNode('span')
          .style('display', 'inline-block')
          .style('width', `${depth * 16 + 16}px`)
      );
    }

    tr.child(structureCell);

    this._columns.forEach((column) => {
      const value = readRowValue(node, column);
      const content =
        typeof column.render === 'function'
          ? column.render(value, node, index)
          : String(value ?? '');
      tr.child(new HtmlElementNode('td').attr('data-key', column.key).child(content));
    });

    return tr;
  }

  _renderCheckbox(item) {
    const { node } = item;
    const state = this._stateForNode(node);
    return new HtmlElementNode('input')
      .className('yoya-vtreetable-select')
      .attr({
        type: 'checkbox',
        checked: state.checked ? true : null,
        'data-indeterminate': state.indeterminate ? 'true' : null
      })
      .on('change', () => this._toggleSelect(item));
  }
}

export function vTreeTable(first = null, second = null, third = null) {
  return createComponentFactory(VTreeTable, first, second, third);
}
