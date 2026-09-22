import { describe, expect, it } from 'vitest';
import { div, vSteps } from '../index.js';

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
});
