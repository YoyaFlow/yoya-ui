# Router 路由演示

这个目录演示 `router()` 的基础页面切换能力。下面的完整模块可以直接复制到 `app-router.js` 使用：

```js
import { div, router, section, vText } from 'yoya-ui';

const links = [
  ['/overview', '概览'],
  ['/users/42?tab=profile', '用户详情'],
  ['/orders/2026-08?status=open', '订单列表'],
  ['/admin', '受保护'],
  ['/missing', '未匹配']
];

export function renderAppRouterExample(target = '#app') {
  const currentPathText = vText('当前路径：/overview');
  const paramsText = vText('参数：{}');
  const queryText = vText('查询：{}');
  const guardText = vText('守卫状态：等待导航');
  const navButtons = [];
  let appRouter = null;

  const updateRouterState = () => {
    const path = appRouter.currentPath();
    currentPathText.textContent(`当前路径：${path}`);
    paramsText.textContent(`参数：${JSON.stringify(appRouter.currentParams())}`);
    queryText.textContent(`查询：${JSON.stringify(appRouter.currentQuery())}`);
    navButtons.forEach((button) => {
      button.attr('aria-current', button.attr('data-route') === path ? 'page' : null);
    });
  };

  appRouter = router((r) => {
    r.default('/overview');
    r.beforeEach((to) => {
      guardText.textContent(`守卫通过：${to.path}`);
      return true;
    });
    r.route('/overview', () => section((view) => {
      view.h2('路由概览');
      view.p('当前页面由 router outlet 承载。');
    }));
    r.route('/users/:id', ({ params, query }) => section((view) => {
      view.h2(`用户 ${params.id}`);
      view.p(`当前标签：${query.tab || 'summary'}`);
    }));
    r.route('/orders/:month', ({ params, query }) => section((view) => {
      view.h2(`订单 ${params.month}`);
      view.p(`筛选状态：${query.status || 'all'}`);
    }));
    r.route('/admin', {
      beforeEnter: ({ path }) => {
        guardText.textContent(`守卫拦截：${path} 需要权限`);
        return false;
      },
      view: () => div('管理后台')
    });
    r.notFound(({ path }) => section((view) => {
      view.h2('未匹配路由');
      view.p(`未找到 ${path}`);
    }));
  });

  const root = section((page) => {
    page.id('app-router');
    page.h1('后台应用路由');
    page.nav((nav) => {
      links.forEach(([path, label]) => {
        nav.button((button) => {
          navButtons.push(button);
          button.attr('type', 'button').attr('data-route', path);
          button.text(label);
          button.on('click', () => {
            appRouter.navigate(path);
            updateRouterState();
          });
        });
      });
    });
    page.output((output) => output.child(currentPathText));
    page.code((code) => code.child(paramsText));
    page.code((code) => code.child(queryText));
    page.output((output) => output.child(guardText));
    page.section((outlet) => outlet.child(appRouter));
  });

  root.bindTo(target);
  appRouter.start();
  updateRouterState();
  return root;
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  renderAppRouterExample('#app');
}
```

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
