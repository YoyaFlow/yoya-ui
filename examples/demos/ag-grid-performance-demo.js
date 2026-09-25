import { vNode } from '@yoyaflow/yoya-ui';
import { vAgGrid } from './ag-grid-glue.js';

export function AgGridPerformanceExample(rowCount = 50000, colCount = 10) {
  const makeRows = (rows, cols) =>
    Array.from({ length: rows }, (_, rowIndex) => {
      const row = {
        id: rowIndex + 1,
        name: `record-${String(rowIndex + 1).padStart(6, '0')}`
      };

      for (let colIndex = 0; colIndex < cols; colIndex += 1) {
        row[`metric${colIndex}`] =
          ((rowIndex * 131 + colIndex * 71) % 9973) / 100;
      }
      return row;
    });

  const makeColumns = (cols) => {
    const fixed = [
      { field: 'id', headerName: '#', type: 'numericColumn', width: 90 },
      {
        field: 'name',
        filter: 'agTextColumnFilter',
        headerName: '记录名',
        pinned: 'left',
        width: 190
      }
    ];
    const metrics = Array.from({ length: cols }, (_, index) => ({
      field: `metric${index}`,
      filter: 'agNumberColumnFilter',
      headerName: `指标 ${index + 1}`,
      type: 'numericColumn',
      width: 130
    }));

    return [...fixed, ...metrics];
  };

  const state = { colCount, rowCount };

  return vNode((api) => {
    const node = vAgGrid({
      columnDefs: makeColumns(state.colCount),
      height: '480px',
      rowData: makeRows(state.rowCount, state.colCount)
    });

    api.setSize = (rows, cols) => {
      state.rowCount = rows;
      state.colCount = cols;
      node.setGridOption('columnDefs', makeColumns(cols));
      node.setRows(makeRows(rows, cols));
      return api;
    };
    api.rowCount = () => state.rowCount;
    api.colCount = () => state.colCount;
    api.cellCount = () => state.rowCount * state.colCount;

    return node;
  });
}
