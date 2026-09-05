import { HtmlElementNode } from '../../index.js';
import {
  AllCommunityModule,
  colorSchemeDark,
  createGrid,
  ModuleRegistry,
  themeQuartz
} from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

function modeIsDark() {
  if (typeof document !== 'undefined') {
    const mode = document.documentElement?.dataset.yoyaMode;
    if (mode === 'dark') {
      return true;
    }
    if (mode === 'system' && typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  }
  return false;
}

function currentTheme() {
  return modeIsDark()
    ? themeQuartz.withPart(colorSchemeDark)
    : themeQuartz;
}

/**
 * AG Grid 统一胶水入口：场景只传 { columnDefs, rowData, gridOptions }。
 * 明暗主题走 AG Grid 官方 JS 主题 API（themeQuartz + colorSchemeDark），
 * 跟随示例站的浅色 / 深色 / 系统模式实时切换，不改写 AG Grid 配色。
 */
export class AgGridDemoNode extends HtmlElementNode {
  constructor(options = {}) {
    super('div', null);
    this._api = null;
    this._columnDefs = options.columnDefs ?? [];
    this._gridOptions = options.gridOptions ?? {};
    this._rowData = options.rowData ?? [];
    this._theme = currentTheme();
    this._themeObserver = null;
    this._onMediaChange = null;
    this._mediaQuery = null;
    this.attr('data-ag-grid-host', 'true');
    this.styles({ height: options.height ?? '440px', width: '100%' });
    if (options.hidden) {
      this.style('display', 'none');
    }
  }

  renderDom() {
    const element = super.renderDom();
    if (this._api) {
      return element;
    }
    this._watchTheme();
    this._api = createGrid(element, {
      columnDefs: this._columnDefs,
      rowData: this._rowData,
      theme: this._theme,
      ...this._gridOptions
    });
    return element;
  }

  _applyTheme() {
    this._theme = currentTheme();
    this._api?.setGridOption?.('theme', this._theme);
  }

  _watchTheme() {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
      return;
    }
    if (!this._themeObserver) {
      this._themeObserver = new MutationObserver(() => this._applyTheme());
      this._themeObserver.observe(document.documentElement, {
        attributeFilter: ['data-yoya-mode'],
        attributes: true
      });
    }
    if (
      !this._mediaQuery &&
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function'
    ) {
      this._mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this._onMediaChange = () => this._applyTheme();
      this._mediaQuery.addEventListener?.('change', this._onMediaChange);
    }
  }

  setRows(rows) {
    this._rowData = rows;
    this._api?.setGridOption?.('rowData', rows);
  }

  setGridOption(name, value) {
    this._api?.setGridOption?.(name, value);
  }

  applyTransaction(transaction) {
    this._api?.applyTransaction?.(transaction);
  }

  setVisible(visible) {
    this.style('display', visible ? null : 'none');
  }

  destroy() {
    this._themeObserver?.disconnect();
    this._themeObserver = null;
    this._mediaQuery?.removeEventListener?.('change', this._onMediaChange);
    this._onMediaChange = null;
    this._mediaQuery = null;
    if (this._api) {
      this._api.destroy();
      this._api = null;
    }
    return super.destroy();
  }
}
