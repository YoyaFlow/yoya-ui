import { vCard } from '../../../src/index.js';

export function CommandMenuCard({ toast }) {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('命令菜单');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p(
              'vMenuGroup 与 vMenuDivider 组织长命令列表，方向键会跳过标题、分隔线和禁用项。'
            );
            stack.vMenu((menu) => {
              menu.vMenuGroup((group) => {
                group.label('常用操作');
                group.vMenuItem((item) => {
                  item.id('menu-refresh');
                  item.icon('R');
                  item.text('刷新状态');
                  item.shortcut('Ctrl+R');
                  item.active(true);
                  item.on('click', () => toast.info('菜单触发：刷新状态', { duration: 0 }));
                });
                group.vMenuItem((item) => {
                  item.icon('S');
                  item.text('系统设置');
                  item.shortcut('Ctrl+,');
                  item.on('click', () => toast.info('菜单触发：系统设置', { duration: 0 }));
                });
              });
              menu.vMenuDivider();
              menu.vMenuGroup((group) => {
                group.label('危险操作');
                group.vMenuItem((item) => {
                  item.icon('D');
                  item.text('删除服务');
                  item.shortcut('Del');
                  item.danger(true);
                  item.disabled(true);
                });
              });
            });
          });
        });
      });
    }
  };
}

export function SubMenuCard({ toast }) {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('嵌套菜单');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('点击或按 ArrowRight 进入子菜单，使用 ArrowLeft 或 Escape 返回上一级。');
            stack.vMenu((menu) => {
              menu.vMenuItem((item) => item.text('查看概览').active(true));
              menu.vSubMenu((submenu) => {
                submenu.label('导出报表');
                submenu.menuContent((exports) => {
                  exports.vMenuItem((item) => {
                    item.text('导出 CSV');
                    item.on('click', () => toast.success('子菜单触发：导出 CSV', { duration: 0 }));
                  });
                  exports.vSubMenu((advanced) => {
                    advanced.label('高级导出');
                    advanced.menuContent((formats) => {
                      formats.vMenuItem((item) => {
                        item.text('导出审计包');
                        item.on('click', () =>
                          toast.info('子菜单触发：导出审计包', { duration: 0 })
                        );
                      });
                      formats.vMenuItem({ disabled: true, text: '导出旧版格式' });
                    });
                  });
                });
              });
            });
          });
        });
      });
    }
  };
}

export function OverlayMenuCard({ toast }) {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('浮层菜单');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('vDropdownMenu 用于按钮触发的次级操作；vContextMenu 用于绑定右键目标区域。');
            stack.hstack((menu) => {
              menu.className('overlay-actions');
              menu.vDropdownMenu((dropdown) => {
                dropdown.placement('bottom-end');
                dropdown.trigger((button) => {
                  button.id('dropdown-trigger');
                  button.label('更多操作');
                  button.variant('secondary');
                });
                dropdown.menuContent((commands) => {
                  commands.vMenuItem((item) => {
                    item.id('dropdown-export');
                    item.icon('E');
                    item.text('导出报表');
                    item.shortcut('Ctrl+E');
                    item.on('click', () => toast.info('菜单触发：导出报表', { duration: 0 }));
                  });
                  commands.vMenuItem((item) => {
                    item.icon('A');
                    item.text('归档任务');
                    item.on('click', () => toast.warning('菜单触发：归档任务', { duration: 0 }));
                  });
                });
              });
              menu.vContextMenu((context) => {
                context.target((target) => {
                  target.id('context-target');
                  target.className('context-demo-target');
                  target.strong('服务 api-gateway');
                  target.span('右键打开服务操作');
                });
                context.menuContent((commands) => {
                  commands.vMenuItem((item) => {
                    item.id('context-restart');
                    item.icon('R');
                    item.text('重启服务');
                    item.shortcut('Ctrl+Shift+R');
                    item.on('click', () => toast.success('菜单触发：重启服务', { duration: 0 }));
                  });
                  commands.vMenuItem((item) => {
                    item.icon('D');
                    item.text('下线服务');
                    item.danger(true);
                    item.on('click', () => toast.error('菜单触发：下线服务', { duration: 0 }));
                  });
                });
              });
            });
          });
        });
      });
    }
  };
}

export const navigationCategory = {
  description: '命令、下拉与上下文菜单。',
  id: 'navigation',
  title: '导航菜单',
  demos: [
    { component: CommandMenuCard, imports: ['vCard'], title: '命令菜单核心源码' },
    { component: SubMenuCard, imports: ['vCard'], title: '嵌套菜单核心源码' },
    { component: OverlayMenuCard, imports: ['vCard'], title: '浮层菜单核心源码' }
  ]
};
