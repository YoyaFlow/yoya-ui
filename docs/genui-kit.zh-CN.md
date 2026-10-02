# GenUI kit 开发指南

GenUI kit 是**你自己的组件包**：组件以 JSON 被模型使用，宿主（`genui-mcp` / yoya-genui）
按一份清单把整族组件动态装进能力面。yoya-ui 提供通用组件，kit 让你把"这个业务才有"的组件
接上同一套协议——模型照样只写 JSON，不用改宿主。

一件事分两半，本文全程按这两半讲：

| 半边       | 产物                      | 谁读它                    | 回答的问题                             |
| ---------- | ------------------------- | ------------------------- | -------------------------------------- |
| **清单**   | `kit.json`（生成物）      | 宿主、模型（catalog）     | 有哪些组件、什么时候用、props 长什么样 |
| **运行时** | `dist/yoya.kit.js`（ESM） | 浏览器（宿主 `import()`） | 组件怎么把 JSON 变成真节点、活值怎么走 |

参考实现：[`@yoyaflow/yoya-kit`](https://github.com/yoyaflow/yoya-kit)（27 个图表组件 + 12 个弹性布局组件）。
本指南对应的脚手架模板：`create-yoya-ui my-kit --template genui-kits`。
组件本身的写法（形态 A/B、`vn` 身份、部件与落点）见
[component-authoring.zh-CN.md](component-authoring.zh-CN.md)。

## 1. 装载链路

```text
GENUI_MCP_KITS=<kit 目录>/kit.json
   │
   ├─ 服务端：校验 namespace / version / components[].name / runtime.entry
   │           → 合并进 genui_catalog（模型在这里"看见"你的组件）
   └─ 页面壳：import(runtime.entry) → GenUI.use(module[runtime.export])
               → 组件进注册表 → schema 里的 `my-org/my-kit#PanelKit` 能渲染出来
```

两条纪律由此而来：

1. **清单与实现必须同真**：宿主只按清单亮能力面，实现坏了不会"半加载"——
   所以清单是**生成物**，`npm run kit:check` 是门禁；
2. **kit 不往 yoya-ui 的默认注册表里塞东西**：必须由宿主显式 `GenUI.use(kitPlugin)`；
   页面退出时逆序卸载（`dispose`），一个挂掉的 kit 只让它自己的组件缺席。

## 2. 快速开始

```bash
npx create-yoya-ui my-kit --template genui-kits
cd my-kit
npm install
npm run dev        # 调试台：组件目录 + examples/*.json 实时渲染 + 写数据验证活值
```

生成后先做两件事：

1. 改 `kit.json` 的 `namespace` / `repo`，以及组件实现里的同一份元数据
   （`KIT_NAMESPACE` / `KIT_VERSION` / `repo` / `source` —— `kit:check` 会核对这四段文本）；
2. 把 `components/demo-kit/` 换成你自己的组件族（照着它复制一份最快）。

## 3. 目录与真相源

```text
my-kit/
├─ kit.json                  # 清单（生成物）：namespace / version / runtime / components[]
├─ components/
│  └─ demo-kit/
│     ├─ component.json      # 元数据真相源：一个目录可声明一族组件
│     ├─ impl.js             # 运行时：组件实现 + 组件族插件
│     └─ examples/           # 示例 schema（调试台渲染的就是它）
├─ indexes/                  # 投影（生成物）：by-category / by-scene
├─ src/index.js              # npm 包出口 + kitPlugin（runtime.export 指向它）
├─ scripts/generate-kit.mjs  # component.json → kit.json + indexes（纯 Node，无依赖）
├─ playground/               # 本地调试台（不进产物）
└─ test/kit.test.js          # 自检
```

口径：

- **`components/*/component.json` 是唯一真源**；`kit.json` 与 `indexes/` 一律由
  `npm run kit:generate` 重写，不要手改（改了会在下一次生成时被覆盖，`kit:check` 也会红）。
- **版本只有一处**：`package.json` 的 `version`。生成时写进 `kit.json`，同时核对实现里的
  `KIT_VERSION`；升级版本 = 改 `package.json` + 改 `impl.js` 的 `KIT_VERSION`（漏一个 `kit:check` 就红）。
- **组件短名 PascalCase**（`PanelKit`），全名由生成器展开成 `my-org/my-kit#PanelKit`；
  第三方**不要用 `v` 前缀**（`v*` 是 yoya-ui 官方工厂保留），也不要和宿主已装库撞名。
- 一个目录可以声明**多个**组件（`components: [...]`），也可以只声明一个（顶层即组件条目）；
  同一份实现 + 同一个 runtime 入口注册一族组件——这是 kit 的常规形态。

## 4. 运行过程脚本

| 命令                   | 什么时候用     | 干什么                                                                |
| ---------------------- | -------------- | --------------------------------------------------------------------- |
| `npm run dev`          | 写组件时       | 调试台：组件目录 + 每份示例的实时渲染 + "写数据模型 +1"按钮（验活值） |
| `npm run kit:generate` | 改了元数据之后 | 由 `component.json` 重写 `kit.json` 与 `indexes/`                     |
| `npm run kit:check`    | 提交前 / CI    | 生成结果与仓库里那份不一致就退出码 1（顺带核对实现里的元数据）        |
| `npm test`             | 提交前 / CI    | 清单同真 / 插件装得上 / 每份示例渲染 / 活值原地更新                   |
| `npm run build`        | 发版 / 交付    | 打 `dist/yoya.kit.js`（`@yoyaflow/*` 保持 external）                  |
| `npm run preview`      | 看构建产物     | 预览 `playground-dist/`                                               |
| `npm run verify`       | 一条命令过门禁 | `kit:check` + `test` + `build`                                        |

调试台按**宿主的写法**跑：`createGenUI()` → `GenUI.use(yoyaUIPlugin)` → `GenUI.use(kitPlugin)`
→ `surface.bindTo(容器)`，所以在这一页能跑通，装进 `genui-mcp` 也能跑通。

## 5. 写一个组件

### 5.1 工厂形状：`(props, place)`

（省略 import：`div` / `h3` 来自 `@yoyaflow/yoya-core/html`。）

```js
export function PanelKit(props = {}, place) {
  const { title, description, tone = 'neutral', ...rest } = props;

  return div(
    // props 进工厂参数：属性 / 样式能写进参数就写进参数（值位置可以放句柄）
    { vn: 'PanelKit', 'data-tone': tone, style: { display: 'flex', padding: '16px' } },
    (root) => {
      if (title) root.child(h3({ vn: 'PanelKitTitle' }, (node) => node.child(title)));
      place?.(root); // ← 内容位：children 已经渲染好了，位置由你决定
    }
  );
}
```

- `props` 全部来自 JSON（可能夹着活值句柄）；
- `place` 是 GenUI 的内容落位回调，只在组件自己决定位置时调用它；
- **不要在组件里读全局、读 DOM 结构、抓节点句柄**：状态归 GenUI 数据模型（见第 7 节）。

### 5.2 组件表：`kind` / `props` / 内容通道

```js
export const demoKitPlugin = createPlugin({
  id: `${KIT_NAMESPACE}@${KIT_VERSION}#demo-kit`,
  namespace: KIT_NAMESPACE,
  version: KIT_VERSION,
  repo: 'https://github.com/your-org/my-kit',
  source: 'components/demo-kit/impl.js',
  components: {
    PanelKit: { factory: PanelKit, kind: 'element' },
    MetricKit: {
      factory: MetricKit,
      kind: 'element',
      props: { value: { live: true }, label: { live: true } }
    },
    BadgeKit: { factory: BadgeKit, kind: 'element', childrenProp: 'children' }
  }
});
```

组件条目（descriptor）上能写的键：

| 键                        | 作用                                                                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `factory`                 | 组件工厂（必填），形状 `(props, place) => 节点`                                                                                                                |
| `kind`                    | `'element'`：工厂返回元素 / 节点，内容按 `place` 落位（要往它里面投 slot 内容时会自动包一层透明 vNode，DOM 结构不变）；不写即 `'component'`                    |
| `props`                   | **props 映射表**：默认按名字透传、落"当次值"快照；写 `{ live: true }` 才把活值句柄原样交给组件；也可以用 `attr:` / `style:` / `class:` / `command:` 前缀换通道 |
| `childrenProp`            | 内容走 prop（GenUI 在调用工厂**之前**把子节点渲染好塞进 `props.children`）                                                                                     |
| `textProp`                | 节点级 `text` 短写落到哪个命令（如 `textProp: 'label'` → `view.label(text)`）                                                                                  |
| `childCommand`            | 内容走命令回调（命令里拿到的就是内容宿主）                                                                                                                     |
| `itemBridge`              | 容器 + 项的桥（如 `vTabs` 的 `vTab`）：项自己走容器命令，内容进项的 content 位                                                                                 |
| `aliases` / `description` | 别名 / 描述（别名只影响引用写法，不改全名）                                                                                                                    |

两条容易踩的：

- **`childrenProp` 与节点级 `text` 短写互斥**：声明了 `childrenProp` 的组件，schema 里的
  `"text": "..."` 不会再到组件（文本通道让位给内容通道）——文本写 `props.text`，
  并在 `dataContract` 里写清楚，模型才知道怎么用；
- **默认是快照，不是活值**：不写 `live: true`，GenUI 落的是当次求值结果；要"写数据即更新"
  的 props 必须声明 `live: true`。

### 5.3 包 yoya-ui 组件（最常写的形态）

kit 组件经常只是"把一个 yoya-ui 组件包成 JSON 面"：

```js
import { vBadge } from '@yoyaflow/yoya-ui/ui';

export function BadgeKit(props = {}) {
  const { children, count, text, status, dot } = props;

  return vBadge({ children, count, text, status, dot }); // 句柄原样传进去，vBadge 自己按活值处理
}
```

配 `kind: 'element'` + `childrenProp: 'children'` + `props: { count: { live: true } }` 即可。要点：

- `@yoyaflow/yoya-core` / `@yoyaflow/yoya-ui` 是 **peerDependency**（构建保持 external）：
  自己写进 `dependencies` 会在宿主里装出第二份 core，单例就断了；
- 组件内部的样式要么写在 kit 自己的 JS 里（内联 / CSS 变量），要么内联进产物——
  宿主只 `import()` 一个 JS 入口，不会去认你的 CSS 文件；
- 组件内部的"命令"（如 `badge.count()`）留在 kit 实现里就行，JSON 面只暴露 props；
  能用句柄 props 表达的更新，不要新加命令。

## 6. 清单字段怎么写

`component.json` 里的每个字段都会进 `kit.json`，**模型选型时读到的就是这几段**，
所以它们不是注释，是接口。三级披露纪律：能改变选型的（分类 / 场景 / summary /
whenToUse / notFor）写足，写法细节放 `dataContract` 与 `props`，坑写 `pitfalls`。

| 字段           | 必填 | 怎么写                                                             |
| -------------- | ---- | ------------------------------------------------------------------ |
| `shortName`    | 是   | PascalCase 短名（`PanelKit`），生成器展开成 `namespace#PanelKit`   |
| `category`     | 是   | 只取 `kit.json` 的 `categoryVocabulary` 里的词（要加新分类先登记） |
| `summary`      | 是   | 一句话：这个组件是什么（选型摘要）                                 |
| `dataContract` | 是   | 数据契约：内容位 + 关键 props 的形状，含活值 / 双向说明            |
| `props`        | 是   | `{ 属性名: "取值示例或类型" }`，每个都要写                         |
| `scenes`       | 建议 | 场景标签（进 `indexes/by-scene.json`，便于"按场景找组件"）         |
| `whenToUse`    | 建议 | 什么时候用它                                                       |
| `notFor`       | 建议 | 什么时候别用它（指向替代组件，模型就不会乱选）                     |
| `pitfalls`     | 建议 | 踩过的坑：写清正确写法与默认值陷阱                                 |
| `entry`        | 是   | 实现文件（目录级给一份 `entry`，单个组件条目可覆盖）               |

## 7. 活值与数据模型

schema 里的联动一律写在数据模型上，kit 组件只负责"哪个 props 吃句柄"：

```json
{
  "data": { "metrics": { "orders": 128 } },
  "root": {
    "type": "my-org/my-kit#MetricKit",
    "props": { "label": "今日订单", "value": "@:/metrics/orders", "unit": "单" }
  }
}
```

- `value` 声明了 `live: true` → 拿到的是**活值句柄**：`surface.data.write('/metrics/orders', 999)`
  之后节点**原地**变成 999（不重建整棵树）；
- 没声明 `live` 的 props 落快照；要联动就换成引用，或把该 props 声明成 `live: true`；
- **组件里不要做构建期归一化**：`String(prop)` / `Number(prop)` / `prop || 默认值` 会把句柄吃成常量，
  联动静默断掉。状态存原样（句柄或普通值），映射写成 `computed(() => ...)`；
- 派生、校验、显隐这类"页面级"逻辑属于 schema（`computed` / `validate` / 条件渲染），
  不要搬进 kit 组件——kit 是组件，不是页面。

## 8. 打包与发布

```bash
npm run verify       # kit:check + test + build
```

- **产物**：`dist/yoya.kit.js`（ESM）。`kit.json` 的 `runtime.entry` 指向它，
  `runtime.export` 指向 `src/index.js` 导出的 `kitPlugin`；
- **external**：`@yoyaflow/*` 不进产物（`vite.config.js` 里一条 `external`），
  自己的依赖（echarts、dayjs…）可以放心打进去；
- **peerDependencies**：`@yoyaflow/yoya-core` / `@yoyaflow/yoya-ui` 只声明 peer；
  发布时 `files` 里带上 `kit.json` / `dist` / `components` / `indexes` 与类型声明；
- **`process.env.NODE_ENV`**：产物里替换成字面量，才能在无 Node global 的环境初始化
  （模板的 `vite.config.js` 已经配好）；
- **版本**：一个运行时里同一个库只能有一个版本（宿主会拒绝装第二个）；
  升级用 `package.json` + `impl.js` 的 `KIT_VERSION` 两处一起改。

## 9. 让宿主用上它

genui-mcp（推荐，一次配好）：

```powershell
$env:GENUI_MCP_KITS = "D:\path\to\my-kit\kit.json"   # 多个用路径分隔符隔开
```

程序化接入：

```js
import { createGenUI } from '@yoyaflow/yoya-core/genui';
import { kitPlugin } from './dist/yoya.kit.js';

const genui = createGenUI();
const dispose = genui.use(kitPlugin); // dispose() 整族卸载
const surface = genui.fromJson(schema);

surface.bindTo(document.querySelector('#app'));
```

宿主侧的校验与隔离（`genui-mcp`）：`namespace` 必须形如 `owner/repo`、`version` 非空、
`components[].name` 必须是 `namespace#PascalCase`、`runtime.entry` 必须是 kit 目录内的本地
`.js/.mjs`；同名组件（跨 kit 或与已装库撞名）直接拒绝加载；清单不合法 = 启动即失败，
不会"半加载"出一个和实现不一致的能力面。

## 10. 常见问题

| 现象                                          | 原因与处理                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 页面出现黄黑斜纹占位块 / `data-genui-unknown` | `type` 没解析到：短名拼错、namespace 不匹配（要写 `namespace#短名`），或者宿主没 `GenUI.use(kitPlugin)` |
| 组件的 props 全是 `undefined`                 | props 写在 `props: {...}` 里了吗（不是直接写在节点上）；名字与 `component.json` 的契约一致吗            |
| 写数据模型视图不动                            | 该 props 没声明 `{ live: true }`；或者组件里做了 `String()` / `Boolean()` 归一化把句柄吃成常量          |
| 节点级 `text` 不生效                          | 组件声明了 `childrenProp`（文本通道让位给内容通道）：文本写 `props.text`                                |
| 内容没出现在预期位置                          | 组件没调用 `place?.(root)`，或者又把内容手动 `child()` 了一遍（一个落点一份内容）                       |
| `kit:check` 报"元数据不一致"                  | `impl.js` 的 `KIT_NAMESPACE` / `KIT_VERSION` / `repo` / `source` 与 `kit.json` 不同真：按提示改         |
| `kit:check` 报"与源码不一致"                  | 只改了 `component.json` 没重跑 `npm run kit:generate`                                                   |
| 宿主提示 `runtime.entry 不存在`               | 先 `npm run build`（`dist/yoya.kit.js` 还没打出来）；entry 必须是 kit 目录内的本地 `.js/.mjs`           |
| 宿主提示"组件名冲突"                          | 短名与已装库 / 内建组件撞了：改短名（PascalCase 语义名，别用 `v` 前缀）                                 |
| props 里想传函数                              | 传不了：JSON 面只吃数据。格式化用字符串模板，映射用数据驱动，交互走 `action`                            |
