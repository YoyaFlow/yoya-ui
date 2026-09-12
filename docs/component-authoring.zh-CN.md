# 组件库开发规范（第三方开发者指南）

> 适用对象：希望基于 yoya-ui 标准开发自有组件库的团队或个人。
> 相关文档：[主题样式规范](theme.zh-CN.md)、[项目 README](../README.md)。

## 1. 定位：小核心 = 标准，组件 = 可插拔生态

yoya-ui 的核心是一个小而稳定的“组件标准”，而不是庞大运行时：

- **核心只有约 1,000 行**，提供节点生命周期（`renderDom` / `bindTo` / `destroy`）、属性快照模型、组件包装（`ComponentNode`）和状态机制，以及 HTML/SVG 元素工厂。
- **自带组件与快捷组件是标准的第一方实现**：`vButton`、`vCard`、`vTable`、`vForm` 等组件库，以及 `toast`、`vText`、布局工厂等快捷组件，都是按本规范开发的，也是最好的参考实现。
- **标准对外开放**：你可以按本规范开发自己的组件库，与内置组件在同一视图树中互操作（嵌套 `child()`、父节点快捷方法、i18n 文本等）。

## 2. 标准契约：`yoya-ui/core` 公共 API

组件开发者只需要依赖 `yoya-ui/core`（零第三方依赖、体积最小）：

| 类别       | API                                                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 节点类     | `ViewNode`、`ElementNode`、`HtmlElementNode`、`SvgElementNode`、`ComponentNode`、`TextNode`（`VTextNode`）                                     |
| 工厂与组合 | `vText`、`createElementFactory`、`registerChildFactories`、`applyElementOptions`、`normalizeChild`、`normalizeSetupArguments`、`resolveTarget` |
| 信号       | `ref`、`computed`、`batch`、`isSignal`、`SignalHandle`、`installSignals`（值位置直接传句柄）                                                   |
| 国际化     | `createI18n`、`I18nTextNode`、`i18nText`、`installI18nStringShortcut`                                                                          |

## 3. 三种组件形态

新组件应从下列三种形态中选择，避免在模板之外另起结构。

### 形态 A：薄工厂（无内部状态、纯配置化组合）

```js
import { vBadge } from 'yoya-ui/ui';

export function ServiceTag(options) {
  return vBadge(options);
}
```

### 形态 B：对象组件（常规独立组件，默认形态）

```js
import { vRate } from 'yoya-ui/ui';

export function RateCard() {
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

### 形态 C：类节点组件（父子嵌套、操作子实例或重写生命周期）

类节点组件必须同时导出成对 `vXxx` 工厂，并使用 `createElementFactory`：

```js
import { HtmlElementNode, createElementFactory } from 'yoya-ui/core';

export class VStatusDot extends HtmlElementNode {
  // 嵌套关系与细粒度操作
}

export function vStatusDot(first = null, second = null, third = null) {
  return createElementFactory('span', VStatusDot)(first, second, third);
}
```

> 注：标准工具包 `createComponentFactory` / `applyComponentArguments` / `themeValue` 目前位于库内 `src/components/shared.js`，后续将由公开入口导出；在此之前可按上述写法基于 `core` 公共 API 实现。

## 4. 命名与样式约定

- 基础 HTML 元素保持原生标签名：`button()`、`div()`、`input()`。
- 复合组件工厂统一 `v` 前缀（PascalCase）：`vButton`、`vCard`、`vStatusBadge`。
- **类名契约**（内置组件，由 `className-contract.test.js` 自动校验）：
  - 共享标记：所有组件根节点带 `yoya-component`。
  - 组件与部件类：`yoya-v<name>`（根，如 `yoya-vcard`）、`yoya-v<name>-<part>`（部件，如 `yoya-vcard-header`）、`yoya-v<name>--<modifier>`（修饰符，如 `yoya-vcarousel-arrow--prev`）。
  - 共享/工具类：`yoya-<feature>-<part>`（如 `yoya-layout`、`yoya-icon`、`yoya-control-clear`），仅用于不属于单一组件的能力。
  - 状态一律使用 kebab-case 的 `data-*` 属性（`data-variant`、`data-open`），类名不承载状态。
  - 动态类名仅允许 `yoya-v${name}-<part>` 与 `yoya-${kind}` 两种模板形态。
  - 组件预设规则必须从根类作用域书写（禁止孤儿部件选择器），保证替换根类后整棵子树与预设样式脱钩。
- 第三方组件建议使用自己的类名前缀（如 `acme-status-badge`），避免与内置样式冲突。
- 颜色、间距等样式优先使用主题变量 `var(--yoya-<token>, fallback)`，主题根为 `:root, [data-yoya-theme]`（见 `yoya.ui.css`）。

## 4.1 样式定制与主题

- 组件预设样式必须从根类作用域书写（`.yoya-v<name> ...`），并让用户可以通过 `replaceClassName('yoya-v<name>', 'my-class')` 剥离预设、用自定义 CSS 接管。
- 实例级定制应通过组件 API 或行内 `styles()` 提供；全局定制通过覆盖 `--yoya-*` token 或多个维度开关实现。
- 库组件自身运行在 `@layer yoya` 内且基础规则低特异度，用户规则天然优先；第三方组件建议遵循相同约定。
- 主题变量体系、换肤维度、明暗/密度模式与定制阶梯详见 [主题样式规范](theme.zh-CN.md)。

## 5. 文本与 i18n 契约

组件的文案输入应统一兼容以下四种写法（由 `vText` / `child()` 自动归一）：

- 原始字符串：`vButton('保存')`
- `VTextNode`：`vButton(vText('保存'))`
- `I18nTextNode`：语言切换时原地更新，不重建视图树
- 字符串快捷方式：`'保存'.s('common.save')`（需先 `installI18nStringShortcut()`）

## 6. 状态与更新

yoya-ui 的状态由内置 Signals 驱动：组件用 `ref` 持有状态、值位置直接传句柄，写入后绑定原地更新；结构变化由 `rebuildable()` 区域读取信号驱动。节点级 `state()` / `setState()` / `getXState()` 与 `vStateNode` 已在 0.5 移除，迁移对照见 [`migration-0.5.zh-CN.md`](migration-0.5.zh-CN.md)。

- 值：`const count = ref(0)`，句柄可直接传给 `attr` / `style` / `vText` / 组件 props；写入 `.value` 或 `handle.update(fn)` 后绑定原地更新，不重建 DOM、不丢焦点。派生值用 `computed(fn)`（只读、惰性、带缓存）。
- 结构：`rebuildable(谓词?)` 把节点声明为「可重建区域」，区域内读到的信号成为依赖，信号变化时按谓词重建；需要强制重建时手动 `rebuild()`。
- 文案原地更新：持有 `vText()` 句柄用 `textContent(next)`（替换、幂等）。元素的 `.text(content)` 等价于 `child()`，**每次调用都会追加一个文本节点**，不要拿它当「设置文案」，否则反复同步会不断堆叠。
- 对外只暴露方法：组件内部用 `ref` 持有状态，对外给 `value(next)` / `disabled(next)` 这类链式方法，不把内部信号对象交给使用者。

### 6.1 可重建区域

当一块内容需要「结构随数据变化」，而组件级状态容器又太重时，把它标记成区域：

```js
const rows = ref([]);
const editing = ref(false);

const body = div((ele) => {
  ele.rebuildable(() => !editing.value); // 可选：时机谓词，为假时只刷值不重建
  ele.attr(
    'data-count',
    computed(() => String(rows.value.length))
  );
  rows.value.forEach((row) => ele.addChild(row.id, div(row.name)));
});

rows.value = [...rows.value, { id: 'r1', name: '第一行' }]; // 写入即重建
body.rebuild(); // 需要强制重建结构时手动调
body.flush(); // 只求值写回绑定，不重建结构（幂等）
```

契约与边界：

- **值用 `flush()`，结构用 `rebuild()`**：`rebuild()` 清空子节点并重跑 setup（会连带刷新本轮新登记的绑定）；`flush()` 只把已登记的绑定求值写回，不重建、不触发谓词、值没变就不写 DOM。一次变化里既有增删又有值变化时，只调 `rebuild()` 即可，不要叠加 `flush()`。
- **区域节点先建一次**：内容由区域自己的 builder 产出，所以它可以在 `render()` 之外创建并直接持有引用（`const list = ul((box) => { box.rebuildable(); … })` → `list.rebuild()`），不需要在 render 里用 `let region = null` 回填；区域外的状态行、工具节点同理。**但要在组件 / 页面工厂内部创建**（每实例、每请求一份），不要提到模块级——服务端复用同一棵树会在并发请求间串数据。`rebuild()` / `flush()` 只在客户端交互期调用，SSR 首屏只做构建（绑定在构建期写回）。
- 区域内容由它自己的 setup 产出；重跑会**清空子节点并重新执行 setup**，因此区域内不保留 DOM 身份——焦点、选区、内部滚动位置、挂在元素上的第三方实例都会重建。区域外的兄弟节点与其 DOM 不受影响。
- 谓词只表达「这次要不要花重建」：为假时只写回绑定值并记为待重建（`rebuildPending()`），结构保持原样。**数据条件请写进 setup**（区域在数据驱动下自会重建），不要当成内容开关。
- 值绑定只接受两种来源：**signal 句柄**（推荐）与**零参闭包** `() => value`（首屏构建期求值一次，需要重新求值时自己调 `flush()`）。带参形式 `(s) => value` 已随节点级状态一起移除，登记时会直接抛错。区域重跑时旧绑定作废、新绑定立即生效，不会重复写回。
- 声明顺序：先 `rebuildable()`，再写值函数与其它登记。
- 区域 setup 里**不要放一次性副作用**（第三方实例创建、请求、埋点）。`bindDocumentEvent` / `bindWindowEvent` 由引擎在重跑前重置；定时器请用 `registerRegionCleanup(fn)` 登记，否则会随重跑叠加。
- 区域自己订阅依赖：区域内读到的信号变化即触发重建（devtools 里记为 `trigger: 'signal'`）；嵌套区域各订阅各的，不会互相代管。
- 需要保留焦点或第三方实例时，把该部分留在区域之外，或只用值绑定——它们是原地更新，不重建 DOM。

## 7. 组合、事件与生命周期

- `child(...)` 接受 `ViewNode`、组件对象（自动包装为 `ComponentNode` 并缓存其 `render()` 结果）或字符串/数字。
- `on(eventName, handler, options)` 绑定真实 DOM 事件，`destroy()` 时自动清理。
- 组件对象只要提供 `render()`（返回 `ViewNode`）即可被 `child()` 使用；类组件遵循 `renderDom` / `bindTo` / `destroy` 生命周期。

### 7.1 生命周期

1. **声明（构建期）**：工厂调用建节点，`setup` 里的 `attr` / `style` / `on` / `child` 只写快照，不创建 DOM；组件对象被包成 `ComponentNode`，首次渲染才解析并缓存 `render()` 结果；`access` / `context` / `i18n` 三类构建期作用域在此捕获。
2. **挂载**：`renderDom()` 创建或复用真实 DOM、绑定事件适配器、递归子节点并应用属性快照；`bindTo(target)` 等于 `renderDom` + append；`commit()` 落地权限态与待移除子节点。
3. **更新（状态变化）**：按代价从低到高——函数值绑定只写回（DOM 不重建）→ `update()` 局部 patch → 区域 `rebuild()`（清空子节点 + 重跑 setup）→ 组件 `rebuild()`（销毁旧根重新 render）。
4. **销毁**：解除事件适配器与 cleanup、递归销毁子节点、清空 keyed 子节点注册表、从 DOM 摘除；重复 `destroy()` 幂等。

SSR 额外走一条线：`toHTML()` 输出 HTML（DOM-free）→ `hydrate()` 收养既有 DOM（`adoptElement` + `bindElement`，不重建元素）→ `hydrateSnapshot()` 回读表单等真实值；前提是 `render()` / `toHTML()` 保持确定性，两端产出同一棵树。

### 7.2 复杂组件分块

复杂组件需要分块定义结构时，文件内部的每一块也按**函数组件**组织：同一文件内声明、PascalCase 命名并描述 UI 单元、输入显式、产出 ViewNode。整棵树看上去应当是一层层组件拼起来的，而不是一段过程式布局代码。

```js
function MemberSummary({ stats }) {
  return p((line) => line.child(vText(() => `共 ${stats().total} 人`))); // 值变化走绑定
}

function MemberRows({ rows, onSelect }) {
  return ul((list) => {
    list.rebuildable(); // 结构随筛选变化：区域负责重建
    rows().forEach((row) => list.addChild(row.id, MemberRow({ row, onSelect })));
  });
}

export function MemberPanel({ state, onFilter, onSelect }) {
  return div((panel) => {
    panel.child(MemberSummary({ stats: () => ({ total: state.members.length }) }));
    panel.child(MemberFilter({ onInput: onFilter }));
    panel.child(MemberRows({ rows: () => state.members, onSelect }));
  });
}
```

- **活数据用 getter 传**（`rows: () => state.members`）：数组/对象引用在状态更新后会变陈旧，尤其配合区域重跑时 builder 读到的仍是旧值；回写一律走回调。
- **块内的更新分工**：值变化用函数值绑定，结构变化用区域（块在自己那层声明 `rebuildable()`，并在 builder 里重新调用 getter）。
- 块组件用与导出组件同一套形态（形态 A 直接返回 ViewNode，或形态 B 返回 `{ render() }`）；不要用匿名箭头片段或 `renderTop` / `BlockA` 这类位置式命名；深度 2–3 层通常足够。

## 8. 注册父节点快捷方法

通过 `registerChildFactories` 将工厂注册到目标节点类，页面内即可使用 `page.vButton(...)` 写法；默认不覆盖既有方法：

```js
import { ViewNode, registerChildFactories } from 'yoya-ui/core';
import { vStatusBadge } from './status-badge.js';

registerChildFactories(ViewNode, { vStatusBadge });
```

## 9. 打包与发布建议

- 以独立 npm 包发布，将 `yoya-ui/core`（或 `yoya-ui/ui`）声明为 `peerDependencies`。
- 只导出公共工厂函数与必要类，按需提供 `.d.ts` 类型声明。
- 在包文档中声明组件清单与 `v` 前缀命名，避免与内置组件重名。

## 10. 测试建议

- 使用 Vitest + jsdom，从公共 API 断言：渲染 DOM、`toHTML()` 输出、事件触发、状态变化。
- 不测试私有字段与内部缓存；必要时用浏览器演示验证浮层定位等真实交互。
