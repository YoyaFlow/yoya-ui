import { afterEach, describe, expect, it, vi } from 'vitest';
import { div, p, ref, ul } from '../index.js';

let errorSpy = null;

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

function failingNode(message = 'boom') {
  const node = div('broken');
  vi.spyOn(node, 'renderDom').mockImplementation(() => {
    throw new Error(message);
  });
  return node;
}

describe('whenFailed error boundary', () => {
  it('replaces boundary content with the fallback node and always logs', () => {
    const box = div((node) => {
      node.whenFailed(() => p('这块挂了'));
      node.child(failingNode());
    });
    const element = box.renderDom();

    expect(element.textContent).toBe('这块挂了');
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [prefix, error, info] = errorSpy.mock.calls[0];
    expect(prefix).toContain('whenFailed');
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('boom');
    expect(info.phase).toBe('render');
  });

  it('keeps current content when the handler returns null', () => {
    const box = div((node) => {
      node.whenFailed(() => null);
      node.p('内容');
      node.button((button) => {
        button.on('click', () => {
          throw new Error('event boom');
        });
      });
    });
    const element = box.renderDom();

    element.querySelector('button').click();

    expect(element.textContent).toContain('内容');
    expect(element.querySelector('button')).not.toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][2].phase).toBe('event');
  });

  it('falls back when a keyed update fails', () => {
    const rows = ref([{ id: 1 }]);
    const list = ul((node) => {
      node.whenFailed(() => p('更新降级'));
      node.keyed(
        rows,
        (row) => row.id,
        (row) => {
          if (row.id === 2) {
            throw new Error('build boom');
          }
          return p(`row-${row.id}`);
        }
      );
    });
    const element = list.renderDom();
    expect(element.textContent).toBe('row-1');

    rows.value = [{ id: 2 }];

    expect(element.textContent).toBe('更新降级');
    expect(errorSpy.mock.calls[0][2].phase).toBe('update');
  });

  it('isolates event handler failures without breaking siblings', () => {
    const outerClicks = [];
    const box = div((node) => {
      node.whenFailed(() => p('事件降级'));
      node.button((button) => {
        button.on('click', () => {
          throw new Error('click boom');
        });
      });
    });
    const host = div((page) => {
      page.child(box);
      page.button((sibling) => {
        sibling.on('click', () => outerClicks.push('sibling'));
      });
    });
    const element = host.renderDom();

    element.querySelectorAll('button')[0].click();

    expect(box.children()[0].textContent()).toBe('事件降级');
    expect(errorSpy.mock.calls[0][2].phase).toBe('event');

    element.querySelectorAll('button')[0].click();
    expect(outerClicks).toEqual(['sibling']);
  });

  it('stops at the innermost boundary that returns a fallback', () => {
    const outerHandler = vi.fn(() => null);
    const inner = div((node) => {
      node.whenFailed(() => p('inner fallback'));
      node.child(failingNode());
    });
    const outer = div((node) => {
      node.whenFailed(outerHandler);
      node.child(inner);
    });
    outer.renderDom();

    expect(inner.children()[0].textContent()).toBe('inner fallback');
    expect(outerHandler).not.toHaveBeenCalled();
  });

  it('chains outward when the inner handler returns null', () => {
    const inner = div((node) => {
      node.whenFailed(() => null);
      node.child(failingNode());
    });
    const outer = div((node) => {
      node.whenFailed(() => p('outer fallback'));
      node.child(inner);
    });
    outer.renderDom();

    expect(outer.children()[0].textContent()).toBe('outer fallback');
  });

  it('propagates handler failures to the outer boundary', () => {
    const inner = div((node) => {
      node.whenFailed(() => {
        throw new Error('handler boom');
      });
      node.child(failingNode());
    });
    const outer = div((node) => {
      node.whenFailed((error) => p(`outer caught ${error.message}`));
      node.child(inner);
    });
    outer.renderDom();

    expect(outer.children()[0].textContent()).toBe('outer caught handler boom');
  });

  it('fails fast when no boundary exists', () => {
    const box = div((node) => {
      node.child(failingNode());
    });

    expect(() => box.renderDom()).toThrow('boom');
  });

  it('renders fallback HTML on the server', () => {
    const bad = p('broken');
    vi.spyOn(bad, 'toHTML').mockImplementation(() => {
      throw new Error('ssr boom');
    });
    const box = div((node) => {
      node.whenFailed(() => p('服务端降级'));
      node.child(bad);
    });

    expect(box.toHTML()).toBe('<div><p>服务端降级</p></div>');
    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][2].phase).toBe('render');
  });

  it('supports the component protocol member', () => {
    const widget = {
      render: () =>
        div((node) => {
          node.child(failingNode('widget boom'));
        }),
      whenFailed: (error) => p(`组件降级：${error.message}`)
    };
    const host = div((page) => {
      page.child(widget);
    });
    const element = host.renderDom();

    expect(element.textContent).toBe('组件降级：widget boom');
    expect(errorSpy).toHaveBeenCalled();
  });
});
