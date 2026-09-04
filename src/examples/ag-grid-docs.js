import { interopPageFrame } from './interop-section.js';
import { AgGridDemoNode, AgGridExample } from './demos/ag-grid-demo.js';

const AG_GRID_DEMO = Object.freeze({
  id: 'ag-grid',
  description: '点击表头即可排序；「刷新数据」会用第二组行数据更新网格。',
  component: AgGridExample,
  sourceComponent: AgGridDemoNode,
  imports: ['HtmlElementNode'],
  extraSource: [
    "import { createGrid } from 'ag-grid-community';",
    "import 'ag-grid-community/styles/ag-grid.css';",
    "import 'ag-grid-community/styles/ag-theme-quartz.css';"
  ].join('\n'),
  sourceTitle: 'AG Grid 胶水类源码',
  outputText: '当前展示内置示例数据，可点击「刷新数据」。',
  controls: [
    {
      label: '刷新数据',
      run: (live, output) => {
        const nextRows = [
          { name: 'search-service', owner: '检索组', status: '运行中' },
          { name: 'notify-worker', owner: '消息组', status: '运行中' },
          { name: 'legacy-job', owner: '运维组', status: '已停用' }
        ];
        live.setRows(nextRows);
        output.textContent(`已更新 ${nextRows.length} 行数据。`);
      }
    }
  ]
});

export function AgGridDocumentationPage() {
  return interopPageFrame({
    docsKey: 'ag-grid',
    heading: 'AG Grid Community 数据表格',
    lead: '内置 vTable 覆盖高频表格；排序、过滤等专业网格需求直接交给 AG Grid Community。',
    usage: [
      '需要排序、过滤、列宽调整等开箱即用的专业网格交互。',
      '数据量或交互复杂度超过基础表格的适用边界。',
      '想保留 AG Grid 自己的生态与更新节奏，而不是重新实现一遍。'
    ],
    note: 'AG Grid 只在客户端创建（createGrid 返回网格 API）并经 vClientOnly 挂载；数据更新走 api，销毁时调用 destroy。',
    demos: [AG_GRID_DEMO]
  });
}
