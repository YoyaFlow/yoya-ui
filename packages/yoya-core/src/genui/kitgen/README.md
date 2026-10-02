# yoya-kitgen —— 组件库 manifest 生成器

给**任何 yoya-core 风格的组件库**生成 `genui-kit.json`（GenUI 的组件目录 / 双制品里的"给模型看的那份"）。

核心纪律：**组件文档只存在于源码 JSDoc（`@genui*` 标签），生成器从源码派生一切**。库作者不维护清单，只维护一份 config。

## 快速开始

组件库仓库根放一份 `kitgen.config.js`：

```js
export default {
  src: 'src', // 组件源码目录
  out: 'genui-kit.json', // manifest 输出
  namespace: 'your-org/your-lib', // 必填
  pkg: 'package.json', // 版本钉来源
  categories: {
    // 目录 → 分类；null 跳过；未列出不扫
    form: 'form',
    legacy: null
  }
  // 其余都有默认值：工厂发现策略 / HTML·SVG 元素面 / 黑名单 / 排除规则
};
```

然后：

```sh
npx @yoyaflow/yoya-kitgen          # 生成并写盘（本地 bin 名：yoya-kitgen）
yoya-kitgen --check                # CI 门禁：与源码不一致则退出码 1
yoya-kitgen --out dist/genui-kit.json
```

> 在本仓（yoya-ui）里改的是**生成器源码** `packages/yoya-core/src/genui/kitgen/`，而 CLI / 消费方
> 走的是 **dist**（`package.json` 的 `./genui/kitgen` 指向 `dist/`）——改完先 `npm run build:packages`
> 再跑 `node scripts/generate-genui-kit.mjs`，否则生成物反映的还是旧代码（踩过一次）。

npm script 写法：`"kit:generate": "yoya-kitgen"`。

## 组件源码里的 `@genui*` 标签

写在紧邻工厂导出的 JSDoc 里（贴 `v*` 快捷方式或 `V*` PascalCase 工厂都认）：

```js
/**
 * @genui 问候卡片
 * @genui.contract greeting: 文本；name: 文本
 * @genui.use 早间问候；新人引导
 * @genui.notFor 深夜模式
 * @genui.pitfall 名字为空时只显示问候
 * @genui.example {"type":"vGreeter","props":{"name":"小明"}}
 */
export function VGreeter({ greeting, name }) {}
export const vGreeter = createComponentShortcut(VGreeter);
```

| 标签              | manifest 字段  | 说明                                                                                   |
| ----------------- | -------------- | -------------------------------------------------------------------------------------- |
| `@genui`          | `summary`      | 一句话选型摘要                                                                         |
| `@genui.contract` | `dataContract` | 数据契约                                                                               |
| `@genui.use`      | `whenToUse`    | 适用场景（`；`分隔成数组）                                                             |
| `@genui.notFor`   | `notFor`       | 不适用场景                                                                             |
| `@genui.pitfall`  | `pitfalls`     | 易踩坑                                                                                 |
| `@genui.example`  | `example`      | 一行合法 JSON                                                                          |
| `@genui.scene`    | `scenes`       | 用途场景词（`；`/`,` 分隔）——**检索权重最高的一维**                                    |
| `@genui.layer`    | `layer`        | `L1`–`L7`：在组装里的层级（`genui_catalog({ layer })` 的**硬过滤主键**）               |
| `@genui.category` | `category`     | 覆盖"目录→分类"映射（一个目录混多分类时才写）                                          |
| `@genui.props`    | `props`        | 一行 JSON `{ "prop": "形态｜说明" }`；签名抽不到时手写，抽得到时补文案（同名文案优先） |
| `@genui.live`     | `liveProps`    | 活绑定位（`；`/`,` 分隔）：这几位 prop 吃数据句柄、数据变了组件自己动                  |
| `@genui.json`     | `jsonProps`    | **JSON 位**（值域是对象 / 数组）：用 `asSignalJson` 归一、可 `.at(路径)` 下钻          |
| `@genui.pairs`    | `pairs`        | **搭配关系**：用了它还要配谁（`；`/`,` 分隔，如 `LayoutDataTableRowKit（行模板）`）    |
| `@genui.state`    | `state`        | **状态归属**：哪些状态在组件内、哪些必须由页面持有                                     |

写标签时按"**消费者在读什么**"分三层，别混：

| 层          | 标签                                                                       | 归到哪                                | 为什么                                         |
| ----------- | -------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------- |
| 选型面      | summary / scene / layer / category / use / notFor                          | **thin 条目**（每一步都会调的瘦切片） | 决定"选不选它、选哪个"；它才是检索索引读的字段 |
| 契约/逻辑面 | contract / props / example / pitfall / **pairs** / **state** / live / json | **full 卡**（选定一个组件后按需取）   | 决定"填得对不对、还要配什么、状态放哪"         |
| 运行期面    | content / text / prop / event / expose                                     | 插件（**不进 manifest**）             | 接线细节，模型的目录里不掺                     |

加新字段时先问一句"它是选型判据吗"：是 → thin；不是 → full。`manifest.tiers` 把这条纪律也写进产物
（消费者照它切片，就不怕有人把长文塞进热路径）。

### 体积预算（防"文档写嗨了 → 上下文爆"）

目录是**给模型看的**，每条都有上限，**超了当场报错**（不是警告）：

| 字段                                          | 上限                            |
| --------------------------------------------- | ------------------------------- |
| `summary`                                     | 60 字                           |
| `scenes`                                      | 4 条，每条 20 字                |
| `whenToUse` / `notFor` / `pitfalls` / `pairs` | 6 条，每条 80 字                |
| `state`                                       | 80 字                           |
| `props`                                       | 24 项，每项说明 60 字           |
| `example`                                     | 800 B（"最小可落页"，别抄整页） |
| 单条目录                                      | 6 KB                            |

默认值比现有库的实际水平留了余量（yoya-ui 现状：summary 最长 42 字、pitfalls 最长 44 字、
example 最大 178 B、单条最大 777 B），所以它是护栏不是苛政；库可用 `config.budgets` 覆盖。

**照抄模板**（写在紧邻工厂导出的 JSDoc 里）：

```js
/**
 * @genui 可交互数据表：表头 + 勾选列 + 行模板落位
 * @genui.scene 订单管理, 列表页, 审批台
 * @genui.layer L2
 * @genui.use 行内容要自定义（状态标签、金额右对齐、多个行操作）
 * @genui.notFor 只读静态表格（用 LayoutTableKit）
 * @genui.pairs LayoutDataTableRowKit（行模板，配 repeat）
 * @genui.state 勾选集合放页面级（行重画会丢），组件只负责画与转发
 * @genui.contract columns + rows(句柄) + rowKey
 * @genui.props {"rows":"句柄｜@:/data/x/rows","selectable":"值｜true 显示勾选列"}
 * @genui.live rows；headerChecked；empty
 * @genui.pitfall 行是动态重画的：勾选与行操作走根节点事件委托，行内别用 vCheckbox
 * @genui.example {"type":"your-lib#LayoutDataTableKit","props":{"columns":[{"key":"id","label":"单号"}],"rows":"@:/data/orders/rows"}}
 */
```

**运行时标签**（接线知识，进插件、不进 manifest——给模型的目录不掺接线细节）：

```js
/**
 * @genui.content children                        // 内容位 = children prop
 * @genui.content command=control                 // 内容位 = 构建回调命令
 * @genui.content bridge=vTab content=children    // 容器 + 项桥接（itemBridge）
 * @genui.text label                              // 文本短写落到的 prop
 * @genui.prop value to=command:value             // 属性映射（可加 read= / live=）
 * @genui.event click dom                         // 事件走 DOM 通道
 * @genui.event change callback payload=0         // 事件走回调 prop 通道
 */
```

- **props 零手写**：从 `V*` 工厂签名的解构参数自动抽取（`...rest` 与默认值剔除）。
- **活绑定面从代码派生**：再扫一遍工厂体里的归一调用点 —— `asSignal(…)` = 普通活位、
  `asSignalJson(…)` = JSON 活位，并集出 `liveProps` / `jsonProps`；声明与代码对不对得上由
  组件库自己的对账门禁守（yoya-ui 那份在 `packages/yoya-ui/src/testing/gates/genui-props-parity.test.js`）。
- 没写 JSDoc 的工厂如实标 `needsDocs: true`——manifest 与运行时同真。

## config 参考

| 键                                          | 默认                                      | 说明                                                                           |
| ------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------ |
| `src` / `out` / `pkg`                       | `src` / `genui-kit.json` / `package.json` | 相对 config 所在目录                                                           |
| `namespace`                                 | 必填                                      | `owner/repo`                                                                   |
| `runtime`                                   | `{ genui: '>=0.1 <0.2' }`                 | 运行期版本约束                                                                 |
| `categories`                                | `{}`                                      | 源码目录 → 分类映射；`null` 跳过                                               |
| `factories.pascalPrefix` / `shortcutPrefix` | `V` / `v`                                 | 工厂命名约定                                                                   |
| `factories.shortcutHelpers`                 | `['createComponentShortcut']`             | `const vX = helper(VX)` 也算工厂                                               |
| `factories.extraPatterns`                   | `[]`                                      | 额外发现模式 `[{ regex, flags?, category, nameGroup? }]`（如布局工厂三参形态） |
| `elements.html` / `elements.svg`            | yoya-core 的 html / svg                   | `{ module, blocked }` 或 `false` 关闭                                          |
| `exclude`                                   | `[/\.test\./]`                            | 文件名排除                                                                     |
| `plugin.out`                                | `genui-plugin.js`                         | 插件产物输出位                                                                 |
| `plugin.runtimeImport`                      | `@yoyaflow/yoya-genui`                    | `createPlugin` 的 import 来源                                                  |
| `plugin.factoryImport`                      | `null`（不生成插件）                      | 工厂 import 来源模块；给了才生成第二产物                                       |
| `plugin.coreFactories`                      | `[]`                                      | 进 core 命名空间的工厂名（布局工厂等）                                         |
| `plugin.functions`                          | `[]`                                      | 从工厂模块按名取的函数表                                                       |
| `plugin.kinds`                              | `{}`                                      | 组件 kind 覆盖（如 `{ vSlot: 'element' }`）                                    |

`elements.*.module` 可以是裸包名（按 config 所在目录解析依赖）或相对路径（私有元素面）。

## 接线通道：值通道 / 命令通道（票 03）

一个 props 位只走**一条**通道，构建期决定、运行期互斥：

| 通道 | 怎么声明 | 运行期 |
| --- | --- | --- |
| **值通道** | 代码里归一过（`asSignal` / `asSignalJson` 调用点 → 插件的 `valueProps`） | 句柄直传给组件，宿主**不**按同名命令重放 |
| **命令通道** | 没归一（默认），或显式声明 `@genui.prop x to=command:x` | 构建期喂一次 + 数据变化按同名命令重放（与旧版完全一致） |

默认判据是"**这个位在代码里归一了吗**"：归一了就说明组件自己会读句柄，宿主再重放一遍等于同一份值走两条通道——谁说了算不明，还多跑一轮（图表的 `setOption` 就是被这么白叫的）。所以没归一的位保持命令通道、行为不变；迁移逐位进行、只减不增（门禁基线管着）。

想提前看清"还有哪些位在靠重放活着"，把 surface 选项切成 `replay: 'declared'`（`genui.fromJson(schema, { replay: 'declared' })`）：此时只有值通道与显式命令通道还能拿到数据，其余位会停在构建期那份快照——那正是迁移清单。yoya-ui 的清单冻结在 `packages/yoya-ui/src/testing/baselines/genui-replay-migration.json`，门禁只减不增；默认 `auto` 时行为与旧版完全一致，可随时回滚。

## 程序化调用

```js
import { generateKit, writeKit } from '@yoyaflow/yoya-kitgen';

const manifest = await generateKit(config, { resolveFrom: import.meta.dirname });
const { out, summary } = await writeKit(config, { resolveFrom: import.meta.dirname, check: true });
```

## 维护约定

- 生成器逻辑统一在 `@yoyaflow/yoya-kitgen` 维护（本仓 `kitgen/` 目录即其源码），组件库**不再各自手搓脚本**。
- yoya-ui 的 `scripts/generate-genui-kit.mjs` 是薄 wrapper：调本生成器 + 本仓 `kitgen.config.js`。
- 现阶段跨仓以相邻路径接入；`@yoyaflow/yoya-kitgen` 发 npm 后改成普通 devDependency。
