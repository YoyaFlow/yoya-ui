import { describe, expect, it } from 'vitest';
import { div } from '../index.js';

describe('rebuildable region contracts', () => {
  it('evaluates the predicate once per rebuild', () => {
    let calls = 0;
    const box = div((ele) => {
      ele.rebuildable(() => {
        calls += 1;
        return true;
      });
      ele.text('x');
    });
    box.renderDom();

    box.rebuild();
    box.rebuild();

    expect(calls).toBe(2);
  });

  it('replaces the predicate when rebuildable() is called again', () => {
    let allow = false;
    const box = div((ele) => {
      ele.rebuildable(() => allow);
      ele.text('x');
    });
    box.renderDom();

    box.rebuildable(() => true);
    box.rebuild();

    expect(box.rebuildPending()).toBe(false);
  });

  it('leaves bindings outside the region untouched by a rebuild', () => {
    const data = { n: 1 };
    let region = null;
    const page = div((host) => {
      host.div((outside) => {
        outside.attr('data-n', () => String(data.n));
      });
      host.div((ele) => {
        region = ele;
        ele.rebuildable();
        ele.text('region');
      });
    });
    const element = page.renderDom();

    const outsideElement = element.firstElementChild;
    expect(outsideElement.getAttribute('data-n')).toBe('1');

    data.n = 2;
    region.rebuild();
    page.flush();

    expect(outsideElement.getAttribute('data-n')).toBe('2');
    expect(outsideElement).toBe(element.firstElementChild);
  });

  it('releases bindings when the region is destroyed', () => {
    const box = div((ele) => {
      ele.rebuildable();
      ele.attr('data-n', () => 'x');
    });
    box.renderDom();

    expect(box._bindings.length).toBeGreaterThan(0);

    box.destroy();

    expect(box._bindings.length).toBe(0);
  });

  it('rejects children appended to a region outside its builder', () => {
    const box = div((ele) => {
      ele.rebuildable();
      ele.text('x');
    });

    expect(() => box.child(div('y'))).toThrow(/region builder/);
  });
});
