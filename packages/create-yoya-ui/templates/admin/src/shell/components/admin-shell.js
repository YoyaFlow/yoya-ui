import { vBody, vRouterViews } from '@yoyaflow/yoya-ui';
import { AppNavbar } from './app-navbar.js';
import { AppSidebar } from './app-sidebar.js';

// 外壳装配：只做布局组装。路由与导航动作都在 ShellState，
// URL 变化 → state.syncFromPath() 写入导航信号 → 顶栏 / 侧栏区域自行更新。
export function AdminShell({ state }) {
  // 形态 A 薄工厂：没有对外命令方法，装配即返回视图节点（不必包一层 `render()`）
  return vBody((shell) => {
    shell.gap(0);
    shell.maxWidth('100%');
    shell.padding(0);
    shell.vContainer((frame) => {
      frame.viewport(true);
      frame.vHeader({ height: 56 }, (header) => {
        header.style('padding', '0');
        header.child(AppNavbar({ state }));
      });
      frame.vContainer((body) => {
        body.style({ flex: '1 1 auto', minHeight: '0' });
        body.child(AppSidebar({ state }));
        body.vMain((main) => {
          main.child(vRouterViews(state.router(), { lockTitle: true, title: '内容区' }));
        });
      });
    });
  });
}
