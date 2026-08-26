import { mobileLayout, section, vBody, vCard, vDialog, vForm, vText } from '../index.js';
import { applyDemoStyles } from './demo-styles.js';
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
      ],
      [
        'vContainer({ direction })',
        '页面骨架容器，包含 header / aside / main / footer。',
        'vContainer((shell) => shell.vHeader(...))'
      ],
      [
        'vHeader / vAside / vMain / vFooter',
        '分别承载页头、侧栏、主体和页脚。',
        'vHeader({ height: 64 })'
      ],
      [
        'shell.viewport() / shell.fill()',
        '让骨架占满视口，或让内层容器填充剩余空间。',
        'shell.viewport()'
      ],
      ['header.sticky()', '让标题栏固定在视口顶部。', 'header.sticky()'],
      [
        'aside.scrollable() / main.scrollable()',
        '让左侧菜单和右侧内容区各自独立滚动。',
        'aside.scrollable()'
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
      },
      {
        component: BodyShellRegionsExample1,
        description: 'vContainer 配合 vHeader / vAside / vMain / vFooter 搭出应用骨架。',
        id: 'regions',
        imports: ['vContainer', 'vHeader', 'vAside', 'vMain', 'vFooter'],
        sourceTitle: '页面骨架核心源码',
        title: '页面骨架'
      }
    ],
    examplesIntro: '这三个例子分别展示整页壳、局部容器和页面骨架的用法。',
    heading: 'vBody 页面容器',
    intro:
      'vBody 统一页面背景、内容宽度和留白，vContainer 负责 header / aside / main / footer 骨架。',
    key: 'body',
    routeItem: 'layout:3',
    title: '布局',
    usageItems: [
      '整页工作台需要统一背景和阅读宽度。',
      '标题栏、指标区和工作区需要清晰留白。',
      '需要 header / aside / main / footer 结构时用 vContainer。',
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
    apiIntro:
      'grid 适合固定轨道，responsiveGrid 适合随视口自动换列，vRow / vCol 适合 24 栅格分栏。',
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
      ],
      [
        'vRow({ gutter, justify, align })',
        '24 栅格行，负责横向分栏和列间距。',
        'vRow({ gutter: 16 }, (row) => row.vCol({ span: 8 }))'
      ],
      [
        'vCol({ span, offset, push, pull, xs, sm, md, lg, xl })',
        '24 栅格列，支持偏移、位移和响应式断点。',
        'vCol({ span: 8, md: { span: 12 } })'
      ]
    ],
    apiSignature: `vRow({ gutter: 16 }, (row) => row.vCol({ span: 8, md: { span: 12 } }))`,
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
      },
      {
        component: GridRowColExample1,
        description: '用 vRow / vCol 按 24 栅格精确控制列宽、偏移和位移。',
        id: 'row-col',
        imports: ['vRow', 'vCol', 'vCard'],
        sourceTitle: '24 栅格核心源码',
        title: '24 栅格'
      }
    ],
    examplesIntro: '固定栅格、自适应栅格和 24 栅格各有一个示例。',
    heading: 'grid 栅格',
    intro:
      'grid 负责固定轨道，responsiveGrid 负责自适应换列，vRow / vCol 负责 Element UI 风格 24 栅格。',
    key: 'grid',
    routeItem: 'layout:2',
    title: '栅格',
    usageItems: [
      '固定列数的指标面板适合用 grid。',
      '内容密度高、卡片数量变化大的区域适合用 responsiveGrid。',
      '需要 span / offset / push / pull 时使用 vRow / vCol。',
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
      ['dialog.close()', '关闭弹窗。', 'dialog.close()'],
      [
        'vDialog + vForm',
        '在弹窗内收集字段、统一校验并提交。',
        'dialog.content((sheet) => sheet.vForm(...))'
      ]
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
      },
      {
        component: PopupFormExample1,
        description: '把 vForm 放进 vDialog，用必填校验和提交动作完成新建流程。',
        id: 'form',
        imports: [
          'vButton',
          'vCard',
          'vDialog',
          'vForm',
          'vFormItem',
          'vInput',
          'vSelect',
          'vText'
        ],
        sourceTitle: '弹窗表单核心源码',
        title: '弹窗表单'
      }
    ],
    examplesIntro: '三个示例分别展示按钮触发、状态控制和弹窗内 vForm 表单。',
    heading: 'vDialog 弹窗',
    intro:
      'vDialog 让弹窗成为一个独立的对象组件，外层按钮负责触发，内层内容负责确认、取消和临时表单。',
    key: 'popup',
    routeItem: 'layout:5',
    title: '弹窗',
    usageItems: [
      '提交、删除、发布这类动作需要二次确认。',
      '需要聚焦到一小段临时内容，而不是整页弹层。',
      '弹窗内需要收集和校验字段时，与 vForm 配合使用。',
      '想要原生 Esc 关闭和模态遮罩时优先用 dialog。'
    ]
  }),
  templates: createLayoutDocsDefinition({
    apiIntro: '布局模板只展示区域结构，不填充业务内容，便于直接判断布局骨架是否合适。',
    apiRows: [
      [
        '管理端',
        '上导航区、左菜单区、主内容区、页脚区。',
        'vContainer + vHeader + vAside + vMain + vFooter'
      ],
      [
        '云工作台',
        '顶部导航、左侧资源菜单、工作台主体、底部状态。',
        'vContainer + vAside + vMain + vRow / vCol'
      ],
      [
        '个人主页',
        '顶部个人区、个人侧栏、内容展示区、页脚。',
        'vContainer + vHeader + vAside + vMain + vFooter'
      ],
      [
        '技术文档',
        '顶部导航、文档目录、文章内容、页脚。',
        'vContainer + vHeader + vAside + vMain + vFooter'
      ]
    ],
    apiSignature: `vContainer((frame) => {
  frame.vHeader(...);
  frame.vContainer((body) => {
    body.vAside(...);
    body.vMain(...);
  });
})`,
    examples: [
      {
        component: AdminTemplateExample1,
        description: '上导航区、左菜单区、主内容区、页脚区组成商用管理后台。',
        frame: true,
        id: 'admin',
        imports: ['vBody', 'vContainer', 'vHeader', 'vAside', 'vMain', 'vFooter'],
        sourceTitle: '管理端模板核心源码',
        title: '管理端'
      },
      {
        component: CloudWorkspaceTemplateExample1,
        description: '顶部导航、左侧资源菜单、工作台主体和底部状态区。',
        frame: true,
        id: 'cloud',
        imports: ['vBody', 'vContainer', 'vHeader', 'vAside', 'vMain', 'vFooter', 'vRow', 'vCol'],
        sourceTitle: '云工作台模板核心源码',
        title: '云工作台'
      },
      {
        component: ProfileTemplateExample1,
        description: '顶部个人区、个人侧栏、内容展示区和页脚区。',
        frame: true,
        id: 'profile',
        imports: ['vBody', 'vContainer', 'vHeader', 'vAside', 'vMain', 'vFooter'],
        sourceTitle: '个人主页模板核心源码',
        title: '个人主页'
      },
      {
        component: DocsTemplateExample1,
        description: '顶部导航、文档目录、文章内容和页脚区。',
        frame: true,
        id: 'docs',
        imports: ['vBody', 'vContainer', 'vHeader', 'vAside', 'vMain', 'vFooter'],
        sourceTitle: '技术文档模板核心源码',
        title: '技术文档'
      }
    ],
    examplesIntro: '四种模板只展示结构区域，不掺入业务内容。',
    heading: '布局模板',
    intro: '布局模板用可识别的区域块展示完整页面结构，用于检查布局能力覆盖面和复用骨架。',
    key: 'templates',
    routeItem: 'layout:6',
    tableHeaders: ['模板', '适用场景', '布局骨架'],
    title: '布局模板',
    usageItems: [
      '管理端强调上导航、左菜单、主内容、页脚四层结构。',
      '云工作台强调侧栏资源菜单与主体工作区的组合。',
      '个人主页和技术文档同样由 header / aside / main / footer 组合。'
    ]
  }),
  mobile: createLayoutDocsDefinition({
    apiIntro: 'mobileLayout 在窄屏自动切换为手机布局，侧栏默认收进抽屉，内容区保持全宽可用。',
    apiRows: [
      [
        'mobileLayout({ breakpoint })',
        '默认在 768px 以下自动切换为手机布局。',
        'mobileLayout({ breakpoint: 768 })'
      ],
      [
        'mobileLayout({ direction, mobileDirection })',
        '宽屏与手机分别使用不同方向。',
        "mobileLayout({ direction: 'row', mobileDirection: 'column' })"
      ],
      [
        'mobileLayout({ gap, mobileGap })',
        '分别设置宽屏和手机间距。',
        'mobileLayout({ gap: 0, mobileGap: 12 })'
      ],
      ['layout.asideWidth(width)', '设置桌面侧栏宽度，手机端自动铺满。', 'layout.asideWidth(280)'],
      ['layout.drawer(value)', '开启或关闭手机端抽屉侧栏，默认开启。', 'layout.drawer(true)'],
      [
        'layout.openAside() / closeAside() / toggleAside()',
        '控制手机抽屉导航的打开与关闭。',
        'shell.toggleAside()'
      ],
      [
        'layout.viewport() / layout.safeArea()',
        '占满视口，并为刘海屏预留安全区。',
        'layout.viewport().safeArea()'
      ]
    ],
    apiSignature: `mobileLayout(
  { breakpoint: 768, asideWidth: 280, drawer: true },
  (shell) => {
    shell.vHeader('顶部导航');
    shell.vAside('抽屉导航');
    shell.vMain('内容');
  }
)`,
    examples: [
      {
        component: MobileLayoutExample1,
        description: '宽屏使用侧栏，手机端侧栏收进抽屉，主体保持全宽可用。',
        id: 'shell',
        imports: [
          'hstack',
          'mobileLayout',
          'spacer',
          'vAside',
          'vCard',
          'vFooter',
          'vHeader',
          'vMain',
          'vMenu',
          'vMenuItem'
        ],
        phone: true,
        sourceTitle: '移动适配骨架核心源码',
        title: '移动骨架'
      },
      {
        component: MobileFlexExample1,
        description: '把一组横向内容在手机端自动改为纵向排列。',
        id: 'stack',
        imports: ['mobileLayout', 'vButton', 'vCard'],
        phone: true,
        sourceTitle: '移动换列核心源码',
        title: '横向换纵向'
      }
    ],
    examplesIntro: '两个示例都放在手机尺寸 iframe 中演示，可直接查看移动端适配效果。',
    heading: 'mobileLayout 移动布局',
    intro: 'mobileLayout 在桌面使用侧栏，在手机端自动把侧栏收进抽屉，并保持内容区全宽。',
    key: 'mobile',
    routeItem: 'layout:7',
    title: '移动布局',
    usageItems: [
      '手机端侧栏应该收进抽屉，而不是占用内容区高度。',
      '管理后台需要保留侧栏，但手机端希望主体保持全宽可用。',
      '同一组卡片、表单或操作区需要在窄屏下由横排改为纵排。',
      '移动端页面需要安全区、视口高度和更紧凑的间距。'
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

export function MobileDocumentationPage() {
  return createLayoutDocumentationPage(layoutDocsDefinitions.mobile);
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
  const liveDemo = demo.component().render();
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
          if (demo.frame || demo.phone) {
            const phone = Boolean(demo.phone);
            const frameClass = phone
              ? 'components-layout-demo-phone'
              : 'components-layout-demo-frame';
            const frameDataAttr = phone ? 'data-layout-demo-phone' : 'data-layout-demo-frame';
            live.iframe((frame) => {
              frame.className(frameClass);
              frame.attr(frameDataAttr, 'true');
              frame.attr('title', `${demo.title} 演示`);

              let mounted = false;
              frame.on('load', () => {
                if (mounted) return;
                mounted = true;
                mountLayoutDemoInFrame(frame, liveDemo);
              });

              const destroy = frame.destroy.bind(frame);
              frame.destroy = () => {
                liveDemo.destroy();
                return destroy();
              };

              frame.attr(
                'srcdoc',
                `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>`
              );
            });
          } else {
            live.child(liveDemo);
          }
        });
        example.child(sourcePanel);
      });
    }
  };
}

function mountLayoutDemoInFrame(frameNode, demoNode) {
  const frame = frameNode.renderDom();
  const doc = frame.contentDocument;
  if (!doc || !doc.body) {
    return;
  }

  doc.head.replaceChildren();
  document.querySelectorAll('style').forEach((styleElement) => {
    const copy = doc.createElement('style');
    copy.textContent = styleElement.textContent;
    doc.head.appendChild(copy);
  });
  document.querySelectorAll('link[rel="stylesheet"]').forEach((linkElement) => {
    const copy = doc.createElement('link');
    copy.rel = 'stylesheet';
    copy.href = new URL(linkElement.href, document.baseURI).href;
    doc.head.appendChild(copy);
  });

  const body = doc.body;
  const phone = frame.hasAttribute('data-layout-demo-phone');
  body.style.background = phone ? '#eef2f7' : '#f5f7fa';
  body.style.color = '#172033';
  body.style.fontFamily =
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  body.style.lineHeight = '1.5';
  body.style.margin = '0';
  body.style.minHeight = '100%';
  body.appendChild(demoNode.renderDom());
  applyDemoStyles(body);
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

function GridRowColExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('24 栅格');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('vRow / vCol 按 24 等分控制列宽，支持 gutter、offset、push / pull。');
            content.vRow({ gutter: 12 }, (row) => {
              [6, 6, 6, 6].forEach((span) => {
                row.vCol({ span }, (cell) => {
                  cell.className('detail-grid-cell');
                  cell.strong(String(span));
                  cell.span(`${(span / 24) * 100}%`);
                });
              });
            });
            content.vRow({ gutter: 12 }, (row) => {
              row.vCol({ span: 8, offset: 4 }, (cell) => {
                cell.className('detail-grid-cell');
                cell.strong('8');
                cell.span('offset 4');
              });
              row.vCol({ span: 6 }, (cell) => {
                cell.className('detail-grid-cell');
                cell.strong('6');
                cell.span('右侧');
              });
            });
          });
        });
      });
    }
  };
}

function MobileLayoutExample1() {
  return {
    render() {
      return mobileLayout(
        { breakpoint: 680, asideWidth: 220, mobileGap: 0, viewport: true },
        (shell) => {
          shell.vHeader({ height: 48 }, (header) => {
            header.className('components-mobile-shell-header');
            header.style('paddingLeft', '56px');
            header.hstack((row) => {
              row.style({ alignItems: 'center', height: '100%', paddingRight: '14px' });
              row.strong('移动工作台');
              row.spacer();
              row.span('已同步');
            });
          });

          shell.vAside({ width: 220 }, (aside) => {
            aside.className('components-mobile-drawer');
            aside.vstack((nav) => {
              nav.style('gap', '8px');
              nav.strong('导航');
              nav.vMenu((menu) => {
                menu.style('gap', '6px');
                ['概览', '工作台', '审批', '设置'].forEach((label) => {
                  menu.vMenuItem((item) => item.text(label));
                });
              });
            });
          });

          shell.vMain((main) => {
            main.className('components-mobile-main');
            main.vstack((content) => {
              content.style('gap', '12px');
              content.h2('今天的工作');
              content.p('手机端侧栏会收进抽屉，点击左上角菜单按钮即可打开。');
              content.vCard((card) => {
                card.vCardHeader('待办');
                card.vCardBody((body) => {
                  body.p('4 项待处理，2 项需要审批。');
                });
              });
            });
          });

          shell.vFooter({ height: 52 }, (footer) => {
            footer.className('components-mobile-tabbar');
            footer.hstack((row) => {
              row.style({ alignItems: 'center', height: '100%' });
              ['首页', '工作台', '我的'].forEach((label) => {
                row.span((item) => {
                  item.className('components-mobile-tab');
                  item.text(label);
                });
              });
            });
          });
        }
      );
    }
  };
}

function MobileFlexExample1() {
  return {
    render() {
      return mobileLayout({ breakpoint: 720, gap: 12, mobileGap: 12 }, (content) => {
        content.vCard((card) => {
          card.vCardHeader('横向内容');
          card.vCardBody((body) => {
            body.p('宽屏时与另一张卡片并排，手机端自动纵向排列。');
            body.vButton((button) => {
              button.label('查看');
              button.variant('secondary');
            });
          });
        });
        content.vCard((card) => {
          card.vCardHeader('详情');
          card.vCardBody((body) => {
            body.p('mobileLayout 也可以用于普通内容区，不限定页面骨架。');
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

function BodyShellRegionsExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('页面骨架');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p(
              'vContainer 根据 header / footer 自动使用纵向布局，也可以显式指定 direction。'
            );
            content.vContainer((shell) => {
              shell.style('minHeight', '260px');
              shell.vHeader({ height: 48 }, (header) => {
                header.className('detail-grid-cell');
                header.hstack((row) => {
                  row.style({ alignItems: 'center', height: '100%', padding: '0 12px' });
                  row.strong('Header');
                  row.spacer();
                  row.span('48px');
                });
              });
              shell.vMain((main) => {
                main.className('detail-grid-cell');
                main.p('Main 区域会自动吸收剩余空间。');
              });
              shell.vFooter({ height: 40 }, (footer) => {
                footer.className('detail-grid-cell');
                footer.hstack((row) => {
                  row.style({ alignItems: 'center', height: '100%', padding: '0 12px' });
                  row.strong('Footer');
                  row.spacer();
                  row.span('40px');
                });
              });
            });
            content.vContainer({ direction: 'row' }, (shell) => {
              shell.style('minHeight', '140px');
              shell.vAside({ width: 140 }, (aside) => {
                aside.className('detail-grid-cell');
                aside.p('Aside 140px');
              });
              shell.vMain((main) => {
                main.className('detail-grid-cell');
                main.p('Main');
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

function PopupFormExample1() {
  const dialog = vDialog({ open: false });
  const status = vText('等待提交');
  const form = vForm((formNode) => {
    formNode.style('gap', '12px');
    formNode.vFormItem((item) => {
      item.name('title').label('发布标题').hint('例如：v2026.08.25');
      item.required({ message: '发布标题不能为空', indicator: '*' });
      item.control((editor) => {
        editor.vInput({ name: 'title', placeholder: '请输入发布标题' });
      });
    });
    formNode.vFormItem((item) => {
      item.name('environment').label('目标环境').hint('选择发布环境');
      item.required({ message: '请选择目标环境', indicator: '*' });
      item.control((editor) => {
        editor.vSelect({
          name: 'environment',
          options: ['生产', '预发', '测试'],
          placeholder: '请选择环境'
        });
      });
    });
    formNode.hstack((actions) => {
      actions.style({ justifyContent: 'flex-end', gap: '10px' });
      actions.vButton((button) => {
        button.label('取消');
        button.variant('secondary');
        button.on('click', () => {
          status.textContent('已取消');
          dialog.close();
        });
      });
      actions.vButton((button) => {
        button.label('创建');
        button.variant('primary');
        button.formType('submit');
      });
    });
    formNode.on('submit', (event) => {
      event.preventDefault();
      if (!formNode.validate()) {
        status.textContent('请检查必填项');
        return;
      }
      status.textContent(`已创建：${JSON.stringify(formNode.values())}`);
      dialog.close();
    });
  });

  dialog.content((sheet) => {
    sheet.className('components-layout-popup-sheet');
    sheet.vstack((content) => {
      content.style('gap', '14px');
      content.h3('新建发布');
      content.p('弹窗内使用 vForm 收集字段，提交前统一校验。');
      content.child(form);
    });
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('弹窗表单');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('把 vForm 放进 vDialog，适合新建、编辑等需要临时收集字段的流程。');
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.vButton((button) => {
                button.label('新建发布');
                button.variant('primary');
                button.on('click', () => {
                  status.textContent('弹窗已打开');
                  dialog.open(true);
                });
              });
              row.output((output) => output.child(status));
            });
            content.child(dialog);
          });
        });
      });
    }
  };
}

function AdminTemplateExample1() {
  return {
    render() {
      return vBody((shell) => {
        shell.className('components-layout-template-shell');
        shell.background('#f5f7fa');
        shell.maxWidth(1200);
        shell.padding('16px');
        shell.gap(16);

        shell.vContainer((frame) => {
          frame.className('components-layout-template-frame');
          frame.style('minHeight', '540px');

          frame.vHeader({ height: 56 }, (header) => {
            header.className('structure-region structure-header');
            header.attr('data-structure-role', 'header');
            header.hstack((row) => {
              row.style({ alignItems: 'center', height: '100%', padding: '0 16px' });
              row.strong('顶部导航区');
            });
          });

          frame.vContainer((body) => {
            body.vAside({ width: 200 }, (aside) => {
              aside.className('structure-region structure-aside');
              aside.attr('data-structure-role', 'aside');
              aside.vstack((nav) => {
                nav.style('gap', '8px');
                ['左侧菜单区', '菜单项 1', '菜单项 2', '菜单项 3'].forEach((label) => {
                  nav.span((item) => {
                    item.className('structure-label');
                    item.text(label);
                  });
                });
              });
            });

            body.vMain((main) => {
              main.className('structure-region structure-main');
              main.attr('data-structure-role', 'main');
              main.vstack((content) => {
                content.style('gap', '12px');
                content.h2('主内容区');
                content.div((placeholder) => {
                  placeholder.className('structure-placeholder');
                  placeholder.text('内容占位区');
                });
              });
            });
          });

          frame.vFooter({ height: 40 }, (footer) => {
            footer.className('structure-region structure-footer');
            footer.attr('data-structure-role', 'footer');
            footer.hstack((row) => {
              row.style({ alignItems: 'center', height: '100%', padding: '0 16px' });
              row.span('页脚区');
            });
          });
        });
      });
    }
  };
}

function CloudWorkspaceTemplateExample1() {
  return {
    render() {
      return vBody((shell) => {
        shell.className('components-layout-template-shell');
        shell.background('#f5f7fa');
        shell.maxWidth(1200);
        shell.padding('16px');
        shell.gap(16);

        shell.vContainer((frame) => {
          frame.className('components-layout-template-frame');
          frame.style('minHeight', '540px');

          frame.vHeader({ height: 56 }, (header) => {
            header.className('structure-region structure-header');
            header.attr('data-structure-role', 'header');
            header.hstack((row) => {
              row.style({ alignItems: 'center', height: '100%', padding: '0 16px' });
              row.strong('顶部导航区');
              row.spacer();
              row.span('云工作台');
            });
          });

          frame.vContainer((body) => {
            body.vAside({ width: 180 }, (aside) => {
              aside.className('structure-region structure-aside');
              aside.attr('data-structure-role', 'aside');
              aside.vstack((nav) => {
                nav.style('gap', '8px');
                ['左侧资源菜单', '资源组 1', '资源组 2', '资源组 3'].forEach((label) => {
                  nav.span((item) => {
                    item.className('structure-label');
                    item.text(label);
                  });
                });
              });
            });

            body.vMain((main) => {
              main.className('structure-region structure-main');
              main.attr('data-structure-role', 'main');
              main.vstack((content) => {
                content.style('gap', '12px');
                content.h2('工作台主体区');
                content.vRow({ gutter: 8 }, (row) => {
                  [8, 8, 8].forEach((span) => {
                    row.vCol({ span, xs: 12, md: span }, (cell) => {
                      cell.className('structure-placeholder');
                      cell.text('指标占位区');
                    });
                  });
                });
                content.div((placeholder) => {
                  placeholder.className('structure-placeholder');
                  placeholder.text('资源列表区');
                });
              });
            });
          });

          frame.vFooter({ height: 40 }, (footer) => {
            footer.className('structure-region structure-footer');
            footer.attr('data-structure-role', 'footer');
            footer.hstack((row) => {
              row.style({ alignItems: 'center', height: '100%', padding: '0 16px' });
              row.span('底部状态区');
            });
          });
        });
      });
    }
  };
}

function ProfileTemplateExample1() {
  return {
    render() {
      return vBody((shell) => {
        shell.className('components-layout-template-shell');
        shell.background('#f5f7fa');
        shell.maxWidth(1200);
        shell.padding('16px');
        shell.gap(16);

        shell.vContainer((frame) => {
          frame.className('components-layout-template-frame');
          frame.style('minHeight', '540px');

          frame.vHeader({ height: 64 }, (header) => {
            header.className('structure-region structure-header');
            header.attr('data-structure-role', 'header');
            header.hstack((row) => {
              row.style({ alignItems: 'center', height: '100%', padding: '0 16px' });
              row.strong('顶部个人区');
            });
          });

          frame.vContainer((body) => {
            body.vAside({ width: 240 }, (aside) => {
              aside.className('structure-region structure-aside');
              aside.attr('data-structure-role', 'aside');
              aside.vstack((nav) => {
                nav.style('gap', '8px');
                ['个人侧栏区', '简介', '作品', '动态'].forEach((label) => {
                  nav.span((item) => {
                    item.className('structure-label');
                    item.text(label);
                  });
                });
              });
            });

            body.vMain((main) => {
              main.className('structure-region structure-main');
              main.attr('data-structure-role', 'main');
              main.vstack((content) => {
                content.style('gap', '12px');
                content.h2('内容展示区');
                content.vRow({ gutter: 8 }, (row) => {
                  row.vCol({ span: 8, xs: 24, md: 8 }, (cell) => {
                    cell.className('structure-placeholder');
                    cell.text('个人资料区');
                  });
                  row.vCol({ span: 16, xs: 24, md: 16 }, (cell) => {
                    cell.className('structure-placeholder');
                    cell.text('作品动态区');
                  });
                });
              });
            });
          });

          frame.vFooter({ height: 40 }, (footer) => {
            footer.className('structure-region structure-footer');
            footer.attr('data-structure-role', 'footer');
            footer.hstack((row) => {
              row.style({ alignItems: 'center', height: '100%', padding: '0 16px' });
              row.span('页脚区');
            });
          });
        });
      });
    }
  };
}

function DocsTemplateExample1() {
  return {
    render() {
      return vBody((shell) => {
        shell.className('components-layout-template-shell');
        shell.background('#f5f7fa');
        shell.maxWidth(1200);
        shell.padding('16px');
        shell.gap(16);

        shell.vContainer((frame) => {
          frame.className('components-layout-template-frame');
          frame.style('minHeight', '540px');

          frame.vHeader({ height: 52 }, (header) => {
            header.className('structure-region structure-header');
            header.attr('data-structure-role', 'header');
            header.hstack((row) => {
              row.style({ alignItems: 'center', height: '100%', padding: '0 16px' });
              row.strong('顶部导航区');
              row.spacer();
              row.span('技术文档');
            });
          });

          frame.vContainer((body) => {
            body.vAside({ width: 220 }, (aside) => {
              aside.className('structure-region structure-aside');
              aside.attr('data-structure-role', 'aside');
              aside.vstack((nav) => {
                nav.style('gap', '8px');
                ['文档目录区', '快速开始', '布局组件', 'API 参考'].forEach((label) => {
                  nav.span((item) => {
                    item.className('structure-label');
                    item.text(label);
                  });
                });
              });
            });

            body.vMain((main) => {
              main.className('structure-region structure-main');
              main.attr('data-structure-role', 'main');
              main.vstack((article) => {
                article.style('gap', '12px');
                article.h2('文章内容区');
                article.div((placeholder) => {
                  placeholder.className('structure-placeholder');
                  placeholder.text('正文占位区');
                });
                article.div((placeholder) => {
                  placeholder.className('structure-placeholder');
                  placeholder.text('代码块占位区');
                });
              });
            });
          });

          frame.vFooter({ height: 40 }, (footer) => {
            footer.className('structure-region structure-footer');
            footer.attr('data-structure-role', 'footer');
            footer.hstack((row) => {
              row.style({ alignItems: 'center', height: '100%', padding: '0 16px' });
              row.span('页脚区');
            });
          });
        });
      });
    }
  };
}
