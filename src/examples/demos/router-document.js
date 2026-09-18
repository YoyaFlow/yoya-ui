import {
  div,
  vContainer,
  vRoute,
  vRouter,
  vRouterViews,
  vText,
  vstack
} from '../../index.js';

/**
 * 文档路由：内部 HTML 页面与外部链接注册成路由，进入即整页跳转。
 * 这里演示「vLink 交给浏览器」那一面：点「旧报表」会真的离开演示页，
 * 点「在线文档」在新标签打开；SPA 路由仍然原地切换。
 */
export function RouterDocumentCard() {
  const appRouter = vRouter({
    default: '/overview',
    notFound: ({ path }) => div(`未找到 ${path}`),
    routes: [
      vRoute('/overview', () => div('SPA 视图：概览')),
      vRoute('/legacy/report.html', { title: '旧报表', url: './legacy-page.html' }),
      vRoute('/docs', {
        target: '_blank',
        title: '在线文档',
        url: 'https://github.com/YoyaFlow/yoya-ui'
      })
    ]
  });
  const currentPath = vText('');
  appRouter.subscribe(({ path }) => currentPath.textContent(`当前 SPA 路径：${path}`));

  return {
    render() {
      return vstack((stack) => {
        stack.style('gap', '14px');
        stack.hstack((nav) => {
          nav.styles({ flexWrap: 'wrap', gap: '10px' });
          nav.vLink(appRouter, { label: '概览（SPA）', replace: true, to: '/overview' });
          nav.vLink(appRouter, { label: '旧报表（HTML 整页跳转）', to: '/legacy/report.html' });
          nav.vLink(appRouter, { label: '在线文档（外链）', to: '/docs' });
        });
        stack.vRouterView(appRouter, (view) => view.className('router-demo-outlet'));
        stack.output((output) => {
          output.className('router-document-status');
          output.child(currentPath);
        });
        appRouter.navigate('/overview', { replace: true });
      });
    }
  };
}

/**
 * 文档路由进标签页：程序化跳转经过 navigate()，示例覆盖 navigateDocument 拦下出口，
 * 于是标签照常保留、内容区显示「跳转占位」（占位里的链接点了会真的走）。
 */
export function RouterViewsDocumentStandalone() {
  const appRouter = vRouter({
    default: '/overview',
    routes: [
      vRoute('/overview', { title: '概览', view: () => div('项目概览内容') }),
      vRoute('/settings', { title: '设置', view: () => div('项目设置内容') }),
      vRoute('/legacy/report.html', { title: '旧报表', url: './legacy-page.html' }),
      vRoute('/docs', {
        target: '_blank',
        title: '在线文档',
        url: 'https://github.com/YoyaFlow/yoya-ui'
      })
    ]
  });
  const status = vText('点「旧报表 / 在线文档」看整页跳转出口（示例已拦下）');
  appRouter.navigateDocument = (url) => {
    status.textContent(`整页跳转出口：${url}`);
    return appRouter;
  };

  const root = vContainer((page) => {
    page.className('router-views-standalone');
    page.viewport();
    page.vHeader((header) => {
      header.styles({
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 16px'
      });
      header.hstack((row) => {
        row.style({ alignItems: 'center', gap: '10px', height: '100%' });
        row.strong('工作区');
        row.vLink(appRouter, { label: '概览', replace: true, to: '/overview' });
        row.vLink(appRouter, { label: '设置', replace: true, to: '/settings' });
        row.vButton('旧报表', (button) =>
          button.on('click', () => appRouter.navigate('/legacy/report.html'))
        );
        row.vButton('在线文档', (button) => button.on('click', () => appRouter.navigate('/docs')));
        row.spacer();
        row.output((out) => out.child(status));
      });
    });
    page.vMain((main) => {
      main.styles({ background: '#f5f7fa', padding: '12px' });
      main.child(vRouterViews(appRouter, { lockTitle: true, title: '未打开文件' }));
    });
  });
  appRouter.navigate('/overview', { replace: true });

  return {
    render() {
      return root;
    }
  };
}
