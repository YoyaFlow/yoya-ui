import { HtmlElementNode } from '../html/index.js';
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
    this._rebuild();
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
    this._rebuild();
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
    this._rebuild();
    return this;
  }

  collapseAll() {
    this._expanded.clear();
    this._rebuild();
    return this;
  }

  visibleRowCount() {
    return this._flat.length;
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
    const walk = (list, depth) => {
      list.forEach((node) => {
        const key = String(this._nodeKey(node, index));
        index += 1;
        const hasChildren = this._hasChildren(node);
        out.push({ node, key, depth, hasChildren });
        if (hasChildren && this._expanded.has(key)) {
          walk(this._childNodes(node), depth + 1);
        }
      });
    };
    walk(this._nodes, 0);
    this._flat = out;
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
      this._rebuild();
      return;
    }
    if (this._childNodes(node).length === 0 && typeof this._lazyLoad === 'function') {
      Promise.resolve(this._lazyLoad(node)).then((loaded) => {
        node.children = Array.isArray(loaded) ? loaded : [];
        this._expanded.add(key);
        this._rebuild();
      });
      return;
    }
    this._expanded.add(key);
    this._rebuild();
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
    this._rebuild();
  }

  _rebuild() {
    this._flatten();
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
    const table = new HtmlElementNode('table')
      .className('yoya-vtreetable-table')
      .child(
        new HtmlElementNode('thead').child(headRow),
        new HtmlElementNode('tbody').child(...body)
      );
    replaceChildren(this, [table]);
    return this;
  }

  _renderRow(item, index) {
    const { node, key, depth, hasChildren } = item;
    const tr = new HtmlElementNode('tr').attr('data-row-key', key);

    const structureCell = new HtmlElementNode('td')
      .attr('data-depth', String(depth))
      .child(this._selection ? this._renderCheckbox(item) : null);

    if (hasChildren) {
      const open = this._expanded.has(key);
      structureCell.child(
        new HtmlElementNode('button')
          .className('yoya-vtreetable-expand')
          .attr({ type: 'button', 'data-role': 'expand', 'aria-expanded': open ? 'true' : 'false' })
          .style('marginLeft', `${depth * 16}px`)
          .text(open ? '▾' : '▸')
          .on('click', () => this._toggleExpand(item))
      );
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
