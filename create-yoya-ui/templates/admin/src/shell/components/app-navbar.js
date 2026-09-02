import { vAvatar, vNavbar } from '@yoyaflow/yoya-ui';

export function AppNavbar({ state }) {
  const items = new Map();

  function applyState() {
    const activeKey = state.activeModuleKey();
    items.forEach((item, key) => {
      item.active(key === activeKey);
    });
  }

  return {
    render() {
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
              logo.text('y');
            });
            row.strong((name) => {
              name.style({
                color: 'var(--yoya-color-text-strong, #0f172a)',
                fontSize: '16px',
                fontWeight: '700'
              });
              name.text('yoya 管理台');
            });
          });
        });
        nav.menuContent((menu) => {
          state.menus().forEach((module) => {
            menu.vMenuItem((item) => {
              item.text(module.label);
              items.set(module.key, item);
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
    },
    applyState
  };
}
