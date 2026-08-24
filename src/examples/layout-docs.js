import { section, vBody, vCard, vDialog, vText } from '../index.js';
import { ComponentSource } from './component-source.js';

const layoutDocsDefinitions = Object.freeze({
  body: createLayoutDocsDefinition({
    apiIntro: 'vBody 负责页面壳，container 负责局部宽度收敛，content 可以继续下钻。',
    apiRows: [
      [
        'vBody({ background, maxWidth, padding, gap })',
        '创建整页壳。',
        'vBody({ maxWidth: 1120, gap: 24 })'
      ],
      [
        'container({ maxWidth, paddingInline })',
        '在内部再收一层内容宽度。',
        'container({ maxWidth: 920 })'
      ],
      [
        'content(...)',
        '访问内层内容容器并继续布局。',
        'page.content((content) => content.vstack(...))'
      ]
    ],
    apiSignature: `vBody({ maxWidth: 1120, padding: 'clamp(16px, 3vw, 32px)', gap: 24 })`,
    examples: [
      {
        component: BodyShellExample1,
        description: '用 vBody 统一页面背景、内容宽度和留白，再在内部拼出工作台布局。',
        id: 'shell',
        imports: ['vBody', 'vButton', 'vText'],
        sourceTitle: '页面容器核心源码',
        title: '页面工作台'
      },
      {
        component: BodyContainerExample1,
        description: 'container 适合把局部内容收窄到更易读的宽度。',
        id: 'container',
        imports: ['container', 'responsiveGrid', 'vCard'],
        sourceTitle: '内容容器核心源码',
        title: '内容容器'
      }
    ],
    examplesIntro: '这两个例子分别展示整页壳和局部容器的用法。',
    heading: 'vBody 页面容器',
    intro: 'vBody 统一页面背景、内容宽度和留白，内部再自由组合工具条、卡片和网格。',
    key: 'body',
    routeItem: 'layout:3',
    title: '布局',
    usageItems: [
      '整页工作台需要统一背景和阅读宽度。',
      '标题栏、指标区和工作区需要清晰留白。',
      '内部内容仍可继续组合 container、grid 和 center。'
    ]
  }),
  divider: createLayoutDocsDefinition({
    apiIntro: 'divider 默认是横向分割线，orientation 为 vertical 时可在行内使用。',
    apiRows: [
      ['divider()', '默认横向分割线。', 'divider()'],
      [
        "divider({ orientation: 'vertical' })",
        '纵向分割线，适合并排动作。',
        "row.divider({ orientation: 'vertical' })"
      ],
      ['与 stack / hstack 配合', '保持分块和行内内容的节奏。', 'row.divider();']
    ],
    apiSignature: `divider({ orientation: 'vertical' })`,
    examples: [
      {
        component: DividerSectionExample1,
        description: '在相邻段落之间插入水平分割线。',
        id: 'section',
        imports: ['divider', 'stack'],
        sourceTitle: '段落分隔核心源码',
        title: '段落分隔'
      },
      {
        component: DividerToolbarExample1,
        description: '在工具条中用竖线拆分连续动作。',
        id: 'toolbar',
        imports: ['divider', 'hstack', 'spacer', 'vButton'],
        sourceTitle: '工具条分组核心源码',
        title: '工具条分组'
      }
    ],
    examplesIntro: '一个示例展示块间分隔，另一个示例展示行内分隔。',
    heading: 'divider 分割线',
    intro: 'divider 负责把相邻内容块切开，帮助读者看清层级和分区。',
    key: 'divider',
    routeItem: 'layout:0',
    title: '分割线',
    usageItems: [
      '列表、详情页和设置页里，用它拆开相邻区块。',
      '工具条里用 vertical divider 识别操作组。',
      '如果只是想拉开大块距离，优先用 gap 或 stack。'
    ]
  }),
  flex: createLayoutDocsDefinition({
    apiIntro: 'flex 负责通用弹性排布，stack / vstack / hstack / center 是常见的专用写法。',
    apiRows: [
      [
        'flex({ align, justify, gap, wrap, direction })',
        '通用弹性容器。',
        "flex({ gap: '12px', align: 'center', wrap: true })"
      ],
      ['stack({ gap })', '纵向堆叠，默认 column。', "stack({ gap: '10px' })"],
      ['vstack({ gap })', '与 stack 等价的纵向写法。', "vstack({ gap: '10px' })"],
      ['hstack({ gap })', '横向排布，默认 row。', "hstack({ gap: '10px' })"],
      ['center()', '让内容居中显示。', 'center()']
    ],
    apiSignature: `flex({ gap: '12px', align: 'center', justify: 'space-between', wrap: true })`,
    examples: [
      {
        component: FlexToolbarExample1,
        description: '用 flex 组织一个会自动换行的筛选工具条。',
        id: 'wrap',
        imports: ['flex', 'spacer', 'vButton'],
        sourceTitle: '换行工具条核心源码',
        title: '换行工具条'
      },
      {
        component: FlexStackExample1,
        description: '用 stack / vstack / hstack 组织纵向步骤和状态行。',
        id: 'stack',
        imports: ['hstack', 'stack', 'vCard', 'vstack'],
        sourceTitle: '纵向堆叠核心源码',
        title: '纵向堆叠'
      },
      {
        component: FlexCenterExample1,
        description: 'center 适合空状态、加载态和确认页。',
        id: 'center',
        imports: ['center', 'vButton', 'vCard'],
        sourceTitle: '居中占位核心源码',
        title: '居中占位'
      }
    ],
    examplesIntro: '这三组例子分别展示换行、纵向堆叠和居中场景。',
    heading: 'flex 弹性布局',
    intro: 'flex、stack、hstack、vstack 和 center 组成了最常用的基础排版工具箱。',
    key: 'flex',
    routeItem: 'layout:1',
    title: '弹性布局',
    usageItems: [
      '标题栏、筛选条和操作区适合用 flex / hstack。',
      '卡片内容、说明文字和步骤列表适合用 stack / vstack。',
      '空状态、加载态和确认页适合用 center。'
    ]
  }),
  grid: createLayoutDocsDefinition({
    apiIntro: 'grid 适合固定轨道，responsiveGrid 适合随视口自动换列。',
    apiRows: [
      [
        'grid({ columns, rows, areas, autoFlow, gap })',
        '固定轨道和明确区域。',
        "grid({ columns: 3, gap: '12px' })"
      ],
      [
        'responsiveGrid({ minColumnWidth, breakpoints, gap })',
        '按视口自动换列。',
        'responsiveGrid({ minColumnWidth: 180 })'
      ],
      [
        'breakpoints',
        '支持数组或对象，按最小宽度选择列数。',
        'responsiveGrid({ breakpoints: [{ minWidth: 640, columns: 2 }] })'
      ]
    ],
    apiSignature: `responsiveGrid({ minColumnWidth: 180, breakpoints: [{ minWidth: 640, columns: 2 }, { minWidth: 960, columns: 3 }] })`,
    examples: [
      {
        component: GridFixedExample1,
        description: '固定列数的指标面板，适合摘要和仪表盘。',
        id: 'fixed',
        imports: ['grid', 'vCard'],
        sourceTitle: '固定栅格核心源码',
        title: '固定栅格'
      },
      {
        component: GridResponsiveExample1,
        description: '根据最小列宽和断点自动切换列数。',
        id: 'responsive',
        imports: ['responsiveGrid', 'vCard'],
        sourceTitle: '响应式栅格核心源码',
        title: '响应式栅格'
      }
    ],
    examplesIntro: '一组示例展示固定栅格，另一组示例展示自适应栅格。',
    heading: 'grid 栅格',
    intro: 'grid 负责固定轨道，responsiveGrid 负责在不同视口里自动调整列数。',
    key: 'grid',
    routeItem: 'layout:2',
    title: '栅格',
    usageItems: [
      '固定列数的指标面板适合用 grid。',
      '内容密度高、卡片数量变化大的区域适合用 responsiveGrid。',
      '如果只是简单的横向对齐，优先用 flex / hstack。'
    ]
  }),
  spacer: createLayoutDocsDefinition({
    apiIntro: 'spacer 会吸收剩余空间，也可以用 size 和 orientation 做定长占位。',
    apiRows: [
      ['spacer()', '默认吸收剩余空间。', 'row.spacer()'],
      [
        'spacer({ size, orientation })',
        '可固定宽度或高度。',
        "spacer({ size: 24, orientation: 'vertical' })"
      ],
      ['与 hstack / vstack 配合', '在横向或纵向布局中推开内容。', 'row.spacer();']
    ],
    apiSignature: `spacer({ size: 24, orientation: 'vertical' })`,
    examples: [
      {
        component: SpacerToolbarExample1,
        description: '用 spacer 把标题和动作推到两侧。',
        id: 'toolbar',
        imports: ['hstack', 'spacer', 'vButton', 'vCard'],
        sourceTitle: '工具条留白核心源码',
        title: '工具条留白'
      },
      {
        component: SpacerSummaryExample1,
        description: '在摘要行里让值项稳定贴在右侧。',
        id: 'summary',
        imports: ['hstack', 'spacer', 'vCard'],
        sourceTitle: '摘要对齐核心源码',
        title: '摘要对齐'
      }
    ],
    examplesIntro: '一组例子展示工具条左右分布，另一组例子展示摘要对齐。',
    heading: 'spacer 间距',
    intro: 'spacer 负责吞掉剩余空间，最适合把一行内容推到两侧。',
    key: 'spacer',
    routeItem: 'layout:4',
    title: '间距',
    usageItems: [
      '一行中的标题和动作要自动分居两侧。',
      '列表行中的状态和时间需要稳定对齐。',
      '如果只是想留空一块区域，spacer 比硬编码边距更灵活。'
    ]
  }),
  popup: createLayoutDocsDefinition({
    apiIntro: 'vDialog 基于原生 dialog 元素，适合模态确认、表单编辑和需要打断当前流程的场景。',
    apiRows: [
      ['vDialog({ open, content, children })', '创建原生弹窗。', 'vDialog({ open: true })'],
      [
        'dialog.content(setup)',
        '继续填充弹窗内部。',
        'dialog.content((sheet) => sheet.vstack(...))'
      ],
      ['dialog.open(true)', '打开弹窗。', 'dialog.open(true)'],
      ['dialog.close()', '关闭弹窗。', 'dialog.close()']
    ],
    apiSignature: `vDialog({ open: false })`,
    examples: [
      {
        component: PopupLaunchExample1,
        description: '按钮点击后打开弹窗，适合编辑、确认和提交前的临时焦点层。',
        id: 'launch',
        imports: ['vButton', 'vCard', 'vDialog', 'vText'],
        sourceTitle: '按钮触发弹窗核心源码',
        title: '按钮触发'
      },
      {
        component: PopupStateExample1,
        description: '通过按钮控制提醒弹窗的打开和关闭，页面进入时不会自动占位。',
        id: 'state',
        imports: ['vButton', 'vCard', 'vDialog', 'vText'],
        sourceTitle: '状态控制弹窗核心源码',
        title: '状态控制'
      }
    ],
    examplesIntro: '一个示例展示按钮触发打开，另一个示例展示可重复控制弹窗状态。',
    heading: 'vDialog 弹窗',
    intro:
      'vDialog 让弹窗成为一个独立的对象组件，外层按钮负责触发，内层内容负责确认、取消和临时表单。',
    key: 'popup',
    routeItem: 'layout:5',
    title: '弹窗',
    usageItems: [
      '提交、删除、发布这类动作需要二次确认。',
      '需要聚焦到一小段临时内容，而不是整页弹层。',
      '想要原生 Esc 关闭和模态遮罩时优先用 dialog。'
    ]
  }),
  templates: createLayoutDocsDefinition({
    apiIntro: '先挑一个页面骨架，再把标题、列表、指标和表单替换成自己的业务内容。',
    apiRows: [
      [
        '后台仪表盘',
        '适合运营总览、监控看板和任务中心。',
        'vBody + header + metrics grid + workspace split'
      ],
      ['列表详情', '适合工单、审批流和内容管理。', 'vBody + search bar + master/detail grid'],
      ['设置中心', '适合系统配置、账号偏好和通知规则。', 'vBody + side nav + section cards'],
      ['登录页', '适合登录、注册和找回密码。', 'center + split card + action row']
    ],
    apiSignature: `vBody((shell) => {
  shell.container(...);
  shell.grid(...);
})`,
    examples: [
      {
        component: DashboardTemplateExample1,
        description: '把顶部工具条、指标卡片和内容工作区组合成后台首页。',
        id: 'dashboard',
        imports: ['vBody', 'vText'],
        sourceTitle: '后台仪表盘模板核心源码',
        title: '后台仪表盘'
      },
      {
        component: MasterDetailTemplateExample1,
        description: '把列表和详情面板并排放置，适合管理页和工单页。',
        id: 'master-detail',
        imports: ['vBody', 'vText'],
        sourceTitle: '列表详情模板核心源码',
        title: '列表详情'
      },
      {
        component: SettingsTemplateExample1,
        description: '左侧导航、右侧表单和底部动作区，适合配置中心。',
        id: 'settings',
        imports: ['vBody', 'vText'],
        sourceTitle: '设置中心模板核心源码',
        title: '设置中心'
      },
      {
        component: AuthTemplateExample1,
        description: '居中卡片和双栏布局，适合登录、注册和找回密码。',
        id: 'auth',
        imports: ['vBody', 'vText'],
        sourceTitle: '登录页模板核心源码',
        title: '登录页'
      }
    ],
    examplesIntro: '四种模板分别覆盖后台、详情、设置和登录这几类最常见的起步页。',
    heading: '布局模板',
    intro: '布局模板帮助你在新项目里先把页面骨架搭好，再填业务组件，起步会快很多。',
    key: 'templates',
    routeItem: 'layout:6',
    tableHeaders: ['模板', '适用场景', '布局骨架'],
    title: '布局模板',
    usageItems: [
      '新项目先选骨架，再替换内容层。',
      '后台、门户、配置页和登录页都可以直接套用。',
      '先把布局节奏定下来，再去调细节和视觉。'
    ]
  })
});

export function DividerDocumentationPage() {
  return createLayoutDocumentationPage(layoutDocsDefinitions.divider);
}

export function FlexDocumentationPage() {
  return createLayoutDocumentationPage(layoutDocsDefinitions.flex);
}

export function GridDocumentationPage() {
  return createLayoutDocumentationPage(layoutDocsDefinitions.grid);
}

export function BodyDocumentationPage() {
  return createLayoutDocumentationPage(layoutDocsDefinitions.body);
}

export function SpacerDocumentationPage() {
  return createLayoutDocumentationPage(layoutDocsDefinitions.spacer);
}

export function PopupDocumentationPage() {
  return createLayoutDocumentationPage(layoutDocsDefinitions.popup);
}

export function TemplateDocumentationPage() {
  return createLayoutDocumentationPage(layoutDocsDefinitions.templates);
}

export function LayoutDocumentationPage() {
  return BodyDocumentationPage();
}

function createLayoutDocsDefinition(config) {
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
    tableHeaders: Object.freeze(config.tableHeaders ?? ['API', '用途', '示例']),
    title: config.title,
    usageItems: Object.freeze(config.usageItems ?? []),
    usageIntro: config.usageIntro ?? '',
    usageTitle: config.usageTitle ?? '何时使用'
  });
}

function createLayoutDocumentationPage(definition) {
  return {
    render() {
      return section((page) => {
        page.className(
          `components-route-page components-layout-docs components-layout-docs--${definition.key}`
        );
        page.attr('data-component-route-item', definition.routeItem);
        page.attr('data-layout-docs', definition.key);

        page.header((header) => {
          header.className('components-layout-docs-header');
          header.h1(definition.heading);
          header.p(definition.intro);
        });

        page.section((usage) => {
          usage.className('components-layout-docs-usage');
          usage.attr('data-layout-usage', definition.key);
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
          api.className('components-layout-docs-api');
          api.h2(definition.apiTitle ?? '常用 API');
          if (definition.apiIntro) {
            api.p(definition.apiIntro);
          }
          api.pre((pre) => {
            pre.className('layout-api-signature');
            pre.code(definition.apiSignature);
          });
          api.table((table) => {
            const [headerA, headerB, headerC] = definition.tableHeaders;
            table.thead((head) => {
              head.tr((row) => {
                row.th(headerA);
                row.th(headerB);
                row.th(headerC);
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
          examples.className('components-layout-docs-examples');
          examples.h2('代码演示');
          examples.p(definition.examplesIntro);
          definition.examples.forEach((demo) => {
            examples.child(LayoutExampleSection(demo));
          });
        });
      });
    }
  };
}

function LayoutExampleSection(demo) {
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
        example.className('components-layout-demo');
        example.attr('data-layout-demo', demo.id);
        example.h3(demo.title);
        example.p(demo.description);
        example.div((live) => {
          live.className('components-layout-demo-live');
          live.attr('data-layout-demo-live', 'true');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}

function DividerSectionExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('段落分隔');
        card.vCardBody((body) => {
          body.stack((content) => {
            content.style('gap', '12px');
            content.p('divider 适合把说明拆成两个语义区块。');
            content.p('上方是背景说明，下面是补充说明。');
            content.divider();
            content.p('这种分隔不会改变层级，只是让阅读节奏更清楚。');
          });
        });
      });
    }
  };
}

function DividerToolbarExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('工具条分组');
        card.vCardBody((body) => {
          body.hstack((row) => {
            row.style({ alignItems: 'center', gap: '10px' });
            row.strong('服务列表');
            row.spacer();
            row.span('已同步');
            row.divider({ orientation: 'vertical' });
            row.vButton((button) => {
              button.label('刷新');
              button.variant('secondary');
            });
            row.vButton((button) => {
              button.label('新建');
              button.variant('primary');
            });
          });
        });
      });
    }
  };
}

function FlexToolbarExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('换行工具条');
        card.vCardBody((body) => {
          body.flex((toolbar) => {
            toolbar.styles({ alignItems: 'center', gap: '8px', flexWrap: 'wrap' });
            ['全部', '在线', '异常', '慢请求'].forEach((label) => {
              toolbar.span((pill) => {
                pill.className('components-route-note');
                pill.text(label);
              });
            });
            toolbar.spacer();
            toolbar.span('3 个筛选已启用');
            toolbar.vButton((button) => {
              button.label('清空');
              button.variant('secondary');
            });
          });
        });
      });
    }
  };
}

function FlexStackExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('纵向堆叠');
        card.vCardBody((body) => {
          body.stack((content) => {
            content.style('gap', '12px');
            content.p('stack 和 vstack 适合从上到下摆放标题、说明和状态。');
            content.vstack((steps) => {
              steps.style('gap', '8px');
              ['准备', '执行', '完成'].forEach((label, index) => {
                steps.div((step) => {
                  step.className('detail-grid-cell');
                  step.strong(`${index + 1}. ${label}`);
                  step.span('按自然顺序展开内容。');
                });
              });
            });
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('当前阶段');
              row.spacer();
              row.span((status) => {
                status.className('components-route-note');
                status.text('执行中');
              });
            });
          });
        });
      });
    }
  };
}

function FlexCenterExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('居中占位');
        card.vCardBody((body) => {
          body.center((empty) => {
            empty.styles({ minHeight: '220px', textAlign: 'center' });
            empty.stack((content) => {
              content.style('gap', '10px');
              content.h2('暂无内容');
              content.p('center 适合空状态、加载态和确认页。');
              content.vButton((button) => {
                button.label('返回');
                button.variant('secondary');
              });
            });
          });
        });
      });
    }
  };
}

function GridFixedExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('固定栅格');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('grid 适合固定列数和明确轨道。');
            content.grid((matrix) => {
              matrix.styles({ gap: '12px', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' });
              [
                ['请求量', '128k'],
                ['成功率', '99.92%'],
                ['队列积压', '42'],
                ['告警', '3']
              ].forEach(([label, value]) => {
                matrix.article((cell) => {
                  cell.className('detail-grid-cell');
                  cell.strong(label);
                  cell.span(value);
                });
              });
            });
          });
        });
      });
    }
  };
}

function GridResponsiveExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('响应式栅格');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('responsiveGrid 会根据最小列宽和断点自动换列。');
            content.responsiveGrid(
              {
                breakpoints: [
                  { minWidth: 640, columns: 2 },
                  { minWidth: 960, columns: 3 }
                ],
                minColumnWidth: 180
              },
              (cards) => {
                cards.style('gap', '12px');
                [
                  ['上线', '稳定'],
                  ['维护', '处理中'],
                  ['告警', '待确认'],
                  ['观察', '跟踪中']
                ].forEach(([label, value]) => {
                  cards.article((cell) => {
                    cell.className('detail-grid-cell');
                    cell.strong(label);
                    cell.span(value);
                  });
                });
              }
            );
          });
        });
      });
    }
  };
}

function BodyShellExample1() {
  const statusText = vText('当前：四列指标');
  const metricCards = [
    ['请求量', '128k', '近 24 小时'],
    ['成功率', '99.92%', '接口稳定'],
    ['队列积压', '42', '低于阈值'],
    ['告警', '3', '待确认']
  ];
  let compact = false;
  let densityButton = null;
  let metricsGrid = null;

  const applyDensity = () => {
    if (!densityButton || !metricsGrid) {
      return;
    }

    metricsGrid.style(
      'gridTemplateColumns',
      compact ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))'
    );
    densityButton.attr('aria-pressed', compact ? 'true' : 'false');
    statusText.textContent(compact ? '当前：两列指标' : '当前：四列指标');
  };

  return {
    render() {
      const page = vBody((shell) => {
        shell.background('#f8fafc');
        shell.maxWidth(1000);
        shell.padding('clamp(16px, 4vw, 28px)');
        shell.gap(18);

        shell.container({ maxWidth: 920, paddingInline: 0 }, (content) => {
          content.vstack((stackNode) => {
            stackNode.style('gap', '18px');

            stackNode.hstack((row) => {
              row.style({ alignItems: 'center', gap: '12px' });
              row.div((title) => {
                title.style('gap', '6px');
                title.h2('服务工作台');
                title.p(
                  'vBody 统一页面背景、内容宽度与留白，内部再继续用 container、grid 和 center 组织内容。'
                );
              });
              row.spacer();
              row.output((output) => output.child(statusText));
              row.vButton((button) => {
                densityButton = button;
                button.label('切换列数');
                button.variant('secondary');
                button.on('click', () => {
                  compact = !compact;
                  applyDensity();
                });
              });
            });

            stackNode.grid((metrics) => {
              metricsGrid = metrics;
              metrics.styles({ gap: '12px', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' });
              metricCards.forEach(([label, value, hint]) => {
                metrics.article((card) => {
                  card.className('detail-grid-cell');
                  card.h3(label);
                  card.strong(value);
                  card.p(hint);
                });
              });
            });

            stackNode.divider();

            stackNode.grid((workspace) => {
              workspace.styles({
                gap: '16px',
                gridTemplateColumns: 'minmax(0, 1.3fr) minmax(280px, 0.7fr)'
              });

              workspace.section((panel) => {
                panel.className('detail-grid-cell');
                panel.h3('flex / hstack / spacer');
                panel.p('工具条、筛选和状态行常用这组组合。');
                panel.flex((toolbar) => {
                  toolbar.styles({ alignItems: 'center', gap: '8px', flexWrap: 'wrap' });
                  ['全部', '异常', '慢请求'].forEach((label, index) => {
                    toolbar.vButton((button) => {
                      button.label(label);
                      button.variant(index === 0 ? 'primary' : 'secondary');
                    });
                  });
                });
                panel.divider();
                panel.hstack((row) => {
                  row.styles({ alignItems: 'center', gap: '10px' });
                  row.span('最近更新时间');
                  row.spacer();
                  row.span('2 分钟前');
                  row.divider({ orientation: 'vertical' });
                  row.span('已同步');
                });
              });

              workspace.section((panel) => {
                panel.className('detail-grid-cell');
                panel.h3('center + stack');
                panel.center((empty) => {
                  empty.styles({ minHeight: '220px', textAlign: 'center' });
                  empty.stack((content) => {
                    content.style('gap', '10px');
                    content.h2('空状态');
                    content.p('适合加载中、无数据和局部占位。');
                    content.vButton((button) => {
                      button.label('刷新');
                      button.variant('secondary');
                    });
                  });
                });
              });
            });
          });
        });
      });

      applyDensity();
      return page;
    }
  };
}

function BodyContainerExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('内容容器');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('container 适合在局部区域收窄内容宽度。');
            content.container({ maxWidth: 720, paddingInline: 0 }, (shell) => {
              shell.vstack((stackNode) => {
                stackNode.style('gap', '12px');
                stackNode.hstack((row) => {
                  row.style({ alignItems: 'center', gap: '10px' });
                  row.strong('文档区');
                  row.spacer();
                  row.span('720px');
                });
                stackNode.responsiveGrid(
                  {
                    breakpoints: [
                      { minWidth: 640, columns: 2 },
                      { minWidth: 960, columns: 3 }
                    ],
                    minColumnWidth: 160
                  },
                  (cards) => {
                    cards.style('gap', '12px');
                    [
                      ['在线服务', '24'],
                      ['待发布', '6'],
                      ['告警', '2']
                    ].forEach(([label, value]) => {
                      cards.article((cell) => {
                        cell.className('detail-grid-cell');
                        cell.strong(label);
                        cell.span(value);
                      });
                    });
                  }
                );
              });
            });
          });
        });
      });
    }
  };
}

function SpacerToolbarExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('工具条留白');
        card.vCardBody((body) => {
          body.hstack((row) => {
            row.style({ alignItems: 'center', gap: '10px' });
            row.strong('服务列表');
            row.spacer();
            row.span('已同步');
            row.vButton((button) => {
              button.label('刷新');
              button.variant('secondary');
            });
            row.vButton((button) => {
              button.label('新建');
              button.variant('primary');
            });
          });
        });
      });
    }
  };
}

function SpacerSummaryExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('摘要对齐');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '12px');
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('最近更新时间');
              row.spacer();
              row.code('2 分钟前');
            });
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('负责人');
              row.spacer();
              row.span((badge) => {
                badge.className('components-route-note');
                badge.text('SRE Team');
              });
            });
          });
        });
      });
    }
  };
}

function PopupLaunchExample1() {
  const dialog = vDialog({ open: false });
  const status = vText('弹窗关闭');

  dialog.content((sheet) => {
    sheet.className('components-layout-popup-sheet');
    sheet.vstack((content) => {
      content.style('gap', '14px');
      content.h3('新建发布任务');
      content.p('弹窗适合承载需要确认的临时流程，完成后就应该被关闭。');
      content.hstack((row) => {
        row.style({ alignItems: 'center', gap: '10px' });
        row.span('当前状态');
        row.spacer();
        row.output((output) => output.child(status));
      });
      content.vCard((card) => {
        card.vCardHeader('确认信息');
        card.vCardBody((body) => body.p('版本：v2026.08.23，目标环境：生产。'));
      });
      content.vCard((card) => {
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ alignItems: 'center', justifyContent: 'end', gap: '10px' });
            actions.vButton((button) => {
              button.label('取消');
              button.variant('secondary');
              button.on('click', () => {
                status.textContent('已取消');
                dialog.close();
              });
            });
            actions.vButton((button) => {
              button.label('确认发布');
              button.variant('primary');
              button.on('click', () => {
                status.textContent('已确认');
                dialog.close();
              });
            });
          });
        });
      });
    });
  });
  dialog.on('close', () => {
    if (status.textContent() === '弹窗已打开') {
      status.textContent('弹窗关闭');
    }
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('按钮触发弹窗');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('点击按钮后打开原生 dialog，适合遮住当前页面并让用户完成一次确认。');
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.vButton((button) => {
                button.label('打开弹窗');
                button.variant('primary');
                button.on('click', () => {
                  status.textContent('弹窗已打开');
                  dialog.open(true);
                });
              });
              row.span('支持 Esc 关闭和确认/取消回收。');
            });
            content.child(dialog);
          });
        });
      });
    }
  };
}

function PopupStateExample1() {
  const dialog = vDialog({ open: false });
  const status = vText('弹窗关闭');

  dialog.content((sheet) => {
    sheet.className('components-layout-popup-sheet');
    sheet.vstack((content) => {
      content.style('gap', '14px');
      content.h3('系统提醒');
      content.p('状态控制适合把提醒保持关闭，等用户需要处理时再进入模态层。');
      content.hstack((row) => {
        row.style({ alignItems: 'center', gap: '10px' });
        row.span('当前状态');
        row.spacer();
        row.output((output) => output.child(status));
      });
      content.vCard((card) => {
        card.vCardHeader('提醒内容');
        card.vCardBody((body) => body.p('存在 3 条待处理发布记录，请先确认是否继续。'));
      });
      content.vCard((card) => {
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ alignItems: 'center', justifyContent: 'end', gap: '10px' });
            actions.vButton((button) => {
              button.label('知道了');
              button.variant('secondary');
              button.on('click', () => {
                status.textContent('已确认');
                dialog.close();
              });
            });
          });
        });
      });
    });
  });
  dialog.on('close', () => {
    if (status.textContent() === '提醒已打开') {
      status.textContent('弹窗关闭');
    }
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('状态控制弹窗');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('把弹窗保持为关闭状态，等用户主动触发时再打开。');
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.vButton((button) => {
                button.label('打开提醒');
                button.variant('secondary');
                button.on('click', () => {
                  status.textContent('提醒已打开');
                  dialog.open(true);
                });
              });
              row.span('适合提醒、确认和临时表单。');
            });
            content.child(dialog);
          });
        });
      });
    }
  };
}

function DashboardTemplateExample1() {
  const status = vText('系统在线');

  return {
    render() {
      return vBody((shell) => {
        shell.className('components-layout-template-shell');
        shell.background('#f8fafc');
        shell.maxWidth(1120);
        shell.padding('16px');
        shell.gap(16);

        shell.container({ maxWidth: 1120, paddingInline: 0 }, (content) => {
          content.vstack((stack) => {
            stack.style('gap', '16px');
            stack.hstack((bar) => {
              bar.style({ alignItems: 'center', gap: '12px' });
              bar.div((title) => {
                title.style('gap', '4px');
                title.h2('后台仪表盘');
                title.p('适合运营总览、监控看板和任务中心。');
              });
              bar.spacer();
              bar.output((output) => output.child(status));
              bar.vButton((button) => {
                button.label('新建任务');
                button.variant('primary');
              });
            });

            stack.responsiveGrid(
              {
                breakpoints: [
                  { minWidth: 640, columns: 2 },
                  { minWidth: 960, columns: 4 }
                ],
                minColumnWidth: 180
              },
              (cards) => {
                cards.style('gap', '12px');
                [
                  ['请求量', '128k', '近 24 小时'],
                  ['成功率', '99.92%', '接口稳定'],
                  ['告警', '3', '待处理'],
                  ['排队', '42', '低于阈值']
                ].forEach(([label, value, hint]) => {
                  cards.article((card) => {
                    card.className('detail-grid-cell');
                    card.span(label);
                    card.strong(value);
                    card.span(hint);
                  });
                });
              }
            );

            stack.grid((workspace) => {
              workspace.styles({
                gap: '16px',
                gridTemplateColumns: 'minmax(0, 1.35fr) minmax(300px, 0.65fr)'
              });

              workspace.section((panel) => {
                panel.className('detail-grid-cell');
                panel.h3('最近活动');
                panel.vstack((list) => {
                  list.style('gap', '10px');
                  [
                    ['发布记录', '生产环境最近一次发布完成'],
                    ['告警记录', '2 条高优先级告警正在处理'],
                    ['工单队列', '3 个工单等待分配']
                  ].forEach(([label, hint]) => {
                    list.article((row) => {
                      row.className('detail-grid-cell');
                      row.style('gap', '4px');
                      row.strong(label);
                      row.span(hint);
                    });
                  });
                });
              });

              workspace.section((panel) => {
                panel.className('detail-grid-cell');
                panel.h3('快捷入口');
                panel.vstack((actions) => {
                  actions.style('gap', '10px');
                  actions.vButton((button) => {
                    button.label('查看告警');
                    button.variant('secondary');
                  });
                  actions.vButton((button) => {
                    button.label('同步数据');
                    button.variant('secondary');
                  });
                  actions.vButton((button) => {
                    button.label('进入详情');
                    button.variant('primary');
                  });
                });
              });
            });
          });
        });
      });
    }
  };
}

function MasterDetailTemplateExample1() {
  const activeItem = vText('订单 #2048');

  return {
    render() {
      return vBody((shell) => {
        shell.className('components-layout-template-shell');
        shell.background('#f8fafc');
        shell.maxWidth(1200);
        shell.padding('16px');
        shell.gap(16);

        shell.container({ maxWidth: 1200, paddingInline: 0 }, (content) => {
          content.vstack((stack) => {
            stack.style('gap', '16px');
            stack.hstack((bar) => {
              bar.style({ alignItems: 'center', gap: '12px' });
              bar.div((title) => {
                title.style('gap', '4px');
                title.h2('列表详情');
                title.p('适合工单、审批流和内容管理。');
              });
              bar.spacer();
              bar.output((output) => output.child(activeItem));
            });

            stack.grid((workspace) => {
              workspace.styles({
                gap: '16px',
                gridTemplateColumns: 'minmax(280px, 340px) minmax(0, 1fr)'
              });

              workspace.section((panel) => {
                panel.className('detail-grid-cell');
                panel.h3('工单列表');
                panel.vstack((list) => {
                  list.style('gap', '8px');
                  [
                    ['订单 #2048', '待发货'],
                    ['订单 #2047', '已完成'],
                    ['订单 #2046', '退款处理中']
                  ].forEach(([label, state], index) => {
                    list.article((row) => {
                      row.className('detail-grid-cell');
                      row.style({
                        cursor: 'pointer',
                        gap: '4px',
                        borderColor: index === 0 ? '#c7d2fe' : null
                      });
                      row.strong(label);
                      row.span(state);
                      row.on('click', () => activeItem.textContent(label));
                    });
                  });
                });
              });

              workspace.section((panel) => {
                panel.className('detail-grid-cell');
                panel.h3('详情面板');
                panel.vstack((detail) => {
                  detail.style('gap', '10px');
                  detail.p('选中列表项后，右侧区域可以承载详情、备注和操作按钮。');
                  detail.divider();
                  detail.hstack((row) => {
                    row.style({ alignItems: 'center', gap: '10px' });
                    row.span('当前条目');
                    row.spacer();
                    row.output((output) => output.child(activeItem));
                  });
                  detail.vCard((card) => {
                    card.vCardHeader('详情摘要');
                    card.vCardBody((body) => {
                      body.stack((summary) => {
                        summary.style('gap', '6px');
                        summary.span('适合把状态、备注和日志拆成小块。');
                        summary.span('右侧可以再放一个操作栏或审批面板。');
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    }
  };
}

function SettingsTemplateExample1() {
  const saveState = vText('未保存');

  return {
    render() {
      return vBody((shell) => {
        shell.className('components-layout-template-shell');
        shell.background('#f8fafc');
        shell.maxWidth(1200);
        shell.padding('16px');
        shell.gap(16);

        shell.container({ maxWidth: 1200, paddingInline: 0 }, (content) => {
          content.vstack((stack) => {
            stack.style('gap', '16px');
            stack.hstack((bar) => {
              bar.style({ alignItems: 'center', gap: '12px' });
              bar.div((title) => {
                title.style('gap', '4px');
                title.h2('设置中心');
                title.p('适合系统配置、账号偏好和通知规则。');
              });
              bar.spacer();
              bar.output((output) => output.child(saveState));
              bar.vButton((button) => {
                button.label('保存配置');
                button.variant('primary');
                button.on('click', () => saveState.textContent('已保存'));
              });
            });

            stack.grid((workspace) => {
              workspace.styles({
                gap: '16px',
                gridTemplateColumns: 'minmax(240px, 280px) minmax(0, 1fr)'
              });

              workspace.section((nav) => {
                nav.className('detail-grid-cell');
                nav.h3('设置目录');
                nav.vstack((list) => {
                  list.style('gap', '8px');
                  ['基础设置', '安全', '通知', '外观'].forEach((label, index) => {
                    list.span((item) => {
                      item.className('components-route-note');
                      if (index === 0) {
                        item.style('background', '#dbeafe');
                        item.style('borderColor', '#bfdbfe');
                        item.style('color', '#1d4ed8');
                      }
                      item.text(label);
                    });
                  });
                });
              });

              workspace.section((panel) => {
                panel.className('detail-grid-cell');
                panel.h3('配置表单');
                panel.vstack((form) => {
                  form.style('gap', '12px');
                  [
                    ['站点名称', 'yoya-ui'],
                    ['默认语言', 'zh-CN'],
                    ['告警邮箱', 'sre@example.com']
                  ].forEach(([label, value]) => {
                    form.article((row) => {
                      row.className('detail-grid-cell');
                      row.style('gap', '4px');
                      row.strong(label);
                      row.span(value);
                    });
                  });
                  form.divider();
                  form.hstack((actions) => {
                    actions.style({ alignItems: 'center', gap: '10px' });
                    actions.span('保存后即可覆盖默认配置。');
                    actions.spacer();
                    actions.vButton((button) => {
                      button.label('重置');
                      button.variant('secondary');
                      button.on('click', () => saveState.textContent('已重置'));
                    });
                  });
                });
              });
            });
          });
        });
      });
    }
  };
}

function AuthTemplateExample1() {
  const mode = vText('登录');

  return {
    render() {
      return vBody((shell) => {
        shell.className('components-layout-template-shell');
        shell.background('#f8fafc');
        shell.maxWidth(980);
        shell.padding('16px');
        shell.gap(16);

        shell.center((frame) => {
          frame.styles({ minHeight: '460px' });
          frame.vCard((card) => {
            card.className('components-layout-template-auth-card');
            card.vCardHeader('认证模板');
            card.vCardBody((body) => {
              body.grid((layout) => {
                layout.styles({
                  gap: '0',
                  gridTemplateColumns: 'minmax(0, 0.92fr) minmax(320px, 1.08fr)'
                });

                layout.div((hero) => {
                  hero.className('detail-grid-cell');
                  hero.style({
                    background: '#0f172a',
                    color: '#e2e8f0',
                    gap: '10px',
                    minHeight: '100%'
                  });
                  hero.h3('欢迎回来');
                  hero.p('适合登录、注册和找回密码。');
                  hero.vstack((points) => {
                    points.style('gap', '8px');
                    ['安全登录', '二次验证', '品牌入口'].forEach((label) => {
                      points.span((tag) => {
                        tag.className('components-route-note');
                        tag.style({
                          background: 'rgba(255, 255, 255, 0.08)',
                          borderColor: 'rgba(255, 255, 255, 0.16)',
                          color: '#e2e8f0'
                        });
                        tag.text(label);
                      });
                    });
                  });
                });

                layout.div((form) => {
                  form.className('detail-grid-cell');
                  form.vstack((stack) => {
                    stack.style('gap', '12px');
                    stack.h3('进入系统');
                    stack.article((field) => {
                      field.className('detail-grid-cell');
                      field.style('gap', '4px');
                      field.strong('账号');
                      field.span('service@example.com');
                    });
                    stack.article((field) => {
                      field.className('detail-grid-cell');
                      field.style('gap', '4px');
                      field.strong('密码');
                      field.span('••••••••');
                    });
                    stack.hstack((actions) => {
                      actions.style({ alignItems: 'center', gap: '10px' });
                      actions.output((output) => output.child(mode));
                      actions.spacer();
                      actions.vButton((button) => {
                        button.label('切换模式');
                        button.variant('secondary');
                        button.on('click', () => {
                          mode.textContent(mode.textContent() === '登录' ? '注册' : '登录');
                        });
                      });
                      actions.vButton((button) => {
                        button.label('进入系统');
                        button.variant('primary');
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    }
  };
}
