import { viewRootOf } from '../core/node.js';
import { keySet } from '../core/key-set.js';
import { ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { caption, div, table, tbody, td, tfoot, th, thead, tr } from '../html/index.js';
import {
  createComponentShortcut,
  isPlainObject,
  normalizeChildren,
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

/**
 * 滚动外壳（形态 A：局部结构，没有行为就只声明结构 + 身份）。
 * 供 `VTable` 组合；用户一般不直接用。
 */
export function VTableScroll() {
  return div({
    style: {
      background: themeValue('color-surface', '#ffffff'),
      border: themeBorder('color-border', '#d8dee8'),
      borderRadius: '8px',
      overflowX: 'auto'
    },
    vn: 'VTableScroll'
  });
}

export const vTableScroll = createComponentShortcut(VTableScroll);

/**
 * 表格本体（形态 A）：只声明结构 + 身份。
 * 谁要用它当插槽，就在**使用处**指定（`vTableGrid({ vn_slot: '' })`）——定义侧不预设槽位。
 */
export function VTableGrid() {
  return table({
    style: {
      borderCollapse: 'collapse',
      color: themeValue('color-text', '#172033'),
      width: '100%'
    },
    vn: 'VTableGrid'
  });
}

export const vTableGrid = createComponentShortcut(VTableGrid);

/** 标题（形态 B：文本与显隐是它自己的行为）。 */
export function VTableCaption() {
  return vNode((api, self) => {
    api.text = (content) => {
      if (content === undefined) {
        return self.node().textContent();
      }

      const hasContent = content !== null && content !== undefined && content !== '';
      self.node().style('display', hasContent ? null : 'none');
      replaceChildren(self.node(), hasContent ? normalizeChildren(content) : []);
      return api;
    };

    return caption({
      style: {
        captionSide: 'top',
        color: themeValue('color-text-strong', '#111827'),
        fontWeight: '700',
        padding: '0 0 12px',
        textAlign: 'left'
      },
      vn: 'VTableCaption'
    }).style('display', 'none');
  });
}

export const vTableCaption = createComponentShortcut(VTableCaption);

/**
 * 表格：**壳 + 用户侧受控 API**（票 15 §11）。
 *
 * - 结构只用定义组合：`div[VTable] > vTableScroll(→ vTableGrid({ vn_slot: '' }))`，
 *   匿名插槽在使用处指定，`<table>` 自己就是内容位（零额外节点）；
 * - 用户按顺序添加：`table.caption('…')` / `table.vThead(…)` / `table.vTbody(…)` / `table.vTfoot(…)`，
 *   命令一律 `self.node().child(part)`；段的内容通过段自己的 `vTr` 投递；
 * - 没有预建节点、没有 `find`、不碰 `_el` / `_children`；
 * - 数据驱动（`columns` / `rows` / `emptyText` / `data`）是在这套 API 之上的一层：
 *   段按需创建（首次用到才建，之后复用），行写进表体自己的 `vTr` 通道。
 */
export function VTable() {
  return vNode((api, self) => {
    const state = { columns: [], emptyText: '暂无数据', rows: [] };
    let captionPart = null;
    let headPart = null;
    let bodyPart = null;
    let footPart = null;

    /** 按需建段：用到才建，建过就复用（不是预建，也不靠身份在结构里找）。 */
    const captionOf = () => {
      if (!captionPart) {
        captionPart = vTableCaption();
        self.node().child(captionPart);
      }

      return captionPart;
    };

    const headOf = () => {
      if (!headPart) {
        headPart = vThead();
        self.node().child(headPart);
      }

      return headPart;
    };

    const bodyOf = () => {
      if (!bodyPart) {
        bodyPart = vTbody();
        self.node().child(bodyPart);
      }

      return bodyPart;
    };

    const footOf = () => {
      if (!footPart) {
        footPart = vTfoot();
        self.node().child(footPart);
      }

      return footPart;
    };

    /** 段的内容：用户声明的段只取它的行，交给同名段的 `vTr` 通道。 */
    const deliverRows = (section, target) => {
      viewRootOf(section)
        .children()
        .forEach((row) => target.vTr(row));
      return target;
    };

    /** 数据驱动：列头行 / 数据行 / 空态行写进段自己的行通道。 */
    const renderTable = () => {
      captionOf();
      const head = headOf();
      const body = bodyOf();
      const resolvedColumns =
        state.columns.length > 0 ? state.columns : inferTableColumns(state.rows);
      const bodyColumns =
        resolvedColumns.length > 0 ? resolvedColumns : [{ key: '__value', label: '' }];

      replaceChildren(viewRootOf(head), []);
      replaceChildren(viewRootOf(body), []);

      if (resolvedColumns.length > 0) {
        head.child(
          vTr((headRow) =>
            resolvedColumns.forEach((column, columnIndex) => {
              headRow.vTh((cell) => {
                cell.attr('scope', 'col');
                cell.attr('data-key', column.key ?? `column-${columnIndex}`);
                applyCellStyles(cell, column, 'head');
                appendCellContent(cell, column.label ?? column.title ?? column.key ?? '');
              });
            })
          )
        );
      }

      if (state.rows.length > 0) {
        state.rows.forEach((row, rowIndex) => {
          body.child(
            vTr((bodyRow) => {
              bodyRow.attr('data-row-index', String(rowIndex));
              bodyColumns.forEach((column, columnIndex) => {
                bodyRow.vTd((cell) => {
                  cell.attr('data-key', column.key ?? `column-${columnIndex}`);
                  applyCellStyles(cell, column, 'body');
                  appendCellContent(cell, resolveTableCellContent(column, row, rowIndex));
                });
              });
            })
          );
        });

        return;
      }

      body.child(
        vTr((emptyRow) =>
          emptyRow.vTd((cell) => {
            cell.attr('colspan', String(Math.max(resolvedColumns.length, 1)));
            cell.styles({
              color: themeValue('color-text-muted', '#64748b'),
              padding: 'var(--yoya-space-4, 16px) var(--yoya-space-3, 12px)',
              textAlign: 'center'
            });
            cell.child(state.emptyText);
          })
        )
      );
    };

    api.caption = (content) => {
      const box = captionOf();

      if (content === undefined) {
        return box.text();
      }

      box.text(content);
      return api;
    };

    api.vThead = (setup) => {
      const head = headOf();

      if (setup !== undefined) {
        deliverRows(vThead(setup), head);
      }

      return api;
    };

    api.vTbody = (setup) => {
      const body = bodyOf();

      if (setup !== undefined) {
        deliverRows(vTbody(setup), body);
      }

      return api;
    };

    api.vTfoot = (setup) => {
      const foot = footOf();

      if (setup !== undefined) {
        deliverRows(vTfoot(setup), foot);
      }

      return api;
    };

    api.vTr = (setup) => {
      deliverRows(vTr(setup), bodyOf());
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

    /** props：键在组件上有同名命令就调命令，其余键按元素 options 写。 */
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
        self.node().setup(elementConfig);
      }

      return api;
    };

    /** 字符串 / 数字 = 表格标题。 */
    api.setupString = (value) => api.caption(value);

    return div({ style: { display: 'block', minWidth: '0' }, vn: 'VTable' }, (root) =>
      root.child(vTableScroll((scroll) => scroll.child(vTableGrid({ vn_slot: '' }))))
    );
  });
}

export const vTable = createComponentShortcut(VTable);

/**
/**
 * 数据驱动包装（`VTable` 之上的一层）：自己管 `columns` / `rows` / `emptyText`。
 *
 * 数据用 `keySet` 按键保管「数据 + 行行为 api」（同 key 同 api，行状态写在 item.api 的信号上，
 * 改它不触发对账）；列头与行都走 `keyed`；视图内部用 `vTable` 组合——基础件不掺数据驱动。
 * 命令名避开节点 / 命令保留字（data / text / child / attr / id / name / render）。
 */
export function VTableWrapper() {
  return vNode((api) => {
    const captionText = ref('');
    const emptyText = ref('暂无数据');

    const columns = keySet(
      [],
      (column) => column?.key ?? column?.field ?? column?.title,
      (item) => {
        item.api.title = ref(item.data?.label ?? item.data?.title ?? item.data?.key ?? '');
      }
    );

    const rows = keySet(
      [],
      (row) => row?.id,
      (item) => {
        item.api.selected = ref(false);
        item.api.select = () => {
          item.api.selected.value = true;
        };
      }
    );

    api.caption = (value) => {
      if (value === undefined) {
        return captionText.value;
      }

      captionText.value = value;
      return api;
    };

    api.columns = (value) => {
      if (value === undefined) {
        return columns.values();
      }

      columns.replaceAll(Array.isArray(value) ? value : []);
      return api;
    };

    api.rows = (value) => {
      if (value === undefined) {
        return rows.values();
      }

      rows.replaceAll(Array.isArray(value) ? value : []);
      return api;
    };

    api.emptyText = (value) => {
      if (value === undefined) {
        return emptyText.value;
      }

      emptyText.value = value;
      return api;
    };

    /** 行行为 api：这一行的状态与命令都在这里（不在数据上）。 */
    api.item = (key) => rows.item(key);

    api.addRow = (row) => {
      rows.add(row);
      return api;
    };

    api.updateRow = (key, patch) => {
      rows.merge(key, patch);
      return api;
    };

    api.removeRow = (key) => {
      rows.remove(key);
      return api;
    };

    api.clearRows = () => {
      rows.clear();
      return api;
    };

    api.setupObject = (config) => {
      Object.entries(config).forEach(([key, value]) => {
        if (typeof api[key] === 'function') {
          api[key](value);
        }
      });

      return api;
    };

    return vTable((table) => {
      table.caption(captionText);

      table.vThead((head) => {
        head.vTr((headRow) => {
          head.keyed(columns, (item) =>
            headRow.vTh((cell) => {
              cell.attr('data-key', String(item.data?.key ?? item.data?.field ?? ''));
              cell.child(item.api.title);
            })
          );
        });
      });

      table.vTbody((body) => {
        body.keyed(rows, (item) =>
          vTr((bodyRow) => {
            bodyRow.attr('data-row-id', String(item.data?.id ?? ''));
            bodyRow.toggleClass('is-selected', item.api.selected);
            bodyRow.on('click', item.api.select);

            const list = columns.values();
            (list.length > 0 ? list : [null]).forEach((column) => {
              bodyRow.vTd((cell) => {
                const key = column ? (column.key ?? column.field) : '__value';
                cell.attr('data-key', String(key));
                cell.child(String((column ? item.data?.[key] : item.data) ?? ''));
              });
            });
          })
        );
      });
    });
  });
}

export const vTableWrapper = createComponentShortcut(VTableWrapper);
