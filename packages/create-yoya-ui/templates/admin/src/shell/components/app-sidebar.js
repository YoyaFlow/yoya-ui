import { vSidebar } from '@yoyaflow/yoya-ui';
import { SidebarMenu } from './sidebar-menu.js';

/**
 * 左侧菜单：菜单区是区域——先声明 rebuildable() 再读信号，
 * 当前模块或当前路径变化时重建菜单（菜单项很少，重建比逐项同步更直接）。
 */
export function AppSidebar({ state }) {
  return vSidebar((side) => {
    side.ariaLabel('左侧菜单');
    side.title('导航');
    side.collapsible(false);
    side.style({
      flex: '0 0 auto',
      width: '220px',
      gridTemplateRows: 'auto minmax(0, 1fr)'
    });
    side.menuContent((menu) => {
      menu.rebuildable();
      const module = state.menus.value.find((entry) => entry.key === state.activeModuleKey.value);
      if (!module) {
        return;
      }
      menu.child(
        SidebarMenu({
          module,
          activePath: state.activePath.value,
          onNavigate: (path) => state.navigate(path)
        })
      );
    });
  });
}
