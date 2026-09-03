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

function fixedStyle(position) {
  if (position === 'left') {
    return { position: 'sticky', left: '0', zIndex: '1' };
  }
  if (position === 'right') {
    return { position: 'sticky', right: '0', zIndex: '1' };
  }
  return {};
}

/**
 * 列配置驱动的增强表格：排序、筛选、跨分页行选择、分页联动、
 * 行展开、单元格编辑+校验、列固定与拖拽调序、虚拟滚动。
 */
export class VSuperTable extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this.className(componentClass, 'yoya-vsupertable');

    this._columns = [];
    this._rows = [];
    this._rowKey = defaultRowKey;
    this._selection = false;
    this._pagination = false;
    this._pageSize = 10;
    this._page = 1;
    this._selectedKeys = new Set();
    this._sort = { key: null, order: null };
    this._filters = new Map();
    this._changeHandler = null;
    this._expandable = null;
    this._expandedRows = new Set();
    this._editing = null;
    this._editingColumn = null;
    this._editorOverlay = null;
    this._editorInput = null;
    this._editError = null;
    this._dragStore = null;
    this._virtual = false;
    this._itemHeight = 40;
    this._overscan = 5;
    this._scrollTop = 0;
    this._viewportHeight = 0;

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
    this._sort =
      value && value.key
        ? { key: value.key, order: value.order || null }
        : { key: null, order: null };
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

  expandable(handler) {
    if (handler === undefined) {
      return this._expandable;
    }
    this._expandable = typeof handler === 'function' ? handler : null;
    this._render();
    return this;
  }

  expandedRowKeys(value) {
    if (value === undefined) {
      return Array.from(this._expandedRows);
    }
    this._expandedRows = new Set(Array.isArray(value) ? value : []);
    this._render();
    return this;
  }

  virtualize(value) {
    if (value === undefined) {
      return this._virtual;
    }
    this._virtual = Boolean(value);
    if (this._virtual) {
      this._pagination = false;
    }
    this._scrollTop = 0;
    this._viewportHeight = 0;
    this._render();
    return this;
  }

  itemHeight(value) {
    if (value === undefined) {
      return this._itemHeight;
    }
    this._itemHeight = Number(value) > 0 ? Number(value) : this._itemHeight;
    return this;
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
        expandable,
        expandedRowKeys,
        itemHeight,
        onChange,
        page,
        pageSize,
        pagination,
        rowKey,
        rowSelection,
        rows,
        selectedRowKeys,
        sort,
        virtualize,
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
      if (expandable !== undefined) this.expandable(expandable);
      if (expandedRowKeys !== undefined) this.expandedRowKeys(expandedRowKeys);
      if (itemHeight !== undefined) this.itemHeight(itemHeight);
      if (virtualize !== undefined) this.virtualize(virtualize);
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
          const cmp =
            typeof av === 'number' && typeof bv === 'number'
              ? av - bv
              : String(av).localeCompare(String(bv), undefined, { numeric: true });
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

  _beginEdit(row, column, tdEl) {
    const rect =
      tdEl && typeof tdEl.getBoundingClientRect === 'function'
        ? tdEl.getBoundingClientRect()
        : null;
    this._editing = { rowKey: String(this._rowKey(row, 0)), columnKey: column.key };
    this._editingColumn = column;
    this._editError = null;
    this._openEditorOverlay(row, column, rect);
  }

  _openEditorOverlay(row, column, rect) {
    if (typeof document === 'undefined' || !document.body) {
      return;
    }
    this._closeEditor();

    const value = readRowValue(row, column);
    const overlay = new HtmlElementNode('div').className('yoya-vsupertable-editor').style(
      rect
        ? {
            left: `${rect.left}px`,
            minHeight: `${rect.height}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`
          }
        : {}
    );

    const editor =
      typeof column.editor === 'function'
        ? column.editor(value, {
            commit: (next) => this._submitEdit(next === undefined ? value : next),
            cancel: () => this._cancelEdit()
          })
        : null;

    if (editor) {
      overlay.child(editor);
    } else {
      const input = new HtmlElementNode('input')
        .attr({ type: 'text', value: String(value ?? '') })
        .on('keydown', (event) => {
          if (event.key === 'Enter') {
            this._submitEdit(event.target.value);
          } else if (event.key === 'Escape') {
            this._cancelEdit();
          }
        })
        .on('blur', (event) => this._submitEdit(event.target.value));
      overlay.child(input);
      this._editorInput = input;
    }

    overlay.bindTo(document.body);
    this._editorOverlay = overlay;
    if (this._editorInput && this._editorInput._el) {
      this._editorInput._el.focus();
    }
  }

  _submitEdit(value) {
    const column = this._editingColumn;
    if (!column) {
      return;
    }
    const error = column.validate ? column.validate(value) : null;
    if (error) {
      this._editError = error;
      if (this._editorOverlay) {
        this._editorOverlay.attr('data-error', 'true');
      }
      return;
    }
    this._finishEdit(true, value);
  }

  _cancelEdit() {
    this._finishEdit(false);
  }

  _finishEdit(commit, value) {
    const column = this._editingColumn;
    const rowKey = this._editing ? this._editing.rowKey : null;
    this._closeEditor();
    this._editing = null;
    this._editingColumn = null;
    this._editError = null;
    if (!commit || !column) {
      return;
    }
    let row = null;
    if (rowKey !== null && rowKey !== undefined) {
      row = this._rows.find((entry, index) => String(this._rowKey(entry, index)) === rowKey);
    }
    const dataIndex = column.dataIndex || column.key;
    if (row && dataIndex) {
      row[dataIndex] = value;
    }
    this._emit();
    this._render();
  }

  _closeEditor() {
    if (this._editorOverlay) {
      this._editorOverlay.destroy();
      this._editorOverlay = null;
    }
    this._editorInput = null;
  }

  _dragStart(column, event) {
    this._dragStore = column.key;
    event.dataTransfer.effectAllowed = 'move';
  }

  _dropColumn(targetColumn, event) {
    event.preventDefault();
    const sourceKey = this._dragStore;
    if (!sourceKey || sourceKey === targetColumn.key) {
      this._dragStore = null;
      return;
    }
    const from = this._columns.findIndex((c) => c.key === sourceKey);
    const to = this._columns.findIndex((c) => c.key === targetColumn.key);
    if (from === -1 || to === -1) {
      this._dragStore = null;
      return;
    }
    const columns = this._columns.slice();
    const [moved] = columns.splice(from, 1);
    columns.splice(to, 0, moved);
    this._columns = columns;
    this._dragStore = null;
    this._render();
  }

  _onVirtualScroll(event) {
    this._scrollTop = Number(event.target.scrollTop) || 0;
    this._viewportHeight = Number(event.target.clientHeight) || 0;
    this._render();
  }

  _render() {
    const processed = this._process();
    const total = processed.length;
    const pageCount = this._pageCount(total);
    this._page = Math.min(Math.max(1, this._page), pageCount);
    const pageStart = this._pagination ? (this._page - 1) * this._pageSize : 0;
    const pageRows = this._pagination
      ? processed.slice(pageStart, pageStart + this._pageSize)
      : processed;

    let bodyRows = pageRows;
    if (this._virtual) {
      const ih = this._itemHeight;
      const startIdx = Math.max(0, Math.floor(this._scrollTop / ih) - this._overscan);
      const endIdx = Math.min(
        total,
        Math.ceil((this._scrollTop + this._viewportHeight) / ih) + this._overscan
      );
      bodyRows = processed.slice(startIdx, endIdx);
    }

    const headRow = new HtmlElementNode('tr');
    if (this._selection) {
      headRow.child(this._th(null));
    }
    if (this._expandable) {
      headRow.child(this._th(null));
    }
    this._columns.forEach((column) => headRow.child(this._renderHeader(column)));

    const body = [];
    bodyRows.forEach((row, index) => {
      body.push(...this._renderRows(row, index));
    });

    const table = new HtmlElementNode('table')
      .className('yoya-vsupertable-table')
      .child(
        new HtmlElementNode('thead').child(headRow),
        new HtmlElementNode('tbody').child(...body)
      );

    const children = [];
    if (this._virtual) {
      children.push(
        new HtmlElementNode('div')
          .className('yoya-vsupertable-viewport')
          .style('height', `${Math.max(120, total * this._itemHeight)}px`)
          .style('overflowY', 'auto')
          .child(table)
          .on('scroll', (event) => this._onVirtualScroll(event))
      );
    } else {
      children.push(table);
      if (this._pagination) {
        children.push(this._renderFooter(pageCount));
      }
    }

    replaceChildren(this, children);
    if (this._virtual && this._el) {
      const viewport = this._el.querySelector('.yoya-vsupertable-viewport');
      if (viewport) {
        viewport.scrollTop = this._scrollTop;
      }
    }
    return this;
  }

  _th() {
    return new HtmlElementNode('th');
  }

  _renderHeader(column) {
    const th = new HtmlElementNode('th')
      .attr('data-key', column.key)
      .attr(column.fixed ? { 'data-fixed': column.fixed } : {})
      .attr('data-col', column.key)
      .attr('draggable', true)
      .style(fixedStyle(column.fixed))
      .on('dragstart', (event) => this._dragStart(column, event))
      .on('dragover', (event) => event.preventDefault())
      .on('drop', (event) => this._dropColumn(column, event));

    th.child(
      new HtmlElementNode('span')
        .className('yoya-vsupertable-th-label')
        .text(column.title ?? column.label ?? column.key ?? '')
    );

    if (column.sorter) {
      const order = this._sort.key === column.key ? this._sort.order : null;
      const mark = order === 'asc' ? ' ↑' : order === 'desc' ? ' ↓' : ' ⇅';
      th.child(
        new HtmlElementNode('button')
          .className('yoya-vsupertable-sort')
          .attr({ type: 'button', 'data-sort': '' })
          .text(mark)
          .on('click', () => this._toggleSort(column.key))
      );
    }

    if (Array.isArray(column.filterOptions)) {
      const select = new HtmlElementNode('select')
        .className('yoya-vsupertable-filter')
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

  _renderRows(row, index) {
    const key = String(this._rowKey(row, index));
    const tr = new HtmlElementNode('tr').attr('data-row-key', key);

    if (this._selection) {
      const checked = this._selectedKeys.has(key);
      tr.child(
        new HtmlElementNode('td').child(
          new HtmlElementNode('input')
            .attr({ type: 'checkbox', checked: checked ? true : null })
            .on('change', () => this._toggleSelect(key))
        )
      );
    }

    if (this._expandable) {
      const open = this._expandedRows.has(key);
      tr.child(
        new HtmlElementNode('td').child(
          new HtmlElementNode('button')
            .className('yoya-vsupertable-row-expand')
            .attr({
              type: 'button',
              'data-role': 'row-expand',
              'aria-expanded': open ? 'true' : 'false'
            })
            .text(open ? '−' : '+')
            .on('click', () => {
              if (this._expandedRows.has(key)) {
                this._expandedRows.delete(key);
              } else {
                this._expandedRows.add(key);
              }
              this._render();
            })
        )
      );
    }

    this._columns.forEach((column) => tr.child(this._renderCell(row, column, index)));

    const detailColumnCount =
      this._columns.length + (this._selection ? 1 : 0) + (this._expandable ? 1 : 0);
    const expanded = this._expandable && this._expandedRows.has(key);
    const detail = expanded && this._expandable ? this._expandable(row, index) : null;

    if (detail) {
      const detailRow = new HtmlElementNode('tr').attr('data-role', 'row-detail');
      detailRow.child(
        new HtmlElementNode('td').attr('colspan', String(detailColumnCount)).child(detail)
      );
      return [tr, detailRow];
    }

    return [tr];
  }

  _renderCell(row, column, index) {
    const value = readRowValue(row, column);
    const td = new HtmlElementNode('td')
      .attr('data-key', column.key)
      .attr(column.fixed ? { 'data-fixed': column.fixed } : {})
      .style(fixedStyle(column.fixed));

    if (column.editable) {
      td.attr('data-editable', 'true');
      td.attr('data-role', 'cell-edit');
      td.on('dblclick', (event) => this._beginEdit(row, column, event.currentTarget));
    }

    const content =
      typeof column.render === 'function' ? column.render(value, row, index) : String(value ?? '');
    td.child(content);
    return td;
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
