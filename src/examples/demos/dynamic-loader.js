import { div, ref, vDynamicLoader, vText, vstack } from '../../index.js';

const STATE_LABELS = {
  error: '加载失败',
  loaded: '加载成功',
  loading: '加载中',
  pending: '等待'
};

export function DynamicLoaderExample1() {
  const attempts = ref(0);
  const statusText = ref('尚未开始');
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const loader = vDynamicLoader({
    auto: false,
    cacheKey: 'audit-module-demo',
    loader: async () => {
      attempts.value += 1;
      const current = attempts.value;
      await wait(current === 1 ? 900 : 1400);
      if (current === 1) {
        throw new Error('模拟网络超时');
      }
      return { name: '审计模块', total: 128 };
    },
    onStateChange(state) {
      statusText.value = `${STATE_LABELS[state]}（第 ${attempts.value} 次请求）`;
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
      loading: () =>
        div((box) => {
          box.styles({
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            color: '#1d4ed8',
            fontWeight: '600',
            padding: '12px 16px'
          });
          box.child(vText('正在请求审计模块…'));
        }),
      pending: () =>
        div((box) => {
          box.styles({
            backgroundColor: '#f1f5f9',
            borderRadius: '8px',
            color: '#475569',
            fontWeight: '600',
            padding: '12px 16px'
          });
          box.child(vText('等待加载审计模块'));
        })
    }
  });

  return {
    render() {
      return vstack({ gap: '14px' }, (stack) => {
        stack.child(loader);
        stack.output((out) => {
          out.attr('data-loader-status-line', 'true');
          out.child(vText(statusText));
        });
        stack.hstack({ gap: '10px' }, (actions) => {
          actions.vButton('开始加载', (button) => {
            button.id('dynamic-load');
            button.on('click', () => loader.load().catch(() => {}));
          });
          actions.vButton('重试', (button) => {
            button.id('dynamic-retry');
            button.variant('secondary');
            button.on('click', () => loader.retry().catch(() => {}));
          });
          actions.vButton('再次加载', (button) => {
            button.id('dynamic-cache');
            button.variant('secondary');
            button.on('click', () => {
              if (loader.status() === 'loaded') {
                statusText.value = '缓存命中：直接返回已加载模块，不发起网络请求';
                return;
              }
              loader.load().catch(() => {});
            });
          });
        });
      });
    }
  };
}
