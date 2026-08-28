import { div, router, vCard, vRouterView, vText } from '../../index.js';

export function RouterParamsCard() {
  const appRouter = router((routes) => {
    routes.default('/home');
    routes.route('/home', () => div('首页'));
    routes.route('/users/:id', () => import('../async-router-user.js'));
  });
  const outlet = vRouterView(appRouter);
  const status = vText('暂无导航');
  const unsubscribe = appRouter.subscribe((context) => {
    status.textContent(`当前 ${context.path} / 参数 ${JSON.stringify(context.params)}`);
  });
  appRouter.navigate('/home', { replace: true });

  return {
    destroy() {
      unsubscribe();
    },
    render() {
      return vCard((card) => {
        card.vCardHeader('参数传递');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '12px');
            stack.p('default 页面函数接收 context，参数通过 options 传给子组件，currentParams() 随时可读。');
            stack.hstack((nav) => {
              nav.styles({ flexWrap: 'wrap', gap: '10px' });
              nav.vLink(appRouter, { label: '首页', replace: true, to: '/home' });
              [1, 2, 3].forEach((id) => {
                nav.vLink(appRouter, {
                  label: `用户 ${id}`,
                  params: { id },
                  replace: true,
                  to: '/users/:id'
                });
              });
            });
            stack.child(outlet);
            stack.output((output) => {
              output.className('router-params-status');
              output.attr('data-router-params-status', 'true');
              output.child(status);
            });
          });
        });
      });
    }
  };
}
