import { ViewNode, registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import {
  applyComponentSetup,
  componentClass,
  createComponentFactory,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  themeBorder,
  themeValue
} from '../components/shared.js';

export class VTable extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._columns = [];
    this._rows = [];
    this._emptyContent = '暂无数据';
    this._hasDeclarativeSections = false;
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
      background: themeValue('color-surface', '#ffffff'),
      border: themeBorder('color-border', '#d8dee8'),
      borderRadius: '8px',
      overflowX: 'auto'
    });
    this._table.styles({
      borderCollapse: 'collapse',
      color: themeValue('color-text', '#172033'),
      width: '100%'
    });
    this._captionBox.styles({
      captionSide: 'top',
      color: themeValue('color-text-strong', '#111827'),
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

  child(...children) {
    children.flat(Infinity).forEach((child) => {
      if (child instanceof VThead || child instanceof VTbody || child instanceof VTfoot) {
        this._addDeclarativeSection(child);
        return;
      }

      if (child instanceof VTr) {
        this.vTr(child);
        return;
      }

      super.child(child);
    });

    return this;
  }

  vThead(setup) {
    return this._addDeclarativeSection(setup instanceof VThead ? setup : vThead(setup));
  }

  vTbody(setup) {
    return this._addDeclarativeSection(setup instanceof VTbody ? setup : vTbody(setup));
  }

  vTfoot(setup) {
    return this._addDeclarativeSection(setup instanceof VTfoot ? setup : vTfoot(setup));
  }

  vTr(setup) {
    const row = setup instanceof VTr ? setup : vTr(setup);

    if (this._hasDeclarativeSections) {
      const body = this._table.children().find((child) => child instanceof VTbody);

      if (body) {
        body.child(row);
      } else {
        this.vTbody((section) => section.child(row));
      }

      return this;
    }

    this._body.child(row);
    return this;
  }

  _addDeclarativeSection(section) {
    if (!this._hasDeclarativeSections) {
      this._hasDeclarativeSections = true;
      this._detachAutoSections();
    }

    this._table.child(section);
    return this;
  }

  _detachAutoSections() {
    this._table._children = this._table._children.filter(
      (child) => child !== this._head && child !== this._body
    );
    this._table._childrenDirty = true;

    if (this._table._el) {
      this._head._el?.remove();
      this._body._el?.remove();
    }
  }

  _resetTableShell() {
    const customSections = this._table._children.filter(
      (child) => child instanceof VThead || child instanceof VTbody || child instanceof VTfoot
    );

    customSections.forEach((section) => section.destroy());
    this._table._children = [this._captionBox, this._head, this._body];
    this._table._childrenDirty = true;

    if (this._table._el) {
      this._table._el.replaceChildren(
        this._captionBox.renderDom(),
        this._head.renderDom(),
        this._body.renderDom()
      );
    }

    this._hasDeclarativeSections = false;
  }

  _renderTable() {
    this._resetTableShell();

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
        color: themeValue('color-text-muted', '#64748b'),
        padding: 'var(--yoya-space-4, 16px) var(--yoya-space-3, 12px)',
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

    if (setup instanceof VThead || setup instanceof VTbody || setup instanceof VTfoot) {
      this._addDeclarativeSection(setup);
      return;
    }

    if (setup instanceof VTr) {
      this.vTr(setup);
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

export class VThead extends HtmlElementNode {
  constructor(setup = null) {
    super('thead', null);
    this.className('yoya-vtable-head');
    applyComponentSetup(this, setup);
  }
}

export function vThead(first = null, second = null, third = null) {
  return createComponentFactory(VThead, first, second, third);
}

export class VTbody extends HtmlElementNode {
  constructor(setup = null) {
    super('tbody', null);
    this.className('yoya-vtable-body');
    applyComponentSetup(this, setup);
  }
}

export function vTbody(first = null, second = null, third = null) {
  return createComponentFactory(VTbody, first, second, third);
}

export class VTfoot extends HtmlElementNode {
  constructor(setup = null) {
    super('tfoot', null);
    this.className('yoya-vtable-foot');
    applyComponentSetup(this, setup);
  }
}

export function vTfoot(first = null, second = null, third = null) {
  return createComponentFactory(VTfoot, first, second, third);
}

export class VTr extends HtmlElementNode {
  constructor(setup = null) {
    super('tr', null);
    this.className('yoya-vtable-row');
    this._setupTr(setup);
  }

  _setupTr(setup) {
    if (Array.isArray(setup)) {
      setup.forEach((cell) => this.child(vTd(cell)));
      return;
    }

    applyComponentSetup(this, setup);
  }
}

export function vTr(first = null, second = null, third = null) {
  return createComponentFactory(VTr, first, second, third);
}

export class VTh extends HtmlElementNode {
  constructor(setup = null) {
    super('th', null);
    this.className('yoya-vtable-head-cell');
    this.attr('scope', 'col');
    applyTableCellStyles(this, {}, 'head');
    applyComponentSetup(this, setup);
  }
}

export function vTh(first = null, second = null, third = null) {
  return createComponentFactory(VTh, first, second, third);
}

export class VTd extends HtmlElementNode {
  constructor(setup = null) {
    super('td', null);
    this.className('yoya-vtable-cell');
    applyTableCellStyles(this, {}, 'body');
    applyComponentSetup(this, setup);
  }
}

export function vTd(first = null, second = null, third = null) {
  return createComponentFactory(VTd, first, second, third);
}

registerChildFactories(VThead, { vTr });
registerChildFactories(VTbody, { vTr });
registerChildFactories(VTfoot, { vTr });
registerChildFactories(VTr, { vTh, vTd });

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
    borderBottom: themeBorder('color-border-faint', '#e2e8f0'),
    fontWeight: isHead ? '700' : '400',
    padding: 'var(--yoya-space-3, 12px) var(--yoya-space-3, 12px)',
    textAlign: column.align || 'left',
    verticalAlign: 'top',
    whiteSpace: column.wrap === false ? 'nowrap' : 'normal'
  });

  if (isHead) {
    node.style('background', themeValue('color-surface-hover', '#f8fafc'));
    node.style('color', themeValue('color-text-secondary', '#334155'));
  } else {
    node.style('color', themeValue('color-text', '#172033'));
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
