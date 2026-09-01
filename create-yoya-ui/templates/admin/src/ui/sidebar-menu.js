import { vMenuGroup } from '@yoyaflow/yoya-ui';

export function SidebarMenu({ module, router }) {
  return vMenuGroup((group) => {
    group.label(module.label);
    module.routes.forEach((route) => {
      group.vMenuItem((item) => {
        item.text(route.title);
        item.active(route.path === router.currentPath());
        item.on('click', () => router.navigate(route.path));
      });
    });
  });
}
