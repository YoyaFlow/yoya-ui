import {
  createRouter,
  toast,
  vBody,
  vNavbar,
  vRouterViews,
  vSidebar,
  vstack
} from '@yoyaflow/yoya-ui';
import '@yoyaflow/yoya-ui/ui.css';

// ---------- 页面视图 ----------

function pageView(title, text) {
  return vstack({ gap: '16px' }, (stack) => {
    stack.h2(title);
    stack.vCard((card) => {
      card.vCardHeader(title);
      card.vCardBody((body) => {
        body.p(text);
        body.vButton('操作', (btn) => {
          btn.variant('primary');
          btn.on('click', () => toast.success(`${title} 操作成功`));
        });
      });
    });
  });
}

// ---------- 模块配置：顶级导航 → 左侧菜单 → 路由 ----------

const modules = [
  {
    key: 'dashboard',
    label: '工作台',
    icon: 'D',
    routes: [
      { path: '/dashboard/overview', title: '数据概览', text: '关键指标、趋势与告警一览。' },
      { path: '/dashboard/todos', title: '待办审批', text: '待处理审批与任务。' }
    ]
  },
  {
    key: 'ops',
    label: '运维',
    icon: 'O',
    routes: [
      { path: '/ops/services', title: '服务清单', text: '服务列表与健康状态。' },
      { path: '/ops/deploys', title: '部署任务', text: '发布记录与执行状态。' }
    ]
  },
  {
    key: 'system',
    label: '系统',
    icon: 'S',
    routes: [
      { path: '/system/users', title: '成员管理', text: '成员列表与角色分配。' },
      { path: '/system/roles', title: '权限策略', text: '角色与权限规则。' }
    ]
  }
];

// ---------- 路由与内容区 ----------

const appRouter = createRouter((r) => {
  modules.forEach((module) => {
    module.routes.forEach((route) => {
      r.route(route.path, { title: route.title, view: () => pageView(route.title, route.text) });
    });
  });
  r.notFound(() => pageView('未找到', '该页面不存在。'));
});

// ---------- 左侧菜单：随顶级导航切换 ----------

let activeTopItem = null;

function renderSidebarMenu(module) {
  sidebar.menuContent((menu) => {
    menu.vMenuGroup((group) => {
      group.label(module.label);
      module.routes.forEach((route) => {
        group.vMenuItem((item) => {
          item.icon(module.icon);
          item.text(route.title);
          item.on('click', () => appRouter.navigate(route.path));
        });
      });
    });
  });
}

function switchModule(module, topItem) {
  if (activeTopItem) {
    activeTopItem.active(false);
  }
  activeTopItem = topItem;
  topItem.active(true);
  renderSidebarMenu(module);
  appRouter.navigate(module.routes[0].path);
}

const sidebar = vSidebar((side) => {
  side.ariaLabel('左侧菜单');
  side.title('导航');
});
renderSidebarMenu(modules[0]);

// ---------- 顶部导航：logo + 系统名 / 顶级导航 / 用户头像 ----------

const navbar = vNavbar((nav) => {
  nav.sticky(true);
  nav.brand((brand) => {
    brand.hstack({ gap: '8px' }, (row) => {
      row.style('alignItems', 'center');
      row.span((logo) => {
        logo.style({
          color: 'var(--yoya-color-primary, #2563eb)',
          fontSize: '18px',
          fontWeight: '700'
        });
        logo.text('◆');
      });
      row.strong('yoya 管理台');
    });
  });
  nav.menuContent((menu) => {
    modules.forEach((module) => {
      menu.vMenuItem((item) => {
        item.text(module.label);
        item.on('click', () => switchModule(module, item));
      });
    });
  });
  nav.actions((actions) => {
    actions.vAvatar({ color: '#2563eb', size: 'small', text: '管' });
  });
});

// ---------- 页面壳：上方导航，下方左菜单右内容 ----------

const page = vBody((shell) => {
  shell.gap(0);
  shell.maxWidth('100%');
  shell.padding(0);
  shell.vContainer((frame) => {
    frame.style('minHeight', '100vh');
    frame.vHeader({ height: 56 }, (header) => {
      header.style('padding', '0');
      header.child(navbar);
    });
    frame.vContainer((body) => {
      body.vAside({ width: 220 }, (aside) => {
        aside.style('padding', '12px');
        aside.child(sidebar);
      });
      body.vMain((main) => {
        main.style('padding', '16px');
        main.child(vRouterViews(appRouter, { lockTitle: true, title: '内容区' }));
      });
    });
  });
});

page.bindTo('#app');
appRouter.start();
appRouter.navigate(modules[0].routes[0].path, { replace: true }); // 进入默认模块首页
