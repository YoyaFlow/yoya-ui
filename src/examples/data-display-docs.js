import {
  div,
  section,
  vAvatarUpload,
  vAvatar,
  vBadge,
  vCarousel,
  vButton,
  vCard,
  vDetail,
  FolderOpenOutlined,
  FolderOutlined,
  vPagination,
  vProgress,
  vScroll,
  vTable,
  vText,
  vTree
} from '../index.js';
import { ComponentSource } from './component-source.js';

const dataDisplayDocsDefinitions = Object.freeze({
  avatar: createDataDisplayDocsDefinition({
    apiIntro:
      'vAvatar 用于展示用户、服务或资源标识。它支持文字、图标、图片、尺寸、形状、自定义颜色和在线状态。',
    apiRows: [
      ['vAvatar("A")', '创建文字头像，适合展示姓名或资源首字母。', 'vAvatar("A")'],
      ['avatar.src(value)', '设置图片地址并切换为图片头像。', 'avatar.src("/alice.png")'],
      ['avatar.alt(value)', '设置图片替代文本和头像 aria-label。', 'avatar.alt("Alice")'],
      ['avatar.icon(value)', '用图标或任意 ViewNode 作为头像内容。', 'avatar.icon("★")'],
      ['avatar.size(value)', '切换 small / medium / large / xlarge 尺寸。', 'avatar.size("large")'],
      ['avatar.shape(value)', '切换 circle / square 形状。', 'avatar.shape("square")'],
      ['avatar.color(value)', '覆盖头像背景色。', "avatar.color('#0f766e')"],
      [
        'avatar.status(value)',
        '显示 online / busy / away / offline 状态点。',
        'avatar.status("online")'
      ]
    ],
    apiSignature: `vAvatar({
  text: 'A',
  size: 'large',
  shape: 'circle',
  color: '#0f766e',
  status: 'online'
})`,
    examples: [
      {
        component: AvatarImageExample1,
        description: 'src 切换为非文字插画图片头像，alt 同步作为替代文本和 aria-label。',
        id: 'image',
        imports: ['vAvatar', 'vCard'],
        sourceTitle: '图片头像源码',
        title: '图片头像'
      },
      {
        component: AvatarBasicExample1,
        description: '文字和图标头像通过 size、shape、color 快速形成不同标识。',
        id: 'basic',
        imports: ['vAvatar', 'vCard'],
        sourceTitle: '基础头像源码',
        title: '基础头像'
      },
      {
        component: AvatarStatusExample1,
        description: 'status 在头像右下角显示语义状态点，适合成员、节点和服务标识。',
        id: 'status',
        imports: ['vAvatar', 'vCard'],
        sourceTitle: '状态头像源码',
        title: '状态头像'
      },
      {
        component: AvatarInteractiveExample1,
        description: '通过公开方法实时切换文字、尺寸、形状、颜色和在线状态。',
        id: 'interactive',
        imports: ['vAvatar', 'vButton', 'vCard', 'vText'],
        sourceTitle: '自定义头像源码',
        title: '自定义头像'
      },
      {
        component: AvatarUploadExample1,
        description: '头像上传组件支持点击、拖拽、预览和移除，适合个人资料编辑。',
        id: 'upload',
        imports: ['vAvatarUpload', 'vCard', 'vText'],
        sourceTitle: '头像上传源码',
        title: '头像上传'
      }
    ],
    examplesIntro: '下面五个示例分别展示图片头像、基础头像、状态头像、自定义头像和头像上传。',
    heading: 'vAvatar 头像',
    intro:
      '头像用于在列表、详情、导航和操作区域中标识用户或对象。vAvatar 把文字、图片、图标和状态统一收敛到一个组件 API 中。',
    key: 'avatar',
    routeItem: 'data-display:0',
    title: '头像',
    usageItems: [
      '用户列表或成员卡片中展示姓名首字母或头像图片。',
      '服务、节点或资源标识中配合状态点表达在线、忙碌或离线。',
      '导航栏和侧栏中用小尺寸头像作为账户入口。'
    ]
  }),
  badge: createDataDisplayDocsDefinition({
    apiIntro:
      'vBadge 用于在内容右上角显示数量或状态点。count 表示数字，overflowCount 控制上限，dot 和 status 适合只表达“有变化”或运行状态。',
    apiRows: [
      [
        'vBadge({ count, children })',
        '创建数字徽标并包裹内容，内容为空时显示为独立徽标。',
        'vBadge({ count: 8, children: "通知" })'
      ],
      ['badge.count(value)', '设置或读取徽标数字，传 0 时默认隐藏。', 'badge.count(12)'],
      [
        'badge.overflowCount(value)',
        '超过上限后显示为 “上限+”，默认 99。',
        'badge.overflowCount(999)'
      ],
      ['badge.showZero(value)', '设置 count 为 0 时是否仍然显示。', 'badge.showZero(true)'],
      ['badge.dot(value)', '切换为只显示圆点，适合新消息提醒。', 'badge.dot(true)'],
      [
        'badge.status(value)',
        '使用 success / processing / warning / error / default 状态色。',
        "badge.status('success')"
      ],
      ['badge.color(value)', '覆盖徽标背景色，也可用于自定义圆点颜色。', "badge.color('#0f766e')"],
      ['badge.text(value)', '在徽标或状态点旁显示文字说明。', "badge.text('运行中')"],
      ['badge.offset({ x, y })', '调整包裹内容时徽标的偏移量。', 'badge.offset({ x: 4, y: -2 })']
    ],
    apiSignature: `vBadge({
  count: 128,
  overflowCount: 99,
  children: '告警',
  title: '128 条告警'
})`,
    examples: [
      {
        component: BadgeCountExample1,
        description: 'count 管理数字，overflowCount 压缩大数值，showZero 控制零值是否可见。',
        id: 'count',
        imports: ['vBadge', 'vButton', 'vCard', 'vText'],
        sourceTitle: '数字徽标核心源码',
        title: '数字徽标'
      },
      {
        component: BadgeDotExample1,
        description: 'dot 模式只保留小圆点，适合强调“有新变化”但不需要具体数量。',
        id: 'dot',
        imports: ['vBadge', 'vButton', 'vCard'],
        sourceTitle: '圆点徽标核心源码',
        title: '圆点徽标'
      },
      {
        component: BadgeStatusExample1,
        description: 'status 搭配 text 表达运行状态，语义比单独一个数字更直观。',
        id: 'status',
        imports: ['vBadge', 'vCard'],
        sourceTitle: '状态徽标核心源码',
        title: '状态徽标'
      }
    ],
    examplesIntro: '下面三个示例分别展示数字徽标、圆点徽标和状态徽标。',
    heading: 'vBadge 徽标数',
    intro:
      '徽标数用于在图标、按钮或文本右上角展示数量、提醒点或状态。vBadge 把数字上限、零值显示和状态色收敛在同一个组件 API 中。',
    key: 'badge',
    routeItem: 'data-display:1',
    title: '徽标数',
    usageItems: [
      '需要在入口或按钮上展示未读数量、告警数量时，用 vBadge 包裹目标内容。',
      '大数字不需要完整展示时，设置 overflowCount 让界面保持可扫描。',
      '只需要表达“有更新”或服务状态时，使用 dot 或 status，而不是数字角标。'
    ]
  }),
  detail: createDataDisplayDocsDefinition({
    apiIntro:
      'vDetail 使用 dl / dt / dd 的语义展示只读对象，支持通过 columns 控制每行展示多少个条目。',
    apiRows: [
      [
        'vDetail({ items })',
        '通过数组或对象数组一次性创建详情项。',
        'vDetail({ items: [["名称", "值"]] })'
      ],
      ['vDetail([...])', '第一个参数是数组时直接当作 items。', 'vDetail([["名称", "值"]])'],
      [
        'detail.items(items)',
        '替换全部详情项，适合接口返回后整体更新。',
        'detail.items(nextItems)'
      ],
      [
        'detail.columns(value) / detail.column(value)',
        '设置每行展示多少个条目，可随时更新。',
        'detail.columns(3)'
      ],
      [
        'detail.vDetailItem(setup)',
        '在详情容器回调里声明单项。',
        'detail.vDetailItem((item) => item.label("状态").value("运行中"))'
      ],
      ['vDetailItem(label, value)', '两参数快捷创建详情项。', "vDetailItem('状态', '运行中')"],
      [
        'vDetailItem({ label, value })',
        '对象方式创建，value 支持任意 ViewNode 或组件。',
        "vDetailItem({ label: '状态', value: vBadge(...) })"
      ],
      [
        'item.label(content) / item.value(content)',
        '更新单个字段的标签或值。',
        "item.value('维护中')"
      ],
      ['item.content(content)', 'value 的别名，适合统一内容入口。', "item.content('SRE 团队')"]
    ],
    apiSignature: `vDetail({
  columns: 2,
  items: [
    ['服务名称', 'api-gateway'],
    { label: '状态', value: '运行中' },
    { label: '负责人', value: 'SRE 团队' }
  ]
})`,
    examples: [
      {
        component: DetailBasicExample1,
        description: 'items 接受数组和对象，适合直接由接口数据生成只读详情。',
        id: 'basic',
        imports: ['vCard', 'vDetail'],
        sourceTitle: '基础详情核心源码',
        title: '基础详情'
      },
      {
        component: DetailColumnsExample1,
        description: 'columns 决定每行条目数，切换后详情网格会立即重新排布。',
        id: 'columns',
        imports: ['vButton', 'vCard', 'vDetail', 'vText'],
        sourceTitle: '多列详情核心源码',
        title: '多列详情'
      },
      {
        component: DetailCustomExample1,
        description: 'value 可以接收 vBadge、vButton 等任意 ViewNode，形成更丰富的字段展示。',
        id: 'custom',
        imports: ['vBadge', 'vButton', 'vCard', 'vDetail'],
        sourceTitle: '自定义值核心源码',
        title: '自定义值'
      },
      {
        component: DetailDynamicExample1,
        description: '持有 vText 引用后，切换服务或状态只需要更新值节点。',
        id: 'dynamic',
        imports: ['vButton', 'vCard', 'vDetail', 'vText'],
        sourceTitle: '动态更新核心源码',
        title: '动态更新'
      }
    ],
    examplesIntro: '下面四个示例分别展示参数写法、多列布局、自定义值和动态更新。',
    heading: 'vDetail 详情',
    intro:
      '详情组件用于展示服务、用户、任务等只读对象。vDetail 把标签列、值列和字段间隔统一起来，适合详情页、资料页和卡片摘要。',
    key: 'detail',
    routeItem: 'data-display:2',
    title: '详情',
    usageItems: [
      '需要展示只读业务对象时，用 vDetail 统一 label/value 布局。',
      '需要让详情更紧凑时，用 columns 设置每行展示 2 个或 3 个条目。',
      '需要放状态徽标、操作按钮或链接时，value 可以直接接收 ViewNode 或组件。',
      '数据来自接口时，用 items 或 item.value 更新，不必重建整个 DOM。'
    ]
  }),
  table: createDataDisplayDocsDefinition({
    apiIntro:
      'vTable 既可以用 columns / rows 描述数据，也可以用 vThead / vTbody / vTfoot / vTr / vTh / vTd 逐层声明内部结构。空状态、行操作和分页都可以在同一个表格实例上更新。',
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
      ['column.align / width / minWidth', '控制单元格对齐和列宽。', "align: 'right', width: 120"],
      [
        'table.vThead / vTbody / vTfoot(setup)',
        '用回调声明式构建表头、主体和表尾。',
        'table.vTbody((body) => body.vTr(...))'
      ],
      [
        'section.vTr / row.vTh / row.vTd(setup)',
        '在表格分区和行内逐层声明单元格。',
        'row.vTd("运行中")'
      ]
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
      },
      {
        component: TableDeclarativeExample1,
        description:
          'vThead / vTbody / vTr / vTh / vTd 支持逐层声明式控制，适合合并单元格和自定义表格结构。',
        id: 'declarative',
        imports: ['vButton', 'vCard', 'vTable', 'vText'],
        sourceTitle: '声明式表格源码',
        title: '声明式内部结构'
      }
    ],
    examplesIntro: '下面四个示例分别展示基础表格、空状态、分页联动和声明式内部结构。',
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
        'tree.toggleIcon(collapsedIcon, expandedIcon)',
        '自定义收起和展开图标，也支持单个图标或回调。',
        'tree.toggleIcon(FolderOutlined(), FolderOpenOutlined())'
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
        imports: ['FolderOpenOutlined', 'FolderOutlined', 'vButton', 'vCard', 'vText', 'vTree'],
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
  }),
  progress: createDataDisplayDocsDefinition({
    apiIntro:
      'vProgress 用轨道和填充条展示任务完成度，支持 value/max、百分比文本、状态色、尺寸、自定义格式和 indeterminate 动画。',
    apiRows: [
      [
        'vProgress({ value, max, label, showText })',
        '创建进度条，value 超过 max 时自动收敛到 max。',
        'vProgress({ value: 64, max: 100 })'
      ],
      ['progress.value(value)', '读取或设置当前进度值。', 'progress.value(88)'],
      ['progress.max(value)', '设置进度上限，并重新计算百分比。', 'progress.max(200)'],
      ['progress.percent(value)', '读取或设置百分比，内部同步 value。', 'progress.percent(45)'],
      [
        'progress.status(value)',
        '切换 normal / success / warning / error / processing 状态色。',
        "progress.status('success')"
      ],
      ['progress.size(value)', '切换 small / default / large 轨道高度。', "progress.size('small')"],
      [
        'progress.strokeColor(value)',
        '用自定义颜色覆盖状态色。',
        "progress.strokeColor('#7c3aed')"
      ],
      ['progress.label(content)', '在轨道左侧显示简短标签。', "progress.label('构建')"],
      ['progress.text(content)', '覆盖右侧文本，支持任意 ViewNode。', "progress.text('处理中')"],
      [
        'progress.format((value, percent) => content)',
        '自定义百分比文本的渲染方式。',
        'progress.format((value, percent) => `${value} (${Math.round(percent)}%)`)'
      ],
      [
        'progress.indeterminate(value) / progress.active(value)',
        '切换不确定进度动画，适合等待接口返回。',
        'progress.indeterminate(true)'
      ]
    ],
    apiSignature: `const progress = vProgress({
  label: '部署',
  max: 200,
  value: 136,
  status: 'processing',
  format: (value, percent) => \`\${value} / 200 (\${Math.round(percent)}%)\`
});`,
    examples: [
      {
        component: ProgressBasicExample1,
        description: 'value/max 驱动百分比，label 和 format 让进度条更贴合业务字段。',
        id: 'basic',
        imports: ['vCard', 'vProgress'],
        sourceTitle: '基础进度条核心源码',
        title: '基础进度条'
      },
      {
        component: ProgressStatusExample1,
        description: 'status 切换语义色，适合构建、发布、告警和同步等任务状态。',
        id: 'status',
        imports: ['vCard', 'vProgress'],
        sourceTitle: '状态进度条核心源码',
        title: '状态进度条'
      },
      {
        component: ProgressDynamicExample1,
        description: '按钮驱动 value 更新，达到 max 后自动切换为 success。',
        id: 'dynamic',
        imports: ['vButton', 'vCard', 'vProgress', 'vText'],
        sourceTitle: '动态进度条核心源码',
        title: '动态进度条'
      }
    ],
    examplesIntro: '下面三个示例分别展示基础用法、状态组合和动态更新。',
    heading: 'vProgress 进度条',
    intro:
      '进度条用于展示任务完成度，比如构建、发布、上传和资源分配。vProgress 把数值换算、语义状态、尺寸和可访问性统一起来，适合卡片、详情页和任务列表。',
    key: 'progress',
    routeItem: 'data-display:8',
    title: '进度条',
    usageItems: [
      '需要展示任务完成百分比或资源用量时，用 vProgress 替代手写 div + width。',
      '构建、发布、告警等不同场景使用 status 表达语义色。',
      '接口未返回具体进度时，用 indeterminate 表示正在处理。'
    ]
  }),
  scroll: createDataDisplayDocsDefinition({
    apiIntro:
      'vScroll 是滚动容器组件，滚动到接近底部时自动触发 loadMore。它支持 items/renderItem 数据驱动、大数据自动虚拟滚动、loop 循环加载、block 阻止加载、threshold 触发距离和 reset 重置。',
    apiRows: [
      [
        'vScroll({ items, renderItem, virtual, itemHeight, overscan, loadMore })',
        '创建滚动组件，items 数据较多时自动开启虚拟滚动，只渲染可视窗口。',
        'vScroll({ items, renderItem: (item) => div(item), itemHeight: 48 })'
      ],
      [
        'scroll.items(data, renderItem)',
        '替换全部数据，并用 renderItem 渲染每一条。',
        'scroll.items(rows, (row) => div(row.name))'
      ],
      [
        'scroll.append(data, renderItem)',
        '追加下一页数据，可复用已设置的 renderItem。',
        'scroll.append(nextRows)'
      ],
      [
        'scroll.loadMore(handler)',
        '设置加载回调，context 提供 append、block、done、page、scroll。',
        'scroll.loadMore(({ append, block }) => { append(next); block(true); })'
      ],
      [
        'scroll.virtual(value) / scroll.virtualize(value)',
        '查询或开关虚拟滚动；数据超过阈值时默认自动开启。',
        'scroll.virtual(false)'
      ],
      [
        'scroll.itemHeight(value)',
        '设置每条数据的固定行高，用于计算可视窗口和滚动高度。',
        'scroll.itemHeight(56)'
      ],
      [
        'scroll.overscan(value)',
        '设置可视区域外额外渲染的条数，值越大滚动时越少闪白。',
        'scroll.overscan(6)'
      ],
      ['scroll.loop(value)', '开启循环加载并解除 block。', 'scroll.loop(true)'],
      [
        'scroll.block(value) / scroll.blocked(value)',
        '阻止后续加载，并显示结束文案。',
        'scroll.block(true)'
      ],
      ['scroll.loading(value)', '读取或设置加载中状态。', 'scroll.loading(true)'],
      ['scroll.threshold(value)', '设置距离底部多少像素时触发加载。', 'scroll.threshold(48)'],
      ['scroll.load()', '手动触发一次加载。', 'scroll.load()'],
      ['scroll.reset()', '清空数据、页码和结束状态。', 'scroll.reset()'],
      [
        'scroll.loadingText(content) / scroll.endText(content)',
        '自定义加载中和结束文案。',
        "scroll.endText('没有更多了')"
      ]
    ],
    apiSignature: `const scroll = vScroll({
  items: firstPage,
  renderItem: (item) => div(item.label),
  virtual: true,
  itemHeight: 48,
  overscan: 5,
  loadMore: ({ append, block, page }) => {
    const next = loadPage(page);
    append(next);
    if (next.length === 0) block(true);
  },
  threshold: 48
});`,
    examples: [
      {
        component: ScrollBasicExample1,
        description: '首批数据由 items 提供，滚动到底部后自动追加后续页。',
        id: 'basic',
        imports: ['div', 'vCard', 'vScroll'],
        sourceTitle: '基础滚动核心源码',
        title: '基础滚动'
      },
      {
        component: ScrollLoopBlockExample1,
        description: 'loop 开启循环加载，block 阻止后续请求，按钮可以实时切换。',
        id: 'loop-block',
        imports: ['div', 'vButton', 'vCard', 'vScroll', 'vText'],
        sourceTitle: '循环与阻止核心源码',
        title: '循环与阻止'
      },
      {
        component: ScrollAsyncExample1,
        description: 'loadMore 支持返回 Promise，适合接入真实接口并展示加载状态。',
        id: 'async',
        imports: ['div', 'vButton', 'vCard', 'vScroll'],
        sourceTitle: '异步加载核心源码',
        title: '异步加载'
      },
      {
        component: ScrollVirtualExample1,
        description: '20000 条数据只渲染可视窗口和少量 overscan，滚动高度仍保持完整。',
        id: 'virtual',
        imports: ['div', 'vCard', 'vScroll'],
        sourceTitle: '虚拟滚动核心源码',
        title: '虚拟滚动'
      }
    ],
    examplesIntro: '下面四个示例分别展示基础滚动、循环/阻止控制、异步加载和虚拟滚动。',
    heading: 'vScroll 滚动组件',
    intro:
      '滚动组件用于在固定高度的容器内按需加载和展示列表，适合日志、消息流、审计记录和长数据列表。',
    key: 'scroll',
    routeItem: 'data-display:9',
    title: '滚动组件',
    usageItems: [
      '日志、消息流和长列表需要按需加载时，用 vScroll 代替一次性渲染全部数据。',
      '列表到底后需要停止请求时，调用 block(true)。',
      '需要不断重复同一批数据时，用 loop(true) 开启循环加载。'
    ]
  }),
  carousel: createDataDisplayDocsDefinition({
    apiIntro:
      'vCarousel 用于在容器内横向切换多张幻灯片。它支持 slides/renderItem 数据驱动、自动播放、循环切换、箭头、指示点和键盘操作。',
    apiRows: [
      [
        'vCarousel({ slides, renderItem, autoplay, loop, arrows, dots })',
        '创建走马灯，slides 提供数据，renderItem 负责渲染每一项。',
        'vCarousel({ slides: [1, 2], renderItem: (item) => div(item) })'
      ],
      [
        'carousel.slides(data, renderItem)',
        '替换全部幻灯片，并回到第一项。',
        'carousel.slides(cards, (card) => cardNode)'
      ],
      [
        'carousel.active(index) / carousel.goTo(index)',
        '切换到指定索引，loop 开启时自动取模。',
        'carousel.active(2)'
      ],
      [
        'carousel.on("change", handler)',
        '监听当前项变化，event.detail 包含 index 和 count。',
        'carousel.on("change", ({ detail }) => console.log(detail.index))'
      ],
      ['carousel.next() / carousel.prev()', '切换到下一项或上一项。', 'carousel.next()'],
      ['carousel.loop(value)', '开启或关闭循环切换。', 'carousel.loop(true)'],
      [
        'carousel.autoplay(value) / start() / stop()',
        '开启或关闭自动播放。',
        'carousel.autoplay(true)'
      ],
      ['carousel.interval(value)', '设置自动播放间隔，单位毫秒。', 'carousel.interval(3000)'],
      ['carousel.arrows(value)', '显示或隐藏左右箭头。', 'carousel.arrows(false)'],
      ['carousel.dots(value)', '显示或隐藏底部指示点。', 'carousel.dots(false)'],
      ['carousel.height(value)', '设置容器高度，支持任意 CSS 长度。', "carousel.height('260px')"]
    ],
    apiSignature: `const carousel = vCarousel({
  slides: cards,
  renderItem: (item) => div(item),
  autoplay: true,
  interval: 3000,
  loop: true
});`,
    examples: [
      {
        component: CarouselBasicExample1,
        description: 'slides 和 renderItem 驱动内容，箭头与指示点可以直接切换。',
        id: 'basic',
        imports: ['div', 'vCarousel', 'vCard'],
        sourceTitle: '基础走马灯核心源码',
        title: '基础走马灯'
      },
      {
        component: CarouselAutoplayExample1,
        description: 'autoplay 和 interval 控制自动轮播，悬停或聚焦时自动暂停。',
        id: 'autoplay',
        imports: ['vCarousel', 'vCard', 'vText'],
        sourceTitle: '自动播放核心源码',
        title: '自动播放'
      },
      {
        component: CarouselLoopExample1,
        description: 'loop 开启时首尾循环，关闭后到达边界会禁用对应箭头。',
        id: 'loop',
        imports: ['vButton', 'vCarousel', 'vCard', 'vText'],
        sourceTitle: '循环切换核心源码',
        title: '循环切换'
      }
    ],
    examplesIntro: '下面三个示例分别展示基础走马灯、自动播放和循环切换。',
    heading: 'vCarousel 走马灯',
    intro:
      '走马灯用于在有限空间内顺序展示图片、卡片或运营内容。vCarousel 把滑动切换、自动播放、循环、指示点和键盘交互收敛在同一个组件 API 中。',
    key: 'carousel',
    routeItem: 'data-display:10',
    title: '走马灯',
    usageItems: [
      '首页横幅、服务卡片和运营位需要轮播展示时，用 vCarousel 承载多张内容。',
      '需要自动轮播时开启 autoplay，用户悬停或聚焦时会自动暂停。',
      '首尾需要连续播放时开启 loop，到底后需要停在边界时可关闭 loop。'
    ]
  })
});

export function TableDocumentationPage() {
  return createDataDisplayDocumentationPage(dataDisplayDocsDefinitions.table);
}

export function AvatarDocumentationPage() {
  return createDataDisplayDocumentationPage(dataDisplayDocsDefinitions.avatar);
}

export function BadgeDocumentationPage() {
  return createDataDisplayDocumentationPage(dataDisplayDocsDefinitions.badge);
}

export function DetailDocumentationPage() {
  return createDataDisplayDocumentationPage(dataDisplayDocsDefinitions.detail);
}

export function TreeDocumentationPage() {
  return createDataDisplayDocumentationPage(dataDisplayDocsDefinitions.tree);
}

export function ProgressDocumentationPage() {
  return createDataDisplayDocumentationPage(dataDisplayDocsDefinitions.progress);
}

export function ScrollDocumentationPage() {
  return createDataDisplayDocumentationPage(dataDisplayDocsDefinitions.scroll);
}

export function CarouselDocumentationPage() {
  return createDataDisplayDocumentationPage(dataDisplayDocsDefinitions.carousel);
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

function BadgeCountExample1() {
  const badge = vBadge({
    children: '未读消息',
    count: 0,
    showZero: true
  });
  const status = vText('当前 0');

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('数字徽标');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.hstack((row) => {
              row.style({ alignItems: 'center', flexWrap: 'wrap', gap: '18px' });
              row.child(badge);
              row.child(vBadge({ children: '通知', count: 8 }));
              row.child(vBadge({ children: '告警', count: 128, overflowCount: 99 }));
              row.child(vBadge({ children: '默认隐藏零', count: 0 }));
            });
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('当前计数');
              row.spacer();
              row.output((output) => {
                output.attr('data-badge-count-status', 'true');
                output.child(status);
              });
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ alignItems: 'center', flexWrap: 'wrap', gap: '10px' });
            actions.vButton((button) => {
              button.label('加 1');
              button.variant('primary');
              button.on('click', () => {
                badge.count(badge.count() + 1);
                status.textContent(`当前 ${badge.count()}`);
              });
            });
            actions.vButton((button) => {
              button.label('清零');
              button.variant('secondary');
              button.on('click', () => {
                badge.count(0);
                status.textContent('当前 0');
              });
            });
            actions.vButton((button) => {
              button.label('切换显示零');
              button.variant('ghost');
              button.on('click', () => {
                badge.showZero(!badge.showZero());
                status.textContent(badge.showZero() ? '显示零值' : '隐藏零值');
              });
            });
          });
        });
      });
    }
  };
}

function BadgeDotExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('圆点徽标');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('dot 模式只显示圆点，适合有新内容但不强调具体数量。');
            content.hstack((row) => {
              row.style({ alignItems: 'center', flexWrap: 'wrap', gap: '18px' });
              row.child(vBadge({ children: '通知', dot: true }));
              row.child(vBadge({ children: vButton('构建'), dot: true, color: '#0f766e' }));
              row.child(vBadge({ children: vButton('部署'), dot: true, color: '#d97706' }));
            });
          });
        });
      });
    }
  };
}

function BadgeStatusExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('状态徽标');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('status 使用固定语义色，text 补充当前状态说明。');
            content.hstack((row) => {
              row.style({ alignItems: 'center', flexWrap: 'wrap', gap: '18px' });
              row.child(vBadge({ status: 'success', text: '运行中' }));
              row.child(vBadge({ status: 'processing', text: '同步中' }));
              row.child(vBadge({ status: 'warning', text: '待确认' }));
              row.child(vBadge({ status: 'error', text: '故障' }));
              row.child(vBadge({ color: '#7c3aed', status: 'default', text: '自定义色' }));
            });
          });
        });
      });
    }
  };
}

function AvatarBasicExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('基础头像');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('文字和图标头像通过 size、shape、color 快速形成不同标识。');
            content.hstack((row) => {
              row.style({ alignItems: 'center', flexWrap: 'wrap', gap: '18px' });
              row.vAvatar('A');
              row.vAvatar({ color: '#0f766e', text: 'UI' });
              row.vAvatar({ icon: '★', shape: 'square' });
              row.vAvatar({ color: '#7c3aed', size: 'large', text: 'API' });
            });
          });
        });
      });
    }
  };
}

function AvatarImageExample1() {
  const aliceImage = new URL('./assets/avatar-alice.svg', import.meta.url).href;
  const opsImage = new URL('./assets/avatar-ops.svg', import.meta.url).href;
  const gatewayImage = new URL('./assets/avatar-gateway.svg', import.meta.url).href;

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('图片头像');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('src 加载本地非文字插画图片，alt 同步作为替代文本和 aria-label。');
            content.hstack((row) => {
              row.style({ alignItems: 'center', flexWrap: 'wrap', gap: '18px' });
              row.vAvatar({
                alt: 'Alice',
                size: 'xlarge',
                src: aliceImage,
                status: 'online'
              });
              row.vAvatar({
                alt: 'Ops',
                shape: 'square',
                src: opsImage
              });
              row.vAvatar({
                alt: 'Gateway',
                size: 'large',
                src: gatewayImage,
                status: 'busy'
              });
            });
          });
        });
      });
    }
  };
}

function AvatarStatusExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('状态头像');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('status 在头像右下角显示语义状态点，适合成员、节点和服务标识。');
            content.hstack((row) => {
              row.style({ alignItems: 'center', flexWrap: 'wrap', gap: '18px' });
              row.vAvatar({ status: 'online', text: 'A' });
              row.vAvatar({ color: '#0f766e', status: 'busy', text: 'B' });
              row.vAvatar({ color: '#b45309', status: 'away', text: 'C' });
              row.vAvatar({
                color: '#64748b',
                size: 'large',
                status: 'offline',
                text: 'D'
              });
            });
          });
        });
      });
    }
  };
}

function AvatarInteractiveExample1() {
  const colors = ['#0f766e', '#7c3aed', '#b45309', '#0284c7'];
  const sizes = ['small', 'medium', 'large', 'xlarge'];
  const statuses = ['online', 'busy', 'away', 'offline'];
  let colorIndex = 0;
  let sizeIndex = 1;
  let statusIndex = 0;
  let label = 'A';
  const avatar = vAvatar({ status: 'online', text: 'A' });
  const statusText = vText('online');

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('自定义头像');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '18px' });
              row.child(avatar);
              row.vstack((info) => {
                info.style('gap', '4px');
                info.span('当前状态');
                info.output((output) => {
                  output.attr('data-avatar-demo-status', 'true');
                  output.child(statusText);
                });
              });
            });
            content.hstack((actions) => {
              actions.style({ alignItems: 'center', flexWrap: 'wrap', gap: '10px' });
              actions.vButton((button) => {
                button.label('切换状态').variant('primary');
                button.on('click', () => {
                  statusIndex = (statusIndex + 1) % statuses.length;
                  avatar.status(statuses[statusIndex]);
                  statusText.textContent(statuses[statusIndex]);
                });
              });
              actions.vButton((button) => {
                button.label('切换形状');
                button.on('click', () => {
                  avatar.shape(avatar.shape() === 'circle' ? 'square' : 'circle');
                });
              });
              actions.vButton((button) => {
                button.label('切换尺寸');
                button.on('click', () => {
                  sizeIndex = (sizeIndex + 1) % sizes.length;
                  avatar.size(sizes[sizeIndex]);
                });
              });
              actions.vButton((button) => {
                button.label('切换颜色');
                button.on('click', () => {
                  colorIndex = (colorIndex + 1) % colors.length;
                  avatar.color(colors[colorIndex]);
                });
              });
              actions.vButton((button) => {
                button.label('切换文字');
                button.on('click', () => {
                  label = label === 'A' ? 'B' : 'A';
                  avatar.text(label);
                });
              });
            });
          });
        });
      });
    }
  };
}

function AvatarUploadExample1() {
  const avatar = vAvatarUpload({ size: 96 });
  const status = vText('未选择头像');

  avatar.on('change', () => {
    const file = avatar.value();
    status.textContent(file ? `已选择：${file.name}` : '未选择头像');
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('头像上传');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('点击头像区域选择图片，也可以拖拽图片到区域内预览。');
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '18px' });
              row.child(avatar);
              row.vstack((info) => {
                info.style('gap', '4px');
                info.span('当前状态');
                info.output((output) => {
                  output.attr('data-avatar-upload-status', 'true');
                  output.child(status);
                });
              });
            });
          });
        });
      });
    }
  };
}

function DetailBasicExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('基础详情');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('items 可以直接接收数组和对象，适合由接口数据生成只读详情。');
            content.child(
              vDetail({
                items: [
                  ['服务名称', 'api-gateway'],
                  { label: '状态', value: '运行中' },
                  { label: '负责人', value: 'SRE 团队' },
                  ['最近发布', 'v1.4.2']
                ]
              })
            );
          });
        });
      });
    }
  };
}

function DetailColumnsExample1() {
  const status = vText('当前 2 列');
  const detail = vDetail((detail) => {
    detail.columns(2);
    detail.vDetailItem('服务名称', 'api-gateway');
    detail.vDetailItem('状态', '运行中');
    detail.vDetailItem('负责人', 'SRE 团队');
    detail.vDetailItem('最近发布', 'v1.4.2');
    detail.vDetailItem('访问地址', 'https://api.example.com');
    detail.vDetailItem('部署区域', '华东 1');
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('多列详情');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('columns 可以动态切换，条目会自动按每行 n 个重新排列。');
            content.child(detail);
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('当前列数');
              row.spacer();
              row.output((output) => {
                output.attr('data-detail-columns-status', 'true');
                output.child(status);
              });
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ alignItems: 'center', flexWrap: 'wrap', gap: '10px' });
            [1, 2, 3].forEach((count) => {
              actions.vButton((button) => {
                button.label(`${count} 列`);
                button.variant(count === 2 ? 'primary' : 'secondary');
                button.on('click', () => {
                  detail.columns(count);
                  status.textContent(`当前 ${count} 列`);
                });
              });
            });
          });
        });
      });
    }
  };
}

function DetailCustomExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('自定义值');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('value 可以接收任意 ViewNode，状态徽标、按钮和链接都能直接放入。');
            content.child(
              vDetail((detail) => {
                detail.vDetailItem((item) => {
                  item.label('运行状态');
                  item.value(
                    vBadge((badge) => {
                      badge.status('success');
                      badge.text('运行中');
                    })
                  );
                });
                detail.vDetailItem((item) => {
                  item.label('负责人');
                  item.value(
                    vButton((button) => {
                      button.label('SRE 团队');
                      button.variant('ghost');
                      button.size('small');
                    })
                  );
                });
                detail.vDetailItem((item) => {
                  item.label('访问地址');
                  item.value('https://api.example.com');
                });
              })
            );
          });
        });
      });
    }
  };
}

function DetailDynamicExample1() {
  const name = vText('api-gateway');
  const status = vText('运行中');
  const owner = vText('SRE 团队');
  const version = vText('v1.4.2');
  const detail = vDetail((detail) => {
    detail.vDetailItem('服务名称', name);
    detail.vDetailItem('状态', status);
    detail.vDetailItem('负责人', owner);
    detail.vDetailItem('最近发布', version);
  });
  const switchService = () => {
    const next = name.textContent() === 'api-gateway' ? 'worker' : 'api-gateway';
    name.textContent(next);
    status.textContent(next === 'worker' ? '维护中' : '运行中');
    owner.textContent(next === 'worker' ? 'Data 团队' : 'SRE 团队');
    version.textContent(next === 'worker' ? 'v2.0.1' : 'v1.4.2');
  };

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('动态更新');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('持有 vText 引用后，切换服务只需要更新值节点。');
            content.child(detail);
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ alignItems: 'center', flexWrap: 'wrap', gap: '10px' });
            actions.vButton((button) => {
              button.label('切换服务');
              button.variant('primary');
              button.on('click', switchService);
            });
            actions.vButton((button) => {
              button.label('切换状态');
              button.variant('secondary');
              button.on('click', () => {
                status.textContent(status.textContent() === '运行中' ? '维护中' : '运行中');
              });
            });
          });
        });
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

function TableDeclarativeExample1() {
  const status = vText('自定义表头已就绪');

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('声明式内部结构');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.vTable((table) => {
              table.vThead((head) => {
                head.vTr((row) => {
                  row.vTh('服务名称');
                  row.vTh('状态');
                  row.vTh('操作');
                });
              });
              table.vTbody((tbody) => {
                tbody.vTr((row) => {
                  row.vTd('api-gateway');
                  row.vTd('运行中');
                  row.vTd(
                    vButton((button) => {
                      button.label('查看');
                      button.size('small');
                      button.variant('secondary');
                      button.on('click', () => status.textContent('已查看 api-gateway'));
                    })
                  );
                });
                tbody.vTr((row) => {
                  row.vTd('worker');
                  row.vTd('维护中');
                  row.vTd('处理');
                });
              });
              table.vTfoot((foot) => {
                foot.vTr((row) => {
                  row.vTd((cell) => {
                    cell.attr('colspan', 3);
                    cell.text('表尾单元格可以跨列');
                  });
                });
              });
            });
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('操作反馈');
              row.spacer();
              row.output((output) => output.child(status));
            });
          });
        });
      });
    }
  };
}

function TreeBasicExample1() {
  const status = vText('当前：未选择');
  const tree = vTree((root) => {
    root.ariaLabel('服务目录').change(({ label, type }) => {
      if (type === 'select') {
        status.textContent(`当前：${label}`);
      }
    });
    root.vTreeNode((node) =>
      node
        .id('frontend')
        .label('前端服务')
        .icon('F')
        .expanded(true)
        .child([
          { id: 'web', icon: 'W', label: 'Web 门户' },
          { id: 'console', icon: 'C', label: '控制台' }
        ])
    );
    root.vTreeNode((node) =>
      node
        .id('backend')
        .label('后端服务')
        .icon('B')
        .child([
          { id: 'api', icon: 'A', label: 'API 网关' },
          { id: 'worker', icon: 'T', label: '任务 Worker' },
          { id: 'scheduler', icon: 'S', label: '调度器' }
        ])
    );
    root.vTreeNode((node) =>
      node
        .id('storage')
        .label('存储')
        .icon('R')
        .child([
          { id: 'database', icon: 'D', label: '数据库' },
          { id: 'object-store', icon: 'O', label: '对象存储' }
        ])
    );
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('树形选择');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.child(tree).hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('当前选择');
              row.spacer();
              row.output((output) => output.attr('data-tree-demo-status', 'true').child(status));
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ alignItems: 'center', flexWrap: 'wrap', gap: '10px' });
            actions.vButton((button) =>
              button
                .label('展开全部')
                .variant('secondary')
                .on('click', () => {
                  tree.expandAll();
                  status.textContent('已展开全部节点');
                })
            );
            actions.vButton((button) =>
              button
                .label('收起全部')
                .variant('secondary')
                .on('click', () => {
                  tree.collapseAll();
                  status.textContent('已收起全部节点');
                })
            );
            actions.vButton((button) =>
              button
                .label('清除选择')
                .variant('ghost')
                .on('click', () => {
                  tree.selectedKeys([]);
                  status.textContent('当前：未选择');
                })
            );
          });
        });
      });
    }
  };
}

function TreeCheckableExample1() {
  const status = vText('已选 0 项');
  const tree = vTree((root) => {
    root
      .ariaLabel('资源选择')
      .checkable(true)
      .change(({ checkedKeys, type }) => {
        if (type === 'check') {
          status.textContent(`已选 ${checkedKeys.length} 项`);
        }
      });
    root.vTreeNode((node) =>
      node
        .id('infra')
        .label('基础设施')
        .expanded(true)
        .child([
          {
            id: 'compute',
            label: '计算资源',
            expanded: true,
            children: [
              { id: 'api-gateway', label: 'API 网关' },
              { id: 'worker-pool', label: 'Worker 池' }
            ]
          },
          {
            id: 'network',
            label: '网络',
            children: [
              { id: 'vpc', label: 'VPC' },
              { id: 'load-balancer', label: '负载均衡' }
            ]
          }
        ])
    );
    root.vTreeNode((node) =>
      node
        .id('security')
        .label('安全合规')
        .child([
          { id: 'readonly-log', label: '审计日志' },
          { id: 'backup', label: '备份策略' }
        ])
    );
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('复选框树');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.child(tree).hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('勾选状态');
              row.spacer();
              row.output((output) => output.attr('data-tree-check-status', 'true').child(status));
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ alignItems: 'center', flexWrap: 'wrap', gap: '10px' });
            actions.vButton((button) =>
              button
                .label('全选')
                .variant('primary')
                .on('click', () => tree.checkAll(true))
            );
            actions.vButton((button) =>
              button
                .label('清空')
                .variant('secondary')
                .on('click', () => tree.checkAll(false))
            );
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
  const folderIcon = FolderOutlined().styles({ height: '18px', width: '18px' });
  const folderOpenIcon = FolderOpenOutlined().styles({ height: '18px', width: '18px' });
  const tree = vTree((root) => {
    root
      .ariaLabel('文件目录')
      .toggleIcon(folderIcon, folderOpenIcon)
      .change(({ id, label, node, type }) => {
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
    root.vTreeNode((node) =>
      node
        .id('projects')
        .label('projects')
        .expanded(true)
        .child([
          (child) =>
            child
              .id('yoya-ui')
              .label('yoya-ui')
              .expanded(true)
              .child([
                (folder) =>
                  folder
                    .id('src')
                    .label('src')
                    .expanded(true)
                    .child([
                      { id: 'components', label: 'components', expandable: true },
                      { id: 'tree.js', label: 'tree.js' }
                    ]),
                { id: 'README.md', label: 'README.md' }
              ]),
          (folder) =>
            folder
              .id('design')
              .label('design')
              .child([{ id: 'logo.svg', label: 'logo.svg' }])
        ])
    );
    root.vTreeNode((folder) =>
      folder
        .id('documents')
        .label('documents')
        .child([{ id: 'release-notes.md', label: 'release-notes.md' }])
    );
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
                background: 'var(--yoya-color-surface-muted, #fbfcfe)',
                border: '1px solid var(--yoya-color-border, #e2e8f0)',
                borderRadius: '8px',
                flex: '2 1 320px',
                minWidth: '0',
                padding: '16px'
              });
              panel.h3((heading) => {
                heading.attr('data-tree-file-name', 'true').child(fileName);
              });
              panel.p((description) => {
                description.attr('data-tree-file-status', 'true').child(status);
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
                    value.attr('data-tree-file-type', 'true').child(fileType);
                  });
                });
                metaRow.div((item) => {
                  item.style({ display: 'grid', gap: '2px' });
                  item.span('大小');
                  item.strong((value) => {
                    value.attr('data-tree-file-size', 'true').child(fileSize);
                  });
                });
                metaRow.div((item) => {
                  item.style({ display: 'grid', gap: '2px' });
                  item.span('更新时间');
                  item.strong((value) => {
                    value.attr('data-tree-file-updated', 'true').child(fileUpdated);
                  });
                });
              });
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ alignItems: 'center', flexWrap: 'wrap', gap: '10px' });
            actions.vButton((button) =>
              button
                .label('新建文件夹')
                .variant('secondary')
                .on('click', () => status.textContent('已创建新文件夹'))
            );
            actions.vButton((button) =>
              button
                .label('上传文件')
                .variant('primary')
                .on('click', () => status.textContent('已开始上传文件'))
            );
            actions.vButton((button) =>
              button
                .label('刷新')
                .variant('ghost')
                .on('click', () => status.textContent('目录已刷新'))
            );
          });
        });
      });
    }
  };
}

function TreeBuilderExample1() {
  const status = vText('当前：未选择');
  const addRowAction = (node) =>
    node.actions((actions) =>
      actions.vButton((button) =>
        button
          .label('⋯')
          .size('small')
          .variant('ghost')
          .attr({
            'aria-label': `扩展操作：${node.label()}`,
            'data-tree-builder-action': node.id()
          })
          .on('click', () => status.textContent(`操作：${node.label()}`))
      )
    );
  const leaf =
    (id, label, { icon = label[0], selected = false } = {}) =>
    (node) => {
      node
        .id(id)
        .label(label)
        .icon((iconBox) => iconBox.text(icon));
      if (selected) {
        node.selected(true);
      }
      addRowAction(node);
    };
  const tree = vTree((root) => {
    root.ariaLabel('权限目录').change(({ label, type }) => {
      if (type === 'select') {
        status.textContent(`当前：${label}`);
      }
    });
    root.vTreeNode((node) => {
      node
        .id('organization')
        .label('组织架构')
        .expanded(true)
        .icon((icon) => icon.text('O'))
        .child([
          (group) => {
            group
              .id('platform')
              .label('平台组')
              .expanded(true)
              .icon((icon) => icon.text('P'))
              .child([
                leaf('sre', 'SRE', { icon: 'S', selected: true }),
                leaf('qa', 'QA', { icon: 'Q' })
              ]);
            addRowAction(group);
          },
          (group) => {
            group
              .id('business')
              .label('业务组')
              .expanded(true)
              .icon((icon) => icon.text('B'))
              .child([
                leaf('finance', '财务', { icon: 'F' }),
                leaf('operations', '运营', { icon: 'O' })
              ]);
            addRowAction(group);
          }
        ]);
      addRowAction(node);
    });
    root.vTreeNode((node) => {
      node
        .id('security')
        .label('安全中心')
        .icon((icon) => icon.text('S'));
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
            content.child(tree).hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('当前选择');
              row.spacer();
              row.output((output) => output.attr('data-tree-builder-status', 'true').child(status));
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ alignItems: 'center', flexWrap: 'wrap', gap: '10px' });
            actions.vButton((button) =>
              button
                .label('展开全部')
                .variant('secondary')
                .on('click', () => tree.expandAll())
            );
            actions.vButton((button) =>
              button
                .label('收起全部')
                .variant('secondary')
                .on('click', () => tree.collapseAll())
            );
          });
        });
      });
    }
  };
}

function ProgressBasicExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('基础进度条');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('value 和 max 决定当前进度，右侧默认显示百分比。');
            content.child(
              vProgress((progress) => {
                progress.label('部署进度');
                progress.value(64);
              })
            );
            content.child(
              vProgress((progress) => {
                progress.format((value, percent) => `${value} / 200（${Math.round(percent)}%）`);
                progress.max(200);
                progress.value(136);
              })
            );
          });
        });
      });
    }
  };
}

function ProgressStatusExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('状态进度条');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('status 切换语义色，适合构建、发布、告警和同步等任务状态。');
            content.child(
              vProgress((progress) => {
                progress.label('构建');
                progress.status('success');
                progress.value(80);
              })
            );
            content.child(
              vProgress((progress) => {
                progress.label('同步');
                progress.status('processing');
                progress.value(55);
              })
            );
            content.child(
              vProgress((progress) => {
                progress.label('告警');
                progress.status('warning');
                progress.value(72);
              })
            );
            content.child(
              vProgress((progress) => {
                progress.label('发布');
                progress.status('error');
                progress.value(34);
              })
            );
          });
        });
      });
    }
  };
}

function ProgressDynamicExample1() {
  const progress = vProgress((progress) => {
    progress.label('任务');
    progress.status('processing');
    progress.value(40);
  });
  const status = vText('当前 40%');
  const update = (value) => {
    progress.value(value);
    progress.status(value >= 100 ? 'success' : 'processing');
    status.textContent(`当前 ${Math.round(progress.percent())}%`);
  };

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('动态进度条');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.child(progress);
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('当前进度');
              row.spacer();
              row.output((output) => {
                output.attr('data-progress-dynamic-status', 'true');
                output.child(status);
              });
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ alignItems: 'center', flexWrap: 'wrap', gap: '10px' });
            actions.vButton((button) => {
              button.label('减 10');
              button.variant('secondary');
              button.on('click', () => update(progress.value() - 10));
            });
            actions.vButton((button) => {
              button.label('加 10');
              button.variant('primary');
              button.on('click', () => update(progress.value() + 10));
            });
            actions.vButton((button) => {
              button.label('重置');
              button.variant('ghost');
              button.on('click', () => update(0));
            });
          });
        });
      });
    }
  };
}

function ScrollBasicExample1() {
  const source = Array.from({ length: 30 }, (_, index) => `日志 ${index + 1}`);

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('基础滚动');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('items 提供首批数据，滚动接近底部时自动调用 loadMore 追加下一页。');
            content.child(
              vScroll((scroll) => {
                scroll.style('height', '280px');
                scroll.items(source.slice(0, 6), (item) => div(item));
                scroll.loadMore(({ append, block, page }) => {
                  const start = page * 6;
                  const next = source.slice(start, start + 6);
                  append(next);
                  if (start + next.length >= source.length) {
                    block(true);
                  }
                });
                scroll.threshold(48);
              })
            );
          });
        });
      });
    }
  };
}

function ScrollLoopBlockExample1() {
  const source = Array.from({ length: 12 }, (_, index) => `任务 ${index + 1}`);
  const status = vText('当前：block');
  const scroll = vScroll((scroll) => {
    scroll.style('height', '220px');
    scroll.items(source.slice(0, 4), (item) => div(item));
    scroll.loadMore(({ append, block, page, scroll: api }) => {
      if (api.loop()) {
        const start = ((page - 1) % 3) * 4;
        append(source.slice(start, start + 4));
      } else {
        const start = (page - 1) * 4;
        const next = source.slice(start, start + 4);
        append(next);
        if (start + next.length >= source.length) {
          block(true);
        }
      }
    });
    scroll.threshold(40);
    scroll.block(true);
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('循环与阻止');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('loop 开启后数据会循环追加；block 会停止后续加载。');
            content.child(scroll);
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('当前模式');
              row.spacer();
              row.output((output) => {
                output.attr('data-scroll-loop-status', 'true');
                output.child(status);
              });
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ alignItems: 'center', flexWrap: 'wrap', gap: '10px' });
            actions.vButton((button) => {
              button.label('开启循环');
              button.variant('primary');
              button.on('click', () => {
                scroll.loop(true);
                status.textContent('loop：循环加载');
                scroll.check();
              });
            });
            actions.vButton((button) => {
              button.label('阻止加载');
              button.variant('secondary');
              button.on('click', () => {
                scroll.block(true);
                status.textContent('block：停止加载');
              });
            });
            actions.vButton((button) => {
              button.label('重置');
              button.variant('ghost');
              button.on('click', () => {
                scroll.reset().loop(false).check();
                status.textContent('已重置');
              });
            });
          });
        });
      });
    }
  };
}

function ScrollAsyncExample1() {
  const source = Array.from({ length: 20 }, (_, index) => `消息 ${index + 1}`);
  const scroll = vScroll((scroll) => {
    scroll.style('height', '260px');
    scroll.items(source.slice(0, 5), (item) => div(item));
    scroll.loadMore(
      ({ append, block, page }) =>
        new Promise((resolve) => {
          setTimeout(() => {
            const start = page * 5;
            const next = source.slice(start, start + 5);
            append(next);
            if (start + next.length >= source.length) {
              block(true);
            }
            resolve();
          }, 400);
        })
    );
    scroll.loadingText('异步加载中…');
    scroll.endText('没有更多消息');
    scroll.threshold(40);
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('异步加载');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('loadMore 可以返回 Promise，组件会在返回前保持 loading 状态。');
            content.child(scroll);
          });
        });
        card.vCardFooter((footer) => {
          footer.vButton((button) => {
            button.label('重新加载');
            button.on('click', () => {
              scroll.reset();
              scroll.check();
            });
          });
        });
      });
    }
  };
}

function ScrollVirtualExample1() {
  const rows = Array.from({ length: 20000 }, (_, index) => ({
    id: index + 1,
    name: `服务 ${index + 1}`,
    status: index % 4 === 0 ? '运行中' : index % 4 === 1 ? '告警' : '已停止'
  }));

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('虚拟滚动');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('20000 条数据只渲染可视窗口，滚动时再按需切换。');
            content.child(
              vScroll((scroll) => {
                scroll.style('height', '320px');
                scroll.itemHeight(52);
                scroll.overscan(4);
                scroll.items(rows, (row) =>
                  div((item) => {
                    item.styles({
                      alignItems: 'center',
                      borderBottom: '1px solid var(--yoya-color-border-faint, #e2e8f0)',
                      boxSizing: 'border-box',
                      display: 'flex',
                      gap: '10px',
                      height: '100%',
                      justifyContent: 'space-between',
                      padding: '0 4px'
                    });
                    item.strong(row.name);
                    item.span(row.status);
                  })
                );
              })
            );
          });
        });
      });
    }
  };
}

function CarouselBasicExample1() {
  const colors = [
    'var(--yoya-color-primary-subtle, #eff6ff)',
    'var(--yoya-color-success-subtle, #ecfdf5)',
    'var(--yoya-color-warning-subtle, #fffbeb)',
    'var(--yoya-color-danger-subtle, #fef2f2)'
  ];
  const slides = [
    { text: '统一管理服务生命周期、版本和负责人。', title: '服务治理' },
    { text: '从构建到上线自动串联审批和回滚。', title: '发布流水线' },
    { text: '汇总健康检查、指标和告警状态。', title: '运行监控' }
  ];

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('基础走马灯');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('slides + renderItem 生成每一页，箭头和指示点负责切换。');
            content.child(
              vCarousel((carousel) => {
                carousel.height('240px');
                carousel.slides(slides, (item, index) =>
                  div((block) => {
                    block.className('carousel-demo-slide');
                    block.styles({
                      background: colors[index % colors.length],
                      borderRadius: '8px',
                      boxSizing: 'border-box',
                      display: 'grid',
                      alignContent: 'center',
                      gap: '8px',
                      height: '100%',
                      padding: '24px'
                    });
                    block.h3(item.title);
                    block.p(item.text);
                  })
                );
              })
            );
          });
        });
      });
    }
  };
}

function CarouselAutoplayExample1() {
  const status = vText('当前：1 / 3');
  const slides = ['自动播放 A', '自动播放 B', '自动播放 C'];
  const colors = [
    'var(--yoya-color-primary-subtle, #eef2ff)',
    'var(--yoya-color-info-subtle, #ecfeff)',
    'var(--yoya-color-primary-subtle, #fdf4ff)'
  ];
  const carousel = vCarousel((carousel) => {
    carousel.height('220px');
    carousel.interval(2500);
    carousel.slides(slides, (item, index) =>
      div((block) => {
        block.styles({
          alignItems: 'center',
          background: colors[index % colors.length],
          borderRadius: '8px',
          boxSizing: 'border-box',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: '700'
        });
        block.text(item);
      })
    );
    carousel.autoplay(true);
    carousel.on('change', (event) => {
      status.textContent(`当前：${event.detail.index + 1} / ${event.detail.count}`);
    });
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('自动播放');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('autoplay 和 interval 控制自动轮播，悬停或聚焦时会暂停。');
            content.child(carousel);
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('当前项');
              row.spacer();
              row.output((output) =>
                output.attr('data-carousel-autoplay-status', 'true').child(status)
              );
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ alignItems: 'center', gap: '10px' });
            actions.vButton((button) => {
              button.label('上一项');
              button.on('click', () => carousel.prev());
            });
            actions.vButton((button) => {
              button.label('下一项');
              button.variant('primary');
              button.on('click', () => carousel.next());
            });
          });
        });
      });
    }
  };
}

function CarouselLoopExample1() {
  const status = vText('loop：true');
  const slides = ['循环 A', '循环 B', '循环 C'];
  const carousel = vCarousel((carousel) => {
    carousel.height('220px');
    carousel.slides(slides, (item, index) =>
      div((block) => {
        block.styles({
          alignItems: 'center',
          background:
            index % 2 === 0
              ? 'var(--yoya-color-primary-subtle, #f0f9ff)'
              : 'var(--yoya-color-surface-muted, #f8fafc)',
          borderRadius: '8px',
          boxSizing: 'border-box',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: '700'
        });
        block.text(item);
      })
    );
    carousel.on('change', syncStatus);
  });

  function syncStatus() {
    status.textContent(
      `loop：${carousel.loop()}，当前 ${carousel.active() + 1} / ${carousel.slides().length}`
    );
  }

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('循环切换');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('loop 开启时首尾连续切换，关闭后到达边界会禁用箭头。');
            content.child(carousel);
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('当前状态');
              row.spacer();
              row.output((output) =>
                output.attr('data-carousel-loop-status', 'true').child(status)
              );
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ alignItems: 'center', flexWrap: 'wrap', gap: '10px' });
            actions.vButton((button) => {
              button.label('切换循环');
              button.variant('secondary');
              button.on('click', () => {
                carousel.loop(!carousel.loop());
                syncStatus();
              });
            });
            actions.vButton((button) => {
              button.label('上一项');
              button.on('click', () => carousel.prev());
            });
            actions.vButton((button) => {
              button.label('下一项');
              button.variant('primary');
              button.on('click', () => carousel.next());
            });
          });
        });
      });
    }
  };
}
