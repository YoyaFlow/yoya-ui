import { beforeEach, describe, expect, it, vi } from 'vitest';

const { FakeGrid, gridInstances } = vi.hoisted(() => {
  const gridInstances = [];

  const FakeGrid = (root, options) => {
    const api = {
      applyCalls: [],
      destroy() {
        this.destroyed = true;
      },
      lastOption: null,
      optionCalls: [],
      options,
      root,
      setGridOption(name, value) {
        this.lastOption = [name, value];
        this.optionCalls.push([name, value]);
      },
      applyTransaction(transaction) {
        this.applyCalls.push(transaction);
      },
      getDisplayedRowCount() {
        return this.options.rowData?.length ?? 0;
      }
    };
    gridInstances.push(api);
    return api;
  };

  return { FakeGrid, gridInstances };
});

vi.mock('ag-grid-community', () => ({
  AllCommunityModule: { moduleName: 'AllCommunity' },
  colorSchemeDark: {},
  ModuleRegistry: { registerModules: vi.fn() },
  themeQuartz: { withPart: vi.fn(() => ({})) },
  createGrid: FakeGrid
}));

import { AgGridPerformanceExample } from './ag-grid-performance-demo.js';
import { AgGridFinanceExample } from './ag-grid-finance-demo.js';
import { AgGridHrExample } from './ag-grid-hr-demo.js';
import { AgGridInventoryExample } from './ag-grid-inventory-demo.js';

describe('AG Grid scenario showcase demos', () => {
  beforeEach(() => {
    gridInstances.length = 0;
  });

  it('performance reloads row and column counts through the grid api', () => {
    const demo = AgGridPerformanceExample(1200, 4);
    const el = demo.render().renderDom();

    expect(gridInstances[0].options.rowData).toHaveLength(1200);
    expect(gridInstances[0].options.columnDefs).toHaveLength(6);

    demo.setSize(3000, 8);

    const calls = gridInstances[0].optionCalls;
    expect(calls[0][0]).toBe('columnDefs');
    expect(calls[0][1]).toHaveLength(10);
    const rowCall = gridInstances[0].optionCalls[1];
    expect(rowCall[0]).toBe('rowData');
    expect(rowCall[1]).toHaveLength(3000);
    expect(demo.cellCount()).toBe(24000);
    demo.destroy();
    el.remove();
  });

  it('finance renders sparkline and pushes price ticks via transactions', () => {
    const demo = AgGridFinanceExample();
    const el = demo.render().renderDom();
    const api = gridInstances[0];
    const columns = api.options.columnDefs;

    expect(api.options.rowData).toHaveLength(8);
    expect(api.options.getRowId({ data: { code: '600519' } })).toBe('600519');
    expect(demo.running()).toBe(true);
    expect(api.options.pinnedBottomRowData[0].marketValue).toBeGreaterThan(0);

    const historyColumn = columns.find((column) => column.field === 'history');
    const sparkHtml = historyColumn.cellRenderer({
      value: [10, 11, 12, 13]
    });
    expect(sparkHtml).toContain('<rect');
    expect(sparkHtml).toContain('fin-spark');

    demo.tick();
    expect(api.applyCalls.length).toBeGreaterThanOrEqual(1);
    expect(api.applyCalls.length).toBeLessThanOrEqual(4);
    expect(typeof api.applyCalls[0].update[0].price).toBe('number');
    expect(api.lastOption[0]).toBe('pinnedBottomRowData');

    demo.reset();
    expect(demo.tickCount()).toBe(0);
    expect(api.lastOption[1]).toHaveLength(8);
    demo.destroy();
    el.remove();
  });

  it('hr rebuilds visible flat rows when org nodes expand or collapse', () => {
    const demo = AgGridHrExample();
    const el = demo.render().renderDom();

    expect(gridInstances[0].options.rowData).toHaveLength(34);

    demo.collapseAll();
    expect(gridInstances[0].lastOption[1]).toHaveLength(4);

    demo.expandAll();
    expect(gridInstances[0].lastOption[1]).toHaveLength(34);
    expect(demo.visibleCount()).toBe(34);
    demo.destroy();
    el.remove();
  });

  it('inventory shows variant rows in a second grid and filters master rows', () => {
    const demo = AgGridInventoryExample();
    const el = demo.render().renderDom();

    const master = gridInstances[0];
    const detail = gridInstances[1];
    expect(master.options.rowData).toHaveLength(12);
    expect(master.options.pagination).toBe(true);

    master.options.onRowClicked({ data: master.options.rowData[0] });
    expect(detail.lastOption[1]).toHaveLength(2);
    expect(demo.countOf('缺货')).toBe(4);

    demo.setStatus('缺货');
    expect(master.lastOption[1]).toHaveLength(4);
    demo.destroy();
    el.remove();
  });
});
