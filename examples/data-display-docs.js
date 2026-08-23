import { section, vButton, vCard, vPagination, vTable, vText } from '../src/index.js';
import { ComponentSource } from './component-source.js';

const dataDisplayDocsDefinitions = Object.freeze({
  table: createDataDisplayDocsDefinition({
    apiIntro:
      'vTable 用列定义描述表头、对齐、宽度和单元格渲染，用 rows 描述当前数据。空状态、行操作和分页都可以在同一个表格实例上更新。',
    apiRows: [
      ['vTable({ caption, columns, rows, emptyText })', '创建表格并填充数据。', "vTable({ columns, rows })"],
      ['table.caption(content)', '设置表格标题。', "table.caption('服务列表')"],
      ['table.columns(columns)', '设置列定义，支持 key、label、align、width、render。', "table.columns([{ key: 'name', label: '名称' }])"],
      ['table.rows(rows)', '替换当前行数据。', 'table.rows(nextRows)'],
      ['table.emptyText(content)', '设置空数据提示。', "table.emptyText('暂无匹配服务')"],
      ['column.render(row, index)', '渲染自定义单元格，适合状态标签和行操作。', "render: (row) => vButton(row.name)"],
      ['column.align / width / minWidth', '控制单元格对齐和列宽。', "align: 'right', width: 120"]
    ],
    apiSignature: `vTable({
  caption: '服务列表',
  columns: [
    { key: 'name', label: '名称' },
    { key: 'status', label: '状态' },
    { key: 'actions', label: '操作', render: (row) => vButton(row.name) }
  ],
  rows
})`,
    examples: [
      {
        component: TableBasicExample1,
        description: '用 column.render 放入行操作按钮，点击后把当前行写回状态区。',
        id: 'basic',
        imports: ['vButton', 'vCard', 'vTable', 'vText'],
        sourceTitle: '基础表格核心源码',
        title: '基础表格'
      },
      {
        component: TableEmptyExample1,
        description: '空数据时显示 emptyText，数据返回后直接 rows(nextRows) 替换内容。',
        id: 'empty',
        imports: ['vButton', 'vCard', 'vTable', 'vText'],
        sourceTitle: '空状态核心源码',
        title: '空状态'
      },
      {
        component: TablePaginationExample1,
        description: '分页器只负责页码状态，表格根据 page 和 pageSize 切换当前页数据。',
        id: 'pagination',
        imports: ['vCard', 'vPagination', 'vTable', 'vText'],
        sourceTitle: '分页表格核心源码',
        title: '分页联动'
      }
    ],
    examplesIntro: '下面三个示例分别展示基础表格、空状态和分页联动。',
    heading: 'vTable 表格',
    intro:
      '表格用于展示结构化列表数据。vTable 把列定义、行数据、空状态和自定义单元格统一起来，适合后台列表、服务清单和审批队列。',
    key: 'table',
    routeItem: 'data-display:4',
    title: '表格',
    usageItems: [
      '需要按列扫描一组同构数据时，用 vTable。',
      '需要在最后一列放查看、重启、删除等操作时，用 column.render 返回按钮组件。',
      '接口返回空数组时，设置 emptyText，而不是在外层额外拼一个空状态。'
    ]
  })
});

export function TableDocumentationPage() {
  return createDataDisplayDocumentationPage(dataDisplayDocsDefinitions.table);
}

function createDataDisplayDocsDefinition(config) {
  return Object.freeze({
    apiIntro: config.apiIntro ?? '',
    apiRows: Object.freeze(config.apiRows ?? []),
    apiSignature: config.apiSignature ?? '',
    examples: Object.freeze(config.examples ?? []),
    examplesIntro: config.examplesIntro ?? '下面的示例可以直接复制到自己的对象组件中。',
    heading: config.heading,
    intro: config.intro,
    key: config.key,
    routeItem: config.routeItem,
    title: config.title,
    usageItems: Object.freeze(config.usageItems ?? []),
    usageIntro: config.usageIntro ?? '',
    usageTitle: config.usageTitle ?? '何时使用',
    apiTitle: config.apiTitle ?? '常用 API'
  });
}

function createDataDisplayDocumentationPage(definition) {
  return {
    render() {
      return section((page) => {
        page.className(
          `components-route-page components-data-display-docs components-data-display-docs--${definition.key}`
        );
        page.attr('data-component-route-item', definition.routeItem);
        page.attr('data-data-display-docs', definition.key);

        page.header((header) => {
          header.className('components-data-display-docs-header');
          header.h1(definition.heading);
          header.p(definition.intro);
        });

        page.section((usage) => {
          usage.className('components-data-display-docs-usage');
          usage.attr('data-data-display-usage', definition.key);
          usage.h2(definition.usageTitle);
          if (definition.usageIntro) {
            usage.p(definition.usageIntro);
          }
          usage.ul((list) => {
            definition.usageItems.forEach((itemText) => {
              list.li(itemText);
            });
          });
        });

        page.section((api) => {
          api.className('components-data-display-docs-api');
          api.h2(definition.apiTitle);
          if (definition.apiIntro) {
            api.p(definition.apiIntro);
          }
          api.pre((pre) => {
            pre.className('data-display-api-signature');
            pre.code(definition.apiSignature);
          });
          api.table((table) => {
            table.thead((head) => {
              head.tr((row) => {
                row.th('API');
                row.th('用途');
                row.th('示例');
              });
            });
            table.tbody((body) => {
              definition.apiRows.forEach(([name, purpose, example]) => {
                body.tr((row) => {
                  row.td((cell) => cell.code(name));
                  row.td(purpose);
                  row.td((cell) => cell.code(example));
                });
              });
            });
          });
        });

        page.section((examples) => {
          examples.className('components-data-display-docs-examples');
          examples.h2('代码演示');
          examples.p(definition.examplesIntro);
          definition.examples.forEach((demo) => {
            examples.child(DataDisplayExampleSection(demo));
          });
        });
      });
    }
  };
}

function DataDisplayExampleSection(demo) {
  const liveDemo = demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    sourceComponent: demo.sourceComponent ?? demo.component,
    imports: demo.imports ?? [],
    title: demo.sourceTitle ?? `${demo.title} 核心源码`
  });

  return {
    render() {
      return section((example) => {
        example.className('components-data-display-demo');
        example.attr('data-data-display-demo', demo.id);
        example.h3(demo.title);
        example.p(demo.description);
        example.div((live) => {
          live.className('components-data-display-demo-live');
          live.attr('data-data-display-demo-live', 'true');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}

function TableBasicExample1() {
  const status = vText('等待操作');
  const rows = [
    { id: 'api-gateway', name: 'api-gateway', status: '运行中', owner: 'SRE', updatedAt: '2 分钟前' },
    { id: 'worker', name: 'worker', status: '排队中', owner: 'Data', updatedAt: '8 分钟前' },
    { id: 'web', name: 'web', status: '维护中', owner: 'Web', updatedAt: '16 分钟前' }
  ];

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('基础表格');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.vTable({
              caption: '服务列表',
              columns: [
                { key: 'name', label: '服务名称', minWidth: 160 },
                { key: 'status', label: '状态', width: 110 },
                { key: 'owner', label: '负责人', width: 110 },
                { key: 'updatedAt', label: '更新时间', width: 120 },
                {
                  key: 'actions',
                  label: '操作',
                  align: 'right',
                  width: 110,
                  render(row) {
                    return vButton((button) => {
                      button.label('选择');
                      button.size('small');
                      button.attr('data-table-row-action', row.id);
                      button.on('click', () => status.textContent(`已选择 ${row.id}`));
                    });
                  }
                }
              ],
              rows
            });
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('最近操作');
              row.spacer();
              row.output((output) => {
                output.attr('data-table-demo-status', 'true');
                output.child(status);
              });
            });
          });
        });
      });
    }
  };
}

function TableEmptyExample1() {
  const status = vText('当前为空');
  const table = vTable({
    caption: '告警记录',
    columns: [
      { key: 'name', label: '告警项', minWidth: 180 },
      { key: 'level', label: '级别', width: 100 },
      { key: 'time', label: '时间', width: 140 }
    ],
    emptyText: '暂无匹配告警',
    rows: []
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('空状态');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('接口返回空数组时，表格会保持表头并展示 emptyText。');
            content.child(table);
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('数据状态');
              row.spacer();
              row.output((output) => output.child(status));
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ alignItems: 'center', flexWrap: 'wrap', gap: '10px' });
            actions.vButton((button) => {
              button.label('填充数据');
              button.variant('primary');
              button.on('click', () => {
                table.rows([
                  { name: 'CPU 使用率', level: 'warning', time: '刚刚' },
                  { name: '队列堆积', level: 'info', time: '3 分钟前' }
                ]);
                status.textContent('已加载 2 条');
              });
            });
            actions.vButton((button) => {
              button.label('清空');
              button.variant('secondary');
              button.on('click', () => {
                table.rows([]);
                status.textContent('当前为空');
              });
            });
          });
        });
      });
    }
  };
}

function TablePaginationExample1() {
  const allRows = [
    { name: 'api-gateway', status: '运行中', owner: 'SRE' },
    { name: 'worker', status: '排队中', owner: 'Data' },
    { name: 'web', status: '维护中', owner: 'Web' },
    { name: 'scheduler', status: '运行中', owner: 'Ops' },
    { name: 'billing', status: '停止', owner: 'Finance' }
  ];
  const pageState = vText('第 1 页');
  const table = vTable({
    caption: '分页服务列表',
    columns: [
      { key: 'name', label: '服务名称', minWidth: 160 },
      { key: 'status', label: '状态', width: 110 },
      { key: 'owner', label: '负责人', width: 110 }
    ],
    rows: allRows.slice(0, 2)
  });
  const pagination = vPagination({
    page: 1,
    pageSize: 2,
    pageSizes: [2, 3],
    total: allRows.length,
    onChange({ page, pageSize }) {
      const start = (page - 1) * pageSize;
      table.rows(allRows.slice(start, start + pageSize));
      pageState.textContent(`第 ${page} 页`);
    }
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('分页联动');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.child(table);
            content.child(pagination);
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('当前页');
              row.spacer();
              row.output((output) => output.child(pageState));
            });
          });
        });
      });
    }
  };
}
