import { vBody, vRouterViews } from '@yoyaflow/yoya-ui';
import { AppNavbar } from './app-navbar.js';
import { AppSidebar } from './app-sidebar.js';

// 外壳装配：只做布局组装与状态接线。路由与导航动作都在 ShellState。
// URL 变化 → state.syncFromPath() → 状态通知 → 顶栏 / 侧栏从状态派生高亮。
export function AdminShell({ state }) {
  const navbar = AppNavbar({ state });
  const sidebar = AppSidebar({ state });

  const unsubscribe = state.subscribe(() => {
    navbar.applyState();
    sidebar.applyState();
  });

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
              main.child(vRouterViews(state.router(), { lockTitle: true, title: '内容区' }));
            });
          });
        });
      });
    },
    destroy() {
      unsubscribe();
    }
  };
}
