/**
 * 组件句柄的**对外面**门禁（票 16 第 130 条的根因）。
 *
 * 类型层把组件句柄写成 `class VXxx extends ComponentNode`，而 `ComponentNode extends HtmlElementNode`
 * ——这条说法成立的前提是运行期**真的**把元素级方法与子工厂委托到了视图根
 * （`packages/yoya-core/src/core/node.js` 的 `DELEGATED_ELEMENT_METHODS` + `registerChildFactories`）。
 * 所以这里逐条验：可遮蔽/可委托清单里的每个名字，在组件节点上都得是函数；
 * 元素工厂与各组件的部件快捷方法同样要能调用。清单从引擎导出量取，不手抄。
 */
import { describe, expect, it } from 'vitest';
import { SHADOWABLE_DEFERRED_METHOD_NAMES } from '@yoyaflow/yoya-core/internal/core/node.js';
import { vButton, vCard, vCardBody, vForm, vInput, vstack, vTable } from '../index.js';

describe('组件句柄的委托面', () => {
  it('引擎委托清单里的名字在组件节点上都是函数', () => {
    const node = vButton('x');
    const names = [...SHADOWABLE_DEFERRED_METHOD_NAMES];
    const missing = names.filter((name) => typeof node[name] !== 'function');

    // 防"清单变空导致空跑"：这条清单是类型层承诺的来源，只增不减
    expect(names.length).toBeGreaterThan(20);
    expect(missing, `组件节点缺少委托方法：${missing.join(', ')}`).toEqual([]);
  });

  it('元素级方法在组件节点上转发到视图根（attr / style / 元素级操作）', () => {
    const node = vCard();

    node.attr('data-probe', 'true');
    node.style('marginTop', '1px');
    node.focus();

    const element = node.renderDom();
    expect(element.getAttribute('data-probe')).toBe('true');
    expect(element.style.marginTop).toBe('1px');
    expect(node.tagName()).toBe('div');
    expect(node.isLanded()).toBe(true);
    node.destroy();
  });

  it('子工厂（元素工厂 + 组件快捷方法）在组件节点上可调用', () => {
    const card = vCard();
    card.vCardHeader('标题');
    card.vCardBody('正文');
    card.div((box) => box.span('自由结构'));

    const form = vForm();
    form.vFormItem((item) => item.name('probe'));

    const table = vTable();
    table.vThead((head) => head.vTr((row) => row.vTh('列')));

    // 薄工厂（元素节点）与组件混排：两边都能当父节点用
    const stack = vstack({ gap: '4px' });
    stack.child(vCardBody('内容'));
    stack.child(vInput({ name: 'probe' }));

    expect(card.children().length).toBeGreaterThan(1);
    expect(stack.children().length).toBe(2);

    card.destroy();
    form.destroy();
    table.destroy();
    stack.destroy();
  });
});
