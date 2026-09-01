# yoya-ui SSR 示例项目

基于 [yoya-ui](https://github.com/yoyaflow/yoya-ui) 的服务端渲染模板：

- 页面即组件：`HomePage(state)` 服务端与客户端共用
- 整页渲染：`renderPage({ page }, state, { messages })` 一行输出完整 HTML
- 客户端一行接入：`hydrateOrMount(HomePage, { messages })`
- 每请求 i18n：`messages` 按 `state.lang` 建实例，`.s()` 自动作用域

## 启动

```bash
npm install
npm run build   # 生成 dist/client.js 与 dist/assets/yoya.ui.css
npm start       # http://localhost:3000
```

## 结构

```text
src/
  home-page.js   页面组件 + 词典（两端共用）
  server.mjs     node:http 服务端（renderPage 整页渲染 + 静态资源）
  client.js      浏览器入口（hydrateOrMount）
```

语言标识：切换语言时写 cookie（如 `document.cookie = 'yoya-lang=en; path=/'`），服务端从 cookie 解析 `lang` 传入 `renderPage`。

## 学习资源

- SSR 集成与底层原语（renderToString / hydrate / mount）见 [docs/ssr.md](https://github.com/yoyaflow/yoya-ui/blob/main/docs/ssr.md)
- 完整 API 见包内类型声明（`types/*.d.ts`）
