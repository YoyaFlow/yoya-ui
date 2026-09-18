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
      ele.child('x');
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
      ele.child('x');
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
        ele.child('region');
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
      ele.child('x');
    });

    expect(() => box.child(div('y'))).toThrow(/region builder/);
  });

  it('releases the build closure of a non-region node when the build returns', () => {
    const box = div((ele) => ele.child('x'));

    // 只清值、保留字段槽位：属性仍在（隐藏类不分叉），引用已放开（闭包与其捕获环境可回收）。
    expect('_builders' in box).toBe(true);
    expect(box._builders).toBeNull();
  });

  it('keeps the build closure of a region so the builder can be re-run', () => {
    let builds = 0;
    const box = div((ele) => {
      builds += 1;
      ele.rebuildable();
      ele.child(`build ${builds}`);
    });
    const element = box.renderDom();

    expect(box._builders).toHaveLength(1);

    box.rebuild();

    expect(builds).toBe(2);
    expect(element.textContent).toBe('build 2');
  });

  it('rejects declaring a region after its build returned', () => {
    const box = div((ele) => ele.child('x'));

    expect(() => box.rebuildable()).toThrow(/its own setup builder/);
  });
});
