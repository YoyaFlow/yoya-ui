import { div, vCard, vDynamicLoader } from '../../../src/index.js';

export function DynamicModuleCard() {
  let attempts = 0;
  const moduleLoader = vDynamicLoader({
    auto: false,
    loader: () => {
      attempts += 1;
      if (attempts === 1) return Promise.reject(new Error('模拟网络失败'));
      return Promise.resolve({ name: '审计模块' });
    },
    views: {
      error: (error) => div(`加载失败：${error.message}`),
      loaded: (module) => div(`${module.name}已就绪`),
      loading: () => div('正在加载审计模块…'),
      pending: () => div('等待加载审计模块')
    }
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('动态模块加载');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('vDynamicLoader 管理加载状态、错误反馈、重试和模块缓存。');
            stack.child(moduleLoader);
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style('gap', '10px');
            actions.vButton((button) => {
              button.id('dynamic-load');
              button.label('开始加载');
              button.on('click', () => moduleLoader.load().catch(() => {}));
            });
            actions.vButton((button) => {
              button.id('dynamic-retry');
              button.label('重试');
              button.variant('secondary');
              button.on('click', () => moduleLoader.retry().catch(() => {}));
            });
          });
        });
      });
    }
  };
}

export const asyncCategory = {
  description: '异步模块状态、失败重试与缓存。',
  id: 'async',
  title: '异步加载',
  demos: [
    {
      component: DynamicModuleCard,
      imports: ['div', 'vCard', 'vDynamicLoader'],
      title: '动态模块加载核心源码'
    }
  ]
};
