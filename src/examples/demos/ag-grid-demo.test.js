import { beforeEach, describe, expect, it, vi } from 'vitest';

const { FakeGrid, gridInstances } = vi.hoisted(() => {
  const gridInstances = [];

  const FakeGrid = (root, options) => {
    const api = {
      destroy() {
        this.destroyed = true;
      },
      options,
      root,
      rowCalls: [],
      setGridOption(name, rows) {
        this.rowCalls.push([name, rows]);
      }
    };
    gridInstances.push(api);
    return api;
  };

  return { FakeGrid, gridInstances };
});

vi.mock('ag-grid-community', () => ({ createGrid: FakeGrid }));

import { AgGridExample } from './ag-grid-demo.js';

describe('AG Grid interop demo', () => {
  beforeEach(() => {
    gridInstances.length = 0;
  });

  it('mounts the grid on the rendered container with column definitions', () => {
    const demo = AgGridExample();
    const el = demo.render().renderDom();

    expect(el.dataset.agGridHost).toBe('true');
    expect(el.classList.contains('ag-theme-quartz')).toBe(true);
    expect(gridInstances).toHaveLength(1);
    expect(gridInstances[0].root).toBe(el);
    expect(gridInstances[0].options.columnDefs.length).toBeGreaterThan(1);
    el.remove();
  });

  it('forwards row updates to the grid api', () => {
    const demo = AgGridExample();
    const el = demo.render().renderDom();
    const nextRows = [{ name: 'pay-service', owner: 'SRE' }];

    demo.setRows(nextRows);

    expect(gridInstances[0].rowCalls[0]).toEqual(['rowData', nextRows]);
    el.remove();
  });

  it('destroys the grid and tolerates updates after destroy', () => {
    const demo = AgGridExample();
    const el = demo.render().renderDom();
    document.body.appendChild(el);

    demo.destroy();

    expect(gridInstances[0].destroyed).toBe(true);
    expect(document.body.contains(el)).toBe(false);
    expect(() => demo.setRows([])).not.toThrow();
  });
});
