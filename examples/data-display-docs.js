import { section, vButton, vCard, vPagination, vTable, vText, vTree } from '../src/index.js';
import { ComponentSource } from './component-source.js';

const dataDisplayDocsDefinitions = Object.freeze({
  table: createDataDisplayDocsDefinition({
    apiIntro:
      'vTable 用列定义描述表头、对齐、宽度和单元格渲染，用 rows 描述当前数据。空状态、行操作和分页都可以在同一个表格实例上更新。',
    apiRows: [
      [
        'vTable({ caption, columns, rows, emptyText })',
        '创建表格并填充数据。',
        'vTable({ columns, rows })'
      ],
      ['table.caption(content)', '设置表格标题。', "table.caption('服务列表')"],
      [
        'table.columns(columns)',
        '设置列定义，支持 key、label、align、width、render。',
        "table.columns([{ key: 'name', label: '名称' }])"
      ],
      ['table.rows(rows)', '替换当前行数据。', 'table.rows(nextRows)'],
      ['table.emptyText(content)', '设置空数据提示。', "table.emptyText('暂无匹配服务')"],
      [
        'column.render(row, index)',
        '渲染自定义单元格，适合状态标签和行操作。',
        'render: (row) => vButton(row.name)'
      ],
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
  }),
  tree: createDataDisplayDocsDefinition({
    apiIntro:
      'vTree 用树形数据描述层级，内置展开/收起、单选/多选和复选框状态，适合目录、组织架构和权限配置。',
    apiRows: [
      ['vTree({ nodes, ariaLabel, selectable, multiple })', '创建树形控件。', 'vTree({ nodes })'],
      [
        'tree.nodes(data)',
        '替换根节点数据，支持 id、label、children、expanded、selected、checked。',
        "tree.nodes([{ id: 'org', label: '组织', children: [] }])"
      ],
      [
        'node.icon(content | callback)',
        '自定义节点左侧图标，支持文本、ViewNode 或图标容器回调。',
        'icon: (icon) => icon.svg(...)'
      ],
      [
        'tree.toggleIcon(callback)',
        '自定义展开/收起图标，回调接收 (iconBox, expanded)。',
        'tree.toggleIcon((icon, expanded) => ...)'
      ],
      [
        'tree.vTreeNode(setup)',
        '用回调声明式创建树节点，节点内可继续嵌套 vTreeNode。',
        "tree.vTreeNode((node) => node.label('组织').vTreeNode(...))"
      ],
      [
        'node.actions(content | callback)',
        '在节点行尾添加可点击按钮或图标，回调接收 (actionsBox, node)。',
        'node.actions((actions) => actions.vButton(...))'
      ],
      [
        'node.expandable(value)',
        '让没有子节点的节点也能展开/收起，只切换图标状态。',
        'node.expandable(true)'
      ],
      ['tree.expandedKeys(keys)', '读取或设置展开节点。', "tree.expandedKeys(['org'])"],
      ['tree.selectedKeys(keys)', '读取或设置选中节点。', "tree.selectedKeys(['org'])"],
      ['tree.checkedKeys(keys)', '读取或设置勾选节点。', "tree.checkedKeys(['org'])"],
      ['tree.expandAll() / collapseAll()', '展开或收起全部节点。', 'tree.expandAll()'],
      ['tree.change(callback)', '监听展开、选中、勾选变化。', 'tree.change(({ type }) => ...)']
    ],
    apiSignature: `vTree({
  ariaLabel: '服务目录',
  nodes: [
    {
      id: 'frontend',
      label: '前端服务',
      expanded: true,
      children: [{ id: 'web', label: 'Web 门户' }]
    }
  ],
  change({ type, id, label }) {
    console.log(type, id, label);
  }
})`,
    examples: [
      {
        component: TreeBasicExample1,
        description: '树形数据展示服务目录，点击节点后把当前选中项写回状态区。',
        id: 'basic',
        imports: ['vButton', 'vCard', 'vText', 'vTree'],
        sourceTitle: '树形选择核心源码',
        title: '树形选择'
      },
      {
        component: TreeCheckableExample1,
        description: '开启 checkable 后可以用复选框批量选择资源，父节点会同步显示部分勾选状态。',
        id: 'checkable',
        imports: ['vButton', 'vCard', 'vText', 'vTree'],
        sourceTitle: '复选框树核心源码',
        title: '复选框树'
      },
      {
        component: TreeFileManagerExample1,
        description: '目录树和文件详情并排展示，选择节点后显示类型、大小和更新时间。',
        id: 'file-manager',
        imports: ['vButton', 'vCard', 'vText', 'vTree'],
        sourceTitle: '文件管理器核心源码',
        title: '文件管理器'
      },
      {
        component: TreeBuilderExample1,
        description: '用 vTree 回调直接声明树节点，适合把结构和状态写在一起的场景。',
        id: 'builder',
        imports: ['vButton', 'vCard', 'vText', 'vTree'],
        sourceTitle: '声明式树核心源码',
        title: '声明式构建'
      }
    ],
    examplesIntro: '下面四个示例分别展示树形选择、复选框树、文件管理器和声明式构建。',
    heading: 'vTree 树形控件',
    intro:
      'vTree 用于展示有层级的业务数据，比如组织架构、服务目录和权限配置。它把展开状态、选中状态和勾选状态收敛在同一个组件 API 中。',
    key: 'tree',
    routeItem: 'data-display:5',
    title: '树形控件',
    usageItems: [
      '需要展示父子层级或可折叠目录时，用 vTree 代替手写多层列表。',
      '需要批量选择资源或权限时，开启 checkable 并使用 checkedKeys。',
      '需要维护当前聚焦节点时，使用 selectedKeys 或 change 回调保持状态一致。'
    ]
  })
});

export function TableDocumentationPage() {
  return createDataDisplayDocumentationPage(dataDisplayDocsDefinitions.table);
}

export function TreeDocumentationPage() {
  return createDataDisplayDocumentationPage(dataDisplayDocsDefinitions.tree);
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
    {
      id: 'api-gateway',
      name: 'api-gateway',
      status: '运行中',
      owner: 'SRE',
      updatedAt: '2 分钟前'
    },
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

function TreeBasicExample1() {
  const status = vText('当前：未选择');
  const tree = vTree({
    ariaLabel: '服务目录',
    nodes: [
      {
        children: [
          { id: 'web', icon: 'W', label: 'Web 门户' },
          { id: 'console', icon: 'C', label: '控制台' }
        ],
        expanded: true,
        icon: 'F',
        id: 'frontend',
        label: '前端服务'
      },
      {
        children: [
          { id: 'api', icon: 'A', label: 'API 网关' },
          { id: 'worker', icon: 'T', label: '任务 Worker' },
          { id: 'scheduler', icon: 'S', label: '调度器' }
        ],
        icon: 'B',
        id: 'backend',
        label: '后端服务'
      },
      {
        children: [
          { id: 'database', icon: 'D', label: '数据库' },
          { id: 'object-store', icon: 'O', label: '对象存储' }
        ],
        icon: 'R',
        id: 'storage',
        label: '存储'
      }
    ],
    change({ label, type }) {
      if (type === 'select') {
        status.textContent(`当前：${label}`);
      }
    }
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('树形选择');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.child(tree);
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('当前选择');
              row.spacer();
              row.output((output) => {
                output.attr('data-tree-demo-status', 'true');
                output.child(status);
              });
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ alignItems: 'center', flexWrap: 'wrap', gap: '10px' });
            actions.vButton((button) => {
              button.label('展开全部');
              button.variant('secondary');
              button.on('click', () => {
                tree.expandAll();
                status.textContent('已展开全部节点');
              });
            });
            actions.vButton((button) => {
              button.label('收起全部');
              button.variant('secondary');
              button.on('click', () => {
                tree.collapseAll();
                status.textContent('已收起全部节点');
              });
            });
            actions.vButton((button) => {
              button.label('清除选择');
              button.variant('ghost');
              button.on('click', () => {
                tree.selectedKeys([]);
                status.textContent('当前：未选择');
              });
            });
          });
        });
      });
    }
  };
}

function TreeCheckableExample1() {
  const status = vText('已选 0 项');
  const tree = vTree({
    ariaLabel: '资源选择',
    checkable: true,
    nodes: [
      {
        children: [
          {
            children: [
              { id: 'api-gateway', label: 'API 网关' },
              { id: 'worker-pool', label: 'Worker 池' }
            ],
            expanded: true,
            id: 'compute',
            label: '计算资源'
          },
          {
            children: [
              { id: 'vpc', label: 'VPC' },
              { id: 'load-balancer', label: '负载均衡' }
            ],
            id: 'network',
            label: '网络'
          }
        ],
        expanded: true,
        id: 'infra',
        label: '基础设施'
      },
      {
        children: [
          { id: 'readonly-log', label: '审计日志' },
          { id: 'backup', label: '备份策略' }
        ],
        id: 'security',
        label: '安全合规'
      }
    ],
    change({ checkedKeys, type }) {
      if (type === 'check') {
        status.textContent(`已选 ${checkedKeys.length} 项`);
      }
    }
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('复选框树');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.child(tree);
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('勾选状态');
              row.spacer();
              row.output((output) => {
                output.attr('data-tree-check-status', 'true');
                output.child(status);
              });
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ alignItems: 'center', flexWrap: 'wrap', gap: '10px' });
            actions.vButton((button) => {
              button.label('全选');
              button.variant('primary');
              button.on('click', () => tree.checkAll(true));
            });
            actions.vButton((button) => {
              button.label('清空');
              button.variant('secondary');
              button.on('click', () => tree.checkAll(false));
            });
          });
        });
      });
    }
  };
}

function TreeFileManagerExample1() {
  const fileName = vText('未选择文件');
  const fileType = vText('--');
  const fileSize = vText('--');
  const fileUpdated = vText('--');
  const status = vText('从左侧选择文件');
  const fileMeta = {
    'logo.svg': { size: '4 KB', type: 'SVG 图片', updated: '8 月 21 日' },
    'release-notes.md': { size: '8 KB', type: 'Markdown', updated: '8 月 22 日' },
    'README.md': { size: '12 KB', type: 'Markdown', updated: '8 月 23 日' },
    'tree.js': { size: '18 KB', type: 'JavaScript', updated: '今天 14:32' }
  };
  const folderToggleIcon = (icon, expanded) => {
    icon.svg((svg) => {
      svg.attr({
        fill: 'none',
        stroke: '#1f2937',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-width': '2',
        viewBox: '0 0 24 24'
      });
      svg.styles({ display: 'block', height: '18px', width: '18px' });
      svg.path({
        d: expanded
          ? 'm6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2'
          : 'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z'
      });
    });
  };
  const tree = vTree((root) => {
    root.ariaLabel('文件目录');
    root.toggleIcon(folderToggleIcon);
    root.change(({ id, label, node, type }) => {
      if (type !== 'select') {
        return;
      }

      const meta = fileMeta[id] ?? {
        size: '--',
        type: node?.children?.length ? '文件夹' : '文件',
        updated: '--'
      };

      fileName.textContent(label);
      fileType.textContent(meta.type);
      fileSize.textContent(meta.size);
      fileUpdated.textContent(meta.updated);
      status.textContent(`当前：${label}`);
    });
    root.vTreeNode((node) => {
      node.id('projects');
      node.label('projects');
      node.expanded(true);
      node.vTreeNode((child) => {
        child.id('yoya-ui');
        child.label('yoya-ui');
        child.expanded(true);
        child.vTreeNode((folder) => {
          folder.id('src');
          folder.label('src');
          folder.expanded(true);
          folder.vTreeNode((emptyFolder) => {
            emptyFolder.expandable(true);
            emptyFolder.id('components');
            emptyFolder.label('components');
          });
          folder.vTreeNode((file) => {
            file.id('tree.js');
            file.label('tree.js');
          });
        });
        child.vTreeNode((file) => {
          file.id('README.md');
          file.label('README.md');
        });
      });
      node.vTreeNode((folder) => {
        folder.id('design');
        folder.label('design');
        folder.vTreeNode((file) => {
          file.id('logo.svg');
          file.label('logo.svg');
        });
      });
    });
    root.vTreeNode((folder) => {
      folder.id('documents');
      folder.label('documents');
      folder.vTreeNode((file) => {
        file.id('release-notes.md');
        file.label('release-notes.md');
      });
    });
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('文件管理器');
        card.vCardBody((body) => {
          body.hstack((layout) => {
            layout.style({ alignItems: 'stretch', flexWrap: 'wrap', gap: '16px' });
            layout.div((column) => {
              column.style({ flex: '1 1 280px', maxWidth: '100%', minWidth: '0' });
              column.child(tree);
            });
            layout.div((panel) => {
              panel.style({
                background: '#fbfcfe',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                flex: '2 1 320px',
                minWidth: '0',
                padding: '16px'
              });
              panel.h3((heading) => {
                heading.attr('data-tree-file-name', 'true');
                heading.child(fileName);
              });
              panel.p((description) => {
                description.attr('data-tree-file-status', 'true');
                description.child(status);
              });
              panel.div((metaRow) => {
                metaRow.style({
                  display: 'grid',
                  gap: '12px',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  marginTop: '14px'
                });
                metaRow.div((item) => {
                  item.style({ display: 'grid', gap: '2px' });
                  item.span('类型');
                  item.strong((value) => {
                    value.attr('data-tree-file-type', 'true');
                    value.child(fileType);
                  });
                });
                metaRow.div((item) => {
                  item.style({ display: 'grid', gap: '2px' });
                  item.span('大小');
                  item.strong((value) => {
                    value.attr('data-tree-file-size', 'true');
                    value.child(fileSize);
                  });
                });
                metaRow.div((item) => {
                  item.style({ display: 'grid', gap: '2px' });
                  item.span('更新时间');
                  item.strong((value) => {
                    value.attr('data-tree-file-updated', 'true');
                    value.child(fileUpdated);
                  });
                });
              });
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ alignItems: 'center', flexWrap: 'wrap', gap: '10px' });
            actions.vButton((button) => {
              button.label('新建文件夹');
              button.variant('secondary');
              button.on('click', () => status.textContent('已创建新文件夹'));
            });
            actions.vButton((button) => {
              button.label('上传文件');
              button.variant('primary');
              button.on('click', () => status.textContent('已开始上传文件'));
            });
            actions.vButton((button) => {
              button.label('刷新');
              button.variant('ghost');
              button.on('click', () => status.textContent('目录已刷新'));
            });
          });
        });
      });
    }
  };
}

function TreeBuilderExample1() {
  const status = vText('当前：未选择');
  const addRowAction = (node) => {
    node.actions((actions) => {
      actions.vButton((button) => {
        button.label('⋯');
        button.size('small');
        button.variant('ghost');
        button.attr({
          'aria-label': `扩展操作：${node.label()}`,
          'data-tree-builder-action': node.id()
        });
        button.on('click', () => status.textContent(`操作：${node.label()}`));
      });
    });
  };
  const tree = vTree((root) => {
    root.ariaLabel('权限目录');
    root.change(({ label, type }) => {
      if (type === 'select') {
        status.textContent(`当前：${label}`);
      }
    });
    root.vTreeNode((node) => {
      node.id('organization');
      node.label('组织架构');
      node.expanded(true);
      node.icon((icon) => icon.text('O'));
      node.vTreeNode((group) => {
        group.id('platform');
        group.label('平台组');
        group.expanded(true);
        group.icon((icon) => icon.text('P'));
        group.vTreeNode((item) => {
          item.id('sre');
          item.label('SRE');
          item.selected(true);
          item.icon((icon) => icon.text('S'));
          addRowAction(item);
        });
        group.vTreeNode((item) => {
          item.id('qa');
          item.label('QA');
          item.icon((icon) => icon.text('Q'));
          addRowAction(item);
        });
        addRowAction(group);
      });
      node.vTreeNode((group) => {
        group.id('business');
        group.label('业务组');
        group.expanded(true);
        group.icon((icon) => icon.text('B'));
        group.vTreeNode((item) => {
          item.id('finance');
          item.label('财务');
          item.icon((icon) => icon.text('F'));
          addRowAction(item);
        });
        group.vTreeNode((item) => {
          item.id('operations');
          item.label('运营');
          item.icon((icon) => icon.text('O'));
          addRowAction(item);
        });
        addRowAction(group);
      });
      addRowAction(node);
    });
    root.vTreeNode((node) => {
      node.id('security');
      node.label('安全中心');
      node.icon((icon) => icon.text('S'));
      addRowAction(node);
    });
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('声明式构建');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.child(tree);
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('当前选择');
              row.spacer();
              row.output((output) => {
                output.attr('data-tree-builder-status', 'true');
                output.child(status);
              });
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ alignItems: 'center', flexWrap: 'wrap', gap: '10px' });
            actions.vButton((button) => {
              button.label('展开全部');
              button.variant('secondary');
              button.on('click', () => tree.expandAll());
            });
            actions.vButton((button) => {
              button.label('收起全部');
              button.variant('secondary');
              button.on('click', () => tree.collapseAll());
            });
          });
        });
      });
    }
  };
}
