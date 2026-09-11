import { afterEach, describe, expect, it } from 'vitest';
import { ViewNode, computed, div, installSignals, ref, vText } from '../index.js';

afterEach(() => {
  installSignals(null);
});

describe('signal value bindings', () => {
  it('renders the current signal value into SSR html', () => {
    const count = ref(3);
    const box = div((el) => el.attr('data-count', count));

    expect(box.toHTML()).toBe('<div data-count="3"></div>');
  });

  it('updates the attribute in place when the signal changes', () => {
    const count = ref(0);
    const box = div((el) => el.attr('data-count', count));
    const element = box.renderDom();
    const before = box._el;

    count.value = 5;

    expect(element.getAttribute('data-count')).toBe('5');
    expect(box._el).toBe(before);
  });

  it('does not subscribe before the node is rendered', () => {
    const count = ref(0);
    const box = div((el) => el.attr('data-count', count));

    count.value = 2;

    expect(box.toHTML()).toBe('<div data-count="0"></div>');
  });

  it('updates bound text in place', () => {
    const count = ref(1);
    const label = vText(count);
    const root = div((el) => el.child(label));
    const element = root.renderDom();
    const textNode = element.firstChild;

    count.value = 2;

    expect(textNode.textContent).toBe('2');
    expect(element.firstChild).toBe(textNode);
  });

  it('updates bound styles in place', () => {
    const width = ref('10px');
    const box = div((el) => el.style('width', width));
    const element = box.renderDom();

    width.value = '20px';

    expect(element.style.width).toBe('20px');
  });

  it('keeps derived values in sync through computed', () => {
    const count = ref(2);
    const double = computed(() => count.value * 2);
    const box = div((el) => el.attr('data-double', double));
    const element = box.renderDom();

    count.value = 3;

    expect(element.getAttribute('data-double')).toBe('6');
  });

  it('stops updating after the node is destroyed', () => {
    const count = ref(0);
    const box = div((el) => el.attr('data-count', count));
    const element = box.renderDom();

    box.destroy();
    count.value = 9;

    expect(element.getAttribute('data-count')).toBe('0');
  });

  it('ignores writes when the value is unchanged', () => {
    const count = ref(1);
    let writes = 0;
    const box = div((el) => {
      el.attr('data-count', count);
      const original = el.attr.bind(el);
      el.attr = (name, value) => {
        if (name === 'data-count' && value !== undefined) {
          writes += 1;
        }
        return original(name, value);
      };
    });
    box.renderDom();

    count.value = 1;

    expect(writes).toBe(1);
  });

  it('keeps working when a bound node is a plain ViewNode child', () => {
    const count = ref(1);
    const child = vText(count);
    const root = div((el) => el.child(child));
    root.renderDom();

    count.value = 4;

    expect(child.textContent()).toBe('4');
    expect(child instanceof ViewNode).toBe(true);
  });

  it('toggles a class from a boolean signal', () => {
    const active = ref(false);
    const box = div((el) => el.toggleClass('is-active', active));
    const element = box.renderDom();

    expect(element.className).not.toContain('is-active');

    active.value = true;
    expect(element.className).toContain('is-active');

    active.value = false;
    expect(element.className).not.toContain('is-active');
  });
});
