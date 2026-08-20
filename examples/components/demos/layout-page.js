import { vCard } from '../../../src/index.js';

export function BodyPageCard() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('页面容器');
        card.vCardBody((body) => {
          body.vBody((page) => {
            page.background('#f8fafc');
            page.maxWidth(880);
            page.padding('clamp(16px, 4vw, 28px)');
            page.gap(18);
            page.vstack((heading) => {
              heading.style('gap', '6px');
              heading.h2('服务工作台');
              heading.p('vBody 统一页面背景、内容宽度与留白，内部布局仍可自由组合。');
            });
            page.responsiveGrid((grid) => {
              grid.minColumnWidth(180);
              grid.style('gap', '12px');
              [
                ['在线服务', '24'],
                ['待发布', '6'],
                ['告警', '2']
              ].forEach(([label, value]) => {
                grid.div((metric) => {
                  metric.className('metric');
                  metric.span(label);
                  metric.strong(value);
                });
              });
            });
          });
        });
      });
    }
  };
}

export const layoutPageCategory = {
  description: '页面容器、内容宽度与响应式网格。',
  id: 'layout-page',
  title: '页面布局',
  demos: [{ component: BodyPageCard, imports: ['vCard'], title: '页面容器核心源码' }]
};
