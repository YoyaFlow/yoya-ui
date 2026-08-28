import { div, router, vCard, vRouterView } from '../../index.js';

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
      return vCard((card) => {
        card.vCardHeader('异步按需加载');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '12px');
            stack.p('view 返回 import() 模块：先显示 loading，模块就绪后执行 export default 页面并传入 context。');
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
        });
      });
    }
  };
}
