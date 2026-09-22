import { describe, expect, it, vi } from 'vitest';
import {
  ElementNode,
  VTextNode,
  ViewNode,
  button,
  div,
  h1,
  p,
  ref,
  span,
  svg,
  vBadge,
  vCard,
  vText
} from '../index.js';

describe('ViewNode core', () => {
  it('creates element and text nodes through HTML factories', () => {
    const root = div((page) => {
      page.h1('Dashboard');
      page.p('Ready');
    });

    expect(root).toBeInstanceOf(ElementNode);
    expect(root).toBeInstanceOf(ViewNode);
    expect(root.children()).toHaveLength(2);
    expect(root.children()[0].tagName()).toBe('h1');
    expect(root.children()[1].textContent()).toBe('Ready');
    expect(vText('copy')).toBeInstanceOf(VTextNode);

    const title = h1('Title');
    expect(title.children()[0]).toBeInstanceOf(VTextNode);
    expect(title.textContent()).toBe('Title');
    expect(title.renderDom().textContent).toBe('Title');
  });

  it('supports string, function, and object setup values', () => {
    const action = vi.fn();
    const root = div({
      id: 'panel',
      className: ['surface', 'active'],
      style: { color: 'red' },
      onclick: action,
      children: [h1('Users'), p((paragraph) => paragraph.child('Created from function setup'))]
    });

    const element = root.renderDom();
    element.click();

    expect(element.id).toBe('panel');
    expect(element.classList.contains('surface')).toBe(true);
    expect(element.classList.contains('active')).toBe(true);
    expect(element.style.color).toBe('red');
    expect(element.textContent).toContain('Users');
    expect(element.textContent).toContain('Created from function setup');
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('chains attrs, classes, styles, events, and children', () => {
    const onClick = vi.fn();
    const root = div()
      .id('root')
      .attr('role', 'region')
      .className('layout primary')
      .style('display', 'grid')
      .on('click', onClick)
      .child(button('Save').attr('type', 'button'));

    const element = root.renderDom();
    element.click();

    expect(root.attr('role')).toBe('region');
    expect(element.id).toBe('root');
    expect(element.className).toBe('layout primary');
    expect(element.style.display).toBe('grid');
    expect(element.querySelector('button').textContent).toBe('Save');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('clears attributes without reflecting the reset onto string DOM properties', () => {
    const root = div((page) => {
      page.img({ alt: '头像', src: '/a.png' });
    });
    const image = root.renderDom().querySelector('img');

    expect(image.getAttribute('src')).toBe('/a.png');

    root.children()[0].attr('src', null);

    // 清属性只 `removeAttribute`：字符串 / URL 属性赋 `false` 会被反射成 `"false"`，
    // 布尔属性（`disabled` / `checked` …）才需要顺手把 IDL 属性复位。
    expect(image.getAttribute('src')).toBeNull();
    expect(root.children()[0].attr('src')).toBeUndefined();
  });

  it('binds to a target and destroys DOM and event listeners', () => {
    document.body.innerHTML = '<main id="app"></main>';
    const onClick = vi.fn();
    const root = div('Mounted').on('click', onClick).bindTo('#app');
    const element = document.querySelector('#app > div');

    element.click();
    root.destroy();
    element.click();

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(document.querySelector('#app > div')).toBeNull();
    expect(root.renderDom()).toBeNull();
  });

  it('serializes the view tree to HTML', () => {
    const root = div((page) => {
      page.id('profile').className('card');
      page.h1('Profile');
      page.input((field) => {
        field.name('email').attr('value', 'ada@example.com');
      });
    });

    expect(root.toHTML()).toBe(
      // 属性按名字排序输出（class < id；name < value），与写入顺序无关
      '<div class="card" id="profile"><h1>Profile</h1><input name="email" value="ada@example.com"></div>'
    );
  });

  it('resolves function components lazily when they are rendered', () => {
    let calls = 0;
    function StatusBadge({ label }) {
      return () => {
        calls += 1;
        return span(label).className('status-badge');
      };
    }

    const root = div().child(StatusBadge({ label: 'Ready' }));

    expect(calls).toBe(0);
    expect(root.renderDom().innerHTML).toBe('<span class="status-badge">Ready</span>');
    expect(calls).toBe(1);
    expect(root.toHTML()).toBe('<div><span class="status-badge">Ready</span></div>');
  });

  it('supports function components added after the parent has rendered', () => {
    const root = div('before');
    root.renderDom();

    root.child(() => p('after'));

    expect(root.renderDom().innerHTML).toBe('before<p>after</p>');
  });

  it('supports component objects with render and public methods', () => {
    let renderCalls = 0;
    function StatusPanel() {
      const message = vText('Waiting');
      return {
        setStatus(value) {
          message.textContent(value);
        },
        render() {
          renderCalls += 1;
          return div((panel) => panel.className('status-panel').child(message));
        }
      };
    }

    const panel = StatusPanel();
    const root = div().child(panel);
    panel.setStatus('Ready');

    expect(renderCalls).toBe(0);
    expect(root.renderDom().textContent).toBe('Ready');
    expect(root.toHTML()).toBe('<div><div class="status-panel">Ready</div></div>');
    expect(renderCalls).toBe(1);
  });

  it('rejects component objects whose render does not return a ViewNode', () => {
    const root = div().child({ render: () => ({}) });

    expect(() => root.renderDom()).toThrow('Component render must return a ViewNode');
  });

  it('reports the parent and value when an invalid child is added', () => {
    const root = div();

    expect(() => root.child({ label: 'not a node' })).toThrow(
      /Invalid child for HtmlElementNode <div>.*Object instance/
    );
  });

  it('reports which component and parent produced an invalid render result', () => {
    const root = div().child({ render: () => ({}) });

    expect(() => root.renderDom()).toThrow(
      /render\(\) of component object.*returned Object instance.*added as a child of HtmlElementNode <div>.*attach it with parent\.child/
    );
  });

  it('clears logical children and removes their DOM on the next render', () => {
    const root = div().child(p('old'));
    const element = root.renderDom();

    root.clearChildren();

    expect(root.children()).toHaveLength(0);
    expect(root.toHTML()).toBe('<div></div>');
    expect(element.textContent).toBe('old');

    root.renderDom();

    expect(element.textContent).toBe('');
  });

  it('exposes commit as the semantic DOM synchronization entry point', () => {
    const root = div().child('Committed');

    expect(root.commit()).toBe(root.renderDom());
    expect(root.commit().textContent).toBe('Committed');
  });

  it('keeps a text() child bound to a signal handle', () => {
    const label = ref('待处理');
    const root = div((page) => page.child(label));
    const element = root.renderDom();
    document.body.appendChild(element);

    expect(element.textContent).toBe('待处理');

    label.value = '已完成';

    expect(element.textContent).toBe('已完成');
    element.remove();
  });

  it('treats a signal handle passed to child() as bound text', () => {
    const label = ref('待处理');
    const root = div((page) => page.child(label));
    const element = root.renderDom();
    document.body.appendChild(element);

    expect(element.textContent).toBe('待处理');

    label.value = '已完成';

    expect(element.textContent).toBe('已完成');
    element.remove();
  });

  it('treats a signal handle passed as the setup value as bound text', () => {
    const count = ref(0);
    const root = div(count);

    expect(root.toHTML()).toBe('<div>0</div>');

    const element = root.renderDom();
    document.body.appendChild(element);

    expect(element.textContent).toBe('0');

    count.value = 2;

    expect(element.textContent).toBe('2');
    element.remove();
  });

  it('does not expose a node-level text()', () => {
    // 最终契约：节点级 text() 不存在（追加文本用 child(content)，替换文本用 vText() + textContent()）
    expect(div().text).toBeUndefined();
    expect(p().text).toBeUndefined();
    expect(span().text).toBeUndefined();
  });

  it('keeps component and SVG text() APIs next to the node contract', () => {
    // 组件自带的 text()（badge / progress / menu …）与 SVG <text> 的 text() 是另一套 API
    expect(typeof vBadge('notifications').text).toBe('function');
    expect(typeof svg().text).toBe('function');
    expect(typeof vText('x').textContent).toBe('function');
  });

  it('keeps text and object setup values unchanged next to the handle form', () => {
    expect(div('快照').toHTML()).toBe('<div>快照</div>');
    expect(div({ attrs: { 'data-role': 'panel' } }).toHTML()).toBe('<div data-role="panel"></div>');
  });

  it('cancels pending removal when a child is added again before render', () => {
    const child = p('keep');
    const root = div().child(child);
    const element = root.renderDom();

    root.clearChildren().child(child);
    root.renderDom();

    expect(root.children()).toEqual([child]);
    expect(element.innerHTML).toBe('<p>keep</p>');
  });
});

describe('ElementNode class replacement', () => {
  it('replaces an existing preset class with a custom class', () => {
    const node = div().className('yoya-vcard', 'preset-a');

    node.replaceClassName('preset-a', 'acme-card');

    expect(node.className()).toBe('yoya-vcard acme-card');
    expect(node.renderDom().className).toBe('yoya-vcard acme-card');
  });

  it('keeps the rendered DOM class list in sync after replacement', () => {
    const node = div().className('yoya-vbutton');
    node.renderDom();

    node.replaceClassName('yoya-vbutton', 'acme-btn');

    expect(node.renderDom().classList.contains('yoya-vbutton')).toBe(false);
    expect(node.renderDom().classList.contains('acme-btn')).toBe(true);
  });

  it('does nothing when the old class is missing and tolerate is false', () => {
    const node = div().className('keep');

    node.replaceClassName('missing', 'acme-btn');

    expect(node.className()).toBe('keep');
  });

  it('adds the new class when the old class is missing and tolerate is true', () => {
    const node = div().className('keep');

    node.replaceClassName('missing', 'acme-btn', true);

    expect(node.className()).toBe('keep acme-btn');
  });

  it('supports multiple new classes separated by spaces', () => {
    const node = div().className('preset-a');

    node.replaceClassName('preset-a', 'acme-btn acme-btn-primary');

    expect(node.className()).toBe('acme-btn acme-btn-primary');
  });

  it('is a no-op when old and next are the same', () => {
    const node = div().className('same');

    node.replaceClassName('same', 'same');

    expect(node.className()).toBe('same');
  });

  it('keeps identity-scoped markers on the subtree when a custom class is replaced', () => {
    const card = vCard((instance) => instance.vCardHeader('标题'));
    const element = card.renderDom();
    const header = element.querySelector('[vn="VCardHeader"]');

    // 组件/part 的标记是身份（vn），不再依赖类名
    expect(header.matches('[vn="VCard"] [vn="VCardHeader"]')).toBe(true);

    // 换掉自定义类不影响身份标记与结构
    card.className('acme-card');
    card.replaceClassName('acme-card', 'acme-card-alt');

    expect(card.className()).toBe('acme-card-alt');
    expect(header.matches('[vn="VCard"] [vn="VCardHeader"]')).toBe(true);
  });

  it('is chainable', () => {
    const node = div().className('preset-a');

    expect(node.replaceClassName('preset-a', 'acme-btn')).toBe(node);
  });
});
