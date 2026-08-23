# 13 — 开发 vChart 图表适配组件

**What to build:** 提供不绑定具体图表库的图表宿主组件，使外部适配器可以初始化、更新、调整尺寸并销毁图表实例。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 定义初始化、数据更新、resize 和 destroy 的适配协议。
- [ ] 核心组件不直接打包 ECharts，ECharts 通过可选适配入口接入。
- [ ] 处理组件销毁和重复初始化，并提供测试及轻量演示。
