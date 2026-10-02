# 页面声明

`*.genui.json` 是**页面真相**（可 diff、可 review、可提交）。

- 只写声明：布局、组件、绑定、`@actions:/<key>`；**不写地址**（地址在运行时目录 / 部署方的 hosts）；
- 活绑定的 key 要同时出现在 `meta.queries` 里（本页是 `orders_page`）；
- 组件能力面 = 基础库（yoya-ui 内建）+ 已加载的 kit —— 越权组件会被校验层直接拒绝；
- 构建期由编译插件把它转成 yoya-ui 模块（JSON 是真相、JS 是产物，票 08）。

本页示范了三件事：① `sources` 声明一条取数（`@actions:/orders_page`）；② 筛选值放在 `data.query`，
改了它 → `sources` 的 `params` 依赖变了 → 自动重取；③ 读值走 `@:/…` / `{/…}`（页面拿不到 SQL 与地址）。
