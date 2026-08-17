# Router 路由演示

这个目录演示 `router()` 的基础页面切换能力。

核心约定：

- `router()` 是一个 hash router outlet，挂载后通过 `.start()` 开始监听。
- `route('/users/:id', view)` 支持动态参数。
- `query` 通过 route context 传入视图函数。
- `beforeEach()` 和单路由 `beforeEnter` 可以阻止导航。
- `notFound()` 负责未匹配路径。

运行方式：

```bash
npm run examples:router
```

然后打开 Vite 输出的地址，访问 `/examples/router/index.html`。
