# 05 — 颜色 token 收敛：raw + color-mix + light-dark 单文件双模式

**What to build:** 覆盖一组原始色板即可让整套组件颜色跟随（hover/active/subtle/ring 自动派生）；一份主题样式文件同时支持浅色、深色和跟随系统三种模式，不再存在重复的暗色定义。

**Blocked by:** 04 — @layer 与 :where 层叠保障

**Status:** ready-for-agent

- [ ] 原始色板以可派生方式注册，语义变体色由派生计算得出。
- [ ] 覆盖单个原始色板后，主色与其 hover/active/subtle/ring 等变体全部联动。
- [ ] 同一份文件经模式开关支持浅色/深色/跟随系统，重复暗色块删除。
- [ ] 既有消费端引用的 token 名保持不变，SSR 输出不受影响。
- [ ] 主题契约测试验证 token 存在、派生联动与模式切换。