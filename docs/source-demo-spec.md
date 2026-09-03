# 源码演示规则（Source Demo Spec）

「源码演示」指 `src/examples/` 中，核心组件代码通过 `ComponentSource` 源码面板直接展示的演示形态（以 `access-control` 演示为范例）。本文是编写此类演示的规则：让「演示界面」与「展示的源码」都尽量小、内聚、自解释。

## 1. 单文件内聚，只演示核心

- 一个演示 = `src/examples/demos/<name>.js` 导出一个组件。
- 核心逻辑收敛成**一个自包含模块**：不拆多余 helper、不写页面壳、不做切换 / 重建。
- 示例（权限控制）：模块顶部一次 `installAccess(createAccess({...}))`，组件里只放「有权限 / 只读 / 无权限」几个控件，让源码自解释。

## 2. 初始化与使用分离

- 初始化只做**一次**：
  - SPA：模块顶部 `installAccess(createAccess({ permissions, roles }))`；
  - SSR：由入口 `options.access` 注入（`renderToString(page, { access })`）。
- 演示体只用产物：`node.access('system:member')` 一行声明。
- 禁止：在 `rebuild` / 切换逻辑里反复初始化、手动调用 `renderDom()`。

## 3. 源码面板自洽（ComponentSource）

- 复用 `src/examples/component-source.js` 的 `ComponentSource({ component, sourceComponent, imports, title })` 生成源码，不维护重复源码字符串、不重新实现源码面板。
- `imports` **只列该函数内直接 import 的符号**；通过快捷方法使用的（`row.vButton`、`row.vSelect`、`card.vCardHeader` 等）**不列入**。
- 被展示的源码要**独立可读**：演示需要的内联配置（如角色权限表）放进组件内部，不依赖源码面板看不到的模块级外援。必要时把辅助常量内联进组件。

## 4. 页面壳分离

- Card、说明文字、演示容器、初始化代码面板（SPA / SSR 两段）都属于 `xxx-docs.js` 的页面壳，**不进 demo 文件、不出现源码面板**。
- demo 文件只包含「内容 + 行为」本身。

## 5. 声明式 + 可读性（有自动检查）

- 单行 ≤ 100 字符（`max-len` 检查）。
- 点式链调用一行 ≤ 3 个；超过按组件边界 / 语义换行。
- 同一节点多个静态属性优先 `node.attr({ ... })`；动态 / 条件值继续用逐项 `attr()`。
- `.on()` 回调逻辑较大或接近 100 字符时，`.on()` 前换行，回调内容独立成行。
- 链式只合并简单、同层级的设置；不把嵌套 setup、条件分支或长参数塞进同一条链。
- `src/examples/demos/` 已在 `.prettierignore`，换行不被 Prettier 自动合并；`demo-readability.test.js` + `npm test` 会拦截违规链。

## 6. 确定性 / SSR 安全

- 不读 `document` / `window`，不用 `Date.now()` / `Math.random()` 影响输出。
- 渲染只依赖请求输入（权限 = 一次性注入的上下文），同一输入输出稳定，`toHTML` / `renderDom` 行为一致。

## 7. 测试伴随

- `src/examples/demos/<name>.test.js` 用 `render().renderDom()` 断言演示行为（隐藏 / 禁用 / 可编辑等）。
- 随 `npm test` 一起运行（含 demo-readability 链检查）。

## 8. 注册三步（docs 页接线）

1. **docs 页**：创建 `src/examples/<name>-docs.js`，导出 `<Name>DocumentationPage`，内含：
   - `demoDefinitions = Object.freeze([...])`，字段 `{ id, title, description, component, sourceComponent, imports, sourceTitle }`；
   - 页面壳 `section((page) => ...)`（header / 何时使用 / 常用 API / 初始化面板 / 代码演示）；
   - `demoDefinitions.forEach((demo) => examples.child(DemoSection(demo)))`，每个 demo 渲染 live 实例 + `ComponentSource` 源码面板。
2. **路由注册**：在 `src/examples/index.router.js`：
   - 侧栏菜单项（如 guides 的 `{ key: 'access-control', ... }`）；
   - `docsRouteLoaders` 增加 `'guides:xxx': () => import('./xxx-docs.js').then((m) => m.XxxDocumentationPage())`；
   - 概览卡（指南类）按需补充。
3. **测试同步**：路由测试里对数量/菜单的断言（如 `[data-overview-guide]` 数量）同步更新。

## 9. 命名

- 演示组件 PascalCase：`AccessControlMembers`。
- 演示集内、独立可展示的核心组件可用 `XxxExample1`；带壳包装（可选）用 `XxxDemo`。
- docs 文件 `<name>-docs.js` 导出 `<Name>DocumentationPage`。
- 一个组件 / 演示集最多保留一个完整参数对象案例，其余声明式。

## 参考文件

- 演示：`src/examples/demos/access-control.js`
- 测试：`src/examples/demos/access-control.test.js`
- docs 页：`src/examples/access-control-docs.js`
- 源码面板：`src/examples/component-source.js`
- 接入点：`src/examples/index.router.js`

## 编写前 Checklist

- [ ] demo 放对目录（`demos/<name>.js`），形态 B 为主
- [ ] 单文件内聚、只演示核心、界面壳分离
- [ ] 初始化一次、使用与初始化分离、不手动 `renderDom()`
- [ ] `ComponentSource` + imports 只列直接导入的符号
- [ ] 声明式、链 ≤3 点、单行 ≤100、`npm test`（含 demo-readability）通过
- [ ] `demos/<name>.test.js` 断言演示行为
- [ ] docs 页注册三步（侧栏 / routeLoaders / 概览卡）与路由测试同步
