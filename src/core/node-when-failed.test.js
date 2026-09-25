import { afterEach, describe, expect, it, vi } from 'vitest';
import { div, p, ref, ul, vClientOnly, vNode } from '../index.js';

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

  it('stops at the innermost boundary when its handler returns null', () => {
    const outerHandler = vi.fn(() => p('outer fallback'));
    const inner = div((node) => {
      node.whenFailed(() => null);
      node.child(failingNode());
    });
    const outer = div((node) => {
      node.whenFailed(outerHandler);
      node.child(inner);
    });
    outer.renderDom();

    expect(outerHandler).not.toHaveBeenCalled();
    // 最近边界独占这次捕获；失败节点被打标记，不再重复渲染与记录
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('skips a failed node on later render passes and retries after re-insertion', () => {
    const box = div((node) => {
      node.whenFailed(() => null);
      node.child(failingNode());
    });
    const element = box.renderDom();

    expect(errorSpy).toHaveBeenCalledTimes(1);

    // 后续渲染不再尝试失败节点，也不重复记录
    box.renderDom();
    expect(errorSpy).toHaveBeenCalledTimes(1);

    // 重新挂载 = 清掉标记，允许再试一次（失败则再记录一次）
    const failed = box.children()[0];
    box.clearChildren();
    box.child(failed);
    box.renderDom();

    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(failed._failed).toBe(true);
    element.remove();
  });

  it('rethrows when the boundary handler itself throws', () => {
    const outerHandler = vi.fn(() => p('outer fallback'));
    const inner = div((node) => {
      node.whenFailed(() => {
        throw new Error('handler boom');
      });
      node.child(failingNode());
    });
    const outer = div((node) => {
      node.whenFailed(outerHandler);
      node.child(inner);
    });

    expect(() => outer.renderDom()).toThrow('handler boom');
    expect(outerHandler).not.toHaveBeenCalled();
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
    const widget = vNode((api) => {
      api.whenFailed = (error) => p(`组件降级：${error.message}`);

      return div((node) => {
        node.child(failingNode('widget boom'));
      });
    });
    const host = div((page) => {
      page.child(widget);
    });
    const element = host.renderDom();

    expect(element.textContent).toBe('组件降级：widget boom');
    expect(errorSpy).toHaveBeenCalled();
  });
});

/** 边界 → 中间层 → 抛错按钮：出事点不是边界的直接子节点。 */
function deepFailingBlock(label = '触发') {
  return div((middle) => {
    middle.div((leaf) => {
      leaf.button(label, (button) => {
        button.on('click', () => {
          throw new Error(`${label} boom`);
        });
      });
    });
  });
}

function mountHost(node) {
  document.body.innerHTML = '';
  const host = document.createElement('div');
  document.body.appendChild(host);
  node.bindTo(host);
  return host;
}

describe('whenFailed along the parent chain', () => {
  it('covers a deep subtree built during setup', () => {
    const box = div((node) => {
      node.whenFailed(() => p('构建期降级'));
      node.child(deepFailingBlock('构建期'));
    });
    const host = mountHost(box);

    host.querySelector('button').click();

    expect(host.textContent).toContain('构建期降级');
    expect(errorSpy.mock.calls[0][2].phase).toBe('event');
  });

  it('covers a deep subtree inserted at runtime', () => {
    const box = div((node) => node.whenFailed(() => p('运行时降级')));
    const host = mountHost(box);

    box.child(deepFailingBlock('运行时'));
    host.querySelector('button').click();

    expect(host.textContent).toContain('运行时降级');
  });

  it('covers children that already exist when the boundary is declared', () => {
    const box = div((node) => node.child(deepFailingBlock('晚声明')));
    const host = mountHost(box);

    box.whenFailed(() => p('晚声明降级'));
    host.querySelector('button').click();

    expect(host.textContent).toContain('晚声明降级');
  });

  it('covers deep render-phase failures', () => {
    const box = div((node) => {
      node.whenFailed(() => p('渲染降级'));
      node.div((middle) => middle.child(failingNode('deep render boom')));
    });
    const element = box.renderDom();

    expect(element.textContent).toBe('渲染降级');
    expect(errorSpy.mock.calls[0][2].phase).toBe('render');
  });

  it('covers rows inserted into a keyed list at runtime', () => {
    const rows = ref([{ id: 1 }]);
    const list = ul((node) => {
      node.whenFailed(() => p('列表降级'));
      node.keyed(
        rows,
        (row) => row.id,
        (row) => deepFailingBlock(`row-${row.id}`)
      );
    });
    const host = mountHost(list);

    rows.value = [{ id: 1 }, { id: 2 }];
    host.querySelectorAll('button')[1].click();

    expect(host.textContent).toContain('列表降级');
  });

  it('covers a child remounted through mountable()', () => {
    const visible = ref(false);
    const box = div((node) => {
      node.whenFailed(() => p('重挂降级'));
      node.child(deepFailingBlock('重挂').mountable(visible));
    });
    const host = mountHost(box);

    visible.value = true;
    host.querySelector('button').click();

    expect(host.textContent).toContain('重挂降级');
  });

  it('lets the nearest boundary win', () => {
    const box = div((node) => {
      node.whenFailed(() => p('外层降级'));
      node.div((inner) => {
        inner.whenFailed(() => p('内层降级'));
        inner.child(deepFailingBlock('就近'));
      });
    });
    const host = mountHost(box);

    host.querySelector('button').click();

    expect(host.textContent).toContain('内层降级');
  });

  it('follows the current parent when a subtree moves', () => {
    const block = deepFailingBlock('搬运');
    const first = div((node) => {
      node.whenFailed(() => p('旧边界降级'));
      node.child(block);
    });
    mountHost(first);
    expect(block._parent).toBe(first);

    const second = div((node) => {
      node.whenFailed(() => p('新边界降级'));
      node.child(block);
    });
    const host = mountHost(second);
    expect(block._parent).toBe(second);

    host.querySelector('button').click();

    expect(host.textContent).toContain('新边界降级');
  });

  it('degrades a region node instead of tripping the region guard', () => {
    const mode = ref('first');
    const region = div((node) => {
      node.whenFailed(() => p('区域降级'));
      node.rebuildable();
      node.child(deepFailingBlock(mode.value));
    });
    const host = mountHost(region);

    mode.value = 'second';
    host.querySelector('button').click();

    expect(host.textContent).toContain('区域降级');
  });

  it('clears the parent link when children are detached', () => {
    const child = p('内容');
    const box = div((node) => node.child(child));
    mountHost(box);
    expect(child._parent).toBe(box);

    box.clearChildren();
    expect(child._parent).toBeNull();

    const other = p('另一个');
    box.child(other);
    expect(other._parent).toBe(box);

    box.destroy();
    expect(other._parent).toBeNull();
    expect(box._parent).toBeNull();
  });

  it('covers nodes resolved behind vClientOnly', () => {
    const box = div((node) => {
      node.whenFailed(() => p('岛降级'));
      node.child(vClientOnly(() => deepFailingBlock('岛')));
    });
    const host = mountHost(box);

    host.querySelector('button').click();

    expect(host.textContent).toContain('岛降级');
  });
});
