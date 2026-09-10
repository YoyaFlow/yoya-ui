import { svg } from '../index.js';

const stroke = 'var(--yoya-color-border, #d8dee8)';
const surface = 'var(--yoya-color-surface, #ffffff)';
const subtle = 'var(--yoya-color-surface-muted, #f8fafc)';
const primary = 'var(--yoya-color-primary, #2563eb)';
const titleColor = 'var(--yoya-color-text, #0f172a)';
const mutedColor = 'var(--yoya-color-text-secondary, #475569)';

/** 组件生命周期四阶段：图中每个方框的标题、要点与一句话摘要。 */
export const componentLifecyclePhases = [
  {
    key: 'declare',
    title: '1 声明（构建期）',
    summary: '工厂调用建节点、setup 只写快照；组件对象包成 ComponentNode，构建期作用域在此捕获',
    items: [
      '工厂 → new Node(tag, setup)',
      'setup 只写快照：attr/style/on',
      '组件对象 → ComponentNode',
      '构建期捕获三种作用域'
    ]
  },
  {
    key: 'mount',
    title: '2 挂载',
    summary: 'renderDom() 造真实 DOM 并绑事件适配器；SSR 走 toHTML()，不碰 DOM',
    items: [
      'renderDom()：建 DOM 与事件',
      'bindTo(target)：renderDom + append',
      'commit()：权限态 + 子节点对齐',
      '递归子节点，应用属性快照',
      'SSR：toHTML()，不碰 DOM'
    ]
  },
  {
    key: 'update',
    title: '3 更新（状态变化）',
    summary: '按代价从低到高：绑定写回 → update 局部 patch → 区域 rebuild → 组件 rebuild',
    items: [
      '函数值绑定：只写回，不重建 DOM',
      'update()：局部 patch',
      '区域 rebuild()：清空 + 重跑 setup',
      '组件 rebuild()：销毁旧根重建'
    ]
  },
  {
    key: 'destroy',
    title: '4 销毁',
    summary: '解除事件与 cleanup、递归销毁子节点、清空 keyed 注册表后摘除 DOM，重复调用幂等',
    items: [
      '解除事件 adapter 与 cleanup',
      '递归销毁子节点',
      '清空 keyed 注册表',
      '摘除 DOM；destroy() 幂等'
    ]
  }
];

const boxWidth = 264;
const boxHeight = 172;
const boxGap = 24;
const startX = 16;
const top = 34;
const canvasWidth = 1200;
const noteTop = top + boxHeight + 34;
const noteWidth = canvasWidth - startX * 2;

/**
 * 组件生命周期图：四阶段横向流程 + 更新自环 + SSR 首屏说明。
 * 用 SVG DSL 绘制，颜色走主题 token，随明暗模式变化。
 */
export function ComponentLifecycleDiagram() {
  return svg((canvas) => {
    canvas.className('components-lifecycle-diagram');
    canvas.attr({
      'data-lifecycle-diagram': 'true',
      role: 'img',
      'aria-label': '组件生命周期：声明、挂载、更新、销毁四个阶段',
      viewBox: `0 0 ${canvasWidth} 340`
    });
    canvas.style('display', 'block');
    canvas.style('width', '100%');
    canvas.style('height', 'auto');

    canvas.defs((defs) => {
      defs.marker((marker) => {
        marker.attr({
          id: 'yoya-lifecycle-arrow',
          markerWidth: 10,
          markerHeight: 10,
          refX: 8,
          refY: 3,
          orient: 'auto'
        });
        marker.path((head) => head.attr({ d: 'M0,0 L8,3 L0,6 Z', fill: primary }));
      });
    });

    componentLifecyclePhases.forEach((phase, index) => {
      const x = startX + index * (boxWidth + boxGap);

      canvas.g((group) => {
        group.rect((box) =>
          box.attr({ x, y: top, width: boxWidth, height: boxHeight, rx: 10, fill: surface, stroke })
        );
        group.rect((bar) =>
          bar.attr({ x, y: top, width: boxWidth, height: 32, rx: 10, fill: subtle })
        );
        group.text(phase.title, (title) =>
          title.attr({
            x: x + 14,
            y: top + 21,
            'font-size': 13,
            'font-weight': 700,
            fill: titleColor
          })
        );
        phase.items.forEach((item, itemIndex) => {
          group.text(item, (line) =>
            line.attr({
              x: x + 14,
              y: top + 58 + itemIndex * 24,
              'font-size': 11,
              fill: mutedColor
            })
          );
        });
      });

      if (index < componentLifecyclePhases.length - 1) {
        canvas.line((arrow) =>
          arrow.attr({
            x1: x + boxWidth + 4,
            y1: top + boxHeight / 2,
            x2: x + boxWidth + boxGap - 4,
            y2: top + boxHeight / 2,
            stroke: primary,
            'stroke-width': 1.5,
            'marker-end': 'url(#yoya-lifecycle-arrow)'
          })
        );
      }
    });

    // 更新阶段是循环：在第三个方框上方画自环，表示「每次状态变化都会再走一遍」。
    const updateX = startX + 2 * (boxWidth + boxGap);
    canvas.path((loop) =>
      loop.attr({
        d: `M${updateX + 110} ${top} C ${updateX + 110} ${top - 22}, ${updateX + 176} ${top - 22}, ${updateX + 176} ${top}`,
        fill: 'none',
        stroke: primary,
        'stroke-width': 1.5,
        'marker-end': 'url(#yoya-lifecycle-arrow)'
      })
    );
    canvas.text('每次状态变化', (label) =>
      label.attr({
        x: updateX + 143,
        y: top - 12,
        'font-size': 11,
        'text-anchor': 'middle',
        fill: primary
      })
    );

    canvas.rect((note) =>
      note.attr({
        x: startX,
        y: noteTop,
        width: noteWidth,
        height: 74,
        rx: 10,
        fill: subtle,
        stroke
      })
    );
    canvas.text(
      'SSR 首屏：toHTML() 输出 HTML → hydrate() 收养既有 DOM（adoptElement + bindElement，不重建元素）',
      (line) => line.attr({ x: startX + 16, y: noteTop + 28, 'font-size': 12, fill: titleColor })
    );
    canvas.text(
      '→ hydrateSnapshot() 回读表单真实值；前提是 render()/toHTML() 保持 DOM-free 且确定性，两棵树一致才不会错位。',
      (line) =>
        line.attr({
          x: startX + 16,
          y: noteTop + 52,
          'font-size': 11.5,
          fill: mutedColor
        })
    );
  });
}
