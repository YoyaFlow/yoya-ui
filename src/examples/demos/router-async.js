import { div, router, vRouterView, vstack } from '../../index.js';

export function RouterAsyncCard() {
  const appRouter = router((routes) => {
    routes.loading(() => div('页面加载中…'));
    routes.route('/home', () => div('首页'));
    routes.route('/dashboard/:id', () =>
      new Promise((resolve) => setTimeout(resolve, 600)).then(() =>
        import('../async-router-dashboard.js')
      )
    );
  });
  const outlet = vRouterView(appRouter);
  appRouter.navigate('/home', { replace: true });

  return {
    render() {
      return vstack((stack) => {
            stack.style('gap', '12px');
            stack.hstack((nav) => {
              nav.styles({ flexWrap: 'wrap', gap: '10px' });
              nav.vLink(appRouter, { label: '首页', replace: true, to: '/home' });
              nav.vLink(appRouter, {
                label: '分析面板',
                params: { id: 42 },
                query: { tab: 'stat' },
                replace: true,
                to: '/dashboard/:id'
              });
            });
            stack.child(outlet);
          });
    }
  };
}
