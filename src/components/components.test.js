import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  HtmlElementNode,
  button,
  createI18n,
  div,
  toast,
  vButton,
  vCard,
  vCardBody,
  vCardFooter,
  vCardHeader,
  vContextMenu,
  vDropdownMenu,
  vMenu,
  vMenuItem,
  vMessage,
  vMessageContainer
} from '../index.js';

describe('compound components', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
    toast.use(null);
  });

  it('keeps vButton distinct from the native button factory', () => {
    const native = button('保存');
    const action = vButton('保存').type('primary').size('small').loading(true);
    const submit = vButton('提交').variant('primary').htmlType('submit');

    const nativeElement = native.renderDom();
    const actionElement = action.renderDom();
    const submitElement = submit.renderDom();

    expect(nativeElement.className).toBe('');
    expect(nativeElement.textContent).toBe('保存');
    expect(action).toBeInstanceOf(HtmlElementNode);
    expect(actionElement.tagName).toBe('BUTTON');
    expect(actionElement.type).toBe('button');
    expect(actionElement.dataset.variant).toBe('primary');
    expect(actionElement.dataset.size).toBe('small');
    expect(actionElement.getAttribute('aria-busy')).toBe('true');
    expect(actionElement.classList.contains('yoya-vbutton')).toBe(true);
    expect(actionElement.querySelector('.yoya-vbutton-label').textContent).toBe('保存');
    expect(submitElement.type).toBe('submit');
    expect(submitElement.dataset.variant).toBe('primary');
  });

  it('registers compound components as v-prefixed parent shortcuts', () => {
    const clicked = vi.fn();
    const page = div((root) => {
      root.vCard((card) => {
        card.vCardHeader('账户');
        card.vCardBody((body) => {
          body.p('余额');
        });
        card.vCardFooter((footer) => {
          footer.vButton((button) => {
            button.label('刷新');
            button.on('click', clicked);
          });
        });
      });
    });

    const element = page.renderDom();
    element.querySelector('.yoya-vbutton').click();

    expect(element.querySelector('.yoya-vcard-header').textContent).toBe('账户');
    expect(element.querySelector('.yoya-vcard-body').textContent).toBe('余额');
    expect(element.querySelector('.yoya-vcard-footer .yoya-vbutton-label').textContent).toBe('刷新');
    expect(clicked).toHaveBeenCalledTimes(1);
  });

  it('creates card slots through top-level factories', () => {
    const card = vCard([
      vCardHeader('标题'),
      vCardBody('内容'),
      vCardFooter(vButton('确认'))
    ]);

    expect(card.toHTML()).toContain('class="yoya-component yoya-vcard"');
    expect(card.toHTML()).toContain('class="yoya-vcard-header"');
    expect(card.toHTML()).toContain('class="yoya-vcard-body"');
    expect(card.toHTML()).toContain('class="yoya-vcard-footer"');
    expect(card.textContent()).toBe('标题内容确认');
  });

  it('renders i18n text inside compound components without rebuilding the tree', () => {
    const locale = createI18n({
      language: 'zh-CN',
      messages: {
        'zh-CN': { save: '保存' },
        en: { save: 'Save' }
      }
    });
    const action = vButton(locale.text('save'));
    const element = action.renderDom();

    expect(element.textContent).toContain('保存');

    locale.setLanguage('en');

    expect(element.textContent).toContain('Save');
    expect(action.toHTML()).toContain('Save');
  });

  it('creates closable messages and toast entries', () => {
    document.body.innerHTML = '';
    const closed = vi.fn();
    const message = vMessage('保存成功').type('success').closable(true).onClose(closed);
    const messageElement = message.renderDom();

    messageElement.querySelector('button').click();

    expect(closed).toHaveBeenCalledTimes(1);
    expect(message.toHTML()).toBe('');

    const container = vMessageContainer({ placement: 'bottom-left' }).bindTo(document.body);
    const id = container.warning('请检查输入', { duration: 0 });

    expect(document.body.querySelector('[data-placement="bottom-left"]')).not.toBeNull();
    expect(document.body.textContent).toContain('请检查输入');

    container.close(id);
    expect(document.body.textContent).not.toContain('请检查输入');

    toast.use(container);
    toast.info('后台任务已启动', { duration: 0 });
    expect(document.body.textContent).toContain('后台任务已启动');
    toast.clear();
    expect(document.body.textContent).not.toContain('后台任务已启动');
  });

  it('replaces an existing message when show receives a duplicate id', () => {
    document.body.innerHTML = '';
    const container = vMessageContainer().bindTo(document.body);

    container.show('旧消息', { id: 'save', duration: 0 });
    container.show('新消息', { id: 'save', duration: 0 });

    expect(document.body.querySelectorAll('.yoya-vmessage')).toHaveLength(1);
    expect(document.body.textContent).not.toContain('旧消息');
    expect(document.body.textContent).toContain('新消息');

    container.close('save');

    expect(document.body.querySelectorAll('.yoya-vmessage')).toHaveLength(0);
  });

  it('clears message timers when the container is destroyed', () => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    const container = vMessageContainer().bindTo(document.body);
    const closeSpy = vi.spyOn(container, 'close');

    container.show('稍后关闭', { id: 'later', duration: 1000 });
    container.destroy();
    expect(closeSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);

    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(document.body.querySelector('.yoya-vmessage-container')).toBeNull();
  });

  it('creates vMenu and vMenuItem command components', () => {
    const clicked = vi.fn();
    const disabledClick = vi.fn();
    const menu = vMenu((commands) => {
      commands.vMenuItem((item) => {
        item.icon('N');
        item.text('新建');
        item.shortcut('Ctrl+N');
        item.active(true);
        item.on('click', clicked);
      });
      commands.vMenuItem((item) => {
        item.text('删除');
        item.danger(true);
        item.disabled(true);
        item.on('click', disabledClick);
      });
    });

    const element = menu.renderDom();
    const items = element.querySelectorAll('.yoya-vmenu-item');

    expect(element.getAttribute('role')).toBe('menu');
    expect(element.dataset.orientation).toBe('vertical');
    expect(items).toHaveLength(2);
    expect(items[0].getAttribute('role')).toBe('menuitem');
    expect(items[0].querySelector('.yoya-vmenu-item-icon').textContent).toBe('N');
    expect(items[0].querySelector('.yoya-vmenu-item-label').textContent).toBe('新建');
    expect(items[0].querySelector('.yoya-vmenu-item-shortcut').textContent).toBe('Ctrl+N');
    expect(items[0].getAttribute('aria-current')).toBe('page');
    expect(items[1].dataset.danger).toBe('true');
    expect(items[1].disabled).toBe(true);

    items[0].click();
    items[1].click();

    expect(clicked).toHaveBeenCalledTimes(1);
    expect(disabledClick).not.toHaveBeenCalled();
  });

  it('registers menu components as v-prefixed parent shortcuts and supports i18n text', () => {
    const locale = createI18n({
      language: 'zh-CN',
      messages: {
        'zh-CN': { menu: { dashboard: '控制台' } },
        en: { menu: { dashboard: 'Dashboard' } }
      }
    });
    const page = div((root) => {
      root.vMenu((menu) => {
        menu.horizontal();
        menu.vMenuItem(locale.text('menu.dashboard'));
      });
    });
    const element = page.renderDom();

    expect(element.querySelector('.yoya-vmenu').dataset.orientation).toBe('horizontal');
    expect(element.querySelector('.yoya-vmenu').getAttribute('role')).toBe('menubar');
    expect(element.querySelector('.yoya-vmenu-item-label').textContent).toBe('控制台');

    locale.setLanguage('en');

    expect(element.querySelector('.yoya-vmenu-item-label').textContent).toBe('Dashboard');
    expect(vMenuItem('独立项').toHTML()).toContain('yoya-vmenu-item-label');
  });

  it('preserves danger styling when active state is turned off', () => {
    const item = vMenuItem('删除服务').danger(true).active(true).active(false);
    const element = item.renderDom();

    expect(element.dataset.danger).toBe('true');
    expect(element.dataset.active).toBeUndefined();
    expect(element.style.color).toBe('rgb(185, 28, 28)');
  });

  it('uses content-width menu items in horizontal menus', () => {
    const menu = vMenu((commands) => {
      commands.horizontal();
      commands.vMenuItem('概览');
      commands.vMenuItem('配置');
    });
    const element = menu.renderDom();
    const items = element.querySelectorAll('.yoya-vmenu-item');

    expect(element.dataset.orientation).toBe('horizontal');
    expect(items[0].style.width).toBe('auto');
    expect(items[1].style.width).toBe('auto');
  });

  it('creates vDropdownMenu with trigger, menu content and open state', () => {
    const clicked = vi.fn();
    const dropdown = vDropdownMenu((menu) => {
      menu.trigger((button) => {
        button.attr('id', 'more-actions');
        button.label('更多操作');
      });
      menu.menuContent((commands) => {
        commands.vMenuItem((item) => {
          item.attr('id', 'dropdown-refresh');
          item.text('刷新');
          item.on('click', clicked);
        });
      });
    }).placement('bottom-end');

    const element = dropdown.renderDom();
    const trigger = element.querySelector('#more-actions');
    const panel = element.querySelector('.yoya-vdropdown-panel');

    expect(element.classList.contains('yoya-vdropdown-menu')).toBe(true);
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(panel.style.display).toBe('none');
    expect(element.dataset.placement).toBe('bottom-end');

    trigger.click();

    expect(element.dataset.open).toBe('true');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(panel.style.display).toBe('');

    element.querySelector('#dropdown-refresh').click();

    expect(clicked).toHaveBeenCalledTimes(1);
    expect(element.dataset.open).toBeUndefined();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes dropdown menus from outside clicks and Escape', () => {
    const dropdown = vDropdownMenu((menu) => {
      menu.trigger((button) => button.attr('id', 'dropdown-close-trigger').label('更多'));
      menu.menuContent((commands) => commands.vMenuItem('刷新'));
    }).bindTo(document.body);
    const element = dropdown.renderDom();
    const trigger = element.querySelector('#dropdown-close-trigger');

    trigger.click();
    expect(element.dataset.open).toBe('true');

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(element.dataset.open).toBeUndefined();

    trigger.click();
    expect(element.dataset.open).toBe('true');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(element.dataset.open).toBeUndefined();
  });

  it('can keep dropdown menus open after selecting an item', () => {
    const clicked = vi.fn();
    const dropdown = vDropdownMenu((menu) => {
      menu.trigger('更多');
      menu.menuContent((commands) => {
        commands.vMenuItem((item) => {
          item.attr('id', 'dropdown-keep-open');
          item.text('固定面板');
          item.on('click', clicked);
        });
      });
    }).closeOnSelect(false);
    const element = dropdown.renderDom();

    element.querySelector('.yoya-vbutton').click();
    element.querySelector('#dropdown-keep-open').click();

    expect(clicked).toHaveBeenCalledTimes(1);
    expect(element.dataset.open).toBe('true');
  });

  it('registers dropdown menu as a v-prefixed parent shortcut', () => {
    const page = div((root) => {
      root.vDropdownMenu((dropdown) => {
        dropdown.trigger('操作');
        dropdown.menuContent((menu) => {
          menu.vMenuItem('导出');
        });
      });
    });
    const element = page.renderDom();

    expect(element.querySelector('.yoya-vdropdown-menu')).not.toBeNull();
    expect(element.querySelector('.yoya-vbutton-label').textContent).toBe('操作');
    expect(element.querySelector('.yoya-vmenu-item-label').textContent).toBe('导出');
  });

  it('creates vContextMenu and opens from a contextmenu event', () => {
    const selected = vi.fn();
    const contextMenu = vContextMenu((menu) => {
      menu.target((target) => {
        target.attr('id', 'service-row');
        target.text('服务 api-gateway');
      });
      menu.menuContent((commands) => {
        commands.vMenuItem((item) => {
          item.attr('id', 'restart-service');
          item.text('重启服务');
          item.on('click', selected);
        });
      });
    });

    const element = contextMenu.renderDom();
    const target = element.querySelector('#service-row');
    const panel = element.querySelector('.yoya-vcontext-panel');
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 24,
      clientY: 48
    });

    target.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(element.dataset.open).toBe('true');
    expect(panel.style.display).toBe('');
    expect(panel.style.left).toBe('24px');
    expect(panel.style.top).toBe('48px');

    element.querySelector('#restart-service').click();

    expect(selected).toHaveBeenCalledTimes(1);
    expect(element.dataset.open).toBeUndefined();
    expect(panel.style.display).toBe('none');
  });

  it('closes context menus from outside clicks and Escape', () => {
    const contextMenu = vContextMenu((menu) => {
      menu.target((target) => target.attr('id', 'context-close-target').text('右键区域'));
      menu.menuContent((commands) => commands.vMenuItem('查看详情'));
    }).bindTo(document.body);
    const element = contextMenu.renderDom();
    const target = element.querySelector('#context-close-target');

    target.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 12,
      clientY: 18
    }));
    expect(element.dataset.open).toBe('true');

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(element.dataset.open).toBeUndefined();

    target.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 24,
      clientY: 36
    }));
    expect(element.dataset.open).toBe('true');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(element.dataset.open).toBeUndefined();
  });

  it('registers context menu as a v-prefixed parent shortcut', () => {
    const page = div((root) => {
      root.vContextMenu((context) => {
        context.target('右键区域');
        context.menuContent((menu) => {
          menu.vMenuItem('查看详情');
        });
      });
    });
    const element = page.renderDom();

    expect(element.querySelector('.yoya-vcontext-menu')).not.toBeNull();
    expect(element.querySelector('.yoya-vcontext-target').textContent).toBe('右键区域');
    expect(element.querySelector('.yoya-vmenu-item-label').textContent).toBe('查看详情');
  });
});
