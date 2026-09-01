# 组件使用说明

所有组件都可用两种写法：setup callback（`vButton('保存', (btn) => ...)`）或参数对象（`vButton({ label: '保存' })`）。示例以声明式为主。

## 按钮与操作

### vButton

复合按钮。`variant`：primary/secondary/danger；支持 `disabled()`、`loading()`。

```js
vButton('保存', (btn) => {
  btn.variant('primary').size('medium').disabled(false);
  btn.on('click', () => console.log('saved'));
});
```

### vButtons

按钮组：`selectable()` 单选、`joined()` 合并圆角、`options()` 配置项、`value()` 读写选中值。

```js
vButtons({ options: ['dev', 'prod'], value: 'dev', selectable: true })
  .on('change', (e) => console.log(e.detail));
```

### vFloatButton

悬浮按钮：`fixed()` 固定定位、`position()` 四角、`icon()`/`label()`。

```js
vFloatButton({ icon: '+', label: '新建', position: 'bottom-right' });
```

### vSymbolButton

仅图标的符号按钮（无边框轮廓）：`icon()`、`ariaLabel()`，常用于图标演示页的源码/复制按钮。

```js
vSymbolButton({ icon: '⧉', ariaLabel: '复制' });
```

### vDropdownMenu

下拉菜单：`trigger(content)`、`menuContent(list)`、`placement()`，`open()/close()/toggle()`。

```js
vDropdownMenu((menu) => {
  menu.trigger('更多').menuContent(['编辑', '删除']).placement('bottom-end');
});
```

### vContextMenu

右键菜单：`target(selector)` 指定触发区域、`menuContent(list)`、`openAt(x, y)` 主动弹出。

### vGlowButton

发光按钮（effects）：`glow()` 开关、`speed()/direction()/strength()/motion()`、`ripple()`。

```js
vGlowButton({ glow: true, strength: 0.6 }).text('发光按钮');
```

## 导航

### vNavbar

顶栏：`title()/subtitle()/brand()`、`sticky()`、`menuContent()` 菜单区、`actions()` 右侧操作。

```js
vNavbar((bar) => {
  bar.title('控制台').sticky(true);
  bar.actions((box) => box.vButton('退出'));
});
```

### vMenu / vMenuItem / vMenuGroup / vSubMenu

菜单：`orientation()` 横/竖、`child()` 组合菜单项；菜单项 `icon()/label()/shortcut()/active()/danger()/disabled()`；`vSubMenu` 支持子菜单 `trigger()/menuContent()/inline()`。

```js
vMenu((menu) => {
  menu.vMenuItem({ label: '首页', icon: '⌂', active: true });
  menu.vSubMenu((sub) => {
    sub.trigger('设置').vMenuItem('账号');
  });
});
```

### vSidebar

侧边栏（menu 族）：`collapsed()` 折叠、`responsive()` 响应式、`visit(path)` 导航。

### vTabs / vTab

标签页：`vTab` 设 `key()/label()/icon()/disabled()`；容器 `activeIndex()/value()` 读写、`change()/onChange()` 回调、`orientation()/variant()/size()`。

```js
vTabs((tabs) => {
  tabs.vTab({ key: 'a', label: '概览' });
  tabs.vTab({ key: 'b', label: '明细' });
});
```

### vSteps / vStep

步骤条：容器 `current()/status()/direction()/size()/items()`、`next()/prev()`；`vStep` 设 `title()/description()/icon()`。

```js
vSteps({ current: 1 }, (steps) => {
  steps.vStep('填写信息');
  steps.vStep('确认提交');
});
```

### vBreadcrumb / vBreadcrumbItem

面包屑：`separator()` 分隔符、`items()` 配置；`vBreadcrumbItem` 设 `label()/href()/current()`。

```js
vBreadcrumb((crumb) => {
  crumb.vBreadcrumbItem({ label: '首页', href: '/' });
  crumb.vBreadcrumbItem({ label: '当前页', current: true });
});
```

### vAnchor / vAnchorItem

锚点导航：`target()` 监听滚动容器、`items()`/`child()`、`active()` 高亮当前；`vAnchorItem` 设 `title()/href()/nested()`。

## 反馈

### vMessage / toast

消息提示。命令式：`toast.success('已保存')`、`toast.error(msg)`、`toast.warning`、`toast.info`；容器组件 `placement()/closable()/countdown()`。

```js
import { toast } from '@yoyaflow/yoya-ui';
toast.success('操作成功');
```

### vDialog

弹窗：`content()` 内容、`open()/close()`；使用原生 `dialog` 元素，支持 `open` 属性控制。

```js
const dialog = vDialog((d) => d.content('确认删除？'));
dialog.open();
```

### vTooltip

提示气泡：`target(content)`、`content(text)`、`placement()`、`trigger('hover'|'click'|'focus')`、`open()/close()`。

```js
vTooltip((tip) => {
  tip.target(vButton('悬停我')).content('这是提示').placement('top');
});
```

## 表单

`vForm`/`vFormItem` 的收集与校验见 references/forms.md。下面是各控件要点（通用 `value()/disabled()/name()/required()` 不再重复）。

### vInput

文本输入：`type()/placeholder()/clearable()/error()`、`clear()`。

```js
vInput({ name: 'name', placeholder: '输入名称', value: 'api-gateway' });
```

### vTextarea

多行文本：`rows()/resize`，其余同 vInput。

### vSelect

下拉选择：`options([...])` 支持字符串、`[value, label]`、对象；`value()/disabled()`。

```js
vSelect({ options: ['dev', 'prod'], value: 'dev' });
```

### vCheckbox / vCheckboxes

单选框/复选框组：`label()/checked()/optionValue()`；组 `options()/checkedValues()/multiple()`。

### vSwitch

开关：`label()/checked()`，布尔值。

### vRadio / vRadios

单选：`label()/checked()/optionValue()`；组 `options()/checkedValue()`。

### vTimer / vTimerRange

日期时间：`mode('date'|'datetime-local'|'time')`；范围 `start()/end()`、结束早于开始自动报错。

### vField

字段显示/编辑切换：`display()/view()/edit()`、`value()`；`mode('display'|'edit')` 切换，适合详情页就地编辑。

### vRate

评分：`count()/allowHalf()/allowClear()/character()/size()`。

### vSlider

滑动条：`min()/max()/step()/showValue()/vertical()`（竖向）。

```js
vSlider({ min: 0, max: 100, step: 5, value: 60, vertical: true });
```

### vCascader

级联选择：`options({label, value, children}[])`、`value()` 返回路径数组、`placeholder()`、`open()/close()`。

```js
vCascader({ options: [{ label: '浙江', value: 'zj', children: [{ label: '杭州', value: 'hz' }] }] });
```

### vTagsInput

标签输入：`value()` 标签数组；回车/逗号添加、退格/× 移除。

```js
vTagsInput({ value: ['vue', 'react'] });
```

### vAutocomplete

自动完成：`source(list | fn)`、`limit()`；输入过滤、键盘/鼠标选择。

```js
vAutocomplete({ source: ['Vue', 'React'], placeholder: '搜索技术栈' });
```

### vColorPicker

颜色选择器：`value()/alpha()/rgba()/palette()/clearValue()`，自定义弹窗 + 透明度调节。

### vUpload / vAvatarUpload

文件上传：`accept()/multiple()/dropZone()`、`files()/items()/addFiles()/remove()/clear()`、`status()/progress()`；头像上传 `shape()/size()`。

## 数据展示

### vCard / vCardHeader / vCardBody / vCardFooter

卡片容器：插槽用 `card.vCardHeader('标题')`、`card.vCardBody(...)`、`card.vCardFooter(...)`。

```js
vCard((card) => {
  card.vCardHeader('标题');
  card.vCardBody((body) => body.p('内容'));
});
```

### vAvatar

头像：`text()/icon()/src()/size()/shape()/color()/status()`。

### vBadge

徽标：`count()/overflowCount()/showZero()/dot()/status()/color()`，可包内容。

```js
vBadge({ count: 5, status: 'success', text: '消息' });
```

### vDetail / vDetailItem

详情列表：`columns()/items()`；`vDetailItem(label, value)` 成对展示。

```js
vDetail((detail) => {
  detail.vDetailItem('服务名', 'api-gateway');
  detail.vDetailItem('状态', '运行中');
});
```

### vCode

代码块：`content()/language()/copyable()`，内置复制按钮。

### vTable / vThead / vTbody / vTr / vTh / vTd

表格：声明式 `<thead>/<tbody>/<tr>/<th>/<td>` 结构或 `columns()/rows()` 数据模式，`emptyText()` 空态。

```js
vTable({ columns: ['名称', '状态'], rows: [['api-gateway', '运行中']] });
```

### vTree

树形控件：`vTreeNode({ label, children, expanded, selected })` 组合；节点 `id()/label()/icon()/actions()/checked()/disabled()`。

### vProgress

进度条：`value()/max()/percent()/showText()/format()/status()/size()/strokeColor()/indeterminate()`。

### vCarousel

走马灯：`items()/renderItem()`、`active()/goTo()/next()/prev()`、`loop()/autoplay()/arrows()/dots()`。

### vScroll

滚动加载：`items()/renderItem()/append()`、`loadMore()/onLoadMore()`、`virtual()/itemHeight()/overscan()` 虚拟列表、`loading()/end()` 状态。

### vTimeline / vTimelineItem

时间线：`vTimelineItem({ title, time, content, status })`。

### vPagination

分页：`VPagination` 组件形态；`current()/total()/pageSize()` 等分页状态 API。

### 看板类组件

- `vDigitalBoard`：数字看板（label/value/unit/trend/icon）
- `vTrendCard`：趋势卡（title/value/delta/up/data）
- `vRingStat`：环形统计（percent/value/label/size/strokeWidth/tone）
- `vSparkline`：迷你趋势线（data/fill/strokeWidth/tone）
- `vGauge`：仪表盘（value/max/unit/tone）

### vChart（第三方图表）

图表容器：`adapter()`（ECharts 等）、`data()/options()`、`resize()`；ECharts 版本用 `vEchart`，需先以 `<script>` 引入 `echarts.min.js` 再传 `echartsLib`。

## C 端体验

### vSkeleton

加载占位（骨架屏）：`variant('paragraph'|'avatar'|'block')`、`rows()`、`barHeight()`（文字行盒高度）、`gap()`（行间距）、`avatarSize()`、`motion('auto'|'always')`。`active(false)` 移除占位并展示真实内容，切换前用 `barHeight`+`gap` 对齐内容行高可避免跳动。

```js
vSkeleton({ rows: 3, barHeight: 20, gap: 8 }, (skeleton) => {
  // 数据到达后：skeleton.active(false) 并挂载真实内容
});
```

### vLazyImage

图片懒加载：进入视口才加载，原生 `loading="lazy"` 兜底；`src()/alt()`、`defer()` 开启 IntersectionObserver 延迟、`state()`（loading/loaded/error）、`retry()` 失败重试。

```js
vLazyImage({ src: '/cover.png', alt: '封面', defer: true });
```

### vTransition

通用进出场过渡：`show()/enter()/leave()/toggle()`，`duration()` 控制时长。`motion('auto')` 走 CSS 动画并跟随系统“减少动态效果”；`motion('always')` 改用 Web Animations API 强制播放，不受系统设置影响。

```js
vTransition({ motion: 'always' }, (transition) => {
  transition.child('内容');
  transition.toggle();
});
```

### vMasonry

瀑布流布局（CSS 多列）：`columns()`/`gap()` 固定列数与间距，`minColumnWidth()` 让列数随容器宽度自适应；子项按顺序落入各列，常用固定高度容器 + `overflow: auto` 实现滚动查看更多。

```js
vMasonry({ columns: 3, gap: 16 }, (masonry) => {
  masonry.div('卡片 1');
  masonry.div('卡片 2');
});
```

### vImagePreview

图片预览灯箱：`src()` 大图、`thumb()` 缩略图、`alt()`；点击缩略图打开，`open()/close()/toggle()`、`zoom()`/`resetZoom()` 缩放与平移，ESC 关闭；大图复用 vLazyImage 的加载/失败态。

```js
vImagePreview({ src: '/big.png', thumb: '/small.png', alt: '示例' });
```

### vCarousel 触摸滑动

vCarousel 内置水平拖动/触摸滑动切换（垂直滚动不拦截，滑动期间自动播放暂停），无需额外配置；`loop()`/`autoplay()`/`arrows()`/`dots()` 见上文数据展示。

## 布局

- `vstack({ gap })`：纵向 flex；`hstack` 横向；`vRow/vCol` 栅格；`vContainer` 定宽容器
- `vBody({ maxWidth })`：页面壳（消费主题 token），`bindTo('#app')`
- `vThemeShell`：区域级主题容器，`background()/backgroundOpacity()/radius()/border()/borderColor()/scrollable()`
- `vSplitPanel`：分隔面板，`direction('horizontal'|'vertical')/size()/minSize()/reset()`，`first()/second()` 两个面板
- `spacer()`：flex 占位；`divider()`：分割线

```js
div((page) => {
  page.hstack({ gap: '12px' }, (row) => {
    row.span('左');
    row.spacer();
    row.span('右');
  });
});
```

## 路由与异步

### vRouter / vRouterViews / vRoute / vLink

内置路由：`vRouter` 创建路由实例，`vRoute(path, view)` 注册，`vRouterViews` 出口，`vLink` 链接；`router.start()` 接管 hash/history。

```js
const router = vRouter((r) => {
  r.route('/home', vCard('首页'));
  r.route('/about', vCard('关于'));
});
div((page) => page.child(router));
router.start();
```

### vDynamicLoader

异步加载占位：传入异步组件工厂，加载中/失败可自定义；常用于按需加载大模块。
