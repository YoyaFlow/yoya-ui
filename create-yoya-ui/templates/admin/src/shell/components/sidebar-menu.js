import { vMenuGroup } from '@yoyaflow/yoya-ui';

export function SidebarMenu({ module, activePath, onNavigate }) {
  return vMenuGroup((group) => {
    group.label(module.label);
    module.routes.forEach((route) => {
      group.vMenuItem((item) => {
        item.text(route.title);
        item.active(route.path === activePath);
        item.on('click', () => onNavigate(route.path));
      });
    });
  });
}
