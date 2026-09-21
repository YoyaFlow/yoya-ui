import { componentNameOf } from '../core/node.js';
import { vNode } from '../core/v-node.js';
import { caption, div, table, tbody, td, tfoot, th, thead, tr } from '../html/index.js';
import {
  createComponentShortcut,
  isPlainObject,
  normalizeChildren,
  removeChild,
  replaceChildren,
  themeBorder,
  themeValue
} from '../components/shared.js';

/**
 * 表格族（票 15 §4：**组件定义 = 结构 + 身份 + 命令**，组件里没有元素节点类）。
 *
 * - 结构用 DSL 声明：`div[VTable] > div[VTableScroll] > table[VTableGrid] > caption + thead + tbody`；
 * - 声明式 section / 行由命令投递（`api.vThead` / `api.vTbody` / `api.vTfoot` / `api.vTr`），
 *   匿名槽位 `table.child(...)` 由根元素实例上的 `child()` 分流，保持"section 进表格、行进表体"的旧语义；
 * - 数据驱动渲染（列头行 / 数据行 / 空态行）在命令内部重建，DOM 与迁移前逐字节一致。
 */

/** 单元格预设样式（列头 / 正文两套，与迁移前 applyTableCellStyles 同口径）。 */
function applyCellStyles(node, column = {}, section) {
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

function appendCellContent(node, content) {
  if (content !== null && content !== undefined) {
    node.child(content);
  }

  return node;
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
    (row) => row && typeof row === 'object' && !Array.isArray(row) && !row.tagName
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

/** 列头段：结构 + 身份，行由 `vTr` 投递。 */
export function VThead() {
  return vNode((api, self) => {
    api.vTr = (setup) => {
      self.node().child(vTr(setup));
      return api;
    };
    return thead({ vn: 'VThead' });
  });
}

/** 表体段：结构 + 身份，行由 `vTr` 投递。 */
export function VTbody() {
  return vNode((api, self) => {
    api.vTr = (setup) => {
      self.node().child(vTr(setup));
      return api;
    };
    return tbody({ vn: 'VTbody' });
  });
}

/** 表尾段：结构 + 身份，行由 `vTr` 投递。 */
export function VTfoot() {
  return vNode((api, self) => {
    api.vTr = (setup) => {
      self.node().child(vTr(setup));
      return api;
    };
    return tfoot({ vn: 'VTfoot' });
  });
}

export const vThead = createComponentShortcut(VThead);
export const vTbody = createComponentShortcut(VTbody);
export const vTfoot = createComponentShortcut(VTfoot);

/** 行：结构 + 身份，单元格由 `vTh` / `vTd` 投递。 */
export function VTr() {
  return vNode((api, self) => {
    api.vTh = (setup) => {
      self.node().child(vTh(setup));
      return api;
    };
    api.vTd = (setup) => {
      self.node().child(vTd(setup));
      return api;
    };
    return tr({ vn: 'VTr' });
  });
}

export const vTr = createComponentShortcut(VTr);

/** 列头单元格（形态 A 薄工厂）。 */
export function VTh() {
  const element = th({ vn: 'VTh' });
  element.attr('scope', 'col');
  applyCellStyles(element, {}, 'head');
  return element;
}

export const vTh = createComponentShortcut(VTh);

/** 正文单元格（形态 A 薄工厂）。 */
export function VTd() {
  const element = td({ vn: 'VTd' });
  applyCellStyles(element, {}, 'body');
  return element;
}

export const vTd = createComponentShortcut(VTd);

/** 表格：外壳结构 + 数据驱动渲染 + 声明式段 / 行投递。 */
export function VTable() {
  return vNode((api) => {
    const state = { columns: [], declarative: false, emptyText: '暂无数据', rows: [] };

    const captionBox = caption({
      style: {
        captionSide: 'top',
        color: themeValue('color-text-strong', '#111827'),
        fontWeight: '700',
        padding: '0 0 12px',
        textAlign: 'left'
      },
      vn: 'VTableCaption'
    }).style('display', 'none');
    const headBox = thead({ vn: 'VThead' });
    const bodyBox = tbody({ vn: 'VTbody' });
    const grid = table(
      {
        style: {
          borderCollapse: 'collapse',
          color: themeValue('color-text', '#172033'),
          width: '100%'
        },
        vn: 'VTableGrid'
      },
      (view) => view.child(captionBox, headBox, bodyBox)
    );
    const scroll = div(
      {
        style: {
          background: themeValue('color-surface', '#ffffff'),
          border: themeBorder('color-border', '#d8dee8'),
          borderRadius: '8px',
          overflowX: 'auto'
        },
        vn: 'VTableScroll'
      },
      (view) => view.child(grid)
    );
    const root = div({ style: { display: 'block', minWidth: '0' }, vn: 'VTable' }, (view) =>
      view.child(scroll)
    );
    const baseChild = root.child.bind(root);

    /** 声明式段出现时摘掉自动 thead / tbody（旧 _detachAutoSections 语义）。 */
    const detachAutoSections = () => {
      removeChild(grid, headBox);
      removeChild(grid, bodyBox);

      if (grid._el) {
        headBox._el?.remove();
        bodyBox._el?.remove();
      }
    };

    const addSection = (section) => {
      if (!state.declarative) {
        state.declarative = true;
        detachAutoSections();
      }

      grid.child(section);
      return api;
    };

    const findSection = (identity) =>
      grid.children().find((child) => componentNameOf(child) === identity);

    const addRow = (row) => {
      if (state.declarative) {
        const body = findSection('VTbody');

        if (body) {
          body.child(row);
        } else {
          addSection(vTbody((section) => section.child(row)));
        }

        return api;
      }

      bodyBox.child(row);
      return api;
    };

    /** 数据驱动渲染前的复位：销毁声明式段，恢复 caption + thead + tbody 三件套。 */
    const resetShell = () => {
      grid.children().forEach((child) => {
        if (child === captionBox || child === headBox || child === bodyBox) {
          return;
        }

        const identity = componentNameOf(child);

        if (identity === 'VThead' || identity === 'VTbody' || identity === 'VTfoot') {
          child.destroy();
        }
      });

      grid._children = [captionBox, headBox, bodyBox];
      grid._childrenDirty = true;

      if (grid._el) {
        grid._el.replaceChildren(captionBox.renderDom(), headBox.renderDom(), bodyBox.renderDom());
      }

      state.declarative = false;
    };

    const renderTable = () => {
      resetShell();

      const resolvedColumns =
        state.columns.length > 0 ? state.columns : inferTableColumns(state.rows);
      const bodyColumns =
        resolvedColumns.length > 0 ? resolvedColumns : [{ key: '__value', label: '' }];

      replaceChildren(headBox, []);
      replaceChildren(bodyBox, []);

      if (resolvedColumns.length > 0) {
        const headRow = tr({ vn: 'VTheadRow' });

        resolvedColumns.forEach((column, columnIndex) => {
          const headerCell = th({ vn: 'VTh' });
          const columnKey = column.key ?? `column-${columnIndex}`;

          headerCell.attr('scope', 'col');
          headerCell.attr('data-key', columnKey);
          applyCellStyles(headerCell, column, 'head');
          appendCellContent(headerCell, column.label ?? column.title ?? column.key ?? '');
          headRow.child(headerCell);
        });

        headBox.child(headRow);
      }

      if (state.rows.length > 0) {
        state.rows.forEach((row, rowIndex) => {
          const bodyRow = tr({ vn: 'VTr' });
          bodyRow.attr('data-row-index', String(rowIndex));

          bodyColumns.forEach((column, columnIndex) => {
            const cell = td({ vn: 'VTd' });
            const columnKey = column.key ?? `column-${columnIndex}`;

            cell.attr('data-key', columnKey);
            applyCellStyles(cell, column, 'body');
            appendCellContent(cell, resolveTableCellContent(column, row, rowIndex));
            bodyRow.child(cell);
          });

          bodyBox.child(bodyRow);
        });
      } else {
        const emptyRow = tr({ vn: 'VTableEmptyRow' });
        const emptyCell = td({ vn: 'VTableEmpty' });

        emptyCell.attr('colspan', String(Math.max(resolvedColumns.length, 1)));
        emptyCell.styles({
          color: themeValue('color-text-muted', '#64748b'),
          padding: 'var(--yoya-space-4, 16px) var(--yoya-space-3, 12px)',
          textAlign: 'center'
        });
        appendCellContent(emptyCell, state.emptyText);
        emptyRow.child(emptyCell);
        bodyBox.child(emptyRow);
      }
    };

    /**
     * 匿名槽位分流（旧 TableNode.child 语义）：段进 `VTableGrid`、行进表体、其余进组件根。
     * 结构自身的构建走 `baseChild`，不受分流影响。
     */
    root.child = (...children) => {
      children.flat(Infinity).forEach((child) => {
        const identity = componentNameOf(child);

        if (identity === 'VThead' || identity === 'VTbody' || identity === 'VTfoot') {
          addSection(child);
          return;
        }

        if (identity === 'VTr') {
          addRow(child);
          return;
        }

        baseChild(child);
      });

      return root;
    };

    api.caption = (content) => {
      if (content === undefined) {
        return captionBox.textContent();
      }

      const hasContent = content !== null && content !== undefined && content !== '';
      captionBox.style('display', hasContent ? null : 'none');
      replaceChildren(captionBox, hasContent ? normalizeChildren(content) : []);
      return api;
    };

    api.columns = (value) => {
      if (value === undefined) {
        return state.columns.slice();
      }

      state.columns = normalizeTableColumns(value);
      renderTable();
      return api;
    };

    api.rows = (value) => {
      if (value === undefined) {
        return state.rows.slice();
      }

      state.rows = Array.isArray(value) ? value.slice() : [];
      renderTable();
      return api;
    };

    api.empty = (value) => {
      if (value === undefined) {
        return state.emptyText;
      }

      state.emptyText = value;
      renderTable();
      return api;
    };

    api.emptyText = (value) => (value === undefined ? state.emptyText : api.empty(value));

    api.data = (value) => {
      if (value === undefined) {
        return {
          caption: api.caption(),
          columns: api.columns(),
          emptyText: api.emptyText(),
          rows: api.rows()
        };
      }

      if (Array.isArray(value)) {
        return api.rows(value);
      }

      if (isPlainObject(value)) {
        const { caption: nextCaption, columns, empty, emptyText, rows } = value;

        if (nextCaption !== undefined) {
          api.caption(nextCaption);
        }

        if (columns !== undefined) {
          api.columns(columns);
        }

        if (rows !== undefined) {
          api.rows(rows);
        }

        if (emptyText !== undefined) {
          api.emptyText(emptyText);
        } else if (empty !== undefined) {
          api.emptyText(empty);
        }
      }

      return api;
    };

    api.vThead = (setup) => addSection(vThead(setup));
    api.vTbody = (setup) => addSection(vTbody(setup));
    api.vTfoot = (setup) => addSection(vTfoot(setup));
    api.vTr = (setup) => addRow(vTr(setup));

    /**
     * props：键在组件上有同名命令就调命令（`columns` / `rows` / `caption` / `emptyText` / `data`…），
     * 其余键按元素 options 写（`attrs` / `style` / `class` / 属性 / 事件）——与元素侧
     * `_setupObject` 的"有同名方法就调方法"口径一致。
     */
    api.setupObject = (config) => {
      const elementConfig = {};

      Object.entries(config).forEach(([key, value]) => {
        if (typeof api[key] === 'function') {
          api[key](value);
          return;
        }

        elementConfig[key] = value;
      });

      if (Object.keys(elementConfig).length > 0) {
        root.setup(elementConfig);
      }

      return api;
    };

    api.setupString = (value) => api.caption(value);

    return root;
  });
}

export const vTable = createComponentShortcut(VTable);
