import { describe, expect, it } from 'vitest';
import { div, vStateNode, vText } from '../index.js';

/**
 * 节点级 setState 的契约：它是「手动状态 + 处理器」的底层钩子，
 * 任意 ViewNode 都有，但只驱动本节点注册的处理器。
 */
describe('node level state', () => {
  it('runs handlers registered on that node and ignores unknown names', () => {
    const calls = [];
    const box = div((ele) => {
      ele.registerStateAttrs('busy', { size: 'string' });
      ele.registerStateHandler('busy', (value, node, oldValue) => {
        calls.push([value, oldValue, node === ele]);
        node.attr('data-busy', value ? 'true' : null);
      });
    });
    const element = box.renderDom();

    box.setState('busy', 'loading');

    expect(calls).toEqual([['loading', undefined, true]]);
    expect(element.getAttribute('data-busy')).toBe('true');
    expect(box.getStringState('busy')).toBe('loading');

    // 没有注册处理器的状态名：只写进状态，不报错也不动 DOM
    expect(() => box.setState('unknown', 1)).not.toThrow();
    expect(box.getState('unknown')).toBe(1);
    expect(element.dataset.unknown).toBeUndefined();
  });

  it('does not re-evaluate function value bindings', () => {
    const data = { label: 'A' };
    const box = div((ele) => {
      ele.rebuildable();
      ele.dataSource(() => data);
      ele.child(vText((source) => source.label));
    });
    box.renderDom();

    data.label = 'B';
    box.setState('anything', true);

    expect(box.children()[0].textContent()).toBe('A');

    box.flush();

    expect(box.children()[0].textContent()).toBe('B');
  });

  it('keeps state values across a rebuild and drops the handlers', () => {
    let handlerCalls = 0;
    const box = div((ele) => {
      ele.rebuildable();
      ele.registerStateHandler('busy', (value, node) => {
        handlerCalls += 1;
        node.attr('data-busy', value ? 'true' : null);
      });
      // 初始态：重建后新 DOM 靠 setup 自己读回，处理器不会自动补跑
      ele.attr('data-busy', ele.getBooleanState('busy') ? 'true' : null);
      ele.text('x');
    });
    box.renderDom();

    box.setState('busy', true);
    expect(handlerCalls).toBe(1);
    expect(box.attr('data-busy')).toBe('true');

    box.rebuild();

    expect(box.getBooleanState('busy')).toBe(true);
    expect(box.attr('data-busy')).toBe('true');

    // 处理器登记随重跑重建，不会叠加
    box.setState('busy', false);
    expect(handlerCalls).toBe(2);
  });

  it('stays independent from the host state component', () => {
    const component = vStateNode({
      state: () => ({ count: 0 }),
      render: (_state, api) =>
        div((ele) => {
          ele.registerStateHandler('local', (value, node) => {
            node.attr('data-local', String(value));
          });
          ele.attr('data-count', (source) => String(source.count));
          ele.on('click', () => {
            ele.setState('local', 'yes');
            api.setState({ count: 1 });
          });
        })
    });

    const element = component.render().renderDom();
    element.click();

    expect(element.getAttribute('data-local')).toBe('yes');
    expect(element.getAttribute('data-count')).toBe('1');
    expect(component.state().count).toBe(1);
  });
});
