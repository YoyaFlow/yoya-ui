# yoya-ui 文档（中文）

本文档集面向 yoya-ui 的使用者与组件生态作者，说明"yoya-ui 是什么、怎么用、怎么扩展"。内部开发过程、路线图与任务规格不放在本目录。

## 命名与文件规划

- 中文文档统一使用 `*.zh-CN.md` 后缀（与仓库根目录 `README.zh-CN.md` 的惯例一致）。
- 英文版在 `feat/docs-en` 分支推进，使用同名 `*.md` 文件（`docs/ssr.md` 对 `docs/ssr.zh-CN.md`），中文为源，英文为译文。
- 每个文档只讲一个主题，互相用链接衔接，不在多篇文档重复同一份规范；如需改写，先动中文源，再同步英文。

## 文档集合

| 文件                                                                                       | 内容                                                                                   | 来源 / 状态     |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | --------------- |
| [`index.zh-CN.md`](index.zh-CN.md)                                                         | 文档导航与内容规划（本页）                                                             | 新建            |
| [`why-yoya-ui.zh-CN.md`](why-yoya-ui.zh-CN.md)                                             | 定位长文：九点理由、与框架的差异、取舍与评估方式                                       | 从 README 迁入  |
| [`highlights.zh-CN.md`](highlights.zh-CN.md)                                               | 特性亮点：DSL、i18n、权限、SSR 双模式、表单等                                          | 重建            |
| [`install.zh-CN.md`](install.zh-CN.md)                                                     | 安装与导入：三种接入方式、各包导出物清单、CDN 与 import map、常见错误                  | 新建            |
| [`access-control.zh-CN.md`](access-control.zh-CN.md)                                       | 权限控制使用指南                                                                       | 重建            |
| [`api.zh-CN.md`](api.zh-CN.md)                                                             | 请求命令、传输注册与 Result 映射                                                       | 新建            |
| [`ssr.zh-CN.md`](ssr.zh-CN.md)                                                             | 服务端渲染集成指南                                                                     | 重建            |
| [`theme.zh-CN.md`](theme.zh-CN.md)                                                         | 主题样式规范                                                                           | 重建并改名      |
| [`devtools.zh-CN.md`](devtools.zh-CN.md)                                                   | DevTools 使用指南                                                                      | 重建            |
| [`component-authoring.zh-CN.md`](component-authoring.zh-CN.md)                             | 组件库开发指南（第三方 / 生态作者）                                                    | 重建并改名      |
| [`interop.zh-CN.md`](interop.zh-CN.md)                                                     | 第三方库接入：交出真实 DOM 元素（vEchart 参照实现与扩展开口）                          | 从 README 迁入  |
| [`browser-support.zh-CN.md`](browser-support.zh-CN.md)                                     | 浏览器基线、降级台账、支持更老浏览器的写法                                             | 新建            |
| [`agents.zh-CN.md`](agents.zh-CN.md)                                                       | AI 代码助手阅读指南：如何阅读本仓库、如何生成与评估代码                                | 从 README 迁入  |
| [`performance.zh-CN.md`](performance.zh-CN.md)                                             | 官方 js-framework-benchmark 实测：对比原生 `vanillajs`                                 | 表格生成 + 门禁 |
| [`compiler.zh-CN.md`](compiler.zh-CN.md)                                                   | 可选的构建期编译路径：编译器 + 运行期钩子                                              | 新增            |
| [`component-comparison.zh-CN.md`](component-comparison.zh-CN.md)                           | 组件对照：Ant Design / Element Plus ↔ yoya-ui；扩展库接入对比（React / Vue / yoya-ui） | 新建            |
| [`artifacts-plan.md`](artifacts-plan.md)                                                   | 产物方案：发什么、用什么名字发、谁在哪个口径用（发布面重排）                           | 新建            |
| [`feedback/security-review-feedback.zh-CN.md`](feedback/security-review-feedback.zh-CN.md) | 安全评审反馈：哪些成立、哪些不成立                                                     | 新建            |
| [`feedback/beginner-feedback.zh-CN.md`](feedback/beginner-feedback.zh-CN.md)               | 初级开发者 44 问质疑清单：三分类复盘 + 文档改进 backlog                                | 新建            |
| [`feedback/reactive-engine-feedback.zh-CN.md`](feedback/reactive-engine-feedback.zh-CN.md) | 响应式引擎生产评审反馈：区域重建、信号传播、错误边界等 7.5 问逐条回应                  | 新建            |

## 阅读路径建议

1. 先读根目录 `README.zh-CN.md` 了解定位、适用人群与快速上手；装进项目、按入口导入（含各包导出物清单）看 `install.zh-CN.md`；
2. 定位长文看 `why-yoya-ui.zh-CN.md`；特性总览看 `highlights.zh-CN.md`；组件清单以示例站组件目录与源码为准，不维护独立清单文档，跨库对照（Ant Design / Element Plus ↔ yoya-ui、扩展库接入）见 `component-comparison.zh-CN.md`；
3. 按场景查阅 `access-control.zh-CN.md` / `ssr.zh-CN.md` / `theme.zh-CN.md` / `devtools.zh-CN.md`；列表长到「每行成本」开始显眼时，读 `compiler.zh-CN.md` 了解可选的构建期编译路径；
   要确认目标浏览器是否在支持范围内、或用户反馈「样式全丢」，先读 `browser-support.zh-CN.md`；
4. 要扩展组件生态时读 `component-authoring.zh-CN.md`，接入现成第三方库时读 `interop.zh-CN.md`，常见第三方库的接入清单见 `component-comparison.zh-CN.md` 第二节。
5. 用 AI 助手生成或评审本仓库代码前，先读 `agents.zh-CN.md`。
6. 收到针对本库的安全评审时，先读 `feedback/security-review-feedback.zh-CN.md`；整理新手 / Vue / React 背景使用者的反馈或撰写 FAQ 时，先读 `feedback/beginner-feedback.zh-CN.md`；收到针对响应式引擎的生产评审时，先读 `feedback/reactive-engine-feedback.zh-CN.md`。
