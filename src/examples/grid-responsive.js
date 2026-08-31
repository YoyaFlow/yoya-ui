import { vCard, vText } from '../index.js';

const breakpoints = [
  { minWidth: 0, columns: 1 },
  { minWidth: 640, columns: 2 },
  { minWidth: 960, columns: 3 }
];

/**
 * 独立响应式栅格页：以自身窗口宽度驱动换列，供文档页 iframe 调整宽度演示。
 */
export function renderGridResponsive() {
  const status = vText('正在读取窗口宽度…');

  const refresh = () => {
    const width = window.innerWidth;
    const match = breakpoints
      .slice()
      .sort((left, right) => left.minWidth - right.minWidth)
      .filter((entry) => width >= entry.minWidth)
      .at(-1);
    status.textContent(
      match ? `窗口宽度 ${width}px → ${match.columns} 列` : `窗口宽度 ${width}px → auto-fit 换列`
    );
  };

  window.addEventListener('resize', refresh);
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(refresh);
  }

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('响应式栅格');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (content) => {
            content.p((text) => {
              text.className('grid-responsive-status');
              text.attr('data-grid-responsive-status', 'true');
              text.child(status);
            });
            content.responsiveGrid({ breakpoints, minColumnWidth: 180 }, (cards) => {
              cards.style('gap', '12px');
              [
                ['上线', '稳定'],
                ['维护', '处理中'],
                ['告警', '待确认'],
                ['观察', '跟踪中'],
                ['扩容', '就绪'],
                ['回滚', '已完成']
              ].forEach(([label, value]) => {
                cards.article((cell) => {
                  cell.className('detail-grid-cell');
                  cell.strong(label);
                  cell.span(value);
                });
              });
            });
          });
        });
      });
    }
  };
}

renderGridResponsive().render().bindTo('#app');
