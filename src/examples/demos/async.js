import { div, vCard, vDynamicLoader, vText } from '../../index.js';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function statusPanel(text, color, background) {
  return div((box) => {
    box.styles({
      backgroundColor: background,
      borderRadius: '8px',
      color,
      fontWeight: '600',
      padding: '12px 16px'
    });
    box.child(vText(text));
  });
}

export function DynamicModuleCard() {
  let attempts = 0;
  let statusLine = null;

  const moduleLoader = vDynamicLoader({
    auto: false,
    cacheKey: 'audit-module-demo',
    loader: async () => {
      attempts += 1;
      const current = attempts;
      await wait(current === 1 ? 900 : 1400);
      if (current === 1) {
        throw new Error('模拟网络超时');
      }
      return {
        name: '审计模块',
        total: 128
      };
    },
    onStateChange(state) {
      if (!statusLine) {
        return;
      }
      const labels = {
        error: '加载失败',
        loaded: '加载成功',
        loading: '加载中',
        pending: '等待'
      };
      statusLine.textContent(`${labels[state]}（第 ${attempts} 次请求）`);
    },
    views: {
      error: (error) =>
        div((box) => {
          box.styles({
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            color: '#dc2626',
            fontWeight: '600',
            padding: '12px 16px'
          });
          box.child(vText(`加载失败：${error.message}`));
          box.div((hint) => {
            hint.styles({ color: '#7f1d1d', fontWeight: '400', marginTop: '6px' });
            hint.child(vText('点击「重试」再次发起请求'));
          });
        }),
      loaded: (module) =>
        div((box) => {
          box.styles({
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            color: '#16a34a',
            fontWeight: '600',
            padding: '12px 16px'
          });
          box.child(vText(`${module.name} 已加载`));
          box.div((meta) => {
            meta.styles({ color: '#475569', fontWeight: '400', marginTop: '6px' });
            meta.child(vText(`共处理 ${module.total} 条记录，数据来自异步模块`));
          });
        }),
      loading: () => statusPanel('正在请求审计模块…', '#1d4ed8', '#eff6ff'),
      pending: () => statusPanel('等待加载审计模块', '#475569', '#f1f5f9')
    }
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('动态模块加载');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('首次加载会失败：观察失败面板，点击重试成功后，再用“再次加载”验证缓存。');
            stack.child(moduleLoader);
            stack.output((out) => {
              out.attr('data-loader-status-line', 'true');
              statusLine = vText('尚未开始');
              out.child(statusLine);
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack({ gap: '10px' }, (actions) => {
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
            actions.vButton((button) => {
              button.id('dynamic-cache');
              button.label('再次加载');
              button.variant('secondary');
              button.on('click', () => {
                if (moduleLoader.status() === 'loaded') {
                  statusLine.textContent('缓存命中：直接返回已加载模块，不发起网络请求');
                  return;
                }
                moduleLoader.load().catch(() => {});
              });
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
      imports: ['div', 'vCard', 'vDynamicLoader', 'vText'],
      title: '动态模块加载核心源码'
    }
  ]
};
