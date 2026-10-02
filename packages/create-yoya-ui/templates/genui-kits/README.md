# GenUI kit 模板（create-yoya-ui --template genui-kits）

一个**能被 GenUI 宿主（genui-mcp / yoya-genui）动态装载的组件包**：你写组件，
模型只写 JSON，就能用上你的组件。

```bash
npx create-yoya-ui my-kit --template genui-kits
cd my-kit
npm install
npm run dev        # 打开调试台：组件目录 + examples/*.json 的实时渲染
```

生成后请先做两件事：

1. 把 `kit.json` 的 `namespace` / `repo`，以及组件实现里的同名元数据
   （`KIT_NAMESPACE` / `repo` / `source`，见 `components/demo-kit/impl.js`）改成你自己的组织与仓库
   —— `npm run kit:check` 会核对这几处；
2. 把 `components/demo-kit/` 换成你自己的组件族（或照着它复制一份）。

## 目录规则

```text
my-kit/
├─ kit.json                  # 宿主唯一入口：namespace / version / runtime / 组件索引（生成物）
├─ components/
│  └─ demo-kit/
│     ├─ component.json      # 组件元数据真相源（一个目录可声明一族组件）
│     ├─ impl.js             # 运行时：组件实现 + 组件族插件
│     └─ examples/           # 示例 schema（调试台渲染的就是它）
├─ indexes/                  # 生成物：by-category / by-scene
├─ playground/               # 本地调试台（不进产物）
├─ src/index.js              # npm 包出口 + kitPlugin（kit.json 的 runtime.export）
├─ scripts/generate-kit.mjs  # component.json → kit.json + indexes
└─ test/kit.test.js          # 自检：清单同真 / 插件装得上 / 示例渲染 / 活值
```

- **`components/*/component.json` 是元数据唯一真源**，`kit.json` 与 `indexes/` 都是生成物，不要手改。
- **版本只有一处**：`package.json` 的 `version`；生成时写进 `kit.json`，并核对实现里的 `KIT_VERSION`。
- 组件名只写 PascalCase 短名（`PanelKit`），生成器自动展开成 `my-org/my-kit#PanelKit`。

## 运行过程脚本

| 命令                   | 干什么                                                           |
| ---------------------- | ---------------------------------------------------------------- |
| `npm run dev`          | 调试台（默认 5180 端口）：组件目录 + 示例渲染 + 写数据按钮       |
| `npm run kit:generate` | 由 `components/*/component.json` 重写 `kit.json` 与 `indexes/`   |
| `npm run kit:check`    | CI 门禁：清单与实现同真（不一致退出码 1）                        |
| `npm test`             | vitest：清单同真 / 插件装载 / 每份示例渲染 / 活值原地更新        |
| `npm run build`        | 打包浏览器制品 `dist/yoya.kit.js`（`@yoyaflow/*` 保持 external） |
| `npm run preview`      | 预览调试台的构建产物（`playground-dist/`）                       |
| `npm run verify`       | `kit:check` + `test` + `build` 的组合（提交前跑这个就够）        |

## 写一个组件

1. 在 `components/<族>/impl.js` 里写工厂：`(props, place) => 节点`；
2. 在 `components/<族>/component.json` 的 `components[]` 里登记它的 `shortName` / `category` /
   `summary` / `dataContract` / `whenToUse` / `notFor` / `props` / `pitfalls`（这些就是模型看到的选型信息）；
3. 在 `components/<族>/impl.js` 的组件表里登记它：`{ factory, kind: 'element', props: {...} }`；
4. 加一份 `examples/*.json`，`npm run dev` 里就能看见；
5. `npm run verify`。

最小形态：

```js
/** @type {(props?: { label?: string }) => unknown} */
export function TagKit(props = {}, place) {
  return span({ vn: 'TagKit', style: { padding: '2px 8px' } }, (node) => {
    node.child(props.label ?? '');
    place?.(node);
  });
}
```

组件表里的三个开关：

- `kind: 'element'` → 工厂是 `(props, place)` 形态（内容自己落位）；
- `props: { 名字: { live: true } }` → 这个 props 收**活值句柄**（`"@:/路径"` 引用的联动基础），
  不声明就是"落当次值"的快照；
- `childrenProp: 'children'` / `textProp: 'text'` → 内容 / 文本走的通道（包 yoya-ui 组件时常要写）。

## 让宿主用上它

```powershell
# genui-mcp：把 kit.json 写进信任路径（agent 不能自己新增来源）
$env:GENUI_MCP_KITS = "D:\path\to\my-kit\kit.json"
```

装载链路：`GENUI_MCP_KITS → kit.json → runtime.entry (dist/yoya.kit.js) → GenUI.use(kitPlugin)`；
页面退出时逆序卸载。浏览器里试：

```js
import { createGenUI } from '@yoyaflow/yoya-core/genui';
import { kitPlugin } from './dist/yoya.kit.js';

const genui = createGenUI();
const dispose = genui.use(kitPlugin); // dispose() 整族卸载
```

## 纪律

- **`@yoyaflow/yoya-core` / `@yoyaflow/yoya-ui` 是 peerDependency**：由宿主提供，构建保持 external。
  自己写进 `dependencies` 会在宿主里装出第二份 core，单例就断了。
- **组件名不撞车**：`kit.json` 里同名（跨 kit 或与已装库撞名）宿主直接拒绝加载；
  第三方短名用 PascalCase 语义名，**不要用 `v` 前缀**（`v*` 是 yoya-ui 官方工厂保留）。
- **只传 JSON**：props 里进不来函数，格式化 / 映射一律用字符串模板或数据驱动。
- **活值别 `String(...)`**：`live: true` 的 props 到的是句柄，一旦按构建期常量归一化，联动就静默断掉。
- 组分（分类 / 场景）只用 `kit.json` 的 `categoryVocabulary` 里的词；要加先登记。

更多：官方文档 [`docs/genui-kit.zh-CN.md`](https://github.com/yoyaflow/yoya-ui/blob/main/docs/genui-kit.zh-CN.md)
（结构、协议接线、发布与打包、常见问题）。
