import { describe, expect, it } from 'vitest';
import { div, ref, vText } from '../index.js';
import { vTbody, vTr } from '../data-display/table.js';

describe('component fragment', () => {
  it('renders the component view root without an extra wrapper element', () => {
    const Card = {
      render: () => div().attr('data-root', 'true').child(vText('0'))
    };
    const element = div().child(Card).renderDom();

    expect(element.firstElementChild.getAttribute('data-root')).toBe('true');
    expect(element.firstElementChild.tagName).toBe('DIV');
  });

  it('works as a table row without wrapper nodes', () => {
    const Row = {
      render: () => vTr((tr) => tr.vTd('Ada'))
    };
    const element = vTbody().child(Row).renderDom();

    expect(element.children.length).toBe(1);
    expect(element.firstElementChild.tagName).toBe('TR');
    expect(element.firstElementChild.textContent).toBe('Ada');
  });

  it('swaps the region content in place after a rebuild', () => {
    const count = ref(0);
    const Counter = {
      render() {
        return div((box) => {
          box.rebuildable();
          box.child(vText(String(count.value)));
        });
      }
    };
    const host = div().child(Counter);
    const container = host.renderDom();
    const first = container.firstElementChild.firstChild;

    expect(container.textContent).toBe('0');

    count.value = 1;

    expect(container.children.length).toBe(1);
    expect(container.firstElementChild.firstChild).not.toBe(first);
    expect(container.textContent).toBe('1');
  });

  it('releases region subscriptions when destroyed through the view tree', () => {
    const count = ref(0);
    let builds = 0;
    const Counter = {
      render() {
        return div((box) => {
          box.rebuildable();
          builds += 1;
          box.child(vText(String(count.value)));
        });
      }
    };
    const host = div().child(Counter);

    host.renderDom();
    expect(builds).toBe(1);

    host.destroy();
    count.value = 1;

    expect(builds).toBe(1);
  });
});
