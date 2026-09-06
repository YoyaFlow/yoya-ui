import {
  div,
  router,
  vContainer,
  vRoute,
  vRouter,
  vRouterViews,
  vText,
  vstack
} from '../../index.js';

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
      return vstack((stack) => {
        stack.style('gap', '14px');
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
      return vstack((stack) => {
        stack.style('gap', '14px');
        stack.vLink(appRouter, {
          label: '项目 42',
          params: { id: 42 },
          query: { tab: 'tasks' },
          to: '/projects/:id'
        });
        stack.vRouterView(appRouter, (view) => view.className('router-demo-outlet'));
        appRouter.navigate('/overview', { replace: true });
      });
    }
  };
}

export function RouterHistoryCard() {
  const appRouter = vRouter({
    mode: 'history',
    notFound: ({ path }) => div(`History 404：${path}`),
    routes: [
      vRoute('/overview', () =>
        div((page) => {
          page.h3('History 概览');
          page.p('这个视图运行在 iframe 内部，URL 使用 history 模式。');
        })
      ),
      vRoute('/projects/:id', ({ params, query }) =>
        div((page) => {
          page.h3(`项目 ${params.id}`);
          page.p(`当前标签：${query.tab || 'overview'}`);
        })
      )
    ]
  });
  const currentPath = vText('');
  appRouter.subscribe(({ path }) => currentPath.textContent(`当前地址：${path}`));

  return {
    render() {
      return vstack((stack) => {
        stack.style('gap', '14px');
        stack.hstack((nav) => {
          nav.className('router-demo-navigation');
          nav.styles({ flexWrap: 'wrap', gap: '10px' });
          nav.vLink(appRouter, { label: '概览', to: '/overview' });
          nav.vLink(appRouter, {
            label: '项目 42',
            params: { id: 42 },
            query: { tab: 'tasks' },
            to: '/projects/:id'
          });
          nav.vLink(appRouter, { label: '未匹配', to: '/missing' });
        });
        stack.vRouterView(appRouter, (view) => view.className('router-demo-outlet'));
        stack.output((output) => {
          output.className('history-url-output');
          output.child(currentPath);
        });
        appRouter.navigate('/home', { replace: true });
        appRouter.start();
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
      return vstack((stack) => {
        stack.style('gap', '14px');
        stack.hstack((tabs) => {
          tabs.style('gap', '8px');
          tabs.vLink(appRouter, { label: '概览', replace: true, to: '/overview' });
          tabs.vLink(appRouter, { label: '设置', replace: true, to: '/settings' });
        });
        stack.vRouterViews(appRouter, { title: '未打开文件', titlePosition: 'left' });
        appRouter.navigate('/overview', { replace: true });
      });
    }
  };
}

export function RouterViewsTopCard() {
  const appRouter = vRouter({
    default: '/overview',
    routes: [
      vRoute('/overview', { title: '概览', view: () => div('项目概览内容') }),
      vRoute('/settings', { title: '设置', view: () => div('项目设置内容') })
    ]
  });

  return {
    render() {
      return vstack((stack) => {
        stack.style('gap', '14px');
        stack.hstack((tabs) => {
          tabs.style('gap', '8px');
          tabs.vLink(appRouter, { label: '概览', replace: true, to: '/overview' });
          tabs.vLink(appRouter, { label: '设置', replace: true, to: '/settings' });
        });
        stack.vRouterViews(appRouter, {
          persist: false,
          title: '未打开文件',
          titlePosition: 'top'
        });
        appRouter.navigate('/overview', { replace: true });
      });
    }
  };
}

export function RouterViewsEditorStandalone() {
  const appRouter = vRouter({
    default: '/overview',
    routes: [
      vRoute('/overview', { title: 'overview.js', view: () => div('项目概览内容') }),
      vRoute('/settings', { title: 'settings.js', view: () => div('项目设置内容') })
    ]
  });
  const root = vContainer((page) => {
    page.className('router-views-standalone');
    page.viewport();
    page.vHeader((header) => {
      header.className('router-views-topbar');
      header.styles({
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 16px'
      });
      header.hstack((row) => {
        row.style({ alignItems: 'center', gap: '10px', height: '100%' });
        row.strong('工作区');
        row.spacer();
        row.vLink(appRouter, { label: '概览', replace: true, to: '/overview' });
        row.vLink(appRouter, { label: '设置', replace: true, to: '/settings' });
      });
    });
    page.vMain((main) => {
      main.className('router-views-main');
      main.styles({ background: '#f5f7fa', padding: '12px' });
      main.child(
        vRouterViews(appRouter, {
          lockTitle: true,
          title: '未打开文件',
          titlePosition: 'left'
        })
      );
    });
  });
  appRouter.navigate('/overview', { replace: true });

  return {
    render() {
      return root;
    }
  };
}

export function RouterViewsTopStandalone() {
  const appRouter = vRouter({
    default: '/overview',
    routes: [
      vRoute('/overview', { title: '概览', view: () => div('项目概览内容') }),
      vRoute('/settings', { title: '设置', view: () => div('项目设置内容') })
    ]
  });
  const root = vContainer((page) => {
    page.className('router-views-standalone');
    page.viewport();
    page.vHeader((header) => {
      header.className('router-views-topbar');
      header.styles({
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 16px'
      });
      header.hstack((row) => {
        row.style({ alignItems: 'center', gap: '10px', height: '100%' });
        row.strong('工作区');
        row.spacer();
        row.vLink(appRouter, { label: '概览', replace: true, to: '/overview' });
        row.vLink(appRouter, { label: '设置', replace: true, to: '/settings' });
      });
    });
    page.vMain((main) => {
      main.className('router-views-main');
      main.styles({ background: '#f5f7fa', padding: '12px' });
      main.child(
        vRouterViews(appRouter, {
          lockTitle: true,
          persist: false,
          title: '未打开文件',
          titlePosition: 'top'
        })
      );
    });
  });
  appRouter.navigate('/overview', { replace: true });

  return {
    render() {
      return root;
    }
  };
}
