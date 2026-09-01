import { vBody, vRouterViews } from '@yoyaflow/yoya-ui';
import { AppNavbar } from '../ui/app-navbar.js';
import { AppSidebar } from '../ui/app-sidebar.js';

export function AdminShell({ router, modules }) {
  const navbar = AppNavbar({ modules, onModuleChange: switchModule });
  const sidebar = AppSidebar({ router });

  function switchModule(module) {
    navbar.activate(module.key);
    router.navigate(module.routes[0].path);
    sidebar.showModule(module);
  }

  function syncModuleFromUrl() {
    const path = router.currentPath();
    const module = modules.find((entry) => entry.routes.some((route) => route.path === path));
    if (!module) {
      return;
    }
    navbar.activate(module.key);
    sidebar.showModule(module);
  }

  return {
    render() {
      return vBody((shell) => {
        shell.gap(0);
        shell.maxWidth('100%');
        shell.padding(0);
        shell.vContainer((frame) => {
          frame.viewport(true);
          frame.vHeader({ height: 56 }, (header) => {
            header.style('padding', '0');
            header.child(navbar);
          });
          frame.vContainer((body) => {
            body.style({ flex: '1 1 auto', minHeight: '0' });
            body.child(sidebar);
            body.vMain((main) => {
              main.child(vRouterViews(router, { lockTitle: true, title: '内容区' }));
            });
          });
        });
      });
    },
    syncFromUrl() {
      syncModuleFromUrl();
    }
  };
}
