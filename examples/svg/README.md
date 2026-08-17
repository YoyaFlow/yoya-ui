# SVG 元素演示

这个目录演示 `svg()` 标签入口和 `SvgElementNode` 内部扩展方法。

核心约定：

- 普通 HTML DSL 里只添加 `svg()` 入口。
- SVG 子元素只能在 `svg((icon) => { ... })` 回调内部添加。
- `circle()`、`path()`、`rect()`、`svgText()`、`svgTitle()` 等不会作为顶层导出，也不会出现在普通 HTML 父节点上。
- SVG 节点仍支持 `attr()`、`className()`、`style()`、`on()`、`child()` 和 `toHTML()`。

示例写法：

```js
section((page) => {
  page.svg((icon) => {
    icon.attr({ viewBox: '0 0 24 24', role: 'img' });
    icon.svgTitle('服务状态');
    icon.circle({ cx: 12, cy: 12, r: 9 });
    icon.path({ d: 'M8 12l2.5 2.5L16 9' });
  });
});
```

当前演示包含：

- 状态图标：`svgTitle`、`defs`、`linearGradient`、`circle`、`path`、`svgText`。
- 趋势柱状图：`rect`、`line`、`svgText`，并通过按钮事件更新现有 SVG 子元素。
- 服务拓扑图：`marker`、`path`、`line`、`rect`、`circle`、`svgText`。

运行方式：

```bash
npm run examples:svg
```

然后打开 Vite 输出的地址，访问 `/examples/svg/index.html`。
