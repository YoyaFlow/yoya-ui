# 组件对照：Ant Design / Element Plus ↔ yoya-ui

从 Ant Design（React）或 Element Plus（Vue）迁移、选型时，用本文快速找到 yoya-ui
的对应组件，或确认缺口。对照基准：Ant Design 5.x、Element Plus 2.x、yoya-ui 0.5.x。

- yoya-ui 列写的是工厂名（代码里实际调用的名字），可到示例站查可运行示例；
- 「—」表示该库没有此组件；「≈」表示语义接近但不完全等价；
- 缺口的补齐节奏见根目录 [ROADMAP.zh-CN.md](../ROADMAP.zh-CN.md)。

## 一、自带组件对照

### 通用 / 操作

| 功能           | Ant Design     | Element Plus          | yoya-ui                                       |
| -------------- | -------------- | --------------------- | --------------------------------------------- |
| 按钮           | Button         | ElButton              | vButton                                       |
| 按钮组（单选） | Button + Space | ElButtonGroup         | vButtons（配置式创建、单选联动，≈ Segmented） |
| 图标按钮       | Button(icon)   | ElButton(icon)        | vSymbolButton                                 |
| 悬浮按钮       | FloatButton    | ElFloatButton（2.8+） | vFloatButton                                  |
| 特效按钮       | —              | —                     | vGlowButton                                   |
| 下拉菜单       | Dropdown       | ElDropdown            | vDropdownMenu                                 |
| 右键菜单       | —              | —                     | vContextMenu                                  |
| 文本排版       | Typography     | ElText                | vText、vCode / vCodeBlock                     |

### 布局

| 功能       | Ant Design                       | Element Plus                              | yoya-ui                                                    |
| ---------- | -------------------------------- | ----------------------------------------- | ---------------------------------------------------------- |
| 页面骨架   | Layout / Header / Sider / Footer | ElContainer / ElHeader / ElAside / ElMain | vContainer / vHeader / vAside / vMain / vFooter / vSidebar |
| 栅格       | Row / Col                        | ElRow / ElCol                             | vRow / vCol（另有 flex / grid 布局原语）                   |
| 间距       | Space                            | ElSpace                                   | hstack / vstack（gap）+ spacer()                           |
| 分隔线     | Divider                          | ElDivider                                 | divider()                                                  |
| 卡片       | Card                             | ElCard                                    | vCard / vCardHeader / vCardBody / vCardFooter              |
| 主题化容器 | —（Card 承担）                   | —（ElCard 承担）                          | vSurface、vThemeShell                                      |
| 分栏拖拽   | —                                | —                                         | vSplitPanel                                                |
| 瀑布流     | —                                | —                                         | vMasonry                                                   |
| 滚动区域   | —                                | ElScrollbar                               | vScroll                                                    |

### 导航

| 功能       | Ant Design                              | Element Plus                         | yoya-ui                                                  |
| ---------- | --------------------------------------- | ------------------------------------ | -------------------------------------------------------- |
| 侧边菜单   | Menu / SubMenu / ItemGroup / Divider    | ElMenu / ElSubMenu / ElMenuItemGroup | vMenu / vSubMenu / vMenuItem / vMenuGroup / vMenuDivider |
| 顶部导航栏 | Layout.Header 组合（PageHeader 已移除） | ElPageHeader                         | vNavbar                                                  |
| 面包屑     | Breadcrumb                              | ElBreadcrumb                         | vBreadcrumb / vBreadcrumbItem                            |
| 标签页     | Tabs                                    | ElTabs / ElTabPane                   | vTabs / vTab                                             |
| 步骤条     | Steps                                   | ElSteps / ElStep                     | vSteps / vStep                                           |
| 锚点       | Anchor                                  | ElAnchor（2.6+）                     | vAnchor / vAnchorItem                                    |
| 固钉       | Affix                                   | —                                    | —                                                        |

### 数据录入

| 功能        | Ant Design              | Element Plus                | yoya-ui                                   |
| ----------- | ----------------------- | --------------------------- | ----------------------------------------- |
| 表单        | Form / Form.Item        | ElForm / ElFormItem         | vForm / vFormItem / vField                |
| 输入框      | Input                   | ElInput                     | vInput                                    |
| 文本域      | Input.TextArea          | ElInput（type=textarea）    | vTextarea                                 |
| 数字输入    | InputNumber             | ElInputNumber               | ≈ vInput（type=number，无独立步进组件）   |
| 选择器      | Select                  | ElSelect                    | vSelect                                   |
| 自动完成    | AutoComplete            | ElAutocomplete              | vAutocomplete                             |
| 级联选择    | Cascader                | ElCascader                  | vCascader                                 |
| 复选框      | Checkbox / Group        | ElCheckbox                  | vCheckbox / vCheckboxes                   |
| 单选框      | Radio / Radio.Group     | ElRadio                     | vRadio / vRadios                          |
| 开关        | Switch                  | ElSwitch                    | vSwitch                                   |
| 滑动输入    | Slider                  | ElSlider                    | vSlider                                   |
| 评分        | Rate                    | ElRate                      | vRate                                     |
| 颜色选择    | ColorPicker             | ElColorPicker               | vColorPicker                              |
| 日期 / 时间 | DatePicker / TimePicker | ElDatePicker / ElTimePicker | vTimer（date / datetime / time 三种模式） |
| 日期范围    | RangePicker             | ElDatePicker（range）       | vTimerRange                               |
| 标签输入    | Mentions / Select(tags) | —                           | vTagsInput                                |
| 树选择      | TreeSelect              | ElTreeSelect                | —（可用 vTree 组合实现）                  |
| 穿梭框      | Transfer                | ElTransfer                  | —                                         |
| 上传        | Upload                  | ElUpload                    | vUpload                                   |
| 头像上传    | Upload（avatar 示例）   | ElUpload                    | vAvatarUpload                             |
| 图标选择    | —                       | —                           | vSvgIconPicker                            |

### 数据展示

| 功能         | Ant Design       | Element Plus   | yoya-ui                                             |
| ------------ | ---------------- | -------------- | --------------------------------------------------- |
| 表格         | Table            | ElTable        | vTable / vThead / vTbody / vTfoot / vTr / vTh / vTd |
| 虚拟滚动表格 | Table（virtual） | ElTableV2      | —                                                   |
| 树控件       | Tree             | ElTree         | vTree / vTreeNode                                   |
| 树表格       | —                | —              | vTreeTable（行常驻，展开不丢 DOM 状态）             |
| 多列层级浏览 | —                | —              | vTreeRanger（ranger 式三窗口）                      |
| 时间线       | Timeline         | ElTimeline     | vTimeline / vTimelineItem                           |
| 分页         | Pagination       | ElPagination   | vPagination                                         |
| 徽标数       | Badge            | ElBadge        | vBadge                                              |
| 标签         | Tag              | ElTag          | —                                                   |
| 头像         | Avatar           | ElAvatar       | vAvatar                                             |
| 轮播         | Carousel         | ElCarousel     | vCarousel                                           |
| 描述列表     | Descriptions     | ElDescriptions | vDetail / vDetailItem                               |
| 列表         | List             | —              | —                                                   |
| 折叠面板     | Collapse         | ElCollapse     | —                                                   |
| 空状态       | Empty            | ElEmpty        | —                                                   |
| 日历         | Calendar         | ElCalendar     | —                                                   |
| 图片         | Image            | ElImage        | vLazyImage                                          |
| 图片预览     | Image（preview） | ElImageViewer  | vImagePreview                                       |
| 统计数值     | Statistic        | ElStatistic    | vTrendCard、vDigitalBoard / vDigitalBoardItem       |
| 轻量图表     | —                | —              | vChart（库无关宿主）、vSparkline、vGauge、vRingStat |

### 反馈

| 功能              | Ant Design                 | Element Plus                | yoya-ui                                        |
| ----------------- | -------------------------- | --------------------------- | ---------------------------------------------- |
| 对话框            | Modal                      | ElDialog                    | vDialog                                        |
| 抽屉              | Drawer                     | ElDrawer                    | —                                              |
| 确认弹窗          | Modal.confirm / Popconfirm | ElMessageBox / ElPopconfirm | vConfirm（Promise 风格，SSR 安全）             |
| 全局消息          | message                    | ElMessage                   | vMessage / vMessageManager / vMessageContainer |
| 通知提醒          | notification               | ElNotification              | —                                              |
| 文字提示          | Tooltip                    | ElTooltip                   | vTooltip                                       |
| 气泡卡片          | Popover                    | ElPopover                   | —（vTooltip / vDialog 组合）                   |
| 警告提示          | Alert                      | ElAlert                     | —                                              |
| 结果页            | Result                     | ElResult                    | —                                              |
| 进度条            | Progress                   | ElProgress                  | vProgress                                      |
| 骨架屏            | Skeleton                   | ElSkeleton                  | vSkeleton                                      |
| 加载指示          | Spin                       | v-loading 指令              | —（加载态由 vSkeleton / vDynamicLoader 承担）  |
| 懒加载 / 异步区域 | —                          | —                           | vLazyImage / vDynamicLoader                    |
| 过渡动效          | motion（ConfigProvider）   | ElTransition                | vTransition                                    |

### 全局能力

| 功能       | Ant Design               | Element Plus               | yoya-ui                               |
| ---------- | ------------------------ | -------------------------- | ------------------------------------- |
| 主题定制   | ConfigProvider（token）  | CSS 变量                   | 主题 token（--yoya-*）、vThemeShell   |
| 国际化     | ConfigProvider（locale） | ElConfigProvider（locale） | createI18n（每请求实例）              |
| 权限       | —                        | —                          | createAccess / installAccess 权限声明 |
| 服务端渲染 | 依赖上层框架             | 依赖上层框架               | 内置 renderToString / hydrate         |

### 小结

**yoya-ui 超出两张对照表的部分**：树表格、多列层级浏览（vTreeRanger）、轻量图表族
（vSparkline / vGauge / vRingStat / vTrendCard / vDigitalBoard）、右键菜单、分栏拖拽、
瀑布流、图标选择器、流光按钮、权限声明——这些在 Ant Design / Element Plus 中没有
或不内置。

**当前缺口**（按场景逐步补齐）：Drawer、Alert、Collapse、Popover、Tag、Empty、List、
Result、Transfer、TreeSelect、虚拟滚动表格，以及水印（Watermark）、引导（Tour）等。

## 二、可用扩展库对比：React / Vue / yoya-ui

**对比维度：DOM 可操作性。** 本节的分析框架基于「框架是否把真实 DOM 的操作权直接
交给使用者」——React / Vue 的渲染由框架托管，DOM 要经 ref 转一手才能交给第三方库；
yoya-ui 的节点即真实 DOM，可直接操作。三方在这件事上的差别，决定了每个第三方库
接入时的形态与成本：

- **React / Vue**：框架管理渲染，第三方库操作真实 DOM，中间需要一层封装组件
  （wrapper）把框架生命周期翻译成库的 init / update / destroy——react-echarts、
  vue-echarts 就是这层。用社区封装就要跟它的版本与维护节奏；自己用 ref 手接，
  等于自己写并长期维护这层胶水。
- **yoya-ui**：节点本身就是真实 DOM，render 之后直接把元素交给库实例，销毁时调用
  其清理方法。官方适配器（vEchart / vThree，随本仓库一起发布与测试，内部依赖
  版本由仓库锁定）与业务侧十几行胶水（AG Grid 示例）是同一个范式，不挑库。

第三方库的初始化属于客户端行为：SSR 时容器照常输出 HTML，实例在 hydrate / mount 之后
创建（示例站的 CodeMirror、Quill 演示就是这个模式）。自建适配器组件的方法见
[component-authoring.zh-CN.md](component-authoring.zh-CN.md)。

| 库（领域）                             | React 生态                   | Vue 生态                 | yoya-ui（真实 DOM 交出）                                                   | 示例站演示 |
| -------------------------------------- | ---------------------------- | ------------------------ | -------------------------------------------------------------------------- | ---------- |
| ECharts（专业图表）                    | echarts-for-react            | vue-echarts              | 官方适配器 vEchart（`@yoyaflow/yoya-ui/echart` 子入口，内置懒加载 loader） | 有         |
| Three.js（3D 渲染）                    | @react-three/fiber           | TresJS                   | 官方适配器 vThree（`@yoyaflow/yoya-ui/three` 子入口）                      | 有         |
| AG Grid（企业级表格）                  | ag-grid-react（官方）        | ag-grid-vue3（官方）     | 胶水组件交出真实 DOM，社区版即可用                                         | 有         |
| CodeMirror 6（代码编辑）               | @uiw/react-codemirror        | vue-codemirror           | EditorView 挂到容器 DOM，语言 / 主题按需装配                               | 有         |
| Quill（富文本）                        | react-quill 系（社区维护）   | @vueup/vue-quill         | new Quill(el)，注意主题 CSS 引入                                           | 有         |
| Handsontable（电子表格）               | @handsontable/react-wrapper  | @handsontable/vue3       | 容器 DOM 交出，销毁时 destroy()                                            | —          |
| Monaco Editor（代码编辑）              | @monaco-editor/react         | 社区封装                 | create(el)；worker 打包需额外配置                                          | —          |
| Chart.js / Plotly / ApexCharts（图表） | react-chartjs-2 等           | vue-chartjs 等           | 挂到 vChart 宿主或直接 canvas 容器                                         | —          |
| D3.js（数据可视化）                    | 自写封装（useRef/useEffect） | 自写封装（ref/watch）    | 直接操作挂载后的 DOM / SVG                                                 | —          |
| Leaflet / MapLibre GL（地图）          | react-leaflet                | @vue-leaflet/vue-leaflet | 实例挂容器；resize 用 bindWindowEvent 监听                                 | —          |
| FullCalendar（日历调度）               | @fullcalendar/react          | @fullcalendar/vue3       | new Calendar(el, plugins)                                                  | —          |
| KaTeX / MathJax（数学公式）            | 社区封装                     | 社区封装                 | 渲染结果塞入文本节点                                                       | —          |
| highlight.js / Shiki（代码高亮）       | 自写封装                     | 指令 / 自写封装          | 配合 vCode / vCodeBlock 使用                                               | —          |
| SortableJS（拖拽排序）                 | react-sortablejs             | vuedraggable             | Sortable.create(el)                                                        | —          |
| GSAP / anime.js（动效动画）            | @gsap/react（useGSAP）       | 无官方封装，watch 手接   | 配合 vTransition；注意 reduced-motion                                      | —          |
| Video.js / Plyr（视频播放）            | 自写封装                     | 自写封装                 | 实例挂 DOM，销毁时 dispose()                                               | —          |
| PDF.js（PDF 预览）                     | react-pdf                    | vue-pdf-embed            | 渲染到 canvas 节点                                                         | —          |

「示例站演示：有」的五项（ECharts、Three.js、AG Grid、CodeMirror、Quill）在
`src/examples/` 有可运行源码，可作为接入新库的参考模板。表中未列出的库同理可接，
不设白名单——React / Vue 侧则每个库都要各自找一套封装。

> **来源说明**：本节的分析框架基于 DOM 可操作性，表格与结论由 AI 辅助整理
> （截至 2026-09）。React / Vue 生态的封装包名与版本以各自官方文档为准，
> yoya-ui 列以本仓库源码与 `package.json` exports 为准。
