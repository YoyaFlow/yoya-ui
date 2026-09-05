# 06 — 参考调试面板

**What to build:** 示例站提供最小参考调试面板：左侧视图树、选中节点详情（tag/class/attr/state/scope）、右侧按 seq 排列的事件时间线，并支持点击树节点在页面高亮对应 DOM；证明 devtools API 足够被真实消费方使用，不追求 React DevTools 级 UI。

**Blocked by:** 02 — 视图树快照与节点身份；03 — 细粒度更新事件；04 — vStateNode 状态可观测；05 — 作用域可观测

**Status:** ready-for-agent

- [ ] 面板可展开/折叠，树与真实 DOM 高亮联动
- [ ] 选中节点详情显示快照字段、状态与作用域信息
- [ ] 事件时间线按 seq 单调展示，可筛选 mount/update/destroy/state
- [ ] 面板只消费公开 devtools API（独立入口），不依赖内部私有字段
- [ ] 演示符合源码演示规范（页面壳与演示分离、复用 ComponentSource）
