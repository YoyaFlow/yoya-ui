import { div, router, vCard, vRoute, vRouter } from '../../../src/index.js';

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

export function DeclarativeRouterCard() {
  const appRouter = vRouter({
    default: '/home',
    notFound: ({ path }) => div(`声明式 404：${path}`),
    routes: [
      vRoute('/home', () => div('声明式首页')),
      vRoute('/projects/:id', ({ params, query }) =>
        div(`项目 ${params.id} / ${query.tab || 'overview'}`)
      )
    ]
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('声明式路由');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('vRouter 负责声明配置，vRoute 描述路径与视图，仍由同一个 Router 执行匹配。');
            stack.vLink(appRouter, {
              label: '项目 42',
              params: { id: 42 },
              query: { tab: 'tasks' },
              to: '/projects/:id'
            });
            stack.vRouterView(appRouter, (view) => view.className('router-demo-outlet'));
          });
        });
        appRouter.navigate('/home', { replace: true });
      });
    }
  };
}

export function RouterViewsEditorCard() {
  const appRouter = vRouter({
    default: '/overview',
    routes: [
      vRoute('/overview', { title: 'overview.js', view: () => div('项目概览内容') }),
      vRoute('/settings', { title: 'settings.js', view: () => div('项目设置内容') })
    ]
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('IDE 风格路由视图');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p(
              '访问过的路由会保留为文件标签；点击 title 切换页面，点击 × 关闭标签。'
            );
            stack.hstack((tabs) => {
              tabs.style('gap', '8px');
              tabs.vLink(appRouter, { label: '概览', replace: true, to: '/overview' });
              tabs.vLink(appRouter, { label: '设置', replace: true, to: '/settings' });
            });
            stack.vRouterViews(appRouter, { title: '未打开文件' });
          });
        });
        appRouter.navigate('/overview', { replace: true });
      });
    }
  };
}

export const routerCategory = {
  description: '链接导航、活动状态、参数 query 与带标题的路由视图。',
  id: 'router',
  title: '路由组件',
  demos: [
    {
      component: RouterNavigationCard,
      imports: ['div', 'router', 'vCard'],
      title: '路由链接与视图核心源码'
    },
    {
      component: DeclarativeRouterCard,
      imports: ['div', 'vCard', 'vRoute', 'vRouter'],
      title: '声明式路由核心源码'
    },
    {
      component: RouterViewsEditorCard,
      imports: ['div', 'vCard', 'vRoute', 'vRouter'],
      title: 'IDE 风格路由视图核心源码'
    }
  ]
};
