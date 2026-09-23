import { div, ref, router, vNode, vRouterView, vText, vstack } from '../../index.js';

export function RouterParamsCard() {
  const appRouter = router((routes) => {
    routes.default('/home');
    routes.route('/home', () => div('首页'));
    routes.route('/users/:id', () => import('../async-router-user.js'));
  });
  const outlet = vRouterView(appRouter);
  const status = ref('暂无导航');
  const unsubscribe = appRouter.subscribe((context) => {
    status.value = `当前 ${context.path} / 参数 ${JSON.stringify(context.params)}`;
  });
  appRouter.navigate('/home', { replace: true });

  return vNode((api) => {
    api.whenDestroy = () => {
      unsubscribe();
    };

    return vstack((stack) => {
      stack.style('gap', '12px');
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
    output.child(vText(status));
      });
    });
  });
}
