import { describe, expect, it } from 'vitest';
import { div, ref, span, vStep, vSteps } from '../index.js';

const STEP = '[vn~="VStep"]';
const TITLE = '[vn~="VStepsTitle"]';

describe('vSteps', () => {
  it('renders derived step statuses from the current step', () => {
    const steps = vSteps({
      current: 1,
      items: [
        { title: '创建', description: '填写基本信息' },
        { title: '配置', description: '选择资源' },
        { title: '发布', description: '确认上线' }
      ]
    });
    const element = steps.renderDom();
    const items = element.querySelectorAll("[vn~='VStep']");

    expect(element.getAttribute('role')).toBe('list');
    expect(items[0].style.gridTemplateColumns).toBe('minmax(0, 1fr)');
    expect(items).toHaveLength(3);
    expect(items[0].dataset.status).toBe('finish');
    expect(items[1].dataset.status).toBe('process');
    expect(items[2].dataset.status).toBe('wait');
    expect(items[0].textContent).toContain('创建');
    expect(items[0].querySelector("[vn~='VStepsIndicator']").textContent).toBe('✓');
    expect(items[1].querySelector("[vn~='VStepsIndicator']").textContent).toBe('2');
  });

  it('supports error status and dynamic current changes', () => {
    const steps = vSteps({
      current: 1,
      items: ['创建', '配置', '发布'],
      status: 'error'
    });
    const element = steps.renderDom();
    const items = element.querySelectorAll("[vn~='VStep']");

    expect(items[1].dataset.status).toBe('error');
    expect(items[1].querySelector("[vn~='VStepsIndicator']").textContent).toBe('!');

    steps.status('process');
    steps.next();

    expect(steps.current()).toBe(2);
    expect(items[2].dataset.status).toBe('process');

    steps.prev();

    expect(steps.current()).toBe(1);
  });

  it('supports declarative callback and vStep child shortcuts', () => {
    const steps = vSteps((steps) => {
      steps.current(0);
      steps.vStep((step) => {
        step.title('第一步');
        step.description('说明');
      });
      steps.vStep({ description: '继续', title: '第二步' });
    });
    const element = steps.renderDom();

    expect(element.querySelectorAll("[vn~='VStep']")).toHaveLength(2);
    expect(element.querySelector("[vn~='VStepsTitle']").textContent).toBe('第一步');
    expect(element.querySelector("[vn~='VStepsDescription']").textContent).toBe('说明');
  });

  it('switches direction and size and hides the last connector', () => {
    const steps = vSteps({ items: ['A', 'B', 'C'] });
    const element = steps.renderDom();

    steps.direction('vertical');
    steps.size('small');

    expect(element.dataset.direction).toBe('vertical');
    expect(element.dataset.size).toBe('small');
    expect(element.querySelector("[vn~='VStep']").style.gridTemplateColumns).toBe(
      'auto minmax(0, 1fr)'
    );

    const stepsItems = element.querySelectorAll("[vn~='VStep']");
    expect(stepsItems[0].hasAttribute('data-last')).toBe(false);
    expect(stepsItems[2].getAttribute('data-last')).toBe('true');
  });

  it('marks the last step so the connector rule hides its line', () => {
    const steps = vSteps({ items: ['A', 'B', 'C'] });
    const element = steps.renderDom();
    const stepsItems = element.querySelectorAll("[vn~='VStep']");

    expect(stepsItems[0].hasAttribute('data-last')).toBe(false);
    expect(stepsItems[1].hasAttribute('data-last')).toBe(false);
    expect(stepsItems[2].getAttribute('data-last')).toBe('true');
    // 末项以外的连线由 CSS 规则显示：`[vn~='VStep']:not([data-last='true']) [vn~='VStepsConnector']`
    expect(element.querySelectorAll("[vn~='VStepsConnector']")).toHaveLength(3);
  });

  it('replaces items and registers vSteps as a parent shortcut', () => {
    const root = div();
    root.vSteps({ current: 0, items: ['X'] });
    const steps = root.children()[0];

    steps.items([{ title: 'Y' }]);
    const element = root.renderDom();

    expect(element.querySelectorAll("[vn~='VStep']")).toHaveLength(1);
    expect(element.textContent).toContain('Y');
  });

  it('keeps prop handles live and mirrors state on attributes', () => {
    const current = ref(1);
    const direction = ref('horizontal');
    const status = ref('process');
    const steps = vSteps({ current, direction, items: ['A', 'B', 'C'], status });
    const element = steps.renderDom();
    const items = element.querySelectorAll(STEP);

    expect(element.dataset.current).toBe('1');
    expect(items[1].dataset.status).toBe('process');

    // 句柄 props 是活值：写状态就落 DOM（容器与每一项都跟着走）
    current.value = 2;

    expect(element.dataset.current).toBe('2');
    expect(items[0].dataset.status).toBe('finish');
    expect(items[2].dataset.status).toBe('process');
    expect(items[2].getAttribute('aria-current')).toBe('step');
    expect(items[2].getAttribute('data-last')).toBe('true');

    direction.value = 'vertical';

    expect(element.dataset.direction).toBe('vertical');
    expect(items[0].style.gridTemplateColumns).toBe('auto minmax(0, 1fr)');

    status.value = 'error';

    expect(items[2].dataset.status).toBe('error');
    expect(items[2].querySelector('[vn~="VStepsIndicator"]').textContent).toBe('!');

    steps.destroy();
  });

  it('reconciles the step list by identity instead of rebuilding it', () => {
    const first = vStep({ title: 'A' });
    const second = vStep({ title: 'B' });
    const steps = vSteps({ items: [first] });
    const element = steps.renderDom();
    const firstLi = element.querySelector(STEP);

    first.title('A2');
    steps.vStep(second);

    const items = steps.items();
    const lis = element.querySelectorAll(STEP);

    // 留下来的项还挂在原来的节点与 DOM 上（不重建、不整段重排）
    expect(items[0]).toBe(first);
    expect(items[1]).toBe(second);
    expect(lis[0]).toBe(firstLi);
    expect(lis[0].querySelector(TITLE).textContent).toBe('A2');
    expect(element.dataset.stepCount).toBe('2');
    expect(lis[0].hasAttribute('data-last')).toBe(false);
    expect(lis[1].getAttribute('data-last')).toBe('true');

    // 整批替换：同一个项实例复用，离场的销毁
    steps.items([first]);

    expect(steps.items()).toHaveLength(1);
    expect(element.querySelector(STEP)).toBe(firstLi);
    expect(element.dataset.stepCount).toBe('1');
    expect(firstLi.getAttribute('data-last')).toBe('true');

    steps.destroy();
  });

  it('takes node content from props and rejects it in the content commands', () => {
    const step = vStep({
      description: span('节点描述'),
      icon: span('★'),
      title: span('节点标题')
    });
    const element = step.renderDom();

    expect(element.querySelector(TITLE).textContent).toBe('节点标题');
    expect(element.querySelector('[vn~="VStepsDescription"]').textContent).toBe('节点描述');
    expect(element.querySelector('[vn~="VStepsIndicator"]').textContent).toBe('★');
    expect(() => step.title(span('其它'))).toThrow(/props\.title/);
    expect(() => step.icon(span('其它'))).toThrow(/props\.icon/);

    step.destroy();
  });
});
