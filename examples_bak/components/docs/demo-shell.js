import { section, vRouterViews, vSidebar } from '../../../src/index.js';

function homePath() {
  return '/';
}

function categoryPath(categoryId) {
  return `/${categoryId}`;
}

function componentPath(entry) {
  return `/${entry.categoryId}/${entry.id}`;
}

function totalDemoCount(registry) {
  return (registry.demos ?? registry.components).length;
}

function totalSourceCount(registry) {
  return (registry.sources ?? []).length;
}

export function DemoShell({ registry, routerInstance, searchState: _searchState = null } = {}) {
  const menuItems = [];
  let sidebar = null;
  let root = null;

  const addMenuItem = (item, path, label) => {
    item.attr('data-demo-menu-item', path);
    item.attr('data-components-menu-item', path);
    item.text(label);
    item.on('click', () => routerInstance.navigate(path));
    menuItems.push({ item, path });
  };

  const updateMenuState = () => {
    const currentPath = routerInstance.currentPath();
    menuItems.forEach(({ item, path }) => {
      item.active(path === currentPath);
    });
  };

  sidebar = vSidebar((node) => {
    node.attr('data-demo-sidebar', 'true');
    node.ariaLabel('组件目录');
    node.title('组件目录');
    node.responsive('(max-width: 960px)');
    node.menuContent((menu) => {
      menu.attr('data-components-menu', 'true');
      menu.vMenuGroup((group) => {
        group.label('总览');
        group.vMenuItem((item) => addMenuItem(item, homePath(), '首页'));
      });
      menu.vMenuDivider();
      registry.categories.forEach((category) => {
        menu.vMenuGroup((group) => {
          group.label(category.title);
          group.vMenuItem((item) => addMenuItem(item, categoryPath(category.id), '分类概览'));
          category.demos.forEach((entry) => {
            group.vMenuItem((item) => {
              item.attr('data-demo-menu-item', componentPath(entry));
              item.attr('data-components-menu-item', componentPath(entry));
              item.text(entry.title);
              item.on('click', () => routerInstance.navigate(componentPath(entry)));
              menuItems.push({ item, path: componentPath(entry) });
            });
          });
        });
      });
    });
  });

  const routerViews = vRouterViews(routerInstance, {
    className: 'components-router-views',
    title: '首页',
    titleResolver: ({ route, path }) => {
      if (!route) {
        return `未找到 ${path}`;
      }
      return route.title;
    }
  });

  const unsubscribe = routerInstance.subscribe(updateMenuState);
  updateMenuState();

  return {
    render() {
      if (root) {
        return root;
      }

      root = section((page) => {
        page.id('components-demo').className('components-shell');
        page.attr('data-demo-shell', 'true');

        page.container((shell) => {
          shell.className('components-container');

          shell.header((header) => {
            header.className('components-header');
            header.h1('组件演示工作台');
            header.p(
              `${registry.categories.length} 个分类，${registry.components.length} 个组件，${totalDemoCount(
                registry
              )} 个演示场景，${totalSourceCount(registry)} 个源码文件。`
            );
          });

          shell.grid((workspace) => {
            workspace.className('components-workspace');
            workspace.styles({
              gap: '16px',
              gridTemplateColumns: '280px minmax(0, 1fr)'
            });

            workspace.aside((aside) => {
              aside.className('components-sidebar');
              aside.child(sidebar);
            });

            workspace.section((panel) => {
              panel.className('components-panel');
              panel.attr('data-demo-outlet', 'true');
              panel.child(routerViews);
            });
          });
        });
      });

      const destroy = root.destroy.bind(root);
      root.destroy = () => {
        unsubscribe();
        sidebar.destroy?.();
        return destroy();
      };

      return root;
    }
  };
}
