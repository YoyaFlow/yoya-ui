# 06 — 补齐非颜色 token 并让组件消费

**What to build:** 空间、字体、控件尺寸、层级、动效、边框等维度全部由 token 提供，组件视觉不再依赖硬编码数值，用户可通过 token 调整整体观感。

**Blocked by:** 05 — 颜色 token 收敛：raw + color-mix + light-dark 单文件双模式

**Status:** ready-for-agent

- [ ] 新增空间/字体/控件尺寸/层级/动效/边框 token 并给出默认值。
- [ ] 组件与布局中的同类硬编码值迁移为由 token 消费。
- [ ] 调整单个 token 即可改变对应维度的全局观感，有示例演示。
- [ ] 现有测试、示例与构建通过。