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

function defaultRowKey(row, index) {
  return row?.id ?? index;
}

function readRowValue(row, column) {
  const dataIndex = column?.dataIndex ?? column?.key;
  if (!dataIndex) {
    return row?.[column?.key];
  }
  return row?.[dataIndex];
}

/**
 * 列配置驱动的增强表格：排序、筛选、跨分页行选择、分页联动。
 */
export class VSuperTable extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this.className(componentClass, 'yoya-vsupertable');

    this._columns = [];
    this._rows = [];
    this._rowKey = defaultRowKey;
    this._pagination = false;
    this._pageSize = 10;
    this._page = 1;
    this._selectedKeys = new Set();
    this._sort = { key: null, order: null };
    this._filters = new Map();
    this._changeHandler = null;

    this._applySetup(setup);
    this._render();
  }

  columns(value) {
    if (value === undefined) {
      return this._columns.slice();
    }
    this._columns = Array.isArray(value) ? value.map(normalizeColumn) : [];
    this._render();
    return this;
  }

  rows(value) {
    if (value === undefined) {
      return this._rows.slice();
    }
    this._rows = Array.isArray(value) ? value.slice() : [];
    this._page = 1;
    this._render();
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
    return this;
  }

  pagination(value) {
    if (value === undefined) {
      return this._pagination;
    }
    if (value === true) {
      this._pagination = true;
      this._pageSize = 10;
    } else if (value === false || value === null) {
      this._pagination = false;
    } else if (isPlainObject(value)) {
      this._pagination = true;
      this._pageSize = Number(value.pageSize) > 0 ? Number(value.pageSize) : 10;
    } else {
      this._pagination = Boolean(value);
    }
    this._page = 1;
    this._render();
    return this;
  }

  pageSize(value) {
    if (value === undefined) {
      return this._pageSize;
    }
    this._pageSize = Number(value) > 0 ? Number(value) : this._pageSize;
    this._page = 1;
    this._render();
    return this;
  }

  page(value) {
    if (value === undefined) {
      return this._page;
    }
    this._page = Math.max(1, Number(value) || 1);
    this._render();
    return this;
  }

  selectedRowKeys(value) {
    if (value === undefined) {
      return Array.from(this._selectedKeys);
    }
    this._selectedKeys = new Set(Array.isArray(value) ? value : []);
    this._render();
    return this;
  }

  sort(value) {
    if (value === undefined) {
      return this._sort;
    }
    this._sort = value && value.key ? { key: value.key, order: value.order || null } : { key: null, order: null };
    this._render();
    return this;
  }

  change(handler) {
    if (handler === undefined) {
      return this._changeHandler;
    }
    this._changeHandler = typeof handler === 'function' ? handler : null;
    return this;
  }

  onChange(handler) {
    return this.change(handler);
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
      const {
        change: changeHandler,
        columns,
        onChange,
        page,
        pageSize,
        pagination,
        rowKey,
        rowSelection,
        rows,
        selectedRowKeys,
        sort,
        ...rest
      } = setup;
      Object.keys(rest).forEach((key) => {
        if (rest[key] !== undefined) {
          this.attr(key, rest[key]);
        }
      });
      if (columns !== undefined) this.columns(columns);
      if (rowKey !== undefined) this.rowKey(rowKey);
      if (rows !== undefined) this.rows(rows);
      if (pagination !== undefined) this.pagination(pagination);
      if (pageSize !== undefined) this.pageSize(pageSize);
      if (page !== undefined) this.page(page);
      if (sort !== undefined) this.sort(sort);
      if (rowSelection !== undefined) this.rowSelection(rowSelection);
      if (selectedRowKeys !== undefined) this.selectedRowKeys(selectedRowKeys);
      if (changeHandler !== undefined) this.change(changeHandler);
      if (onChange !== undefined) this.change(onChange);
    }
  }

  _process() {
    let rows = this._rows.slice();

    this._filters.forEach((value, key) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      const column = this._columns.find((col) => col.key === key);
      rows = rows.filter((row) => {
        const left = readRowValue(row, column);
        return left !== undefined && String(left) === String(value);
      });
    });

    if (this._sort.order) {
      const column = this._columns.find((col) => col.key === this._sort.key);
      if (column) {
        const direction = this._sort.order === 'asc' ? 1 : -1;
        rows = rows.slice().sort((a, b) => {
          const av = readRowValue(a, column);
          const bv = readRowValue(b, column);
          if (av === bv) return 0;
          if (av === undefined || av === null) return 1;
          if (bv === undefined || bv === null) return -1;
          const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true });
          return cmp * direction;
        });
      }
    }

    return rows;
  }

  _pageCount(total) {
    return this._pagination ? Math.max(1, Math.ceil(total / this._pageSize)) : 1;
  }

  _emit() {
    if (!this._changeHandler) {
      return;
    }
    this._changeHandler({
      sort: this._sort,
      filters: Object.fromEntries(this._filters),
      pagination: this._pagination ? { current: this._page, pageSize: this._pageSize } : undefined,
      selectedKeys: this.selectedRowKeys()
    });
  }

  _toggleSort(key) {
    const current = this._sort.key === key ? this._sort.order : null;
    const next = current === 'asc' ? 'desc' : current === 'desc' ? null : 'asc';
    this._sort = { key, order: next };
    this._render();
    this._emit();
  }

  _applyFilter(key, value) {
    if (value === undefined || value === null || value === '') {
      this._filters.delete(key);
    } else {
      this._filters.set(key, value);
    }
    this._page = 1;
    this._render();
    this._emit();
  }

  _toggleSelect(key) {
    if (this._selectedKeys.has(key)) {
      this._selectedKeys.delete(key);
    } else {
      this._selectedKeys.add(key);
    }
    this._render();
    this._emit();
  }

  _setPage(next) {
    const pageCount = this._pageCount(this._process().length);
    const clamped = Math.min(Math.max(1, next), pageCount);
    if (clamped === this._page) {
      return;
    }
    this._page = clamped;
    this._render();
    this._emit();
  }

  _render() {
    const processed = this._process();
    const total = processed.length;
    const pageCount = this._pageCount(total);
    this._page = Math.min(Math.max(1, this._page), pageCount);
    const start = this._pagination ? (this._page - 1) * this._pageSize : 0;
    const pageRows = this._pagination ? processed.slice(start, start + this._pageSize) : processed;

    const headRow = new HtmlElementNode('tr');
    if (this._selection) {
      headRow.child(this._th(null));
    }
    this._columns.forEach((column) => headRow.child(this._renderHeader(column)));

    const body = pageRows.map((row, index) => this._renderRow(row, index));

    const table = new HtmlElementNode('table')
      .className('yoya-vsupertable-table')
      .child(new HtmlElementNode('thead').child(headRow), new HtmlElementNode('tbody').child(...body));

    const children = [table];
    if (this._pagination) {
      children.push(this._renderFooter(pageCount));
    }
    replaceChildren(this, children);
    return this;
  }

  _th(content) {
    return new HtmlElementNode('th').attr({ 'data-key': null })
      .attr((content && content.key) ? { 'data-key': content.key } : {})
      .child(content);
  }

  _renderHeader(column) {
    const th = new HtmlElementNode('th').attr('data-key', column.key);

    const label = new HtmlElementNode('span').text(column.title ?? column.label ?? column.key ?? '');
    th.child(label);

    if (column.sorter) {
      const order = this._sort.key === column.key ? this._sort.order : null;
      const mark = order === 'asc' ? ' ↑' : order === 'desc' ? ' ↓' : ' ⇅';
      th.child(
        new HtmlElementNode('button')
          .attr({ type: 'button', 'data-sort': '' })
          .text(mark)
          .on('click', () => this._toggleSort(column.key))
      );
    }

    if (Array.isArray(column.filterOptions)) {
      const select = new HtmlElementNode('select')
        .attr('data-filter', column.key)
        .child(
          column.filterOptions.map((option) => {
            const el = new HtmlElementNode('option').attr('value', option.value).text(option.label);
            if (this._filters.get(column.key) === option.value) {
              el.attr('selected', true);
            }
            return el;
          })
        )
        .on('change', (event) => this._applyFilter(column.key, event.target.value));
      th.child(select);
    }

    return th;
  }

  _renderRow(row, index) {
    const key = this._rowKey(row, index);
    const tr = new HtmlElementNode('tr').attr('data-row-key', String(key));

    if (this._selection) {
      const keyStr = String(key);
      const checked = this._selectedKeys.has(keyStr);
      const box = new HtmlElementNode('input')
        .attr({ type: 'checkbox', checked: checked ? true : null })
        .on('change', () => this._toggleSelect(keyStr));
      tr.child(new HtmlElementNode('td').child(box));
    }

    this._columns.forEach((column) => {
      const value = readRowValue(row, column);
      const content =
        typeof column.render === 'function' ? column.render(value, row, index) : String(value ?? '');
      const td = new HtmlElementNode('td').attr('data-key', column.key).child(content);
      tr.child(td);
    });

    return tr;
  }

  _renderFooter(pageCount) {
    const footer = new HtmlElementNode('div').className('yoya-vsupertable-footer');
    footer.child(
      new HtmlElementNode('button')
        .attr({ type: 'button', 'data-testid': 'page-prev' })
        .text('‹')
        .on('click', () => this._setPage(this._page - 1)),
      new HtmlElementNode('span').text(`第 ${this._page} / ${pageCount} 页`),
      new HtmlElementNode('button')
        .attr({ type: 'button', 'data-testid': 'page-next' })
        .text('›')
        .on('click', () => this._setPage(this._page + 1))
    );
    return footer;
  }
}

export function vSuperTable(first = null, second = null, third = null) {
  return createComponentFactory(VSuperTable, first, second, third);
}
