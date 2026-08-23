import { ViewNode } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import {
  componentClass,
  createComponentFactory,
  isPlainObject,
  normalizeChildren,
  replaceChildren
} from '../components/shared.js';

export class VTable extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._columns = [];
    this._rows = [];
    this._emptyContent = '暂无数据';
    this._captionBox = new HtmlElementNode('caption').className('yoya-vtable-caption');
    this._head = new HtmlElementNode('thead').className('yoya-vtable-head');
    this._body = new HtmlElementNode('tbody').className('yoya-vtable-body');
    this._table = new HtmlElementNode('table').className('yoya-vtable-table');
    this._scroll = new HtmlElementNode('div').className('yoya-vtable-scroll');

    this.className(componentClass, 'yoya-vtable');
    this.styles({
      display: 'block',
      minWidth: '0'
    });
    this._scroll.styles({
      background: '#ffffff',
      border: '1px solid #d8dee8',
      borderRadius: '8px',
      overflowX: 'auto'
    });
    this._table.styles({
      borderCollapse: 'collapse',
      color: '#172033',
      width: '100%'
    });
    this._captionBox.styles({
      captionSide: 'top',
      color: '#111827',
      fontWeight: '700',
      padding: '0 0 12px',
      textAlign: 'left'
    });
    this._captionBox.style('display', 'none');
    this._scroll.child(this._table);
    this._table.child(this._captionBox, this._head, this._body);
    this.child(this._scroll);
    this._setupTable(setup);
  }

  caption(content) {
    if (content === undefined) {
      return this._captionBox.textContent();
    }

    const hasContent = content !== null && content !== undefined && content !== '';
    this._captionBox.style('display', hasContent ? null : 'none');
    replaceChildren(this._captionBox, hasContent ? normalizeChildren(content) : []);
    return this;
  }

  columns(value) {
    if (value === undefined) {
      return this._columns.slice();
    }

    this._columns = normalizeTableColumns(value);
    this._renderTable();
    return this;
  }

  rows(value) {
    if (value === undefined) {
      return this._rows.slice();
    }

    this._rows = Array.isArray(value) ? value.slice() : [];
    this._renderTable();
    return this;
  }

  empty(value) {
    if (value === undefined) {
      return this._emptyContent;
    }

    this._emptyContent = value;
    this._renderTable();
    return this;
  }

  emptyText(value) {
    if (value === undefined) {
      return this._emptyContent;
    }

    return this.empty(value);
  }

  data(value) {
    if (value === undefined) {
      return {
        caption: this.caption(),
        columns: this.columns(),
        emptyText: this.emptyText(),
        rows: this.rows()
      };
    }

    if (Array.isArray(value)) {
      this.rows(value);
      return this;
    }

    if (isPlainObject(value)) {
      const { caption, columns, empty, emptyText, rows } = value;

      if (caption !== undefined) {
        this.caption(caption);
      }

      if (columns !== undefined) {
        this.columns(columns);
      }

      if (rows !== undefined) {
        this.rows(rows);
      }

      if (emptyText !== undefined) {
        this.emptyText(emptyText);
      } else if (empty !== undefined) {
        this.emptyText(empty);
      }
    }

    return this;
  }

  _renderTable() {
    const resolvedColumns =
      this._columns.length > 0 ? this._columns : inferTableColumns(this._rows);
    const bodyColumns =
      resolvedColumns.length > 0 ? resolvedColumns : [{ key: '__value', label: '' }];

    replaceChildren(this._head, []);
    replaceChildren(this._body, []);

    if (resolvedColumns.length > 0) {
      const headRow = new HtmlElementNode('tr').className('yoya-vtable-head-row');

      resolvedColumns.forEach((column, columnIndex) => {
        const headerCell = new HtmlElementNode('th').className('yoya-vtable-head-cell');
        const columnKey = column.key ?? `column-${columnIndex}`;

        headerCell.attr('scope', 'col');
        headerCell.attr('data-key', columnKey);
        applyTableCellStyles(headerCell, column, 'head');
        appendTableCellContent(headerCell, column.label ?? column.title ?? column.key ?? '');
        headRow.child(headerCell);
      });

      this._head.child(headRow);
    }

    if (this._rows.length > 0) {
      this._rows.forEach((row, rowIndex) => {
        const bodyRow = new HtmlElementNode('tr').className('yoya-vtable-row');
        bodyRow.attr('data-row-index', String(rowIndex));

        bodyColumns.forEach((column, columnIndex) => {
          const cell = new HtmlElementNode('td').className('yoya-vtable-cell');
          const columnKey = column.key ?? `column-${columnIndex}`;

          cell.attr('data-key', columnKey);
          applyTableCellStyles(cell, column, 'body');
          appendTableCellContent(cell, resolveTableCellContent(column, row, rowIndex));
          bodyRow.child(cell);
        });

        this._body.child(bodyRow);
      });
    } else {
      const emptyRow = new HtmlElementNode('tr').className('yoya-vtable-empty-row');
      const emptyCell = new HtmlElementNode('td').className('yoya-vtable-empty');

      emptyCell.attr('colspan', String(Math.max(resolvedColumns.length, 1)));
      emptyCell.styles({
        color: '#64748b',
        padding: '18px 14px',
        textAlign: 'center'
      });
      appendTableCellContent(emptyCell, this._emptyContent);
      emptyRow.child(emptyCell);
      this._body.child(emptyRow);
    }
  }

  _setupTable(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (Array.isArray(setup)) {
      this.rows(setup);
      return;
    }

    if (isPlainObject(setup)) {
      this.setup(setup);
      return;
    }

    this.caption(setup);
  }
}

export function vTable(first = null, second = null, third = null) {
  return createComponentFactory(VTable, first, second, third);
}

function normalizeTableColumns(columns) {
  if (!Array.isArray(columns)) {
    return [];
  }

  return columns.map((column, index) => {
    if (typeof column === 'string' || typeof column === 'number') {
      const key = String(column);
      return { key, label: key };
    }

    if (Array.isArray(column) && column.length > 0) {
      const [key, label = key] = column;
      return {
        key: key === undefined || key === null ? `column-${index}` : key,
        label: label ?? key ?? ''
      };
    }

    if (isPlainObject(column)) {
      const key =
        column.key ??
        column.field ??
        column.name ??
        column.label ??
        column.title ??
        `column-${index}`;
      return {
        ...column,
        key,
        label: column.label ?? column.title ?? column.name ?? key
      };
    }

    const key = `column-${index}`;
    return { key, label: String(column ?? '') };
  });
}

function inferTableColumns(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }

  const sampleRow = rows.find(
    (row) => row && typeof row === 'object' && !Array.isArray(row) && !(row instanceof ViewNode)
  );

  if (!sampleRow) {
    return [];
  }

  return Object.keys(sampleRow).map((key) => ({ key, label: key }));
}

function resolveTableCellContent(column, row, rowIndex) {
  if (typeof column.render === 'function') {
    return column.render(row, rowIndex, column);
  }

  if (typeof column.value === 'function') {
    return column.value(row, rowIndex, column);
  }

  if (column.key === '__value') {
    return row;
  }

  if (column.value !== undefined) {
    return column.value;
  }

  if (column.key && row && typeof row === 'object' && !Array.isArray(row)) {
    return row[column.key];
  }

  return row;
}

function appendTableCellContent(node, content) {
  if (content !== null && content !== undefined) {
    node.child(content);
  }

  return node;
}

function applyTableCellStyles(node, column, section) {
  const isHead = section === 'head';

  node.styles({
    borderBottom: '1px solid #e2e8f0',
    fontWeight: isHead ? '700' : '400',
    padding: '12px 14px',
    textAlign: column.align || 'left',
    verticalAlign: 'top',
    whiteSpace: column.wrap === false ? 'nowrap' : 'normal'
  });

  if (isHead) {
    node.style('background', '#f8fafc');
    node.style('color', '#334155');
  } else {
    node.style('color', '#172033');
  }

  if (column.className !== undefined) {
    node.className(column.className);
  }

  if (column.style !== undefined) {
    node.styles(column.style);
  }

  if (column.width !== undefined) {
    node.style('width', typeof column.width === 'number' ? `${column.width}px` : column.width);
  }

  if (column.minWidth !== undefined) {
    node.style(
      'minWidth',
      typeof column.minWidth === 'number' ? `${column.minWidth}px` : column.minWidth
    );
  }

  if (column.maxWidth !== undefined) {
    node.style(
      'maxWidth',
      typeof column.maxWidth === 'number' ? `${column.maxWidth}px` : column.maxWidth
    );
  }
}
