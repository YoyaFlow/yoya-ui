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

| 标签              | manifest 字段  | 说明                       |
| ----------------- | -------------- | -------------------------- |
| `@genui`          | `summary`      | 一句话选型摘要             |
| `@genui.contract` | `dataContract` | 数据契约                   |
| `@genui.use`      | `whenToUse`    | 适用场景（`；`分隔成数组） |
| `@genui.notFor`   | `notFor`       | 不适用场景                 |
| `@genui.pitfall`  | `pitfalls`     | 易踩坑                     |
| `@genui.example`  | `example`      | 一行合法 JSON              |

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
