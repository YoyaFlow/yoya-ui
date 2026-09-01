import { createRouter } from '@yoyaflow/yoya-ui';
import { modules } from './modules.js';
import { PlaceholderPage } from '../ui/placeholder-page.js';

export function createAppRouter() {
  const router = createRouter((r) => {
    modules.forEach((module) => {
      module.routes.forEach((route) => {
        r.route(route.path, {
          title: route.title,
          view: () =>
            route.view ? route.view() : PlaceholderPage({ title: route.title, text: route.text })
        });
      });
    });
    r.notFound(() => PlaceholderPage({ title: '未找到', text: '该页面不存在。' }));
  });
  router.default(modules[0].routes[0].path);
  return router;
}
