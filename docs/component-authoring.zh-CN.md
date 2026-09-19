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

| 类别         | API                                                                                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 节点类       | `ViewNode`、`ElementNode`、`HtmlElementNode`、`SvgElementNode`、`ComponentNode`、`TextNode`（`VTextNode`）                                               |
| 工厂与组合   | `vText`、`createElementFactory`、`registerChildFactories`、`applyElementOptions`、`normalizeChild`、`normalizeSetupArguments`、`resolveTarget`           |
| 节点内部集合 | `nodeChildren`、`appendNodeChild`、`EMPTY_CHILDREN`、`elementStyles`、`elementAttrs`、`elementClassNames`、`elementHasClass`（形态 C 组件专用，见 §7.3） |
| 组件身份     | 视图根上的 `vn: 'VCard'`、`defineComponentIdentity`、`componentNameOf`、`hasComponentIdentity`（三种形态同一条判定，见 §7.3）                            |
| 信号         | `ref`、`computed`、`batch`、`isSignal`、`SignalHandle`、`installSignals`（值位置直接传句柄）                                                             |
| 国际化       | `createI18n`、`I18nTextNode`、`i18nText`、`installI18nStringShortcut`                                                                                    |

## 3. 三种组件形态

新组件应从下列三种形态中选择，避免在模板之外另起结构。

### 形态 A：薄工厂（无内部状态、纯配置化组合）

确定这个组件没有额外行为要定义时就用它——**演示代码同样按此判据**：只演示结构与交互、没有对外命令方法时，函数直接返回 ViewNode，不要为了统一而包一层 `render()`。

```js
import { vBadge } from '@yoyaflow/yoya-ui/ui';

export function ServiceTag(options) {
  return vBadge(options);
}
```

### 形态 B：对象组件（常规独立组件，默认形态）

```js
import { vRate } from '@yoyaflow/yoya-ui/ui';

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

### 形态 B 的快捷工厂：`vNode((api) => 视图)`

需要对外命令方法时，用 `vNode` 定义即得到组件节点：

```js
import { computed, ref, vNode, vstack, vText } from '@yoyaflow/yoya-ui';

export function CounterCard() {
  const count = ref(0);

  return vNode((api) => {
    api.bump = () => {
      count.value += 1;
      return api; // 等价于返回节点
    };

    return vstack((stack) => {
      stack.output((out) => out.child(vText(computed(() => `计数 ${count.value}`))));
      stack.vButton('+1', (button) => button.on('click', () => api.bump()));
    });
  });
}
```

- 返回的是组件节点（`ComponentNode extends ViewNode`）：当根挂载、当子节点、进 keyed 列表都用节点语义；不产生占位元素，setup 返回数组即多根 fragment。
- `api` 只收命令函数；工厂把命令挂到节点本身，撞上节点已有成员（`child` / `destroy` / `mountable` …）或 `render` / `_*` 直接抛错，不静默覆盖。
- 命令里 `return api` 等于 `return 节点`；自带错误边界写 `api.whenFailed = (error, info) => 降级节点`（等价 `node.whenFailed(fn)`），其余节点级能力（`mountable()` / `rebuildable()`）链在返回的节点上。
- 旧写法不受影响：形态 A/B/C 与 `child(componentObject)` 全部照旧，没有对外命令方法的展示组件仍用形态 A。

### 形态 C：类节点组件（父子嵌套、操作子实例或重写生命周期）

类节点组件必须同时导出成对 `vXxx` 工厂，并使用 `createElementFactory`：

```js
import { HtmlElementNode, createElementFactory } from '@yoyaflow/yoya-ui/core';

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

yoya-ui 的状态由内置 Signals 驱动：组件用 `ref` 持有状态、值位置直接传句柄，写入后绑定原地更新；结构变化由 `rebuildable()` 区域读取信号驱动。节点级 `state()` / `setState()` / `getXState()` 与 `vStateNode` 已在 0.5 移除。

- 值：`const count = ref(0)`，句柄可直接传给 `attr` / `style` / `vText` / 组件 props；写入 `.value` 或 `handle.update(fn)` 后绑定原地更新，不重建 DOM、不丢焦点。派生值用 `computed(fn)`（只读、惰性、带缓存）；依赖订阅跟着观察者走——没人观察时不订阅依赖（内置引擎的原生派生；写入后下次读取惰性重算），观察者清零即退订，行内派生不会在行销毁后继续占着内存。
- **只有这一种反应式模型**：库不提供深层代理——`obj.field = x` 不会通知（对象整体替换才会）。字段要跟着更新，就把该字段本身做成句柄；列表行模型的做法见 skill 的「状态模块」一节（热字段句柄 + 按 key `apply()` 合并）。
- 结构：`rebuildable(谓词?)` 把节点声明为「可重建区域」，区域内读到的信号成为依赖，信号变化时按谓词重建；需要强制重建时手动 `rebuild()`。
- 文案：状态驱动的文案传句柄——`vText(count)`、`child(count)`、元素工厂 setup 位置的 `div(count)` 三种写法等价（`div(count)` 等价 `div((el) => el.child(count))`），只有值本身是派生结果时才套 `computed(fn)`；需要命令式原地替换时，持有 `vText()` 句柄用 `textContent(next)`（替换、幂等）。**节点级 `text()` 已移除**：追加文本用 `child(content)`，反复追加会堆叠，要"设置文案"就用 `vText()` 句柄的 `textContent(next)`；组件自己的 `text()`（`vBadge` / `vProgress` / `vMenu` 等）与 SVG `<text>` 的 `text()` 是另一套 API，照旧可用。
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
    computed(() => rows.value.length)
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
- **区域必须在自己的 setup builder 内声明**：`rebuildable()` 只在 builder 运行期间有效；非区域节点的构建闭包在构建返回处即释放（行的常驻内存主要省在这里），builder 已返回的节点不能再补声明区域，直接抛错并说明原因。区域节点保留自己的 builder，所以之后仍可再调一次 `rebuildable(谓词)` 替换谓词。
- 区域内容由它自己的 setup 产出；重跑会**清空子节点并重新执行 setup**，因此区域内不保留 DOM 身份——焦点、选区、内部滚动位置、挂在元素上的第三方实例都会重建。区域外的兄弟节点与其 DOM 不受影响。
- 谓词只表达「这次要不要花重建」：为假时只写回绑定值并记为待重建（`rebuildPending()`），结构保持原样。**数据条件请写进 setup**（区域在数据驱动下自会重建），不要当成内容开关。
- 值绑定只接受两种来源：**signal 句柄**（推荐）与**零参闭包** `() => value`（reader）。两者走同一条绑定管线：闭包在构建期求值一次，**读到的信号即成为它的依赖**，写入就重算；读的是普通变量时，需要重新求值自己调 `flush()`。带参形式 `(s) => value` 已随节点级状态一起移除，登记时会直接抛错，类型上也不接受。区域重跑时旧绑定作废、新绑定立即生效，不会重复写回。
- **组件 props 只接受字面值与句柄**（`vInput({ value: name })`）：props 是配置位，函数另有语义（`onChange` / `render`），传零参闭包会在组件构造时显式抛错，而不是静默串成源码文本。文本位置用闭包要写 `vText(fn)`——`child(fn)` 是组件渲染槽。
- 声明顺序：先 `rebuildable()`，再写值函数与其它登记。
- 区域 setup 里**不要放一次性副作用**（第三方实例创建、请求、埋点）。`bindDocumentEvent` / `bindWindowEvent` 由引擎在重跑前重置；定时器请用 `registerRegionCleanup(fn)` 登记，否则会随重跑叠加。显式归属节点时用节点方法：`ele.bindWindowEvent(type, handler)` / `ele.bindDocumentEvent(...)` / `ele.bindAnimationFrame(cb)` / `ele.bindAnimationFrameLoop(cb)`，`destroy()` 自动卸载或停帧（循环另可用 `stopAnimationFrameLoop()` 提前停）；独立函数的原有用法（自行保存 unbind）保持不变。
- **列表协调**：`node.keyed(rows, keyFn, build, options?)` 用信号驱动子项——同 key 且行引用未变时复用节点，行引用变化原位换新，顺序变化保身份移动（只搬真的换位的行，交换两行不会重排整张表；多根组件的行整组一起搬）；行内字段用信号可在不重建的前提下原地刷值。第四参数声明**行级更新协议**：`equals(prevRow, nextRow)` 为真视为未变（节点复用），否则 `update(node, prevRow, nextRow)` 原地改写该行（节点身份保留），两者都没有才原位换新；`equals` 与 `update` 同时给出时 `equals` 优先。自定义策略用 `insertBefore(key, child, beforeKey)` / `insertAfter(key, child, afterKey)` / `moveBefore(key, beforeKey)` / `moveAfter(key, afterKey)` / `replaceChild(key, child)` 原语。
- **条件挂载**：`panel.mountable(cond)` 是唯一公共入口——条件接受 ref/computed 句柄、布尔或零参闭包，**省略参数即默认常挂 `true`**；惰性存在子节点上，入树时父节点收养建绑定（`keyed()` 的行节点同一条路径），**入树后随时再调 `mountable()` 即可替换条件并立即生效**（闭包变化后用**父节点** `flush()` 重求值）。为假时子元素脱离文档但 ViewNode 与状态保留，为真时按子节点槽位回归；SSR 条件假输出空串。`node.isMounted()` 查询自身挂载条件的最近提交状态；「元素此刻是否在文档里」查 `node._el?.isConnected`。它与 `display` 显隐（看不见但在）、`rebuildable()`（销毁重建）构成三档：**不在但活着**。挂载绑定登记在父节点，条件存在子节点自己的值单元里（无需父指针）；`div({ mountable: cond })` 配置形态走同一条收养路径。
- 区域自己订阅依赖：区域内读到的信号变化即触发重建（devtools 里记为 `trigger: 'signal'`）；嵌套区域各订阅各的，不会互相代管。`batch()` 内写入多个信号时，依赖多个源的区域只在批次结束时同步重建一次；用 `rebuildScheduled()` 查询是否有已排队的信号触发重建。批次外的写入仍同步立即重建；重建期间依赖再次变化会在本次重建后补跑，而不是丢弃。

- 需要保留焦点或第三方实例时，把该部分留在区域之外，或只用值绑定——它们是原地更新，不重建 DOM。
- **keyed 段内的事件委托**：在 `keyed()` 的行构建函数里（含其子树）注册的 `click` / `input` 这类冒泡标准事件，
  不再逐行挂 DOM 监听器，而是登记成段根上的一个监听器统一派发——10k 行从 2 万个监听器降到每段一个。
  `.on()` 的用法与可观察行为不变（`this`、`event.target`、`event.currentTarget`、`stopPropagation()`
  语义一致，后者同时截断原生冒泡）；以下情况自动回落逐元素绑定：传了 `once` / `capture` / `passive: true`、
  事件不冒泡（`focus` / `mouseenter` 等）、自定义事件、非元素节点，以及挂载之后才补的 `.on()`。
  两条细微差异：`currentTarget` 由引擎逐事件伪造（值一致，但它是事件对象上的自有属性）；第三方直接挂在
  「行根到段根之间」元素上的监听器，相对顺序可能与逐元素绑定时不同。
- **错误边界**：`node.whenFailed(handler)` 声明子树边界——handler 返回节点则替换子树降级、返回空仅上报并保持现状；组件对象可写与 `render()` 同层的 `whenFailed(error, info)` 成员，`ComponentNode` 自动挂载。捕获永不静默：`console.error` 必发，devtools 开启时追加 `error` 事件。错误在出错时**沿父链上溯**找最近的边界，由它独占捕获、捕获后不再向外，因此与声明顺序、嵌套深度、运行时插入、子树搬家都无关；handler 自身抛错则向外抛出。render / build 阶段返回空时，失败子节点会被标记并跳过后续重试（避免反复失败与重复记录），重新挂载或区域重建会清掉标记、允许再试一次。无边界时错误原样传播（fail fast）。区域节点上的降级替换按一次区域构建执行，不会撞区域守卫。

### 6.2 大列表里的选中态：别用共享句柄逐行派生

长列表（1k 行以上）里，"哪一行被选中"如果用**共享句柄 + 每行派生**表达：

```js
const selectedId = ref(null);
// 每一行
line.toggleClass(
  'danger',
  computed(() => selectedId.value === row.id)
);
```

切换选中时会**唤醒全部行**——每行都订阅了同一个信号，框架看到的是"N 个派生都读了这个信号"，
它无法知道只有两行真的变了。实测（`npm run perf:selection`，1000 行）：

| 写法                         | 每次切换的派生求值 | 切换耗时（写入本身） |
| ---------------------------- | ------------------ | -------------------- |
| 共享句柄逐行派生（上面这种） | **1000 次**        | 0.47 ms              |
| 每行派生读行自己的句柄       | 2 次               | 0.014 ms             |
| 行自己持 `ref` 布尔（推荐）  | **0 次**           | 0.015 ms             |

代价随行数线性放大：10k 行时第一种写法每次切换要跑 10000 次派生（1.5 ms）。
内存上第一种写法每行多持一个派生对象与一条订阅，约多 0.2 KB/行（1000 行约 0.2 MB）。

推荐的写法是把选中态放在**行自己身上**，切换时只写两行：

```js
const row = { id, label: ref(labelOf(id)), selected: ref(false) };
// 每一行
line.toggleClass('danger', row.selected);
// 切换：只写两行
const select = (next) => {
  const list = rows.peek();
  const previous = list.find((item) => item.selected.value);
  if (previous) previous.selected.value = false;
  next.selected.value = true;
};
```

- 两种写法都是声明式，差别只在"状态存在共享句柄里还是存在行里"；后者是 O(1)。
- 代价是成对写入要自己维护（键盘导航、全选、数据刷新都要走同一个入口）。需要多选集合 / 过滤 /
  悬浮 + 选中组合时，自己维护一个 `Map<id, 行>` 索引即可，不需要框架新 API。
- 行数不大（几十~几百）、或本来就是"每次全量刷新"的列表，继续用共享句柄派生更简洁，不必改。

### 6.4 按键容器：`keySet`（`ref([])` 的替代品）

列表经常要当 map 用：按 key 取/改/删一行、给每行挂一点状态（选中 / 展开 / dirty / loading）、
主从联动、键盘导航。这些都能自己用 `Map` 拼，但"数据换了状态还在不在"要靠人手守。`keySet` 把这件事
收成一个容器：**元素是 `KeyItem`，`data` 与 `api` 在同一个对象里**，排序 / 插入 / 移动 / 整表替换
作用在元素上，两者不可能脱钩。

```js
const list = keySet(
  rows,
  (row) => row.id,
  (item) => {
    item.api.selected = ref(false);
    item.api.select = () => {
      item.api.selected.value = true;
    };
  }
);

tbody((body) => {
  body.keyed(list, (item) =>
    // 行就是元素；第二参数仍是下标
    tr((line) => {
      line.attr('data-row-id', String(item.data.id));
      line.toggleClass('danger', item.api.selected);
      line.on('click', item.api.select);
    })
  );
});
```

- `item.data` 是应用那一行数据；`item.api` 是应用给这一行定义的状态与命令，第三个参数每个新 key 只跑一次。
- **同 key 同 api**：重排、移动、重新赋值同一批行，元素与 api 都原样续用；`item.data` 换成新引用时
  该行原位换新（要"内容等价就复用 / 原地更新"，照旧传 `keyed` 的 `equals` / `update`，收的是行数据）。
- key 变了 = 旧 key 离场（元素丢弃、`item.api.dispose?.()` 被调用）+ 新 key 入场（新元素、新 api）。
  键的身份永远是 `keyOf(item.data)`，容器不缓存 key。
- 数据操作触发一次 keyed 对账；写 `item.api` 上的信号**不碰数据数组、不触发对账**——这就是 §6.2
  那张表里"行自己持 ref"的 O(1) 唤醒，只是状态由容器按 key 保管。

| 用途          | API                                                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 刷新触发      | `list.value = datas` / `list.replaceAll(datas)`；`list.batch(() => …)` 把多步合成一次对账                                                                |
| 按 key 增删改 | `add(data)` / `insertBefore(data, beforeKey?)` / `insertAfter(data, afterKey?)` / `replace(key, data)` / `merge(key, patch)` / `remove(key)` / `clear()` |
| 排序与移动    | `sort((itemA, itemB) => …)`（稳定排序，比较器拿元素）/ `moveBefore(key, targetKey?)` / `moveAfter(key, targetKey?)`                                      |
| 读            | `item(key)`（元素）/ `get(key)`（数据）/ `has(key)` / `indexOf(key)` / `keys()` / `items()` / `values()` / `size` / `keyOf(data)`                        |
| 作数据句柄    | `value` / `peek()` / `subscribe()`；写句柄 = 换数据，读句柄给**元素表**（`KeyItem[]`）                                                                   |

细则：目标 key 不存在时**写操作抛错**、读操作返回 `undefined` / `false`；`moveBefore(k, k)` /
`moveAfter(k, k)` 是 no-op（`moveBefore(key)` 落到末尾、`moveAfter(key)` 落到开头）；同一份数据里
出现重复 key 直接报错；`merge` 只接受对象行。`keySet` 是可选 API——小列表、每次全量刷新的列表，
继续用 §6.2 的 `ref` + 派生写法更直接。

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
- **上游用 `ref` 时直接传句柄**（`rows: itemsRef`）：块内用值绑定或区域读句柄即可，不需要 getter；getter 留给非信号来源（请求结果、外部对象）。
- **块内的更新分工**：值变化用函数值绑定，结构变化用区域（块在自己那层声明 `rebuildable()`，并在 builder 里重新调用 getter）。
- 块组件用与导出组件同一套形态（形态 A 直接返回 ViewNode，或形态 B 返回 `{ render() }`）；不要用匿名箭头片段或 `renderTop` / `BlockA` 这类位置式命名；深度 2–3 层通常足够。

### 7.3 形态 C 组件的字段访问（0.6.3 起）

`_children` / `_classText` / `_styles` / `_attrs` 这些下划线字段是**实现细节**（内存优化会改它们的表示），
第三方或库外形 C 组件不要直接读写；0.6.3 起改用下面这组 helper，语义与旧字段一一对应：

| 旧写法                                                      | 新写法                                                   |
| ----------------------------------------------------------- | -------------------------------------------------------- |
| `node._children.push(child)` / `this._children.splice(...)` | `appendNodeChild(node, child)`、`nodeChildren(node)`     |
| 比对空列表                                                  | `EMPTY_CHILDREN`（共享的**冻结**数组哨兵，就地写会抛错） |
| `node._classes` / `node._attrs.class`                       | `elementClassNames(node)`、`elementHasClass(node, name)` |
| `node._styles.background = …`                               | `elementStyles(node).background = …`                     |
| `node._attrs['data-x'] = …`                                 | `elementAttrs(node)['data-x'] = …`                       |

注意三点：空子节点列表是共享哨兵，`nodeChildren()` 首次写入时才换成真数组（所以别缓存它、也别写哨兵）；
类名的真身是文本（`_classText`，`_classes` 这个 Set 已不存在）；`_styles` / `_attrs` 按需创建，
没写过样式或属性的元素上它们是 `undefined`，helper 会替你建好。追加子节点请走 `child()` / `addChild()`，
helper 只用于"必须在自己的渲染路径里直接改节点名单"的形态 C 场景。

## 7.1 槽位：内容往哪里去

组件结构里给某个元素打上 `slot` 标记，它就是这个组件的**槽位**；`child()` 进来的、带同名标记的元素是
"信封"——它的子节点、类名与同名属性合并进槽位元素，**信封本身不进 DOM**（与 HTML 的 `<slot>` fallback 一致）。
不带标记的内容按**普通元素**语义落在组件根元素内部。

```js
// 组件作者：结构里声明槽位（元素自己的内容就是默认内容）
function Panel() {
  return vNode(() =>
    div((root) => {
      root.span({ slot: 't-head' }, '默认标题');
      root.div('body');
    })
  );
}

// 消费者：两种内容都能进
panel.child(span({ slot: 't-head' }, '来自用户的标题')); // 进槽位，默认内容被替换
panel.child(p('普通内容')); // 未标记 → 追加到组件根元素末尾
```

规则：

- **就近作用域**：标记只在**直接父组件**里解析，不冒泡、不穿透；嵌套组件里的同名槽互不影响；
- **一个槽一份内容**：同名槽第二次投递 → 报错；同一个组件里同名槽声明两次 → 报错；
- **找不到槽位**：不 mount + 开发期提示（HTML 语义：没有位置就不渲染）；
- **多根组件**没有单一容器：未标记内容 → 报错，请声明命名槽；
- 槽位不产生额外 DOM；`slot` 只是**标记**，不是 `<slot>` 元素（`slot()` 是 HTML 原生标签工厂，与组件槽位无关）。

### 何时用槽、何时直接 `child`

| 场景                             | 写法                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------ |
| 组件只有一个放内容的地方         | `child(...)`（不带标记，进根元素）                                                         |
| 组件有多个插入点（头 / 体 / 尾） | 结构里给每个位置打 `slot` 标记，内容带同名标记                                             |
| 内容要落在组件内部的指定位置     | 槽位                                                                                       |
| 内容只是追加到组件末尾           | 不带标记的 `child(...)`                                                                    |
| 独立创建、之后挂到某个组件的槽里 | 工厂产出就带标记（`span({ slot: 't-head' }, …)` 或自己的工厂封装），再 `panel.child(head)` |

## 7.2 组件级钩子：`whenMount` / `whenDestroy`

与 `whenFailed` 同族的**协议成员**：属性持函数，声明在 vNode 的 api 上或形态 B 的返回对象上。

```js
const chart = vNode((api) => {
  api.whenMount = function () {
    this.instance = createChart(thisEl); // 元素已经落地，可以测量 / 初始化第三方
  };
  api.whenDestroy = function () {
    this.instance?.dispose(); // 子树销毁之前，自己的 DOM 与子节点还读得到
  };
  return div((root) => root.span('chart'));
});
```

规则：

- **时机**：`whenMount` 在节点真正落到 DOM 时触发（`mountable(false)` 期间不触发，条件转真、真正落地时才触发）；
  `whenDestroy` 在**子树销毁之前**触发且幂等；
- **不能写进 options 对象**：`div({ whenMount: fn })` 直接报错 —— `onXxx` 才是事件简写（`{ onClick: fn }`），
  `whenMount` / `whenDestroy` / `whenFailed` 放错位置会报错，不会被静默绑成事件；
- **`this`** 绑定到组件对象（形态 B）或 api（vNode）；
- **内存**：没有钩子的组件零额外字段；框架不 `bind()`、不用数组收集，销毁后释放引用；
- **不做 `onUpdate`**：库里"更新"有区域重建 / keyed 换 key / 组件主动换根三种不同场景，没有单一语义。

## 7.3 组件身份：`vn` 与 `instanceof`

组件的**视图根元素**上写 `vn: 'VCard'`（值 = 导出名），这个成员就是"一个 VCard"。三种形态写法完全一样：

```js
function ServiceTag() {
  // 形态 A：薄工厂，成员就是元素节点
  return span({ vn: 'ServiceTag', class: 'yoya-service-tag' }, 'tag');
}

function RateCard() {
  // 形态 B：组件对象，成员是 child() 包出来的 ComponentNode
  return { render: () => div({ vn: 'RateCard', class: 'yoya-rate' }, 'rate') };
}

function Chart() {
  // vNode：同形态 B
  return vNode(() => div({ vn: 'Chart' }, 'chart'));
}

// 模块底一行（与 registerChildFactories 并排），三种形态同一个调用
defineComponentIdentity(ServiceTag, 'ServiceTag');
defineComponentIdentity(RateCard, 'RateCard');
defineComponentIdentity(Chart, 'Chart');
```

判定只有一种写法，与形态无关：

```js
page.children().filter((child) => child instanceof ServiceTag); // 元素节点：读自己
page.children().filter((child) => child instanceof RateCard); // 组件节点：展开到视图根
page.children().filter((child) => child instanceof Chart);
```

规则：

- **一条判定**：成员是元素节点就看它自己，是组件节点就展开到它的视图根（多根任一命中）。判定读 `vn`
  属性（快照优先、再回读真实 DOM），所以编译片段克隆、`adopt` / `hydrate` 进来的节点一样认；
- **多值**：包装型组件共用根时写 `vn: 'VCard UserCard'`，两个身份都命中（空格分隔）；
- **类名不参与判定**：`yoya-*` 是样式钩子；身份只认 `vn`，改样式不会改身份，手搓同名类名也不会误判；
- **原型判定保留为兜底**：类组件（形态 C）与 `new` 出来的实例照旧 `instanceof` 成立，迁移期老组件不断；
- **裸组件对象不算**：`RateCard()` 返回的对象还没进树；判定针对 `children()` 里的成员；
- **代价**：每个组件实例的 DOM / SSR 输出多一份 ` vn="VCard"`（11 字节起），而且身份进了 DOM 就是公开
  契约——**改组件名等于改身份语义**。

## 7.4 迁移提示（这批改动带来的行为变化）

- **options 里与子工厂同名的键按属性写**：`div({ slot: 't-head' })` / `div({ title: 't' })` 现在是**属性**；
  以前会创建 `<slot>` / `<title>` 子元素（静默错误）。要建子元素请用链式写法 `root.title(...)`。
- **setup 参数数量不定、严格按出现顺序**：函数 = 构建回调、字符串/数字 = 文本、节点/句柄 = 子节点、
  数组 = 子节点列表、对象 = options、同类实例 = 复用。`div(null, { children: 'x' })`、`div(cb, 't')`
  这类以前被静默丢弃的参数现在生效。
- **组件的内容侧**：`component.child(x)` 现在渲染在**组件根元素内部**（以前既不进 DOM、也不出现在
  `children()` 里）；多根组件带内容会报错。
- **`whenMount` 待评估**：它可能是多余的（很多场景可用 `requestAnimationFrame` 或首次交互惰性初始化替代），
  `whenDestroy` 是必需的清理钩子。

## 8. 注册父节点快捷方法

通过 `registerChildFactories` 将工厂注册到目标节点类，页面内即可使用 `page.vButton(...)` 写法；默认不覆盖既有方法：

```js
import { ViewNode, registerChildFactories } from '@yoyaflow/yoya-ui/core';
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
