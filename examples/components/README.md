# Components 复合组件示例

这个目录演示当前复合组件：

- `vButton`
- `vCard` / `vCardHeader` / `vCardBody` / `vCardFooter`
- `vMenu` / `vMenuItem`
- `vMenuGroup` / `vMenuDivider`
- `vSubMenu`
- `vSidebar`
- `vBody` / `responsiveGrid`
- `vLink` / `vRouterView`
- `vRouter` / `vRoute`
- `vDynamicLoader`
- `CodeBlock` / `codeBlock`
- `vDropdownMenu` / `vContextMenu`
- `vMessageContainer`
- `toast`
- `vDetail` / `vDetailItem`
- `vCode`
- `vTable`
- `vInput`
- `vTextarea`
- `vSelect`
- `vCheckbox` / `vSwitch` / `vCheckboxes`
- `vField` / `vForm`
- `vTimer`
- `vTimerRange`

运行方式：

```bash
npm run examples:components
```

然后打开 Vite 输出的地址，访问 `/examples/components/index.html`。

## 函数组件约定

可复用组件和每个演示源码统一返回带 `render()` 的对象；`render()` 返回真正的 `ViewNode`。

```js
import { div, p } from 'yoya-ui';

function UserCard({ name }) {
  return {
    render() {
      return div((card) => {
        card.className('user-card');
        card.h2(name);
        card.child(p('可复用内容'));
      });
    }
  };
}

const page = div((root) => {
  root.child(UserCard({ name: 'Ada Lovelace' }));
});
```

`child` 接收到组件对象后会在首次 `commit()` 或 `toHTML()` 时调用并缓存 `render()` 的结果。组件可以在对象上继续公开命令；演示源码不得直接返回 `ViewNode` 或裸 Factory。已有的 `vButton(...)` 等底层快捷工厂仍然在 `render()` 内正常使用。

长菜单使用 `vMenuGroup` 提供可访问的分组标题，并用 `vMenuDivider` 分隔命令区域：

```js
menu.vMenuGroup((group) => {
  group.label('常用操作');
  group.vMenuItem('刷新');
  group.vMenuItem({ disabled: true, text: '删除' });
});
menu.vMenuDivider();
menu.vMenuGroup((group) => {
  group.label('其他操作');
  group.vMenuItem('退出');
});
```

纵向菜单使用 `ArrowUp` / `ArrowDown`，横向菜单使用 `ArrowLeft` / `ArrowRight`；`Home` / `End` 跳到首尾。导航会循环并自动跳过分组标题、分隔线和禁用项。

嵌套命令使用 `vSubMenu`。点击触发器，或聚焦后按 `ArrowRight`、`Enter`、空格可展开并进入子菜单；按 `ArrowLeft` 或 `Escape` 收起并返回上一级。点击外部区域或选择可用的叶子命令也会关闭子菜单，禁用的子菜单不会展开。

后台导航使用 `vSidebar` 组合现有的 `vMenuGroup`、`vMenuItem` 和 `vSubMenu`。通过 `title()` 设置标题、`menuContent()` 填充导航，`collapsed()` / `toggle()` 控制折叠；菜单继续支持方向键、`Home` / `End` 和当前项的 `aria-current`。调用 `responsive('(max-width: 768px)')` 后，侧栏会跟随媒体查询折叠，并在销毁时释放监听器。

日期和时间输入使用 `vTimer`，通过 `mode` 选择 `date`、`datetime-local` 或 `time`：

```js
function ScheduleTimerField() {
  return {
    render() {
      return vTimer({
        mode: 'datetime-local',
        name: 'scheduledAt',
        required: true,
        value: '2026-08-19T14:30'
      });
    }
  };
}

page.child(ScheduleTimerField());
```

日期范围使用 `vTimerRange`。它接受对象或二元数组，`value()` 始终返回统一对象；结束值早于开始值时会显示错误并设置 `aria-invalid`：

```js
function MaintenanceRangeField() {
  return {
    render() {
      return vTimerRange({
        mode: 'date',
        name: 'maintenance',
        value: { start: '2026-08-19', end: '2026-08-21' }
      }).on('change', (event) => {
        console.log(event.detail); // { start, end }
      });
    }
  };
}
```

组件需要公开命令时，把方法与 `render()` 放在同一个返回对象上；调用方继续持有该对象并调用公开方法。

## 演示源码组件

新增演示时使用 `ComponentSource` 展示实际组件函数源码，不要维护重复的源码字符串：

```js
import { ComponentSource } from './component-source.js';

example.child(DeploymentTaskCard({ locale, toast }));
example.child(
  ComponentSource({
    component: DeploymentTaskCard,
    imports: ['vCard', 'vText'],
    title: '部署任务核心源码'
  })
);
```

`ComponentSource` 遵循标准对象组件模式，内部通过 `componentSource()` 调用 `Function.toString()`，并负责补充 import/export、清理 Vite 测试标识和统一源码缩进。

## 演示分类文件

页面壳层只负责遍历分类和组合组件，具体演示按大类维护：

- `demos/actions-feedback.js`：操作、审计、语言切换与反馈。
- `demos/navigation.js`：命令菜单、下拉菜单、上下文菜单与后台侧栏。
- `demos/routing.js`：路由链接、活动状态、参数 query 与路由视图。
- `demos/async-dynamic.js`：异步模块状态、失败重试与缓存。
- `demos/layout-page.js`：页面容器、内容宽度与响应式网格。
- `demos/data-display.js`：详情、代码片段与表格。
- `demos/forms-datetime.js`：表单、字段模式、`vTimer` 与 `vTimerRange`。

新增演示时，把标准对象组件和分类描述放入所属文件，并让页面通过 `child(component(options))` 与 `ComponentSource` 组合它们。
