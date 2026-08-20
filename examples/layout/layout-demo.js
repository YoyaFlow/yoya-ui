import { section, vText } from '../../src/index.js';

const densityText = {
  relaxed: '当前：四列指标',
  compact: '当前：两列指标'
};

const metricCards = [
  ['请求量', '128k', '近 24 小时', 'blue'],
  ['成功率', '99.92%', '接口稳定', 'green'],
  ['队列积压', '42', '低于阈值', 'amber'],
  ['告警', '3', '待确认', 'red']
];

const queueItems = [
  ['API 网关', '健康', '18ms'],
  ['任务队列', '观察中', '42 pending'],
  ['报表服务', '健康', '1.2s']
];

const layoutMapSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="360" height="190" viewBox="0 0 360 190">
  <rect width="360" height="190" rx="8" fill="#eef2f7"/>
  <rect x="24" y="24" width="312" height="28" rx="6" fill="#1f6feb"/>
  <rect x="24" y="68" width="88" height="42" rx="6" fill="#ffffff" stroke="#9fb1c8"/>
  <rect x="136" y="68" width="88" height="42" rx="6" fill="#ffffff" stroke="#9fb1c8"/>
  <rect x="248" y="68" width="88" height="42" rx="6" fill="#ffffff" stroke="#9fb1c8"/>
  <rect x="24" y="130" width="200" height="36" rx="6" fill="#ffffff" stroke="#9fb1c8"/>
  <rect x="248" y="130" width="88" height="36" rx="6" fill="#2da44e"/>
</svg>
`.trim();

const layoutMapSrc = `data:image/svg+xml,${encodeURIComponent(layoutMapSvg)}`;

/**
 * 渲染布局组件示例，集中展示 container / grid / flex / stack 等基础布局能力。
 */
export function renderLayoutExample(target = '#app') {
  const statusText = vText(densityText.relaxed);
  let compact = false;
  let metricsGrid = null;
  let densityButton = null;

  const applyDensity = () => {
    const mode = compact ? 'compact' : 'relaxed';

    metricsGrid.style(
      'gridTemplateColumns',
      compact ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))'
    );
    densityButton.attr('aria-pressed', compact ? 'true' : 'false');
    densityButton.attr('data-density', mode);
    statusText.textContent(densityText[mode]);
  };

  const root = section((page) => {
    page.id('layout-demo').className('layout-shell');

    page.container((shell) => {
      shell.className('layout-container');

      shell.vstack((body) => {
        body.className('layout-flow');
        body.style('gap', '20px');

        body.header((header) => {
          header.className('layout-header');

          header.hstack((row) => {
            row.className('layout-header-row');
            row.styles({ alignItems: 'center', gap: '16px', flexWrap: 'wrap' });

            row.div((title) => {
              title.className('layout-title');
              title.h1('Layout 布局组件');
              title.p('用轻量 ViewNode DSL 组合后台页面最常见的容器、栅格、行列和居中状态。');
            });

            row.spacer();

            row.button((button) => {
              densityButton = button;
              button.id('toggle-grid-density');
              button.attr('type', 'button');
              button.attr('aria-pressed', 'false');
              button.attr('data-density', 'relaxed');
              button.text('切换指标列数');
              button.on('click', () => {
                compact = !compact;
                applyDensity();
              });
            });
          });

          header.output((status) => {
            status.id('grid-density-status');
            status.child(statusText);
          });
        });

        body.responsiveGrid((metrics) => {
          metricsGrid = metrics;
          metrics.breakpoints([
            { minWidth: 600, columns: 2 },
            { minWidth: 1000, columns: 4 }
          ]);
          metrics.minColumnWidth('220px');
          metrics.id('metric-grid');
          metrics.className('metric-grid');
          metrics.styles({
            gap: '14px',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))'
          });
          metrics.refresh();

          metricCards.forEach(([label, value, hint, tone]) => {
            metrics.article((card) => {
              card.attr('data-layout-card', label);
              card.className('metric-card', `metric-card-${tone}`);
              card.h3(label);
              card.strong(value);
              card.p(hint);
            });
          });
        });

        body.divider();

        body.grid((workspace) => {
          workspace.className('layout-workspace');
          workspace.styles({
            gap: '18px',
            gridTemplateColumns: 'minmax(0, 1.35fr) minmax(280px, 0.65fr)'
          });

          workspace.section((panel) => {
            panel.className('layout-panel');
            panel.attr('data-layout-panel', 'flow');
            panel.h2('flex / hstack / spacer');
            panel.p('适合工具条、过滤条件、标题与操作按钮分布。');

            panel.flex((toolbar) => {
              toolbar.className('filter-bar');
              toolbar.styles({ alignItems: 'center', gap: '8px', flexWrap: 'wrap' });
              toolbar.button((button) => {
                button.attr('type', 'button');
                button.text('全部');
              });
              toolbar.button((button) => {
                button.attr('type', 'button');
                button.text('异常');
              });
              toolbar.button((button) => {
                button.attr('type', 'button');
                button.text('慢请求');
              });
            });

            panel.vstack((list) => {
              list.className('service-list');
              list.style('gap', '10px');

              queueItems.forEach(([name, state, latency]) => {
                list.hstack((item) => {
                  item.className('service-row');
                  item.styles({ alignItems: 'center', gap: '12px' });
                  item.span((badge) => {
                    badge.className('service-dot');
                    badge.attr('aria-hidden', 'true');
                  });
                  item.strong(name);
                  item.spacer();
                  item.span(state);
                  item.divider({ orientation: 'vertical' });
                  item.code(latency);
                });
              });
            });
          });

          workspace.section((panel) => {
            panel.className('layout-panel');
            panel.attr('data-layout-panel', 'center');

            panel.center((empty) => {
              empty.className('center-preview');
              empty.styles({ minHeight: '272px', textAlign: 'center' });

              empty.stack((content) => {
                content.className('center-content');
                content.style('gap', '10px');
                content.img((image) => {
                  image.attr('src', layoutMapSrc);
                  image.attr('alt', '布局组件组合示意图');
                  image.attr('width', 360);
                  image.attr('height', 190);
                });
                content.h2('center：居中预览');
                content.p('适合空状态、加载态、确认提示和局部占位。');
              });
            });
          });
        });
      });
    });
  });

  root.bindTo(target);
  return root;
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  renderLayoutExample('#app');
}
