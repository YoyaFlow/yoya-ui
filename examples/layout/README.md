# Layout 布局组件示例

这个目录演示 `container`、`grid`、`flex`、`stack`、`hstack`、`vstack`、`center`、`spacer` 和 `divider` 的组合方式。

示例保持和基础元素一致的父级回调写法：

```js
section((page) => {
  page.container((shell) => {
    shell.vstack((body) => {
      body.hstack((row) => {
        row.h1('Layout 布局组件');
        row.spacer();
        row.button('切换指标列数');
      });
    });
  });
});
```

当前演示包含：

- `container`：页面内容宽度和左右内边距。
- `vstack`：页面主流程垂直排列。
- `hstack + spacer`：标题区左右分布。
- `grid`：指标卡片和两栏工作区。
- `flex`：过滤按钮工具条。
- `stack`：居中预览中的垂直内容。
- `divider`：横向区域分隔和行内竖向分隔。
- `center`：空状态或局部预览居中。
- 一个按钮事件，用于在四列指标和两列指标之间切换。

运行方式：

```bash
npm run examples:layout
```

然后打开 Vite 输出的地址，访问 `/examples/layout/index.html`。
