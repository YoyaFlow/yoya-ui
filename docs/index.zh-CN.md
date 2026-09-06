# yoya-ui 文档（中文）

本文档集面向 yoya-ui 的使用者与组件生态作者，说明"yoya-ui 是什么、怎么用、怎么扩展"。内部开发过程、路线图与任务规格不放在本目录，统一归档在 [`docs/_bak/`](_bak/)，`docs/superpowers` 已删除。

## 命名与文件规划

- 中文文档统一使用 `*.zh-CN.md` 后缀（与仓库根目录 `README.zh-CN.md` 的惯例一致）。
- 英文版在 `feat/docs-en` 分支推进，使用同名 `*.md` 文件（`docs/ssr.md` 对 `docs/ssr.zh-CN.md`），中文为源，英文为译文。
- 每个文档只讲一个主题，互相用链接衔接，不在多篇文档重复同一份规范；如需改写，先动中文源，再同步英文。

## 文档集合

| 文件                                                           | 内容                                          | 来源 / 状态                                         |
| -------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------- |
| [`index.zh-CN.md`](index.zh-CN.md)                             | 文档导航与内容规划（本页）                    | 新建                                                |
| [`highlights.zh-CN.md`](highlights.zh-CN.md)                   | 特性亮点：DSL、i18n、权限、SSR 双模式、表单等 | 由 `_bak/highlights.md` 重建                        |
| [`access-control.zh-CN.md`](access-control.zh-CN.md)           | 权限控制使用指南                              | 由 `_bak/access-control.md` 重建                    |
| [`ssr.zh-CN.md`](ssr.zh-CN.md)                                 | 服务端渲染集成指南                            | 由 `_bak/ssr.md` 重建                               |
| [`theme.zh-CN.md`](theme.zh-CN.md)                             | 主题样式规范                                  | 由 `_bak/theme-styling.md` 重建并改名               |
| [`devtools.zh-CN.md`](devtools.zh-CN.md)                       | DevTools 使用指南                             | 由 `_bak/devtools.md` 重建                          |
| [`component-authoring.zh-CN.md`](component-authoring.zh-CN.md) | 组件库开发指南（第三方 / 生态作者）           | 由 `_bak/component-library-authoring.md` 重建并改名 |

## 阅读路径建议

1. 先读根目录 `README.zh-CN.md` 了解定位与快速上手；
2. 特性总览看 `highlights.zh-CN.md`；组件清单以示例站组件目录与源码为准，不再维护独立清单文档；
3. 按场景查阅 `access-control.zh-CN.md` / `ssr.zh-CN.md` / `theme.zh-CN.md` / `devtools.zh-CN.md`；
4. 要扩展组件生态时读 `component-authoring.zh-CN.md`。

## 归档内容（`docs/_bak/`，不再对外发布）

| 旧文件                           | 类型                                          | 处理                                                     |
| -------------------------------- | --------------------------------------------- | -------------------------------------------------------- |
| `roadmap.md`                     | 开发任务清单（特性状态 / 待实现 / 不纳入）    | 归档，不再作为对外文档                                   |
| `spec-super-table-foundation.md` | 单期功能开发规格（任务票式）                  | 归档                                                     |
| `component-development-spec.md`  | 内部开发规格（Problem / User Stories / 决策） | 归档，其常驻契约并入 `component-authoring.zh-CN.md` 维护 |
| `source-demo-spec.md`            | 仓库内演示代码开发规则                        | 归档；仓库开发说明以 `AGENTS.md` 为准，引用路径待同步    |
| `yoya-basic-core-summary.md`     | 旧仓库 `yoya-basic` 历史技术总结              | 归档，不对外                                             |

## 待确认事项

1. 上述"对外说明"与"归档"的边界是否符合预期（尤其 `component-development-spec.md`、`source-demo-spec.md` 这两篇内部规范）？
2. 文件名 `theme.zh-CN.md`、`component-authoring.zh-CN.md` 是否合适，还是保留旧名 `theme-styling` / `component-library-authoring`？
3. 文档结构确认后，会同步更新 `README.md` / `README.zh-CN.md` / `AGENTS.md` / `skills` 中对旧 `docs/*.md` 路径的引用，再开始英文翻译。
