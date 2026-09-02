import { createRouter } from '@yoyaflow/yoya-ui';
import { PlaceholderPage } from '../shared/ui.pages.js';
import { DashboardOverviewPage } from '../features/dashboard/overview/pages/dashboard-overview-page.js';
import { TodoApprovalPage } from '../features/dashboard/todos/pages/todo-approval-page.js';
import { ServiceListPage } from '../features/ops/services/pages/service-list-page.js';
import { DeployListPage } from '../features/ops/deploys/pages/deploy-list-page.js';
import { MemberListPage } from '../features/system/members/pages/member-list-page.js';
import { RoleListPage } from '../features/system/roles/pages/role-list-page.js';
import { PermissionListPage } from '../features/system/permissions/pages/permission-list-page.js';
import { DictListPage } from '../features/system/dicts/pages/dict-list-page.js';

// 菜单视图注册表：服务端菜单只返回 viewKey，由这里映射到客户端页面组件。
const viewRegistry = {
  'dashboard-overview': DashboardOverviewPage,
  'todo-approval': TodoApprovalPage,
  'service-list': ServiceListPage,
  'deploy-list': DeployListPage,
  'member-list': MemberListPage,
  'role-list': RoleListPage,
  'permission-list': PermissionListPage,
  'dict-list': DictListPage
};

export function createAppRouter(menus) {
  const router = createRouter((r) => {
    menus.forEach((module) => {
      module.routes.forEach((route) => {
        const Page = viewRegistry[route.viewKey];
        r.route(route.path, {
          title: route.title,
          view: () =>
            Page ? Page() : PlaceholderPage({ title: route.title, text: '该页面待开发。' })
        });
      });
    });
    r.notFound(() => PlaceholderPage({ title: '未找到', text: '该页面不存在。' }));
  });
  router.default(menus[0].routes[0].path);
  return router;
}
