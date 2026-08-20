import { div, router, vCard } from '../../../src/index.js';

export function RouterNavigationCard() {
  const appRouter = router((routes) => {
    routes.route('/overview', () =>
      div((page) => {
        page.h3('路由概览');
        page.p('当前视图由 vRouterView 承载。');
      })
    );
    routes.route('/users/:id', ({ params, query }) =>
      div((page) => {
        page.h3(`用户 ${params.id}`);
        page.p(`当前标签：${query.tab || 'summary'}`);
      })
    );
    routes.notFound(({ path }) =>
      div((page) => {
        page.h3('404');
        page.p(`未找到 ${path}`);
      })
    );
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('路由链接与视图');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('vLink 委托现有 Router 导航，vRouterView 负责展示匹配视图和 404。');
            stack.hstack((nav) => {
              nav.className('router-demo-navigation');
              nav.styles({ flexWrap: 'wrap', gap: '10px' });
              nav.vLink(appRouter, { label: '概览', replace: true, to: '/overview' });
              nav.vLink(appRouter, {
                label: '用户详情',
                params: { id: 42 },
                query: { tab: 'profile' },
                replace: true,
                to: '/users/:id'
              });
              nav.vLink(appRouter, { label: '未匹配', replace: true, to: '/missing' });
            });
            stack.vRouterView(appRouter, (view) => view.className('router-demo-outlet'));
          });
        });
        appRouter.navigate('/overview', { replace: true });
      });
    }
  };
}

export const routingCategory = {
  description: '链接导航、活动状态、参数 query 与路由视图。',
  id: 'routing',
  title: '路由导航',
  demos: [
    {
      component: RouterNavigationCard,
      imports: ['div', 'router', 'vCard'],
      title: '路由链接与视图核心源码'
    }
  ]
};
