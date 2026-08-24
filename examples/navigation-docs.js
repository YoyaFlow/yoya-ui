import { section, toast, vCard, vText } from '../src/index.js';
import { ComponentSource } from './component-source.js';
import {
  AdminSidebarCard,
  CommandMenuCard,
  OverlayMenuCard,
  SidebarCard,
  SubMenuCard
} from '../examples_bak/components/demos/navigation.js';

const navigationDocsDefinitions = Object.freeze({
  menu: createNavigationDocsDefinition({
    apiIntro:
      'vMenu 负责菜单骨架，vMenuGroup 和 vMenuDivider 负责层级，vSubMenu 负责展开更深一层的选择。vDropdownMenu 和 vContextMenu 只是把同一套菜单内容挂到按钮或右键上。',
    apiRows: [
      [
        'vMenu({ orientation })',
        '创建纵向或横向菜单容器。',
        "vMenu({ orientation: 'horizontal' })"
      ],
      [
        'vMenuItem({ text, icon, shortcut, active, danger, disabled })',
        '定义可点击的菜单项。',
        "item.text('刷新状态')"
      ],
      ['vMenuGroup({ label, title })', '把相关动作归为一组。', "group.label('常用操作')"],
      ['vMenuDivider()', '在菜单中插入分隔线。', 'menu.vMenuDivider()'],
      [
        'vSubMenu({ label, trigger, menuContent, inline })',
        '展开二级或三级菜单；inline 时在菜单内上下展开。',
        'submenu.inline(true)'
      ],
      [
        'vSidebar({ title, ariaLabel, menuContent, responsive })',
        '把菜单装进可折叠侧边栏。',
        "vSidebar({ title: '运维中心' })"
      ],
      [
        'vDropdownMenu({ trigger, menuContent, placement })',
        '按钮触发的浮层菜单。',
        "vDropdownMenu({ placement: 'bottom-end' })"
      ],
      [
        'vContextMenu({ target, menuContent })',
        '右键触发的上下文菜单。',
        "vContextMenu({ target: '...' })"
      ]
    ],
    apiSignature: `vMenu((menu) => {
  menu.vMenuGroup(...);
  menu.vMenuDivider();
})`,
    examples: [
      {
        component: () => CommandMenuCard({ toast }),
        description: '长命令列表用分组和分隔线组织，读起来更像一组动作，而不是一串按钮。',
        id: 'command',
        imports: ['vCard'],
        sourceComponent: CommandMenuCard,
        sourceTitle: '命令菜单核心源码',
        title: '命令菜单'
      },
      {
        component: () => SubMenuCard({ toast }),
        description: '当菜单需要二级、三级入口时，vSubMenu 会把层级收起来，按需展开。',
        id: 'submenu',
        imports: ['vCard'],
        sourceComponent: SubMenuCard,
        sourceTitle: '嵌套菜单核心源码',
        title: '嵌套菜单'
      },
      {
        component: () => OverlayMenuCard({ toast }),
        description: '按钮触发和右键触发可以共用同一套菜单内容，适合次级操作。',
        id: 'overlay',
        imports: ['vCard'],
        sourceComponent: OverlayMenuCard,
        sourceTitle: '浮层菜单核心源码',
        title: '浮层菜单'
      },
      {
        component: () => SidebarCard({ toast }),
        description: '后台侧栏把菜单变成可折叠工作区导航，适合长列表和多级入口。',
        id: 'sidebar',
        imports: ['vCard'],
        sourceComponent: SidebarCard,
        sourceTitle: '侧栏菜单核心源码',
        title: '后台侧栏'
      },
      {
        component: () => AdminSidebarCard({ toast }),
        description: '常见管理系统左侧导航：工作台、组织、业务、系统设置和监控审计分组。',
        id: 'admin-sidebar',
        imports: ['vCard'],
        sourceComponent: AdminSidebarCard,
        sourceTitle: '管理系统左侧菜单核心源码',
        title: '管理系统左侧菜单'
      }
    ],
    examplesIntro: '下面五个示例分别展示命令菜单、嵌套菜单、浮层菜单、后台侧栏和管理系统左侧菜单。',
    heading: 'vMenu 菜单',
    intro:
      'vMenu 负责把导航动作整理成可扫描的列表，常见于命令面板、下拉菜单和后台侧栏。它和 vSubMenu、vSidebar、vDropdownMenu、vContextMenu 配合起来，足够覆盖大多数菜单场景。',
    key: 'menu',
    routeItem: 'navigation:3',
    title: '菜单',
    usageItems: [
      '命令列表、页面跳转和设置入口都适合先收进 vMenu。',
      '有多级入口时，用 vSubMenu 逐层展开，不要把所有项摊平。',
      '后台侧栏和右键菜单分别交给 vSidebar、vDropdownMenu 和 vContextMenu。'
    ]
  }),
  navbar: createNavigationDocsDefinition({
    apiIntro:
      'vNavbar 把品牌区、横向菜单和右侧动作区组合成统一顶栏，内部仍然复用 vMenu 的 horizontal 模式，所以左右方向键、Home 和 End 都保持菜单的行为。',
    apiRows: [
      [
        'vNavbar({ title, subtitle, ariaLabel, menuContent, actions })',
        '创建横向导航栏。',
        "vNavbar({ title: 'yoya-ui' })"
      ],
      ['navbar.title(content)', '设置品牌标题。', "navbar.title('yoya-ui')"],
      ['navbar.subtitle(content)', '设置品牌副标题。', "navbar.subtitle('Workspace')"],
      ['navbar.brand(setup)', '自定义品牌区域。', 'navbar.brand((brand) => brand.strong(...))'],
      [
        'navbar.menuContent(setup)',
        '填充横向菜单。',
        "navbar.menuContent((menu) => menu.vMenuItem('概览'))"
      ],
      [
        'navbar.actions(setup)',
        '放置右侧按钮或下拉菜单。',
        "navbar.actions((actions) => actions.vButton('登录'))"
      ],
      ['navbar.ariaLabel(content)', '设置导航地标名称。', "navbar.ariaLabel('产品主导航')"]
    ],
    apiSignature: `vNavbar((navbar) => {
  navbar.title('yoya-ui');
  navbar.menuContent((menu) => menu.vMenuItem('概览'));
  navbar.actions((actions) => actions.vButton('登录'));
})`,
    examples: [
      {
        component: NavbarShellExample1,
        description: '品牌、横向菜单和动作按钮一起放在顶栏里，适合产品首页和工作台。',
        id: 'shell',
        imports: ['vButton', 'vCard', 'vDropdownMenu', 'vNavbar', 'vText'],
        sourceTitle: '产品顶栏核心源码',
        title: '产品顶栏'
      },
      {
        component: NavbarBrandExample1,
        description: 'brand 槽可以放自定义品牌结构，适合带副标题的系统导航。',
        id: 'brand',
        imports: ['vButton', 'vCard', 'vNavbar', 'vText'],
        sourceTitle: '自定义品牌核心源码',
        title: '自定义品牌'
      },
      {
        component: NavbarWrapExample1,
        description: '在窄宽度里让菜单和动作自然换行，适合响应式顶栏。',
        id: 'wrap',
        imports: ['vButton', 'vCard', 'vNavbar', 'vText'],
        sourceTitle: '响应式顶栏核心源码',
        title: '窄屏换行'
      }
    ],
    examplesIntro: '下面三个示例分别展示产品顶栏、自定义品牌和窄屏换行。',
    heading: 'vNavbar 横向导航栏',
    intro:
      'vNavbar 负责把品牌、主导航和页面动作放进一条横向顶栏里。它内部沿用 vMenu 的焦点管理和键盘导航，所以横向菜单的可访问性不会丢。',
    key: 'navbar',
    routeItem: 'navigation:9',
    title: '导航栏',
    usageItems: [
      '页面最上方需要品牌、主导航和动作区时用它。',
      '菜单项需要横向排列并保持左右方向键导航时用它。',
      '右侧还有按钮、下拉和状态标签时，把它们一起放进 actions 槽。'
    ]
  })
});

export function MenuDocumentationPage() {
  return createNavigationDocumentationPage(navigationDocsDefinitions.menu);
}

export function NavbarDocumentationPage() {
  return createNavigationDocumentationPage(navigationDocsDefinitions.navbar);
}

function createNavigationDocsDefinition(config) {
  return Object.freeze({
    apiIntro: config.apiIntro ?? '',
    apiRows: Object.freeze(config.apiRows ?? []),
    apiSignature: config.apiSignature ?? '',
    examples: Object.freeze(config.examples ?? []),
    examplesIntro: config.examplesIntro ?? '下面的示例可以直接复制到自己的对象组件中。',
    heading: config.heading,
    intro: config.intro,
    key: config.key,
    routeItem: config.routeItem,
    title: config.title,
    usageItems: Object.freeze(config.usageItems ?? []),
    usageIntro: config.usageIntro ?? '',
    usageTitle: config.usageTitle ?? '何时使用',
    apiTitle: config.apiTitle ?? '常用 API'
  });
}

function createNavigationDocumentationPage(definition) {
  return {
    render() {
      return section((page) => {
        page.className(
          `components-route-page components-navigation-docs components-navigation-docs--${definition.key}`
        );
        page.attr('data-component-route-item', definition.routeItem);
        page.attr('data-navigation-docs', definition.key);

        page.header((header) => {
          header.className('components-navigation-docs-header');
          header.h1(definition.heading);
          header.p(definition.intro);
        });

        page.section((usage) => {
          usage.className('components-navigation-docs-usage');
          usage.attr('data-navigation-usage', definition.key);
          usage.h2(definition.usageTitle);
          if (definition.usageIntro) {
            usage.p(definition.usageIntro);
          }
          usage.ul((list) => {
            definition.usageItems.forEach((itemText) => {
              list.li(itemText);
            });
          });
        });

        page.section((api) => {
          api.className('components-navigation-docs-api');
          api.h2(definition.apiTitle);
          if (definition.apiIntro) {
            api.p(definition.apiIntro);
          }
          api.pre((pre) => {
            pre.className('navigation-api-signature');
            pre.code(definition.apiSignature);
          });
          api.table((table) => {
            table.thead((head) => {
              head.tr((row) => {
                row.th('API');
                row.th('用途');
                row.th('示例');
              });
            });
            table.tbody((body) => {
              definition.apiRows.forEach(([name, purpose, example]) => {
                body.tr((row) => {
                  row.td((cell) => cell.code(name));
                  row.td(purpose);
                  row.td((cell) => cell.code(example));
                });
              });
            });
          });
        });

        page.section((examples) => {
          examples.className('components-navigation-docs-examples');
          examples.h2('代码演示');
          examples.p(definition.examplesIntro);
          definition.examples.forEach((demo) => {
            examples.child(NavigationExampleSection(demo));
          });
        });
      });
    }
  };
}

function NavigationExampleSection(demo) {
  const liveDemo = demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    sourceComponent: demo.sourceComponent ?? demo.component,
    imports: demo.imports ?? [],
    title: demo.sourceTitle ?? `${demo.title} 核心源码`
  });

  return {
    render() {
      return section((example) => {
        example.className('components-navigation-demo');
        example.attr('data-navigation-demo', demo.id);
        example.h3(demo.title);
        example.p(demo.description);
        example.div((live) => {
          live.className('components-navigation-demo-live');
          live.attr('data-navigation-demo-live', 'true');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}

function NavbarShellExample1() {
  const status = vText('当前：概览');
  const menuItems = [];
  const setActive = (label, activeIndex) => {
    menuItems.forEach((item, index) => item.active(index === activeIndex));
    status.textContent(`当前：${label}`);
  };
  const showAction = (label) => {
    status.textContent(`已触发：${label}`);
  };

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('产品顶栏');
        card.vCardBody((body) => {
          body.vstack((shell) => {
            shell.style('gap', '14px');
            shell.vNavbar((navbar) => {
              navbar.ariaLabel('产品主导航');
              navbar.title('yoya-ui');
              navbar.subtitle('设计系统');
              navbar.menuContent((menu) => {
                ['概览', '组件', '文档'].forEach((label, index) => {
                  menu.vMenuItem((item) => {
                    item.text(label);
                    item.active(index === 0);
                    item.on('click', () => setActive(label, index));
                    menuItems[index] = item;
                  });
                });
              });
              navbar.actions((actions) => {
                actions.output((output) => {
                  output.className('components-route-note');
                  output.attr('data-navbar-demo-status', 'true');
                  output.child(status);
                });
                actions.span((badge) => {
                  badge.className('components-route-note');
                  badge.text('在线');
                });
                actions.vButton((button) => {
                  button.label('登录');
                  button.variant('primary');
                  button.on('click', () => showAction('登录'));
                });
                actions.vDropdownMenu((dropdown) => {
                  dropdown.trigger('更多');
                  dropdown.menuContent((commands) => {
                    commands.vMenuItem((item) => {
                      item.text('设置');
                      item.on('click', () => showAction('设置'));
                    });
                    commands.vMenuItem((item) => {
                      item.text('退出');
                      item.on('click', () => showAction('退出'));
                    });
                  });
                });
              });
            });
            shell.p('品牌、主导航和动作按钮都在同一条顶栏里。');
          });
        });
      });
    }
  };
}

function NavbarBrandExample1() {
  const status = vText('当前：服务');
  const menuItems = [];
  const setActive = (label, activeIndex) => {
    menuItems.forEach((item, index) => item.active(index === activeIndex));
    status.textContent(`当前：${label}`);
  };

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('自定义品牌');
        card.vCardBody((body) => {
          body.vNavbar((navbar) => {
            navbar.ariaLabel('运维主导航');
            navbar.brand((brand) => {
              brand.strong('运维中心');
              brand.span('Workspace');
            });
            navbar.menuContent((menu) => {
              ['服务', '任务', '审计'].forEach((label, index) => {
                menu.vMenuItem((item) => {
                  item.text(label);
                  item.active(index === 0);
                  item.on('click', () => setActive(label, index));
                  menuItems[index] = item;
                });
              });
            });
            navbar.actions((actions) => {
              actions.output((output) => {
                output.className('components-route-note');
                output.child(status);
              });
              actions.vButton((button) => {
                button.label('同步');
                button.variant('secondary');
                button.on('click', () => status.textContent('同步完成'));
              });
              actions.vButton((button) => {
                button.label('新建');
                button.variant('primary');
                button.on('click', () => status.textContent('已进入新建流程'));
              });
            });
          });
        });
      });
    }
  };
}

function NavbarWrapExample1() {
  const status = vText('当前：概览');
  const menuItems = [];
  const setActive = (label, activeIndex) => {
    menuItems.forEach((item, index) => item.active(index === activeIndex));
    status.textContent(`当前：${label}`);
  };

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('窄屏换行');
        card.vCardBody((body) => {
          body.div((frame) => {
            frame.style('maxWidth', '720px');
            frame.vstack((shell) => {
              shell.style('gap', '14px');
              shell.vNavbar((navbar) => {
                navbar.title('yoya-ui');
                navbar.menuContent((menu) => {
                  ['概览', '配置', '日志', '审计'].forEach((label, index) => {
                    if (index === 2) {
                      menu.vMenuDivider();
                    }

                    menu.vMenuItem((item) => {
                      item.text(label);
                      item.active(index === 0);
                      item.on('click', () => setActive(label, index));
                      menuItems[index] = item;
                    });
                  });
                });
                navbar.actions((actions) => {
                  actions.output((output) => {
                    output.className('components-route-note');
                    output.child(status);
                  });
                  actions.vButton((button) => {
                    button.label('同步');
                    button.variant('secondary');
                    button.on('click', () => status.textContent('同步完成'));
                  });
                  actions.vButton((button) => {
                    button.label('发布');
                    button.variant('primary');
                    button.on('click', () => status.textContent('发布已提交'));
                  });
                });
              });
              shell.p('空间变窄时，动作区会自然换行。');
            });
          });
        });
      });
    }
  };
}
