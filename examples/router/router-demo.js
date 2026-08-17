import { div, router, section, vText } from '../../src/index.js';

const routeItems = [
  ['/overview', '概览'],
  ['/users/42?tab=profile', '用户详情'],
  ['/orders/2026-08?status=open', '订单列表'],
  ['/admin', '受保护'],
  ['/missing', '未匹配']
];

/**
 * 渲染 router 演示，展示默认路由、动态参数、query、404 和守卫拦截。
 */
export function renderRouterExample(target = '#app') {
  const currentPathText = vText('当前路径：/overview');
  const paramsText = vText('参数：{}');
  const queryText = vText('查询：{}');
  const guardMessage = vText('守卫状态：等待导航');
  const navButtons = [];
  let appRouter = null;

  const updateRouterState = () => {
    const currentPath = appRouter.currentPath();

    currentPathText.textContent(`当前路径：${currentPath}`);
    paramsText.textContent(`参数：${JSON.stringify(appRouter.currentParams())}`);
    queryText.textContent(`查询：${JSON.stringify(appRouter.currentQuery())}`);

    navButtons.forEach((button) => {
      const active = button.attr('data-router-link') === currentPath;
      button.attr('aria-current', active ? 'page' : null);
    });
  };

  appRouter = router((r) => {
    r.default('/overview');
    r.beforeEach((to) => {
      guardMessage.textContent(`守卫通过：${to.path}`);
      return true;
    });

    r.route('/overview', () => overviewRoute());
    r.route('/users/:id', ({ params, query }) => userRoute(params, query));
    r.route('/orders/:month', ({ params, query }) => orderRoute(params, query));
    r.route('/admin', {
      beforeEnter: ({ path }) => {
        guardMessage.textContent(`守卫拦截：${path} 需要权限`);
        return false;
      },
      view: () => div('管理后台')
    });
    r.notFound(({ path }) => notFoundRoute(path));
  });

  appRouter.id('router-view').className('router-view');

  const root = section((page) => {
    page.id('router-demo').className('router-shell');

    page.container((container) => {
      container.className('router-container');

      container.header((header) => {
        header.className('router-header');
        header.h1('Router 路由演示');
        header.p('hash 路由、动态参数、query、404 和 beforeEnter 守卫在同一个 ViewNode 树里工作。');
      });

      container.grid((workspace) => {
        workspace.className('router-workspace');
        workspace.styles({
          gap: '18px',
          gridTemplateColumns: '260px minmax(0, 1fr)'
        });

        workspace.aside((sidebar) => {
          sidebar.className('router-sidebar');
          sidebar.h2('路由');

          sidebar.nav((nav) => {
            nav.className('router-nav');

            routeItems.forEach(([path, label]) => {
              nav.button((button) => {
                navButtons.push(button);
                button.attr('type', 'button');
                button.attr('data-router-link', path);
                button.text(label);
                button.on('click', () => {
                  appRouter.navigate(path);
                  updateRouterState();
                });
              });
            });
          });

          sidebar.divider();

          sidebar.output((status) => {
            status.id('router-current-path');
            status.child(currentPathText);
          });
          sidebar.code((code) => {
            code.id('router-params');
            code.child(paramsText);
          });
          sidebar.code((code) => {
            code.id('router-query');
            code.child(queryText);
          });
          sidebar.output((status) => {
            status.id('router-guard-message');
            status.child(guardMessage);
          });
        });

        workspace.section((panel) => {
          panel.className('router-panel');
          panel.child(appRouter);
        });
      });
    });
  });

  root.bindTo(target);
  appRouter.start();
  updateRouterState();

  return root;
}

function overviewRoute() {
  return section((view) => {
    view.className('route-card overview-route');
    view.h2('路由概览');
    view.p('当前演示以一个 router outlet 承载页面切换，普通按钮负责触发 navigate。');

    view.svg((map) => {
      map.className('route-map');
      map.attr({ viewBox: '0 0 520 170', role: 'img', 'aria-labelledby': 'route-map-title' });
      map.title((title) => {
        title.id('route-map-title');
        title.text('路由流转示意');
      });
      map.rect({ x: 20, y: 42, width: 120, height: 64, rx: 8, fill: '#ffffff', stroke: '#1f6feb' });
      map.text((label) => {
        label.attr({ x: 80, y: 80, 'text-anchor': 'middle' });
        label.text('导航');
      });
      map.line({ x1: 140, y1: 74, x2: 220, y2: 74, stroke: '#74839a', 'stroke-width': 2 });
      map.rect({ x: 220, y: 32, width: 128, height: 84, rx: 8, fill: '#f6f8fa', stroke: '#2da44e' });
      map.text((label) => {
        label.attr({ x: 284, y: 70, 'text-anchor': 'middle' });
        label.text('匹配路由');
      });
      map.text((label) => {
        label.attr({ x: 284, y: 94, 'text-anchor': 'middle' });
        label.text('params / query');
      });
      map.line({ x1: 348, y1: 74, x2: 428, y2: 74, stroke: '#74839a', 'stroke-width': 2 });
      map.rect({ x: 428, y: 42, width: 72, height: 64, rx: 8, fill: '#ffffff', stroke: '#bf8700' });
      map.text((label) => {
        label.attr({ x: 464, y: 80, 'text-anchor': 'middle' });
        label.text('视图');
      });
    });
  });
}

function userRoute(params, query) {
  return section((view) => {
    view.className('route-card user-route');
    view.h2(`用户 ${params.id}`);
    view.p(`当前标签：${query.tab || 'summary'}`);

    view.grid((grid) => {
      grid.className('detail-grid');
      grid.styles({ gap: '12px', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' });
      stat(grid, '角色', '后端工程师');
      stat(grid, '状态', '在线');
      stat(grid, '最近访问', '2 分钟前');
    });
  });
}

function orderRoute(params, query) {
  return section((view) => {
    view.className('route-card order-route');
    view.h2(`订单 ${params.month}`);
    view.p(`筛选状态：${query.status || 'all'}`);

    view.table((table) => {
      table.className('order-table');
      table.thead((head) => {
        head.tr((row) => {
          row.th('编号');
          row.th('客户');
          row.th('状态');
        });
      });
      table.tbody((body) => {
        [
          ['ORD-1001', 'Alpha', 'open'],
          ['ORD-1002', 'Beta', 'review'],
          ['ORD-1003', 'Gamma', 'closed']
        ].forEach(([id, customer, state]) => {
          body.tr((row) => {
            row.td(id);
            row.td(customer);
            row.td(state);
          });
        });
      });
    });
  });
}

function notFoundRoute(path) {
  return section((view) => {
    view.className('route-card not-found-route');
    view.h2('未匹配路由');
    view.p(`未找到 ${path}`);
  });
}

function stat(parent, label, value) {
  parent.article((card) => {
    card.className('stat-card');
    card.h3(label);
    card.strong(value);
  });
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  renderRouterExample('#app');
}
