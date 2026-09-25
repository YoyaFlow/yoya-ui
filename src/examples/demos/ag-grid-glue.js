import { div, ref, vNode } from '../../index.js';
import {
  AllCommunityModule,
  colorSchemeDark,
  createGrid,
  ModuleRegistry,
  themeQuartz
} from 'ag-grid-community';
import { isDarkMode, watchDocsTheme } from './docs-theme.js';

ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * AG Grid 统一胶水组件（形态 B，照 `VBadge` 的写法规格）：场景只传
 * { columnDefs, rowData, gridOptions }，网格实例与主题观察器都挂在闭包里，
 * 初始化 / 清理走 `whenMount` / `whenDestroy`。
 *
 * 明暗主题走 AG Grid 官方 JS 主题 API（themeQuartz + colorSchemeDark），
 * 跟随示例站的浅色 / 深色 / 系统模式实时切换，不改写 AG Grid 配色。
 */
export function vAgGrid(options = {}) {
  const hidden = ref(Boolean(options.hidden));
  const resolveTheme = () => (isDarkMode() ? themeQuartz.withPart(colorSchemeDark) : themeQuartz);

  return vNode((api) => {
    const state = { gridApi: null, stopTheme: null };
    const applyTheme = () => state.gridApi?.setGridOption?.('theme', resolveTheme());

    api.setRows = (rows) => {
      state.gridApi?.setGridOption?.('rowData', rows);
      return api;
    };
    api.setGridOption = (name, value) => {
      state.gridApi?.setGridOption?.(name, value);
      return api;
    };
    api.applyTransaction = (transaction) => {
      state.gridApi?.applyTransaction?.(transaction);
      return api;
    };
    api.setVisible = (visible) => {
      hidden.value = !visible;
      return api;
    };
    api.whenMount = (host) => {
      const element = host?.element?.() ?? null;

      if (!element || state.gridApi) {
        return;
      }

      state.gridApi = createGrid(element, {
        columnDefs: options.columnDefs ?? [],
        rowData: options.rowData ?? [],
        theme: resolveTheme(),
        ...options.gridOptions
      });
      state.stopTheme = watchDocsTheme(applyTheme);
    };
    api.whenDestroy = () => {
      state.stopTheme?.();
      state.stopTheme = null;
      state.gridApi?.destroy();
      state.gridApi = null;
    };

    return div({
      'data-ag-grid-host': 'true',
      style: {
        display: () => (hidden.value ? 'none' : null),
        height: options.height ?? '440px',
        width: '100%'
      }
    });
  });
}
