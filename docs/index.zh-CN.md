# yoya-ui 文档（中文）

本文档集面向 yoya-ui 的使用者与组件生态作者，说明"yoya-ui 是什么、怎么用、怎么扩展"。内部开发过程、路线图与任务规格不放在本目录。

## 命名与文件规划

- 中文文档统一使用 `*.zh-CN.md` 后缀（与仓库根目录 `README.zh-CN.md` 的惯例一致）。
- 英文版在 `feat/docs-en` 分支推进，使用同名 `*.md` 文件（`docs/ssr.md` 对 `docs/ssr.zh-CN.md`），中文为源，英文为译文。
- 每个文档只讲一个主题，互相用链接衔接，不在多篇文档重复同一份规范；如需改写，先动中文源，再同步英文。

## 文档集合

| 文件                                                                     | 内容                                          | 来源 / 状态 |
| ------------------------------------------------------------------------ | --------------------------------------------- | ----------- |
| [`index.zh-CN.md`](index.zh-CN.md)                                       | 文档导航与内容规划（本页）                    | 新建        |
| [`highlights.zh-CN.md`](highlights.zh-CN.md)                             | 特性亮点：DSL、i18n、权限、SSR 双模式、表单等 | 重建        |
| [`access-control.zh-CN.md`](access-control.zh-CN.md)                     | 权限控制使用指南                              | 重建        |
| [`ssr.zh-CN.md`](ssr.zh-CN.md)                                           | 服务端渲染集成指南                            | 重建        |
| [`theme.zh-CN.md`](theme.zh-CN.md)                                       | 主题样式规范                                  | 重建并改名  |
| [`devtools.zh-CN.md`](devtools.zh-CN.md)                                 | DevTools 使用指南                             | 重建        |
| [`component-authoring.zh-CN.md`](component-authoring.zh-CN.md)           | 组件库开发指南（第三方 / 生态作者）           | 重建并改名  |
| [`security-review-feedback.zh-CN.md`](security-review-feedback.zh-CN.md) | 安全评审反馈：哪些成立、哪些不成立            | 新建        |

## 阅读路径建议

1. 先读根目录 `README.zh-CN.md` 了解定位与快速上手；
2. 特性总览看 `highlights.zh-CN.md`；组件清单以示例站组件目录与源码为准，不再维护独立清单文档；
3. 按场景查阅 `access-control.zh-CN.md` / `ssr.zh-CN.md` / `theme.zh-CN.md` / `devtools.zh-CN.md`；
4. 要扩展组件生态时读 `component-authoring.zh-CN.md`。
5. 收到针对本库的安全评审时，先读 `security-review-feedback.zh-CN.md`。
