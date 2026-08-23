import { createI18n, router, section, toast, vMessageContainer } from '../../../src/index.js';
import { componentDemoRegistry } from './demo-registry.js';
import { DemoCategoryPage } from './demo-category-page.js';
import { DemoComponentPage } from './demo-component-page.js';
import { DemoHomePage } from './demo-home.js';
import { DemoShell } from './demo-shell.js';

const locale = createI18n({
  language: 'zh-CN',
  messages: {
    'zh-CN': {
      actions: {
        danger: '危险操作',
        refresh: '刷新状态',
        save: '保存配置',
        start: '启动任务'
      }
    },
    en: {
      actions: {
        danger: 'Danger',
        refresh: 'Refresh',
        save: 'Save',
        start: 'Start job'
      }
    }
  }
});

function homePath() {
  return '/';
}

function categoryPath(categoryId) {
  return `/${categoryId}`;
}

function componentPath(entry) {
  return `/${entry.categoryId}/${entry.id}`;
}

function registerRoutes(routerInstance, registry, context, navigate, searchState) {
  routerInstance.default(homePath());

  routerInstance.route(homePath(), {
    title: '首页',
    view: () => DemoHomePage({ navigate, registry, searchState }).render()
  });

  registry.categories.forEach((category) => {
    routerInstance.route(categoryPath(category.id), {
      title: category.title,
      view: () => DemoCategoryPage({ category, context, navigate }).render()
    });
  });

  (registry.demos ?? registry.components).forEach((entry) => {
    routerInstance.route(componentPath(entry), {
      title: entry.title,
      view: () => DemoComponentPage({ context, entry, navigate }).render()
    });
  });

  routerInstance.notFound(({ path }) =>
    section((page) => {
      page.className('components-not-found');
      page.header((header) => {
        header.className('component-category-header');
        header.h2('未找到页面');
        header.p(`未匹配路径：${path}`);
      });
    })
  );
}

export function createComponentsDemoApp({
  target = '#app',
  locale: providedLocale = locale,
  registry = componentDemoRegistry,
  toast: providedToast = toast
} = {}) {
  const messageHost = vMessageContainer({ placement: 'top-right' }).bindTo(document.body);
  providedToast.use(messageHost);

  const routerInstance = router();
  const searchState = { query: '' };
  const navigate = routerInstance.navigate.bind(routerInstance);
  const context = { locale: providedLocale, navigate, routerInstance, toast: providedToast };

  registerRoutes(routerInstance, registry, context, navigate, searchState);

  const root = DemoShell({ registry, routerInstance, searchState }).render();
  root.bindTo(target);
  routerInstance.start();

  const destroy = root.destroy.bind(root);
  root.destroy = () => {
    messageHost.destroy?.();
    routerInstance.stop();
    return destroy();
  };

  return root;
}

export { componentDemoCategories } from './demo-registry.js';
