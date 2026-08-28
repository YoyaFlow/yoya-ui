import { vCard, vText } from '../../index.js';

const RING_CIRCUMFERENCE = 2 * Math.PI * 44;

export function SvgProgressRingExample1() {
  let frame = 0;
  let progress = 0;
  let ring = null;
  let valueText = vText('0%');

  const schedule =
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (callback) => setTimeout(callback, 16);
  const cancel =
    typeof cancelAnimationFrame === 'function'
      ? cancelAnimationFrame
      : (id) => clearTimeout(id);

  const progressTo = (target) => {
    if (frame) {
      cancel(frame);
    }

    const from = progress;
    const startedAt = Date.now();

    const tick = () => {
      if (!ring._el || !ring._el.isConnected) {
        frame = 0;
        return;
      }

      const ratio = Math.min(1, (Date.now() - startedAt) / 600);
      const eased = 1 - (1 - ratio) ** 3;
      progress = from + (target - from) * eased;
      ring.attr('stroke-dashoffset', String(RING_CIRCUMFERENCE * (1 - progress)));
      valueText.textContent(`${Math.round(progress * 100)}%`);
      frame = ratio < 1 ? schedule(tick) : 0;
    };

    frame = schedule(tick);
  };

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('可中断的环形进度');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('点击目标值后从当前值平滑补间；动画中途可再次点击，不会跳变。');
            stack.svg((root) => {
              root.attr({ height: '120', viewBox: '0 0 120 120', width: '120' });
              root.circle({
                cx: '60',
                cy: '60',
                fill: 'none',
                r: '44',
                stroke: '#e2e8f0',
                'stroke-width': '10'
              });
              root.circle((circle) => {
                ring = circle.attr({
                  cx: '60',
                  cy: '60',
                  fill: 'none',
                  r: '44',
                  stroke: '#0f766e',
                  'stroke-dasharray': String(RING_CIRCUMFERENCE),
                  'stroke-dashoffset': String(RING_CIRCUMFERENCE),
                  'stroke-linecap': 'round',
                  'stroke-width': '10',
                  transform: 'rotate(-90 60 60)'
                });
              });
              root.text((text) => {
                text
                  .attr({
                    'dominant-baseline': 'central',
                    fill: '#0f766e',
                    'font-size': '18',
                    'text-anchor': 'middle',
                    x: '60',
                    y: '60'
                  })
                  .child(valueText);
              });
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.vButton('25%', (button) => button.on('click', () => progressTo(0.25)));
          footer.vButton('70%', (button) => button.on('click', () => progressTo(0.7)));
          footer.vButton('40%', (button) => button.on('click', () => progressTo(0.4)));
        });
      });
    }
  };
}
