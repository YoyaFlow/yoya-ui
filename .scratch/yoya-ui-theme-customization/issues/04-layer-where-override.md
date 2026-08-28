# 04 — @layer 与 :where 层叠保障

**What to build:** 用户任何一条普通规则都能覆盖库的默认样式，无需 !important 或更高特异性选择器，覆盖行为稳定不随库升级漂移。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 库样式统一放入低优先级层，用户未分层规则天然优先。
- [ ] 库选择器采用低特异度写法，特异性战争消失。
- [ ] 覆盖用例测试：用户规则覆盖变体色、尺寸、状态色成功。
- [ ] 现有外观、示例、构建与测试全部保持通过。