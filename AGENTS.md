# Project Agent Instructions

## Codebase Knowledge Graph

This project uses codebase-memory-mcp to maintain a knowledge graph of the codebase.
Always prefer MCP graph tools over grep, glob, or file search for code discovery:

1. `search_graph` for functions, classes, routes, and variables.
2. `trace_path` for callers, callees, and data flow.
3. `get_code_snippet` for specific functions or classes.
4. `query_graph` for complex graph queries.
5. `get_architecture` for project-level structure.

Fall back to text search for string literals, configuration, non-code files, or when the graph is stale or insufficient.

## Local Work Tickets

Local tickets are the source of truth for pending tracer-bullet work. They live under
`.scratch/<feature-slug>/issues/*.md` (one ticket per file); `.scratch/` is intentionally
git-ignored. When the user asks about “工作票” or remaining tasks, inspect the newest ticket
set by directory modification time before answering. The current active set is
`.scratch/post-0.6-followups/issues/`.

## 编译路径的定位（准则，优先级最高）

编译路径的存在意义是**打榜与曝光**：让更多人在基准与对比里看见 yoya-ui。它不是主战场，
也不该改变主路径的形态。由此推出四条硬约束，任何改动都按它们验收：

1. **运行期优先**：所有 API 以"不跑编译器时的使用方式"为准；编译路径只能**消费**运行期语义，
   不能反过来定义 API、约束写法，或要求用户为了编而改代码。
2. **不为编译牺牲运行期**：运行期指标（体积 / 内存 / 首屏 / 构建）已经够用，**不接受**为了编译产物
   更好而让运行期变复杂、变大或变慢。运行期侧的新增字段 / 钩子 / 契约，必须先回答
   "不跑编译器的人为什么需要它"。
3. **编译不得引入运行期错误或复杂度**：编译产物与通用路径必须**逐字节等价**；认不出就整体回落，
   绝不产出半成品；编译产物里不允许出现"只有编译路径才成立"的运行时行为。
4. **编译器只懂形状、不懂组件**：不允许出现针对某个组件名的分支或清单。允许的"库内知识"只有三张
   接口表——元素白名单（由 core 工厂推导）、库内纯值 / 助手（按导入来源识别）、内容助手（同）；
   其它一律靠形状规则读，读不出就回落。表变大必须显式说明"为什么这是接口，不是组件"。

反过来，**性能与体积的取舍只作用在编译侧**（编译器自身、`compiler-runtime` 子入口、生成的模块）——
它们不进主入口的下载路径，可以放心为打榜服务。

## Component Definition Patterns

组件定义支持多种形态，按场景选用；新组件应从下列三种形态中选择，避免在模板之外另起结构。

### A. 薄工厂：函数直接返回 ViewNode

适用：无内部状态、纯配置化组合，代码量最小。**确定没有额外行为要定义时就用它**——包括演示代码：只演示结构与交互、不需要对外命令方法时，函数直接返回 ViewNode，不要为了跟对象组件统一而白包一层 `render()`。

```js
function ServiceTag(options) {
  return vBadge(options);
}
```

### B. 对象组件：返回 { render(), ... }

适用：常规独立组件（默认形态）。render() 返回 ViewNode（包括 vCard(...) 这类复合节点），状态保存在闭包或返回对象上，可暴露命令/状态方法。

```js
function RateCard() {
  const state = { value: 0 };
  return {
    render() {
      return vRate((rate) => {
        rate.value(state.value);
      });
    },
    value(next) {
      state.value = next;
      return this;
    }
  };
}
```

### C. 类节点组件：class VXxx extends HtmlElementNode

适用：VTable↔VTr 这类父子嵌套关系、需要操作子实例或重写节点生命周期（renderDom/destroy/child）的细粒度场景；必须同时导出成对 vXxx 工厂，并在分类 index.js 通过 registerChildFactories 注册进嵌套 DSL。

```js
export class VTr extends HtmlElementNode {
  // 嵌套关系与细粒度操作
}
export function vTr(first = null, second = null, third = null) {
  return createComponentFactory(VTr, first, second, third);
}
```

- 组件名 PascalCase 并描述 UI 单元，例如 ServiceTableCard、VButton；形态 C 使用 VXxx 类 + vXxx 工厂、yoya-vxxx CSS 类。
- CustomNode 统一基类为未实现特性（planned），暂不提供；当前形态 C 使用 HtmlElementNode / ViewNode / SvgElementNode 作为基类，业务用户可在业务代码中用形态 C 自定义类组件。
- 库内参考实现：
  - 形态 A：layout 的 flex/stack/grid/container/spacer/divider、vDynamicLoader；
  - 形态 B：VPagination（render() + update/change 等状态 API）；
  - 形态 C：VButton/VCard/VTable/VTr/VTabs 等组件库主体。
- child(...) 接受 ViewNode、组件对象（自动包装为 ComponentNode 并缓存其 render() 结果）或字符串/数字；三种形态均可作为子节点传入页面组合。
- 形态 B 的快捷写法：`vNode((api) => 视图)` 定义即得到组件节点（ComponentNode），命令方法收到 api 上后由工厂挂到节点、重名报错；旧三形态与 child() 的对象形式不变。
- 低层元素与 v* 工厂在 render() 内继续有效；本规则约束可复用组件边界。
- 组件身份：视图根写 `vn: 'VCard'`（值 = 导出名），模块底一行 `defineComponentIdentity(VCard, 'VCard')`；
  `member instanceof VCard` 对形态 A / B / vNode 是同一条判定（元素节点读自己、组件节点展开到视图根），
  详见 `docs/component-authoring.md` §7.3。
- **新增组件一律形态 B**（`vNode(setup)` / `{ render() }`）；形态 C（class 继承节点）停止新增，存量迁移见票 43。
- **setup 参数数量不定、按出现顺序分派**：函数 = 构建回调、字符串/数字 = 文本、节点/句柄 = 子节点、
  数组 = 子节点列表、对象 = options、同类实例 = 复用；`Factory(options, setup)` 与变参都合法。
- **options 里子工厂不参与分派**：与子工厂同名的键按**属性**写（`div({ slot: 't-head' })` 是属性，
  不是创建 `<slot>` 子元素）；组件自有方法照旧调用（`vDialog({ title })` 是 props）；`attrs` / `style`
  是显式通道。键分类的唯一真源是 `src/core/setup-keys.js`。
- **内容与槽位**：未标记的 `child(...)` 进组件根元素内部（普通元素语义）；带 `slot` 标记的内容按
  **就近作用域**进直接父组件的同名槽位，一个槽一份内容，找不到槽位不 mount；多根组件不接受未标记内容。
- **组件级钩子**：`whenMount` / `whenDestroy`（与 `whenFailed` 同族的协议成员，属性持函数，写在 vNode
  的 api 或形态 B 返回对象上）；写在 options 对象里会报错，不要与 `onXxx` 事件简写混用。

### Demo 演示组件

- 演示代码（examples/demos）同样按形态判：**没有额外操作（无对外命令方法、无需持有组件句柄）时用形态 A 直接返回 ViewNode，不包 `render()`**；确有状态或命令方法才用形态 B 展示操作空间，确需演示形态 C 时允许直接书写对应形态。
- 演示源码面板复用 ComponentSource（src/examples/component-source.js），不维护重复源码字符串或重新实现源码面板。
- 演示组件与页面壳分离：演示组件只包含 vCardBody 内容与操作方法（如 increment()/reset()/setValue()），Card、按钮和说明文字属于页面壳（live demo），不放进演示组件，也不出现在源码面板中。
- 源码面板展示核心组件时，imports 只列核心组件实际使用的符号；页面壳（Card/按钮）用到的符号不列入。
- 「源码演示」细则（单文件内聚 / 初始化与使用分离 / 源码面板自洽 / 注册三步等）见上文「Demo Code Readability Rule」与演示示例约定。

## Declarative-First Component Rule

组件定义和演示代码优先使用声明式写法：

```js
function ServiceDetailCard() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('服务详情');
        card.vCardBody((body) => {
          body.vDetail((detail) => {
            detail.vDetailItem('服务名称', 'api-gateway');
            detail.vDetailItem('状态', '运行中');
          });
        });
      });
    }
  };
}
```

- 定义组件时优先使用 setup callback、父节点快捷方法和链式方法组合结构。
- 演示代码同样以声明式写法为主，参数对象只作为 API 说明保留。
- 每个组件或演示集最多保留一个完整的参数对象案例，其余示例使用声明式写法。

## Setup 回调节点命名规则

setup 回调参数是节点（ViewNode / 组件），命名按职责语义化，避免与闭包外层业务数据同名，防止变量遮蔽：

- 回调参数使用能说明“这是哪个节点”的名字，例如 `vFormItem` 用 `itemOfLabel` / `labelField`，`vForm` 用 `form`，`vCardBody` 用 `body`；不要一律叫 `item` / `node`。
- 当业务数据变量与节点常用名相同（如字典值 `item`）时，节点参数必须改名区分，禁止同名遮蔽：

```js
// 反例：item 被 vFormItem 回调参数遮蔽，item?.label 取到的是节点方法
form.vFormItem((item) => {
  item.control((editor) => editor.vInput({ name: 'label', value: item?.label ?? '' }));
});

// 正例：节点参数语义化命名，业务数据 item 保持可访问
form.vFormItem((itemOfLabel) => {
  itemOfLabel.control((editor) => editor.vInput({ name: 'label', value: item?.label ?? '' }));
});
```

- 节点方法与业务字段同名（label / value / status …）时尤其小心：漏掉 `()` 会得到函数对象，可能被宽松地转成源码文本。
- 建议开启 ESLint `no-shadow` 兜底。

## Demo Code Readability Rule

- 演示代码要在代码量、总行数和单行长度之间取平衡，优先使用链式调用减少中间变量。
- 一行内的点式链式调用不超过 3 个（`node.attr(...).attr(...)` 算 2 个点式调用）；超过时按组件边界或语义换行。
- 单行代码长度不超过 100 个字符，与 Prettier `printWidth: 100` 一致；由 ESLint `max-len` 检查。
- 单个演示函数建议控制在 60 行以内，但不作为编译检查；超过时优先拆成更小演示。
- 链式调用只合并简单、同层级的设置，不把嵌套 setup、条件分支或长参数塞进同一条链。
- `.on()` 等带回调内容的方法，回调逻辑较大或单行接近 100 字符时，在 `.on()` 前换行，回调内容独立成行。
- 同一节点需要设置多个属性时，优先合并为 `node.attr({ ... })` 对象写法；动态属性、条件赋值或运行时计算值可以继续使用 `attr()`。
- `src/examples/demos/` 已加入 `.prettierignore`，演示代码的换行格式不被 Prettier 自动合并。
- i18n 演示优先使用 `"默认语言内容".s("key", locale?)` 字符串快捷写法；未指定 locale 时使用默认 locale，未注册的语言内容使用默认语言内容。
- `src/examples/demos/*.js` 由 `demo-readability.test.js` 自动检查点式链数量，`npm test` 会拦截违规。
- 页面壳分层由 `demo-layering.test.js` 自动检查：演示源码禁止出现 `vCard(` / `vCardHeader(` / `vCardBody(` / `vCardFooter(`；存量文件以迁移基线放行，shell token 只减不增，清零后删除白名单条目。

## SSR 开发纪律

- 页面按 `createPage(requestState)` 工厂约定编写，服务端与客户端复用同一份工厂与初始状态；`renderToString`/`hydrate`/`mount` 见 `docs/ssr.md`。
- `render()` 与 `toHTML()` 路径保持 DOM-free 且确定性：不读 `document`/`window`，不用 `Date.now()`/`Math.random()` 影响输出。
- 组件代码（含事件回调）不允许直接操作 `document`；`renderDom()` 内创建元素是节点引擎的唯一职责，组件一律走节点 DSL。
- 需要监听文档级事件（外部点击、拖拽、Esc、滚动等）时，统一使用核心辅助 `bindDocumentEvent`，组件自身不直接 `addEventListener/removeEventListener`。
- `window` 全局监听（scroll / resize / popstate 等）同样收敛到 `bindWindowEvent`。
- 动画帧用节点方法 `bindAnimationFrame(cb)` / `bindAnimationFrameLoop(cb)`（显式归属节点，`destroy()` 自动取消；同节点只保留一条循环），不要自己存 frameId + cancelAnimationFrame。
- 浏览器 API 一律加 `typeof xxx === 'undefined'` 守卫（集中在 `bindDocumentEvent` 等核心位置）。
- 模块级可变状态（注册表、id 计数器）不跨请求共享；id 使用 `allocateId` 渲染上下文分配器。
- 服务端渲染使用每请求 i18n 实例（`createI18n`），`.s()` 快捷方式用 `withI18nStringShortcut` 作用域化。
- 服务端保持无状态：渲染后销毁组件树、输出只依赖请求输入。

## Git 分支管理

- `main` 是唯一长期分支（受保护）：日常改动不直接提交到 main，先开分支、经 PR 审查后合回；发布（release）等经明确确认的直接提交除外。
- 分支命名按 `<type>/<name>`；特性分支固定用 `feat/{feature}`，例如 `feat/demo-source-simplify`、`feat/docs-en`。修复、文档、杂务分别用 `fix/`、`docs/`、`chore/`。
- 新分支一律从最新的 `main` 切出；一个分支只做一个目标，不把无关改动堆在同一分支（例如文档英文化与演示源码调整分开）。
- 提交信息使用 Conventional Commits 风格：`feat` / `fix` / `docs` / `style` / `refactor` / `test` / `chore` / `release`，并带具体 scope 或主题。
- 分支合回 main 前需在本地通过 `npm run lint`、`npm run format:check`、`npm run typecheck`、`npm test`、`npm run build`（与 CI 检查一致）。
- 推送时使用同名远程分支并建立跟踪：`git push -u origin <branch>`；分支合回后删除本地与远程分支，切换前确保工作区干净。
