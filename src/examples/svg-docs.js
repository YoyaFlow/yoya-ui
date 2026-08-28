import { section } from '../index.js';
import { ComponentSource } from './component-source.js';
import { SvgProgressRingExample1 } from './demos/svg.js';

export function SvgDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-svg-page');
        page.attr('data-svg-page', 'true');
        page.h1('SVG 动画');
        page.p(
          '闭环动画：每次点击从当前值平滑补间，动画中途可再次点击并从中途继续。' +
            'CSS 过渡与 SMIL 是开环播放，无法读取当前值、也无法从中间状态衔接。'
        );

        page.section((demo) => {
          demo.className('components-svg-demo');
          demo.attr('data-svg-demo', 'ring');
          demo.h2('可中断的环形进度');
          demo.p('requestAnimationFrame 逐帧计算并写入 stroke-dashoffset，数字文本同步更新。');
          demo.div((live) => {
            live.className('components-svg-demo-live');
            live.attr('data-svg-demo-live', 'true');
            live.child(SvgProgressRingExample1());
          });
          demo.child(
            ComponentSource({
              component: SvgProgressRingExample1,
              imports: ['vCard', 'vText'],
              title: 'SvgProgressRingExample1 源码'
            })
          );
        });

        page.section((tips) => {
          tips.className('components-svg-tips');
          tips.h2('JS 闭环控制的价值');
          tips.ul((list) => {
            list.li('读取当前值：进度保存在闭包中，随时可继续，开环动画做不到。');
            list.li('中断衔接：连续点击 25% → 70% → 40%，从当前值补间而不是跳变。');
            list.li('状态同步：数字文本与圆环由同一份状态驱动，不会各自漂移。');
          });
        });
      });
    }
  };
}
