import { vAvatar, vNavbar } from '@yoyaflow/yoya-ui';

/**
 * 顶栏：模块页签从 state 派生。菜单区是区域——先声明 rebuildable() 再读信号，
 * 当前模块变化时重建页签，模块内换路由不会动它。
 */
export function AppNavbar({ state }) {
  return vNavbar((nav) => {
    nav.sticky(true);
    nav.brand((brand) => {
      brand.hstack({ gap: '10px' }, (row) => {
        row.style({ alignItems: 'center', marginLeft: '16px' });
        row.span((logo) => {
          logo.style({
            alignItems: 'center',
            background: 'var(--yoya-color-primary, #2563eb)',
            borderRadius: '8px',
            boxSizing: 'border-box',
            color: '#ffffff',
            display: 'inline-flex',
            fontSize: '16px',
            fontWeight: '800',
            height: '32px',
            justifyContent: 'center',
            lineHeight: '1',
            width: '32px'
          });
          logo.child('y');
        });
        row.strong((name) => {
          name.style({
            color: 'var(--yoya-color-text-strong, #0f172a)',
            fontSize: '16px',
            fontWeight: '700'
          });
          name.child('yoya 管理台');
        });
      });
    });
    nav.menuContent((menu) => {
      menu.rebuildable();
      const activeKey = state.activeModuleKey.value;
      state.menus.value.forEach((module) => {
        menu.vMenuItem((item) => {
          item.child(module.label);
          item.active(module.key === activeKey);
          item.on('click', () => state.switchModule(module));
        });
      });
    });
    nav.actions((actions) => {
      actions.vThemeModeSwitch({ persist: true });
      const avatar = vAvatar({ color: '#2563eb', size: 'small', text: '管' });
      avatar.style('marginRight', '16px');
      actions.child(avatar);
    });
  });
}
