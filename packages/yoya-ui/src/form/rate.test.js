import { describe, expect, it, vi } from 'vitest';
import { div, hasComponentIdentity, ref, vField, vForm, vRate } from '../index.js';

const STAR = '[vn~="VRateStar"]';

function findRate(node) {
  if (hasComponentIdentity(node, 'VRate')) {
    return node;
  }

  for (const child of node.children()) {
    const found = findRate(child);
    if (found) {
      return found;
    }
  }

  return null;
}

describe('vRate', () => {
  it('renders stars and a hidden range input', () => {
    const rate = vRate({ count: 5, value: 3 });
    const element = rate.renderDom();

    expect(hasComponentIdentity(rate, 'VRate')).toBe(true);
    expect(element.getAttribute('vn')).toBe('VRate');
    expect(element.querySelectorAll('[vn~="VRateStar"]')).toHaveLength(5);
    const input = element.querySelector('[vn~="VRateInput"]');

    expect(input.type).toBe('range');
    // 原生输入不参与交互 / 无朗读（显隐本身是静态样式，已搬进 CSS，由契约用例守着）
    expect(input.getAttribute('aria-hidden')).toBe('true');
    expect(input.getAttribute('tabindex')).toBe('-1');
    expect(rate.value()).toBe(3);
    expect(element.querySelector('[data-value="3"]').getAttribute('aria-checked')).toBe('true');
  });

  it('selects a star, emits change, and clears when clicking the selected star', () => {
    const changed = vi.fn();
    const rate = vRate({ value: 3 });
    rate.on('change', changed);
    const element = rate.renderDom();

    element.querySelector('[data-value="4"]').click();

    expect(rate.value()).toBe(4);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed.mock.calls[0][0].detail).toBe(4);

    element.querySelector('[data-value="4"]').click();

    expect(rate.value()).toBe(0);
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it('blocks interaction while disabled or readonly', () => {
    const rate = vRate({ disabled: true, value: 3 });
    const element = rate.renderDom();

    element.querySelector('[data-value="4"]').click();
    expect(rate.value()).toBe(3);
    expect(element.querySelector('[vn~="VRateStars"]').getAttribute('aria-disabled')).toBe('true');

    rate.disabled(false).readonly(true);
    element.querySelector('[data-value="4"]').click();
    expect(rate.value()).toBe(3);
    expect(element.querySelector('[vn~="VRateStars"]').getAttribute('aria-readonly')).toBe('true');

    rate.readonly(false);
    element.querySelector('[data-value="4"]').click();
    expect(rate.value()).toBe(4);
  });

  it('supports half values and rounds when half mode is disabled', () => {
    const rate = vRate({ allowHalf: true, count: 5, value: 3.5 });
    const element = rate.renderDom();

    expect(rate.value()).toBe(3.5);
    expect(element.querySelector('[data-value="4"]').dataset.half).toBe('true');
    expect(element.querySelector('[data-value="4"]').getAttribute('aria-checked')).toBe('true');

    rate.allowHalf(false);
    expect(rate.value()).toBe(4);
  });

  it('updates count, character, size, name, required, and error states', () => {
    const rate = vRate({
      character: '●',
      count: 7,
      error: true,
      name: 'score',
      required: true,
      size: 26,
      value: 6
    });
    const element = rate.renderDom();

    expect(rate.count()).toBe(7);
    expect(rate.character()).toBe('●');
    expect(rate.size()).toBe(26);
    expect(rate.name()).toBe('score');
    expect(rate.required()).toBe(true);
    expect(rate.error()).toBe(true);
    expect(element.querySelectorAll('[vn~="VRateStar"]')).toHaveLength(7);
    expect(element.querySelector('[vn~="VRateStarBase"]').textContent).toBe('●');
    expect(element.querySelector('[vn~="VRateInput"]').name).toBe('score');
    expect(element.querySelector('[vn~="VRateInput"]').required).toBe(true);
    expect(element.querySelector('[vn~="VRateStars"]').getAttribute('aria-invalid')).toBe('true');
  });

  it('registers vRate as a parent shortcut', () => {
    const page = div((root) => {
      root.vRate({ value: 2 });
    });
    const rate = page.children()[0];

    expect(hasComponentIdentity(rate, 'VRate')).toBe(true);
    expect(rate.value()).toBe(2);
  });

  it('collects and applies values through vForm and vFormItem', () => {
    const form = vForm((root) => {
      root.vFormItem((item) => {
        item.label('评分').name('score');
        item.control((editor) => editor.vRate({ name: 'score', value: 4 }));
      });
    });
    form.renderDom();
    const rate = findRate(form);

    expect(form.values().score).toBe(4);

    rate.value(2);
    expect(form.values().score).toBe(2);

    form.values({ score: 5 });
    expect(rate.value()).toBe(5);
  });

  it('validates required ratings and works as a vField editor', () => {
    const form = vForm((root) => {
      root.vFormItem((item) => {
        item.label('评分').name('score').required({ message: '请选择评分' });
        item.control((editor) => editor.vRate({ name: 'score' }));
      });
    });
    form.renderDom();

    expect(form.validate()).toBe(false);
    findRate(form).value(2);
    expect(form.validate()).toBe(true);

    const field = vField({
      label: '评分',
      value: 4,
      control: (editor) => editor.vRate({ name: 'score', value: 4 })
    });
    const fieldElement = field.renderDom();

    expect(hasComponentIdentity(field.control(), 'VRate')).toBe(true);
    expect(field.value()).toBe(4);
    expect(fieldElement.querySelector('[vn~="VFieldDisplay"]').textContent).toBe('4');

    field.mode('edit');
    field.value(2);
    expect(field.value()).toBe(2);
  });

  it('declares zero as an empty value for required checks without a form item', () => {
    // 值语义走能力约定（`isEmptyValue`），不按组件身份分支：直接挂在 vForm 下的评分也一样判定
    const form = vForm((root) => root.vRate({ name: 'score', required: true }));
    form.renderDom();

    const rate = findRate(form);
    expect(rate.isEmptyValue(0)).toBe(true);
    expect(rate.isEmptyValue(3)).toBe(false);
    expect(form.validate()).toBe(false);

    rate.value(3);
    expect(form.values().score).toBe(3);
    expect(form.validate()).toBe(true);
  });

  it('keeps prop handles live and derives every star from them', () => {
    const value = ref(2);
    const count = ref(3);
    const rate = vRate({ count, value });
    const element = rate.renderDom();
    const stars = element.querySelectorAll(STAR);

    expect(element.dataset.value).toBe('2');
    expect(stars).toHaveLength(3);
    expect(stars[1].getAttribute('aria-checked')).toBe('true');
    expect(stars[1].getAttribute('data-filled')).toBe('true');
    expect(stars[2].getAttribute('data-filled')).toBeNull();

    // 句柄 props 是活值：写状态就落 DOM（星标、填充比例、原生输入都跟着走）
    value.value = 3;

    expect(rate.value()).toBe(3);
    expect(element.dataset.value).toBe('3');
    expect(stars[2].getAttribute('data-filled')).toBe('true');
    expect(element.querySelector('[vn~="VRateInput"]').value).toBe('3');

    count.value = 5;

    expect(element.querySelectorAll(STAR)).toHaveLength(5);
    expect(element.dataset.count).toBe('5');

    rate.destroy();
  });

  it('reconciles stars by count instead of rebuilding the row', () => {
    const rate = vRate({ count: 3, value: 2 });
    const element = rate.renderDom();
    const firstStar = element.querySelector(STAR);
    const fill = firstStar.querySelector('[vn~="VRateStarFill"]');

    // 只加两颗：原有星标节点与填充节点原地复用（不整段重建）
    rate.count(5);

    expect(element.querySelectorAll(STAR)).toHaveLength(5);
    expect(element.querySelector(STAR)).toBe(firstStar);
    expect(firstStar.querySelector('[vn~="VRateStarFill"]')).toBe(fill);

    // 换字符 / 换尺寸只写文本与 CSS 变量，同样不重建
    rate.character('●');
    rate.size(30);

    expect(firstStar.querySelector('[vn~="VRateStarBase"]').textContent).toBe('●');
    expect(element.style.getPropertyValue('--yoya-rate-size')).toBe('30px');
    expect(element.querySelector(STAR)).toBe(firstStar);

    // 只减：离场的星标销毁，留下的还是同一个节点
    rate.count(2);

    expect(element.querySelectorAll(STAR)).toHaveLength(2);
    expect(element.querySelector(STAR)).toBe(firstStar);
    expect(element.querySelector('[vn~="VRateStarFill"]')).toBe(fill);

    rate.destroy();
  });
});
