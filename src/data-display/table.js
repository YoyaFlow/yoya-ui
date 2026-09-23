import { keySet } from '../core/key-set.js';
import { computed, isSignal, ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { caption, div, table, tbody, td, tfoot, th, thead, tr } from '../html/index.js';
import {
  createComponentShortcut,
  isPlainObject,
  normalizeChildren,
  replaceChildren
} from '../components/shared.js';

/**
 * 表格族（票 15 §4：**组件定义 = 结构 + 身份 + 命令**，组件里没有元素节点类）。
 *
 * - 结构用 DSL 声明：`div[VTable] > div[VTableScroll] > table[VTableGrid] > caption + thead + tbody`；
 * - 匿名占位**就是 `<table>`**：`table.child(section)` / `table.child(vTr(…))` 的内容都落进 `<table>`；
 * - 段与行各有命令通道（`api.vThead` / `api.vTbody` / `api.vTfoot` / `api.vTr`）：
 *   `table.vTr(…)` 进表体、`section.vTr(…)` 进该段——同一张表里**不要和匿名 `child()` 混用**。
 * - **数据驱动（列 / 行 / 空态）在 `VTableWrapper` 上**：表格壳只认结构，数据层只消费它。
 * - 静态样式（壳 / 滚动壳 / 表体 / 标题 / 单元格预设）全在 `yoya.ui.css`（R5）；列定义带来的
 *   对齐 / 换行 / 宽高 / `style` 是**数据**，仍旧写行内。
 */

/** 没声明列、也推断不出列时的兜底列：整行当一格显示（`column.key === '__value'`）。 */
const VALUE_COLUMN = { key: '__value', label: '' };

/** 列 key：归一后的列一定有 key，拿不到时用下标兜底（对账只认 key）。 */
const columnKeyOf = (column, index) => column?.key ?? index;

/**
 * 数据层的键（票 15）：`VTable` 只认结构，`columns` / `rows` / `emptyText` 归 `VTableWrapper`。
 * 写在 `vTable` 的 options 里要**报错**——不报错就会当成同名 DOM 属性静默写下去。
 */
const TABLE_DATA_KEYS = new Set(['columns', 'rows', 'data', 'empty', 'emptyText']);

/** 结构 props 守卫：`vTable({ rows })` 这类数据键要**报错**——不报错就当成同名 DOM 属性静默写下去。 */
function assertVTableStructure(props) {
  Object.keys(props).forEach((key) => {
    if (TABLE_DATA_KEYS.has(key)) {
      throw new TypeError(
        `vTable() does not take "${key}": the data-driven table is vTableWrapper(...) ` +
          '(columns / rows / emptyText). vTable only takes structure.'
      );
    }
  });
}

/**
 * 单元格的**数据**样式（列头 / 正文共用）：预设样式（边框 / 内边距 / 字重 / 垂直对齐 / 配色）在
 * `yoya.ui.css` 的 `[vn~='VTh']` / `[vn~='VTd']` 规则里（R5）；这里只写列定义带来的对齐 / 换行 /
 * 宽高，以及调用方自己给的 `className` / `style`（`style` 放在对齐之后，用户写的压过列配置）。
 */
function applyCellStyles(node, column = {}) {
  if (column.align) {
    node.style('textAlign', column.align);
  }

  if (column.wrap === false) {
    node.style('whiteSpace', 'nowrap');
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

/**
 * 列定义归一（与迁移前的数据层同口径）：字符串 / `[key, label]` / 对象都收，
 * 结果一定有 `key` 与 `label`。
 *
 * 列头与单元格都按键对账，所以 key 必须唯一：同一份列定义里重名时按出现顺序补 `#n` 后缀。
 */
function normalizeTableColumns(columns) {
  if (!Array.isArray(columns)) {
    return [];
  }

  const usedKeys = new Set();

  return columns.map((column, index) => {
    const normalized = normalizeTableColumn(column, index);
    const key = uniqueColumnKey(normalized.key, usedKeys);
    return key === normalized.key ? normalized : { ...normalized, key };
  });
}

/** 单列归一：结果一定有 `key` / `label`，其余键（render / align / width / …）原样保留。 */
function normalizeTableColumn(column, index) {
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
}

/** 列 key 去重：`name` / `name#1` / `name#2`（重名列在 DOM 上仍然可分辨）。 */
function uniqueColumnKey(key, usedKeys) {
  const text = String(key);
  let next = text;
  let serial = 1;

  while (usedKeys.has(next)) {
    next = `${text}#${serial}`;
    serial += 1;
  }

  usedKeys.add(next);
  return next;
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
  return element;
}

export const vTh = createComponentShortcut(VTh);

/** 正文单元格（形态 A 薄工厂）。 */
export function VTd() {
  return td({ vn: 'VTd' });
}

export const vTd = createComponentShortcut(VTd);

/**
 * 滚动外壳（形态 A：局部结构，没有行为就只声明结构 + 身份）。
 * 供 `VTable` 组合；用户一般不直接用。
 */
export function VTableScroll() {
  return div({ vn: 'VTableScroll' });
}

export const vTableScroll = createComponentShortcut(VTableScroll);

/**
 * 表格本体（形态 A）：只声明结构 + 身份。
 * 谁要用它当插槽，就在**使用处**指定（`vTableGrid({ vn_slot: '' })`）——定义侧不预设槽位。
 */
export function VTableGrid() {
  return table({ vn: 'VTableGrid' });
}

export const vTableGrid = createComponentShortcut(VTableGrid);

/** 标题内容是否算「有」（空字符串 / null 都算没有 → 整条标题隐藏）。 */
function hasCaptionText(content) {
  const value = isSignal(content) ? content.value : content;
  return value !== null && value !== undefined && value !== '';
}

/** 标题（形态 B：文本与显隐是它自己的行为）。 */
export function VTableCaption() {
  return vNode((api, self) => {
    api.text = (content) => {
      if (content === undefined) {
        return self.node().textContent();
      }

      // 活值（句柄 / 零参闭包）：文本与「空则隐藏」一起跟着值走——
      // 只绑文本的话，先空后有的标题会一直带着建时的 hidden 态。
      if (typeof content === 'function' || isSignal(content)) {
        // 显隐归 CSS（`[data-has-text='true']` 规则）：这里是读值绑定，跟着值走
        self.node().attr('data-has-text', () => (hasCaptionText(content) ? 'true' : null));
        replaceChildren(self.node(), [content]);
        return api;
      }

      const hasContent = hasCaptionText(content);
      self.node().attr('data-has-text', hasContent ? 'true' : null);
      replaceChildren(self.node(), hasContent ? normalizeChildren(content) : []);
      return api;
    };

    // 默认隐藏（没有内容就不占位）由 CSS 的 `[vn~='VTableCaption']` 规则给
    return caption({ vn: 'VTableCaption' });
  });
}

export const vTableCaption = createComponentShortcut(VTableCaption);

/**
 * 表格：**壳 + 用户侧受控 API**（票 15 §11）。
 *
 * - 结构只用定义组合：`div[VTable] > vTableScroll(→ vTableGrid({ vn_slot: '' }))`，
 *   匿名插槽在使用处指定，`<table>` 自己就是内容位（零额外节点）；
 * - **props 在参数表里展开**：`caption` → 标题、`vThead` / `vTbody` / `vTfoot` → 三个段、`vTr` → 表体行，
 *   其余键照 JSX 摊进根元素工厂（`{ ...rest, vn: 'VTable' }`）。props 里的段在**定义体的结构声明**里
 *   落位，与运行期命令（`table.caption(…)` / `table.vThead(…)` / …）**共用同一份按需建的段**——
 *   先 props 后命令不会建出两份；
 * - 段命令把 setup **直接落在真段上**（不建临时段再搬行）：行是声明式投递还是 `keyed`
 *   活值对账，都挂在真表体上；
 * - 没有预建节点、没有 `find`、不碰 `_el` / `_children`；
 * - **壳不装数据**：`columns` / `rows` / `emptyText` 那层在 `VTableWrapper` 上（壳只被它消费）。
 */
export function VTable({
  caption,
  // 段 / 行 props 的键名就是命令名，但段工厂（`vThead` / `vTbody` / `vTfoot` / `vTr`）同名，
  // 解构时换绑名，别把工厂遮住
  vThead: headSetup,
  vTbody: bodySetup,
  vTfoot: footSetup,
  vTr: rowSetup,
  ...rest
} = {}) {
  assertVTableStructure(rest);

  return vNode((api, self) => {
    let captionPart = null;
    let headPart = null;
    let bodyPart = null;
    let footPart = null;

    /**
     * 按需建段：用到才建，建过就复用（不是预建，也不靠身份在结构里找）。
     * **宿主由调用方给**：props 路径（定义体的结构声明）是 `<table>` 那个句柄，运行期命令是组件节点
     * ——两条路都落进表格的匿名占位（`vn_slot: ''`），并且共用 `captionPart` 这些实例。
     */
    const captionOf = (host = self.node()) => {
      if (!captionPart) {
        captionPart = vTableCaption();
        host.child(captionPart);
      }

      return captionPart;
    };

    const headOf = (host = self.node()) => {
      if (!headPart) {
        headPart = vThead();
        host.child(headPart);
      }

      return headPart;
    };

    const bodyOf = (host = self.node()) => {
      if (!bodyPart) {
        bodyPart = vTbody();
        host.child(bodyPart);
      }

      return bodyPart;
    };

    const footOf = (host = self.node()) => {
      if (!footPart) {
        footPart = vTfoot();
        host.child(footPart);
      }

      return footPart;
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
      if (setup !== undefined) {
        headOf().setup(setup);
      }

      return api;
    };

    api.vTbody = (setup) => {
      if (setup !== undefined) {
        bodyOf().setup(setup);
      }

      return api;
    };

    api.vTfoot = (setup) => {
      if (setup !== undefined) {
        footOf().setup(setup);
      }

      return api;
    };

    api.vTr = (setup) => {
      bodyOf().vTr(setup);
      return api;
    };

    /** 字符串 / 数字 = 表格标题。 */
    api.setupString = (value) => api.caption(value);

    const view = div({ ...rest, vn: 'VTable' }, (shell) =>
      shell.child(
        vTableScroll((scroll) =>
          scroll.child(
            vTableGrid({ vn_slot: '' }, (tableGrid) => {
              // props 里的段：在结构声明里落位（没给就不建）；顺序 = 标题 → 表头 → 表体 → 表尾
              if (caption !== undefined) captionOf(tableGrid).text(caption);
              if (headSetup !== undefined) headOf(tableGrid).setup(headSetup);
              if (bodySetup !== undefined) bodyOf(tableGrid).setup(bodySetup);
              if (footSetup !== undefined) footOf(tableGrid).setup(footSetup);
              if (rowSetup !== undefined) bodyOf(tableGrid).vTr(rowSetup);
            })
          )
        )
      )
    );

    return view;
  });
}

export const vTable = createComponentShortcut(VTable, { props: true });

/**
 * 数据驱动表格（`VTable` 之上的一层）：`caption` / `columns` / `rows` / `emptyText` 都归它管。
 *
 * - **列**是纯数据（没有自己的状态）：`ref` 持有 + `keyed` 按 key 对账，改一列只重建那一格；
 *   没声明列时按行数据推断（与迁移前的数据层同口径），一列都没有就兜底成「整行一格」；
 * - **行**是 `keySet`：数据与行状态同住一个元素，**同 key 同 api**—— `item.api.selected`
 *   这类行状态写在 `item.api` 的信号上，改它不触发对账；数据操作走
 *   `rows / addRow / updateRow / removeRow / clearRows`；
 * - 视图用 `vTable` 组合：自己不造 `<thead>` / `<tbody>`，也不碰 `_el` / `_children`。
 *
 * 行键：`row.id` / `row.key` 优先，其次 `rowKey(...)`（可传函数换口径），都没有就按对象身份发
 * 内部键（同一个对象反复写入保持同一个键，换新对象算新行）。行键由 `keyed` 镜像成
 * `data-row-key`（引擎口径，编译路径同样写），所以行数据最好自带 `id` / `key`——没有身份的行
 * 只能按内部键对账，按 key 的行操作（`updateRow` / `item`）也就无从下手。
 * 命令名避开节点 / 命令保留字（data / text / child / attr / id / name / render）。
 */
export function VTableWrapper() {
  return vNode((api) => {
    const captionText = ref('');
    const emptyText = ref('暂无数据');
    const columns = ref([]);
    let view = null;

    /**
     * 数据写入收口：**首屏之前**绑定只求值不订阅（服务端同理），这一窗里写进来的数据要靠
     * `flush()` 手动刷成快照——`vTableWrapper({ columns, rows })` 的 options 正好落在这个窗里。
     * 渲染之后订阅已经接上，写入自己就会到 DOM，不必再整树重扫。
     * 判据是视图根元素有没有落地（库内组件读 `_el` 的既有用法，如 svg / menu / chart）。
     */
    const syncView = () => {
      if (view !== null && !view._el) {
        view.flush();
      }

      return api;
    };

    /** 没有身份的行：按对象身份发内部键（DOM 上只会看到 `keyed` 镜像的 `data-row-key`）。 */
    let autoRowKeys = new WeakMap();
    let autoRowSerial = 0;
    let rowKeyHandler = null;

    const declaredRowKey = (row) => (rowKeyHandler ? rowKeyHandler(row) : (row?.id ?? row?.key));

    const rowKeyOf = (row) => {
      const declared = declaredRowKey(row);

      if (declared !== undefined && declared !== null) {
        return declared;
      }

      if (row === null || typeof row !== 'object') {
        return `row:${String(row)}`;
      }

      let key = autoRowKeys.get(row);

      if (key === undefined) {
        key = `row:auto-${autoRowSerial}`;
        autoRowSerial += 1;
        autoRowKeys.set(row, key);
      }

      return key;
    };

    const rows = keySet([], rowKeyOf, (item) => {
      /** 行行为 api：这一行的状态与命令都在这里（不在数据上）。 */
      item.api.selected = ref(false);
      item.api.select = () => {
        item.api.selected.value = true;
      };
    });

    /** 真正渲染的列：声明优先，其次按第一行对象推断（推断不出就是空）。 */
    const resolvedColumns = computed(() => {
      const declared = columns.value;
      return declared.length > 0
        ? declared
        : inferTableColumns(rows.value.map((item) => item.data));
    });

    /** 正文列：一列都没有时兜底成「整行一格」，与迁移前的数据层同口径。 */
    const bodyColumns = computed(() =>
      resolvedColumns.value.length > 0 ? resolvedColumns.value : [VALUE_COLUMN]
    );

    const hasColumns = computed(() => resolvedColumns.value.length > 0);
    const isEmpty = computed(() => rows.value.length === 0);
    const emptySpan = computed(() => String(Math.max(resolvedColumns.value.length, 1)));

    api.caption = (value) => {
      if (value === undefined) {
        return captionText.value;
      }

      captionText.value = value;
      return syncView();
    };

    api.columns = (value) => {
      if (value === undefined) {
        return columns.value;
      }

      columns.value = normalizeTableColumns(value);
      return syncView();
    };

    api.rows = (value) => {
      if (value === undefined) {
        return rows.values();
      }

      rows.replaceAll(Array.isArray(value) ? value : []);
      return syncView();
    };

    api.emptyText = (value) => {
      if (value === undefined) {
        return emptyText.value;
      }

      emptyText.value = value;
      return syncView();
    };

    /** 换行键口径（行没有 id / key 时最常用）：换完按新键重认一遍现有行。 */
    api.rowKey = (handler) => {
      if (handler === undefined) {
        return rowKeyHandler;
      }

      const next = typeof handler === 'function' ? handler : null;

      if (next === rowKeyHandler) {
        return api;
      }

      rowKeyHandler = next;
      autoRowKeys = new WeakMap();
      autoRowSerial = 0;
      rows.replaceAll(rows.values());
      return syncView();
    };

    /** 行行为 api：`item.api` 上是这一行的状态与命令，`item.data` 是行数据。 */
    api.item = (key) => rows.item(key);

    api.addRow = (row) => {
      rows.add(row);
      return syncView();
    };

    api.updateRow = (key, patch) => {
      rows.merge(key, patch);
      return syncView();
    };

    api.removeRow = (key) => {
      rows.remove(key);
      return syncView();
    };

    api.clearRows = () => {
      rows.clear();
      return syncView();
    };

    /** props：键必须是自己的命令——写错的键直接报错，不静默写进 DOM 属性。 */
    api.setupObject = (config) => {
      Object.entries(config).forEach(([key, value]) => {
        if (typeof api[key] !== 'function') {
          throw new TypeError(
            `vTableWrapper() does not take "${key}": it takes caption / columns / rows / ` +
              'emptyText / rowKey.'
          );
        }

        api[key](value);
      });

      return api;
    };

    /** 字符串 / 数字 = 表格标题。 */
    api.setupString = (value) => api.caption(value);

    view = vTable((table) => {
      table.caption(captionText);

      table.vThead((head) => {
        head.vTr((headRow) => {
          headRow.mountable(hasColumns);
          headRow.keyed(resolvedColumns, columnKeyOf, (column) =>
            vTh((cell) => {
              cell.attr('data-key', String(column.key));
              applyCellStyles(cell, column);
              appendCellContent(cell, column.label ?? column.key ?? '');
            })
          );
        });
      });

      table.vTbody((body) => {
        body.keyed(rows, (item, rowIndex) =>
          vTr((bodyRow) => {
            const row = item.data;

            bodyRow.toggleClass('is-selected', item.api.selected);
            bodyRow.keyed(bodyColumns, columnKeyOf, (column) =>
              vTd((cell) => {
                cell.attr('data-key', String(column.key));
                applyCellStyles(cell, column);
                appendCellContent(cell, resolveTableCellContent(column, row, rowIndex));
              })
            );
          })
        );

        body.vTr((emptyRow) => {
          emptyRow.mountable(isEmpty);
          emptyRow.vTd((cell) => {
            // 空态格的压暗 / 居中 / 大内边距归 CSS（`[data-empty='true']` 规则）
            cell.attr({ colspan: emptySpan, 'data-empty': 'true' });
            cell.child(emptyText);
          });
        });
      });
    });

    return view;
  });
}

export const vTableWrapper = createComponentShortcut(VTableWrapper);
