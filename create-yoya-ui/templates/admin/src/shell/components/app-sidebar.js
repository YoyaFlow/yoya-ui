import { vSidebar } from '@yoyaflow/yoya-ui';
import { SidebarMenu } from './sidebar-menu.js';

export function AppSidebar({ state }) {
  let sidebar = null;

  function render() {
    sidebar = vSidebar((side) => {
      side.ariaLabel('左侧菜单');
      side.title('导航');
      side.collapsible(false);
      side.style({
        flex: '0 0 auto',
        width: '220px',
        gridTemplateRows: 'auto minmax(0, 1fr)'
      });
    });
    return sidebar;
  }

  function applyState() {
    if (!sidebar) {
      return;
    }
    const module = state.menus().find((entry) => entry.key === state.activeModuleKey());
    if (!module) {
      return;
    }
    sidebar.menuContent((menu) => {
      menu.child(
        SidebarMenu({
          module,
          activePath: state.activePath(),
          onNavigate: (path) => state.navigate(path)
        })
      );
    });
  }

  return {
    render,
    applyState
  };
}
