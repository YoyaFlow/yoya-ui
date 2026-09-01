import { vSidebar } from '@yoyaflow/yoya-ui';
import { SidebarMenu } from './sidebar-menu.js';

export function AppSidebar({ router }) {
  const sidebar = vSidebar((side) => {
    side.ariaLabel('左侧菜单');
    side.title('导航');
    side.collapsible(false);
  });
  sidebar.style({
    flex: '0 0 auto',
    width: '220px',
    gridTemplateRows: 'auto minmax(0, 1fr)'
  });

  return {
    render() {
      return sidebar;
    },
    showModule(module) {
      sidebar.menuContent((menu) => {
        menu.child(SidebarMenu({ module, router }));
      });
      return this;
    }
  };
}
