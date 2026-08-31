import { describe, expect, it, vi } from 'vitest';
import { VCascader, div, vCascader, vForm } from '../index.js';

const options = [
  {
    label: '浙江',
    value: 'zhejiang',
    children: [
      { label: '杭州', value: 'hangzhou' },
      { label: '宁波', value: 'ningbo' }
    ]
  },
  {
    label: '广东',
    value: 'guangdong',
    children: [
      {
        label: '深圳',
        value: 'shenzhen',
        children: [{ label: '南山区', value: 'nanshan' }]
      }
    ]
  }
];

function findCascader(node) {
  if (node instanceof VCascader) {
    return node;
  }

  for (const child of node.children()) {
    const found = findCascader(child);
    if (found) {
      return found;
    }
  }

  return null;
}

describe('vCascader', () => {
  it('renders a trigger and a closed panel', () => {
    const cascader = vCascader({ options, placeholder: '请选择地区' });
    const element = cascader.renderDom();

    expect(cascader).toBeInstanceOf(VCascader);
    expect(element.classList.contains('yoya-vcascader')).toBe(true);
    expect(element.querySelector('[data-vcascader-trigger]')).not.toBeNull();
    expect(element.querySelector('[data-vcascader-trigger]').textContent).toContain('请选择地区');
    expect(element.querySelector('[data-vcascader-panel]').style.display).toBe('none');
  });

  it('opens, navigates columns and selects a leaf path', () => {
    const onChange = vi.fn();
    const cascader = vCascader({ onChange, options });
    const element = cascader.renderDom();

    element.querySelector('[data-vcascader-trigger]').click();
    const panel = element.querySelector('[data-vcascader-panel]');
    expect(panel.style.display).not.toBe('none');
    expect(element.querySelector('[data-vcascader-trigger]').getAttribute('aria-expanded')).toBe(
      'true'
    );

    element.querySelector('[data-vcascader-option="guangdong"]').click();
    expect(element.querySelector('[data-vcascader-option="shenzhen"]')).not.toBeNull();
    expect(element.querySelector('[data-vcascader-trigger]').textContent).toContain('广东');

    element.querySelector('[data-vcascader-option="shenzhen"]').click();
    element.querySelector('[data-vcascader-option="nanshan"]').click();

    expect(cascader.value()).toEqual(['guangdong', 'shenzhen', 'nanshan']);
    expect(element.querySelector('[data-vcascader-trigger]').textContent).toContain(
      '广东 / 深圳 / 南山区'
    );
    expect(element.querySelector('[data-vcascader-panel]').style.display).toBe('none');
    expect(onChange).toHaveBeenLastCalledWith(['guangdong', 'shenzhen', 'nanshan'], cascader);
  });

  it('sets a value from an array and reads it back', () => {
    const cascader = vCascader({ options });
    cascader.value(['zhejiang', 'hangzhou']);

    expect(cascader.value()).toEqual(['zhejiang', 'hangzhou']);
    expect(cascader.renderDom().querySelector('[data-vcascader-trigger]').textContent).toContain(
      '浙江 / 杭州'
    );
  });

  it('exposes disabled/name/required and blocks interaction while disabled', () => {
    const cascader = vCascader({ disabled: true, name: 'region', options, required: true });
    const element = cascader.renderDom();

    expect(cascader.disabled()).toBe(true);
    expect(cascader.name()).toBe('region');
    expect(cascader.required()).toBe(true);
    expect(element.querySelector('[data-vcascader-trigger]').disabled).toBe(true);

    cascader.disabled(false);
    expect(cascader.disabled()).toBe(false);
    expect(element.querySelector('[data-vcascader-trigger]').disabled).toBe(false);
  });

  it('registers vCascader as a parent shortcut', () => {
    const page = div((root) => {
      root.vCascader({ options });
    });
    const cascader = page.children()[0];

    expect(cascader).toBeInstanceOf(VCascader);
    expect(cascader.options()).toHaveLength(2);
  });

  it('collects and applies values through vForm and vFormItem', () => {
    const form = vForm((root) => {
      root.vFormItem((item) => {
        item.label('地区').name('region');
        item.control((editor) => editor.vCascader({ name: 'region', options }));
      });
    });
    form.renderDom();
    const cascader = findCascader(form);

    cascader.value(['guangdong', 'shenzhen']);
    expect(form.values().region).toEqual(['guangdong', 'shenzhen']);

    form.values({ region: ['zhejiang', 'hangzhou'] });
    expect(cascader.value()).toEqual(['zhejiang', 'hangzhou']);
  });
});
