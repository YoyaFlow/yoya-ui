import { HtmlElementNode } from '../../index.js';
import { createGrid } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

const DEFAULT_ROWS = [
  { name: 'api-gateway', owner: '平台组', status: '运行中' },
  { name: 'pay-service', owner: '交易组', status: '运行中' },
  { name: 'report-worker', owner: '数据组', status: '已停用' }
];

const COLUMN_DEFS = [
  { field: 'name', headerName: '服务名', sortable: true, filter: true },
  { field: 'owner', headerName: '负责人', sortable: true },
  { field: 'status', headerName: '状态', sortable: true, filter: true }
];

export class AgGridDemoNode extends HtmlElementNode {
  constructor(rows) {
    super('div', null);
    this._api = null;
    this._rows = rows;
    this.attr('data-ag-grid-host', 'true');
    this.className('ag-theme-quartz');
    this.styles({ height: '340px', width: '100%' });
  }

  renderDom() {
    const element = super.renderDom();
    if (this._api) {
      return element;
    }
    this._api = createGrid(element, {
      columnDefs: COLUMN_DEFS,
      defaultColDef: { resizable: true },
      rowData: this._rows
    });
    return element;
  }

  setRows(rows) {
    if (!this._api) {
      return;
    }
    if (typeof this._api.setGridOption === 'function') {
      this._api.setGridOption('rowData', rows);
      return;
    }
    this._api.setRowData(rows);
  }

  destroy() {
    if (this._api) {
      this._api.destroy();
      this._api = null;
    }
    return super.destroy();
  }
}

export function AgGridExample(rows = DEFAULT_ROWS) {
  let node = null;

  return {
    render() {
      node = new AgGridDemoNode(rows);
      return node;
    },
    setRows(next) {
      node?.setRows(next);
    },
    destroy() {
      node?.destroy();
      node = null;
    }
  };
}
