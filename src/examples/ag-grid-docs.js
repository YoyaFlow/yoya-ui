import { interopPageFrame } from './interop-section.js';
import { ComponentSource } from './component-source.js';
import './ag-grid-showcase.css';
import { AgGridDemoNode } from './demos/ag-grid-glue.js';
import { AgGridPerformanceExample } from './demos/ag-grid-performance-demo.js';
import { AgGridFinanceExample } from './demos/ag-grid-finance-demo.js';
import { AgGridHrExample } from './demos/ag-grid-hr-demo.js';
import { AgGridInventoryExample } from './demos/ag-grid-inventory-demo.js';

const AG_GRID_IMPORTS = [
  [
    "import { AllCommunityModule, colorSchemeDark, createGrid,",
    "  ModuleRegistry, themeQuartz } from 'ag-grid-community';"
  ].join('\n'),
  '',
  'ModuleRegistry.registerModules([AllCommunityModule]);'
].join('\n');

const GLUE_PANEL = ComponentSource({
  extraSource: AG_GRID_IMPORTS,
  imports: ['HtmlElementNode'],
  sourceComponent: AgGridDemoNode,
  title: 'AG Grid 统一胶水入口源码'
});

function performanceDemo() {
  return Object.freeze({
    component: () => AgGridPerformanceExample(),
    controls: [
      {
        label: '1 万行',
        run: (live, output) => {
          live.setSize(10000, live.colCount());
          output.textContent(
            `已重载 1 万行 × ${live.colCount()} 列，滚动与排序保持即时。`
          );
        }
      },
      {
        label: '5 万行',
        run: (live, output) => {
          live.setSize(50000, live.colCount());
          output.textContent(
            `已重载 5 万行 × ${live.colCount()} 列，滚动与排序保持即时。`
          );
        }
      },
      {
        label: '10 万行',
        run: (live, output) => {
          live.setSize(100000, live.colCount());
          output.textContent(
            `已重载 10 万行 × ${live.colCount()} 列，滚动与排序保持即时。`
          );
        }
      },
      {
        label: '6 列',
        run: (live, output) => {
          live.setSize(live.rowCount(), 6);
          output.textContent(`已重载 ${live.rowCount()} 行 × 6 列。`);
        }
      },
      {
        label: '16 列',
        run: (live, output) => {
          live.setSize(live.rowCount(), 16);
          output.textContent(`已重载 ${live.rowCount()} 行 × 16 列。`);
        }
      }
    ],
    description:
      '一次性挂载 5 万行起步、最高 10 万行与 16 个指标列，AG Grid 只渲染可视窗口；列头可拖宽，数字列带排序与过滤，随时按预设重载行数或列数验证性能。',
    glue: false,
    id: 'ag-grid-performance',
    kicker: 'PERFORMANCE',
    outputText:
      '当前 5 万行 × 10 列（共 50 万个数据点），全部列可排序、筛选、拖拽改宽。',
    title: '10 万级行 × 多列压力演示',
    usageComponent: AgGridPerformanceExample,
    usageImports: [
      {
        from: './demos/ag-grid-glue.js',
        names: ['AgGridDemoNode']
      }
    ],
    usageTitle: 'Performance 使用案例源码'
  });
}

function financeDemo() {
  return Object.freeze({
    component: () => AgGridFinanceExample(),
    controls: [
      {
        label: '启动行情',
        run: (live, output) => {
          live.start();
          output.textContent('行情运行中：每 650ms 随机跳动 2~4 只证券。');
        }
      },
      {
        label: '暂停行情',
        run: (live, output) => {
          live.stop();
          output.textContent(`已暂停，本次共更新 ${live.tickCount()} 轮。`);
        }
      },
      {
        label: '推进一步',
        run: (live, output) => {
          live.tick();
          output.textContent(`手动更新 1 轮，累计 ${live.tickCount()} 轮。`);
        }
      },
      {
        label: '重置行情',
        run: (live, output) => {
          live.reset();
          output.textContent('已重置为初始行情。');
        }
      }
    ],
    description:
      '进入页面行情即自动跳动：自选股带证券标识、涨跌色、持仓与浮动盈亏，日内走势列用 SVG 纵向柱形复刻官网 sparkline（Community 无内置 Sparkline）。applyTransaction 增量更新让价格与盈亏单元格自动闪烁，底部合计行随每次跳动同步变化。',
    glue: false,
    id: 'ag-grid-finance',
    kicker: 'FINANCE',
    outputText:
      '进入页面即开始实时跳动：价格与盈亏自动闪烁，底部合计行同步更新。',
    title: '实时行情与走势面板',
    usageComponent: AgGridFinanceExample,
    usageImports: [
      {
        from: './demos/ag-grid-glue.js',
        names: ['AgGridDemoNode']
      }
    ],
    usageTitle: 'Finance 使用案例源码'
  });
}

function hrDemo() {
  return Object.freeze({
    component: () => AgGridHrExample(),
    controls: [
      {
        label: '全部展开',
        run: (live, output) => {
          live.expandAll();
          output.textContent(`已展开完整组织树，当前可见 ${live.visibleCount()} 行。`);
        }
      },
      {
        label: '收起全部',
        run: (live, output) => {
          live.collapseAll();
          output.textContent(`已收起到 4 个中心，当前可见 ${live.visibleCount()} 行。`);
        }
      }
    ],
    description:
      '官方 HR 示例用 Enterprise Tree Data；这里用 Community 复刻：中心-小组-成员三级数据先拍平成可见行，首列按层级缩进并渲染展开箭头，收起/展开时由场景数据层重排行，其余列展示部门、用工、薪资与发薪状态。',
    glue: false,
    id: 'ag-grid-hr',
    kicker: 'HR',
    outputText: '默认展开 4 个中心与全部小组，可点行首箭头逐级收起。',
    title: '组织树形员工目录',
    usageComponent: AgGridHrExample,
    usageImports: [
      {
        from: './demos/ag-grid-glue.js',
        names: ['AgGridDemoNode']
      }
    ],
    usageTitle: 'HR 使用案例源码'
  });
}

function inventoryDemo() {
  return Object.freeze({
    component: () => AgGridInventoryExample(),
    controls: [
      {
        label: '全部',
        run: (live, output) => {
          live.setStatus('全部');
          output.textContent(
            `显示全部商品：在售 ${live.countOf('在售')}、已暂停 ` +
              `${live.countOf('已暂停')}、缺货 ${live.countOf('缺货')}。`
          );
        }
      },
      {
        label: '在售',
        run: (live, output) => {
          live.setStatus('在售');
          output.textContent(`仅显示在售商品，共 ${live.countOf('在售')} 个。`);
        }
      },
      {
        label: '已暂停',
        run: (live, output) => {
          live.setStatus('已暂停');
          output.textContent(`仅显示暂停销售商品，共 ${live.countOf('已暂停')} 个。`);
        }
      },
      {
        label: '缺货',
        run: (live, output) => {
          live.setStatus('缺货');
          output.textContent(`仅显示缺货商品，共 ${live.countOf('缺货')} 个。`);
        }
      }
    ],
    description:
      '商品主表（Community 无 Master/Detail）用“主表 + 点击行下方第二张网格”呈现规格明细；行内可暂停/恢复销售、一键补货或删除，状态筛选由场景层过滤 rowData 后整体重载。',
    glue: false,
    id: 'ag-grid-inventory',
    kicker: 'INVENTORY',
    outputText:
      '共 12 个商品：在售 5、已暂停 3、缺货 4。点击任意主行查看下方规格明细。',
    title: '商品库存主从管理',
    usageComponent: AgGridInventoryExample,
    usageImports: [
      {
        from: './demos/ag-grid-glue.js',
        names: ['AgGridDemoNode']
      },
      'HtmlElementNode'
    ],
    usageTitle: 'Inventory 使用案例源码'
  });
}

export function AgGridDocumentationPage() {
  return interopPageFrame({
    demos: [performanceDemo(), financeDemo(), hrDemo(), inventoryDemo()],
    docsKey: 'ag-grid',
    gluePanel: GLUE_PANEL,
    heading: 'AG Grid Community 数据表格',
    lead:
      '参照 ag-grid.com/example 的四个大型场景重做演示：Performance 大数据量、Finance 实时行情、HR 组织树、Inventory 主从库存。四个场景共用同一个胶水入口，只各自提供列与数据配置。',
    note:
      '网格统一由 AgGridDemoNode 入口挂载（createGrid 一次、destroy 时释放）。明暗与主题直接使用 AG Grid 自带的 Quartz：light / dark / auto-dark 跟随示例站的浅色、深色与系统模式，不再用 yoya-ui 变量改写 AG Grid 内部配色。',
    pageClass: 'components-ag-grid-showcase',
    usage: [
      '需要 10 万级行/列的虚拟滚动，滚动、排序与过滤保持即时。',
      '需要走势图、实时更新、树形层级、主从明细等专业业务表格结构。',
      '想复用同一个 AG Grid 容器入口，用列与数据配置拼不同业务场景。'
    ]
  });
}
