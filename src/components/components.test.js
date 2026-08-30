import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  HtmlElementNode,
  VMenuDivider,
  VMenuGroup,
  VSidebar,
  VSubMenu,
  VTimer,
  VTimerRange,
  button,
  createI18n,
  div,
  toast,
  vChart,
  vCode,
  vButtons,
  vButton,
  vFloatButton,
  vCard,
  vCardBody,
  vCardFooter,
  vCardHeader,
  vCheckbox,
  vCheckboxes,
  vContextMenu,
  vDetailItem,
  vDropdownMenu,
  vDynamicLoader,
  vField,
  vForm,
  vInput,
  hstack,
  vMenu,
  vMenuDivider,
  vMenuGroup,
  vMenuItem,
  vSidebar,
  vSubMenu,
  vMessage,
  vMessageContainer,
  vRadio,
  vRadios,
  vSelect,
  vSwitch,
  vTextarea,
  vTable,
  VPagination,
  vTimer,
  vTimerRange,
  vPagination
} from '../index.js';
import { applyComponentArguments } from './shared.js';

describe('compound components', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
    toast.use(null);
  });

  it('keeps vButton distinct from the native button factory', () => {
    const native = button('保存');
    const action = vButton('保存').type('primary').size('small').loading(true);
    const submit = vButton('提交').variant('primary').formType('submit');
    const reset = vButton({ label: '重置', formType: 'reset' });

    const nativeElement = native.renderDom();
    const actionElement = action.renderDom();
    const submitElement = submit.renderDom();
    const resetElement = reset.renderDom();

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
    expect(resetElement.type).toBe('reset');
  });

  it('creates buttons from options with a shared default variant and size', () => {
    const group = vButtons({
      options: ['复制', '粘贴', '剪切'],
      variant: 'secondary',
      size: 'small'
    });
    const element = group.renderDom();

    expect(element.tagName).toBe('DIV');
    expect(element.getAttribute('role')).toBe('group');
    expect(element.classList.contains('yoya-vbuttons')).toBe(true);
    expect(element.querySelectorAll('.yoya-vbutton')).toHaveLength(3);
    expect(element.querySelector('.yoya-vbutton-label').textContent).toBe('复制');
    expect(element.querySelector('.yoya-vbutton').dataset.size).toBe('small');
    expect(element.querySelector('.yoya-vbutton').dataset.variant).toBe('secondary');
  });

  it('supports exclusive selection with value and change', () => {
    const change = vi.fn();
    const group = vButtons({
      options: [
        { label: '全部', value: 'all' },
        { label: '运行中', value: 'running' },
        { label: '已停止', value: 'stopped' }
      ],
      selectable: true,
      value: 'all',
      change
    });
    const element = group.renderDom();
    const buttons = [...element.querySelectorAll('.yoya-vbutton')];

    expect(group.value()).toBe('all');
    expect(buttons[0].dataset.selected).toBe('true');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');

    buttons[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(group.value()).toBe('running');
    expect(change).toHaveBeenCalledWith('running', group);
    expect(buttons[0].dataset.selected).toBeUndefined();
    expect(buttons[1].dataset.selected).toBe('true');
    expect(buttons[1].dataset.variant).toBe('primary');
  });

  it('groups manually added vButton children and keeps their own variant', () => {
    const group = vButtons((container) => {
      container.vButton('保存').variant('primary');
      container.vButton('取消');
    });
    const element = group.renderDom();
    const buttons = [...element.querySelectorAll('.yoya-vbutton')];

    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toBe('保存');
    expect(buttons[0].dataset.variant).toBe('primary');
    expect(buttons[1].dataset.variant).toBe('secondary');
  });

  it('applies disabled and replaces options on demand', () => {
    const group = vButtons({
      options: [{ label: '运行', value: 'run' }, '停止'],
      selectable: true
    });
    const element = group.renderDom();
    const buttons = [...element.querySelectorAll('.yoya-vbutton')];

    group.disabled(true);
    expect(buttons.every((button) => button.disabled)).toBe(true);

    group.options([{ label: '刷新', value: 'refresh' }]);

    expect(element.querySelectorAll('.yoya-vbutton')).toHaveLength(1);
    expect(element.querySelector('.yoya-vbutton-label').textContent).toBe('刷新');
  });

  it('renders a joined segmented group with shared borders and outer radius', () => {
    const group = vButtons({
      options: ['列表', '卡片', '看板'],
      joined: true,
      selectable: true,
      value: '列表'
    });
    const element = group.renderDom();
    const buttons = [...element.querySelectorAll('.yoya-vbutton')];

    expect(element.style.gap).toBe('0px');
    expect(element.style.flexWrap).toBe('nowrap');
    expect(buttons[0].style.borderRadius).toBe(
      'var(--yoya-radius-md, 6px) 0 0 var(--yoya-radius-md, 6px)'
    );
    expect(buttons[1].style.borderRadius).toBe('0px');
    expect(buttons[2].style.borderRadius).toBe(
      '0 var(--yoya-radius-md, 6px) var(--yoya-radius-md, 6px) 0'
    );
    expect(buttons[0].style.marginLeft).toBe('');
    expect(buttons[1].style.marginLeft).toBe('-1px');
    expect(buttons[2].style.marginLeft).toBe('-1px');
    expect(buttons[0].dataset.selected).toBe('true');
    expect(buttons[0].style.zIndex).toBe('1');

    group.joined(false);

    expect(element.style.gap).toBe('8px');
    expect(element.style.flexWrap).toBe('wrap');
    expect(buttons[0].style.borderRadius).toBe('');
    expect(buttons[1].style.marginLeft).toBe('');
    expect(buttons[0].style.zIndex).toBe('');
  });

  it('creates a button group through the parent shortcut', () => {
    const root = div((page) => {
      page.vButtons(['复制', '粘贴']);
    });
    const element = root.renderDom();

    expect(element.querySelectorAll('.yoya-vbutton')).toHaveLength(2);
  });

  it('renders an exclusive radio group with value, selection and change', () => {
    const change = vi.fn();
    const radios = vRadios({
      name: 'env',
      options: [
        { label: '开发', value: 'dev' },
        { label: '预发', value: 'staging' },
        { label: '生产', value: 'prod' }
      ],
      value: 'staging',
      change
    });
    const element = radios.renderDom();
    const items = [...element.querySelectorAll('.yoya-vradio')];

    expect(radios.value()).toBe('staging');
    expect(items).toHaveLength(3);
    expect(items[1].dataset.checked).toBe('true');

    const prodInput = items[2].querySelector('input');
    prodInput.checked = true;
    prodInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(radios.value()).toBe('prod');
    expect(change).toHaveBeenCalledWith('prod', radios);
    expect(items[1].dataset.checked).toBeUndefined();
    expect(items[2].dataset.checked).toBe('true');
  });

  it('renders a single radio with label, checked and disabled states', () => {
    const radio = vRadio((item) => {
      item.label('启用自动部署');
      item.description('发布后自动执行');
      item.checked(true);
    });
    const disabled = vRadio({ label: '定时发布', disabled: true });
    const page = div((root) => root.child(radio, disabled));
    const element = page.renderDom();
    const items = [...element.querySelectorAll('.yoya-vradio')];

    expect(items[0].querySelector('.yoya-vradio-label').textContent).toBe('启用自动部署');
    expect(items[0].querySelector('.yoya-vradio-description').textContent).toBe('发布后自动执行');
    expect(items[0].dataset.checked).toBe('true');
    expect(items[0].querySelector('.yoya-vradio-dot')).not.toBeNull();
    expect(items[1].dataset.checked).toBeUndefined();
    expect(items[1].querySelector('input').disabled).toBe(true);
  });

  it('collects radio group values inside a form', () => {
    const form = vForm((form) => {
      form.vRadios((radios) => {
        radios.name('plan');
        radios.options([
          { label: '滚动发布', value: 'rolling' },
          { label: '全量发布', value: 'full' }
        ]);
        radios.value('rolling');
      });
    });

    expect(form.values()).toEqual({ plan: 'rolling' });
  });

  it('keeps same-name standalone radios mutually exclusive', () => {
    const first = vRadio((radio) => {
      radio.name('deploy');
      radio.label('自动部署');
      radio.checked(true);
    });
    const second = vRadio((radio) => {
      radio.name('deploy');
      radio.label('保留历史');
    });
    const page = div((root) => root.child(first, second));
    const element = page.renderDom();
    const items = [...element.querySelectorAll('.yoya-vradio')];

    expect(first.checked()).toBe(true);

    const secondInput = items[1].querySelector('input');
    secondInput.checked = true;
    secondInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(first.checked()).toBe(false);
    expect(second.checked()).toBe(true);
    expect(items[0].dataset.checked).toBeUndefined();
    expect(items[1].dataset.checked).toBe('true');
  });

  it('renders a circular float button with icon and label slots', () => {
    const action = vFloatButton({
      icon: '＋',
      label: '新建任务',
      variant: 'primary',
      size: 'small'
    });
    const element = action.renderDom();

    expect(element.tagName).toBe('BUTTON');
    expect(element.type).toBe('button');
    expect(element.classList.contains('yoya-vfloat-button')).toBe(true);
    expect(element.dataset.variant).toBe('primary');
    expect(element.dataset.size).toBe('small');
    expect(element.dataset.icon).toBe('true');
    expect(element.dataset.label).toBe('true');
    expect(element.querySelector('.yoya-vfloat-button-icon').textContent).toBe('＋');
    expect(element.querySelector('.yoya-vfloat-button-label').textContent).toBe('新建任务');
    expect(element.style.paddingLeft).toBe('18px');
  });

  it('keeps an icon-only float button round without label padding', () => {
    const action = vFloatButton({ icon: '＋' });
    const element = action.renderDom();

    expect(element.dataset.icon).toBe('true');
    expect(element.dataset.label).toBeUndefined();
    expect(element.style.paddingLeft).not.toBe('18px');
    expect(element.style.borderRadius).toBe('9999px');
    expect(element.querySelector('.yoya-vfloat-button-label').style.display).toBe('none');
  });

  it('applies disabled and fixed position presets', () => {
    const action = vFloatButton({
      icon: '↑',
      disabled: true,
      fixed: true,
      position: 'bottom-right'
    });
    const element = action.renderDom();

    expect(element.disabled).toBe(true);
    expect(element.style.position).toBe('fixed');
    expect(element.style.bottom).toBe('24px');
    expect(element.style.right).toBe('24px');
    expect(element.style.zIndex).toBe('100');
  });

  it('accepts label, element options, and a final button setup callback', () => {
    let callbackButton = null;
    const action = vButton(
      'OK',
      {
        attrs: {
          'aria-label': '确认操作',
          'data-action': 'confirm',
          id: 'confirm-button'
        },
        style: {
          minWidth: '120px',
          textTransform: 'uppercase'
        }
      },
      (button) => {
        callbackButton = button;
        button.variant('primary');
      }
    );

    const element = action.renderDom();

    expect(callbackButton).toBe(action);
    expect(element.textContent).toBe('OK');
    expect(element.id).toBe('confirm-button');
    expect(element.getAttribute('aria-label')).toBe('确认操作');
    expect(element.dataset.action).toBe('confirm');
    expect(element.style.minWidth).toBe('120px');
    expect(element.style.textTransform).toBe('uppercase');
    expect(element.dataset.variant).toBe('primary');
  });

  it('tracks button interaction states as data attributes', () => {
    const action = vButton('保存').variant('primary');
    const element = action.renderDom();

    element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));

    expect(element.dataset.interaction).toBe('hover');

    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(element.dataset.interaction).toBe('active');

    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
    element.dispatchEvent(new FocusEvent('focus', { bubbles: false }));

    expect(element.dataset.interaction).toBe('focus');

    action.disabled(true);
    element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));

    expect(element.dataset.interaction).toBe('disabled');
    expect(element.disabled).toBe(true);
  });

  it('applies shared element options and final callbacks when the first setup is omitted', () => {
    let callbackNode = null;
    const card = vCard(
      null,
      { attrs: { 'data-surface': 'card' }, style: { minHeight: '40px' } },
      (node) => {
        callbackNode = node;
        node.attr('data-callback', 'yes');
      }
    );

    const element = card.renderDom();

    expect(callbackNode).toBe(card);
    expect(element.dataset.surface).toBe('card');
    expect(element.dataset.callback).toBe('yes');
    expect(element.style.minHeight).toBe('40px');
  });

  it('keeps component-specific first arguments while sharing options and callbacks', () => {
    let inputCallback = null;
    const input = vInput(
      '请输入服务名',
      { attrs: { name: 'serviceName' }, style: { maxWidth: '240px' } },
      (node) => {
        inputCallback = node;
        node.required(true);
      }
    );
    const inputRoot = input.renderDom();
    const inputElement = inputRoot.querySelector('.yoya-vinput');

    expect(inputCallback).toBe(input);
    expect(inputElement.placeholder).toBe('请输入服务名');
    expect(inputElement.name).toBe('serviceName');
    expect(inputRoot.style.maxWidth).toBe('240px');
    expect(inputElement.required).toBe(true);
  });

  it('allows layout factories to use options as their first argument', () => {
    let rowCallback = null;
    const row = hstack({ attrs: { 'data-layout': 'hstack' }, style: { gap: '12px' } }, (node) => {
      rowCallback = node;
      node.span('content');
    });
    const rowElement = row.renderDom();

    expect(rowCallback).toBe(row);
    expect(rowElement.dataset.layout).toBe('hstack');
    expect(rowElement.style.gap).toBe('12px');
    expect(rowElement.textContent).toBe('content');
  });

  it('exposes the shared argument applier for custom factories', () => {
    let callbackNode = null;
    const node = vCard();
    applyComponentArguments(node, { attrs: { id: 'custom' } }, (value) => {
      callbackNode = value;
    });

    expect(callbackNode).toBe(node);
    expect(node.attr('id')).toBe('custom');
  });

  it('supports the same setup sequence in native HTML factories', () => {
    let callbackNode = null;
    const node = button(
      'OK',
      { attrs: { id: 'native-button' }, style: { minWidth: '80px' } },
      (element) => {
        callbackNode = element;
        element.attr('data-ready', 'true');
      }
    );
    const element = node.renderDom();

    expect(callbackNode).toBe(node);
    expect(element.id).toBe('native-button');
    expect(element.dataset.ready).toBe('true');
    expect(element.style.minWidth).toBe('80px');
    expect(element.textContent).toBe('OK');
  });

  it('shares options and final callbacks across select, menu, and code components', () => {
    let selectCallback = null;
    const select = vSelect(
      { options: ['运行中', '已停用'], value: '运行中' },
      { attrs: { name: 'status' }, style: { maxWidth: '220px' } },
      (node) => {
        selectCallback = node;
        node.required(true);
      }
    );
    const selectRoot = select.renderDom();
    const selectElement = selectRoot.querySelector('.yoya-vselect');

    let menuCallback = null;
    const menu = vMenu({ attrs: { 'data-menu': 'actions' } }, (node) => {
      menuCallback = node;
      node.horizontal();
    });
    const menuElement = menu.renderDom();

    let codeCallback = null;
    const code = vCode(
      'SELECT 1',
      { attrs: { 'data-language': 'sql' }, style: { maxWidth: '320px' } },
      (node) => {
        codeCallback = node;
        node.copyable(false);
      }
    );
    const codeElement = code.renderDom();

    expect(selectCallback).toBe(select);
    expect(selectElement.name).toBe('status');
    expect(selectRoot.style.maxWidth).toBe('220px');
    expect(selectElement.required).toBe(true);
    expect(menuCallback).toBe(menu);
    expect(menuElement.dataset.menu).toBe('actions');
    expect(menuElement.dataset.orientation).toBe('horizontal');
    expect(codeCallback).toBe(code);
    expect(codeElement.dataset.language).toBe('sql');
    expect(codeElement.style.maxWidth).toBe('320px');
    expect(codeElement.dataset.copyable).toBeUndefined();
  });

  it('applies element options to render-backed component APIs', () => {
    let paginationCallback = null;
    const pagination = vPagination(
      { total: 12 },
      { attrs: { 'data-pagination': 'demo' }, style: { maxWidth: '480px' } },
      (api) => {
        paginationCallback = api;
        api.page(1);
      }
    );
    const element = pagination.render().renderDom();

    expect(paginationCallback).toBe(pagination);
    expect(element.dataset.pagination).toBe('demo');
    expect(element.style.maxWidth).toBe('480px');
  });

  it('keeps attrs and style from configuration-first async and chart components', () => {
    const loader = vDynamicLoader({
      attrs: { 'data-loader-demo': 'true' },
      auto: false,
      loader: () => Promise.resolve('ready'),
      style: { maxWidth: '260px' }
    });
    const loaderElement = loader.renderDom();

    const chart = vChart({
      adapter: { init: () => ({}) },
      attrs: { 'data-chart-demo': 'true' },
      style: { maxWidth: '360px' }
    });
    const chartElement = chart.renderDom();

    expect(loaderElement.dataset.loaderDemo).toBe('true');
    expect(loaderElement.style.maxWidth).toBe('260px');
    expect(chartElement.dataset.chartDemo).toBe('true');
    expect(chartElement.style.maxWidth).toBe('360px');
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
    expect(element.querySelector('.yoya-vcard-footer .yoya-vbutton-label').textContent).toBe(
      '刷新'
    );
    expect(clicked).toHaveBeenCalledTimes(1);
  });

  it('creates card slots through top-level factories', () => {
    const card = vCard([vCardHeader('标题'), vCardBody('内容'), vCardFooter(vButton('确认'))]);

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
    const closeElement = messageElement.querySelector('.yoya-vmessage-close');

    expect(closeElement.tagName).toBe('SPAN');
    expect(closeElement.style.borderWidth).toBe('0px');
    expect(closeElement.style.marginLeft).toBe('auto');
    expect(closeElement.querySelector('svg')).not.toBeNull();

    closeElement.click();

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

  it('creates accessible menu groups and dividers', () => {
    const menu = vMenu((commands) => {
      commands.vMenuGroup((group) => {
        group.label('文件操作');
        group.vMenuItem('新建');
        group.vMenuItem({ disabled: true, text: '删除' });
      });
      commands.vMenuDivider();
      commands.vMenuItem('退出');
    });
    const element = menu.renderDom();
    const group = element.querySelector('.yoya-vmenu-group');
    const heading = group.querySelector('.yoya-vmenu-group-label');
    const divider = element.querySelector('.yoya-vmenu-divider');
    const disabledItem = group.querySelector('[disabled]');

    expect(menu.children()[0]).toBeInstanceOf(VMenuGroup);
    expect(menu.children()[1]).toBeInstanceOf(VMenuDivider);
    expect(group.getAttribute('role')).toBe('group');
    expect(heading.id).not.toBe('');
    expect(group.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(heading.textContent).toBe('文件操作');
    expect(divider.getAttribute('role')).toBe('separator');
    expect(divider.getAttribute('aria-orientation')).toBe('horizontal');
    expect(disabledItem.getAttribute('aria-disabled')).toBe('true');
  });

  it('registers menu groups and dividers as v-prefixed parent shortcuts', () => {
    const page = div((root) => {
      root.vMenuGroup((group) => group.label('快捷操作').vMenuItem('复制'));
      root.vMenuDivider();
    });
    const element = page.renderDom();

    expect(vMenuGroup('分组')).toBeInstanceOf(VMenuGroup);
    expect(vMenuDivider()).toBeInstanceOf(VMenuDivider);
    expect(element.querySelector('.yoya-vmenu-group-label').textContent).toBe('快捷操作');
    expect(element.querySelector('.yoya-vmenu-divider').getAttribute('role')).toBe('separator');
  });

  it('creates an accessible nested submenu through public factories', () => {
    const menu = vMenu((commands) => {
      commands.vSubMenu((submenu) => {
        submenu.label('更多操作');
        submenu.menuContent((nested) => nested.vMenuItem('导出'));
      });
    });
    const element = menu.renderDom();
    const submenu = menu.children()[0];
    const trigger = element.querySelector('.yoya-vsubmenu-trigger');
    const panel = element.querySelector('.yoya-vsubmenu-panel');

    expect(submenu).toBeInstanceOf(VSubMenu);
    expect(vSubMenu('独立子菜单')).toBeInstanceOf(VSubMenu);
    expect(trigger.getAttribute('role')).toBe('menuitem');
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
    expect(trigger.textContent).toContain('更多操作');
    expect(element.querySelector('.yoya-vsubmenu').dataset.open).toBeUndefined();
    expect(panel.classList.contains('yoya-vsubmenu-panel')).toBe(true);
    expect(panel.querySelector('.yoya-vmenu').getAttribute('role')).toBe('menu');
    expect(panel.querySelector('.yoya-vmenu-item-label').textContent).toBe('导出');
  });

  it('creates an accessible sidebar from existing navigation compounds', () => {
    const sidebar = vSidebar({
      ariaLabel: '后台主导航',
      title: '运维中心',
      menuContent(menu) {
        menu.vMenuGroup((group) => {
          group.label('工作台');
          group.vMenuItem({ active: true, icon: 'O', text: '概览' });
        });
        menu.vSubMenu((submenu) => {
          submenu.label('系统设置');
          submenu.menuContent((nested) => nested.vMenuItem('成员管理'));
        });
      }
    });
    const element = sidebar.renderDom();
    const toggle = element.querySelector('.yoya-vsidebar-toggle');
    const menu = element.querySelector('.yoya-vmenu');

    expect(sidebar).toBeInstanceOf(VSidebar);
    expect(vSidebar(sidebar)).toBe(sidebar);
    expect(element.tagName).toBe('ASIDE');
    expect(element.getAttribute('aria-label')).toBe('后台主导航');
    expect(element.querySelector('.yoya-vsidebar-title').textContent).toBe('运维中心');
    expect(toggle.getAttribute('aria-controls')).toBe(menu.id);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(menu.getAttribute('aria-label')).toBe('后台主导航菜单');
    expect(element.querySelector('.yoya-vmenu-group').getAttribute('role')).toBe('group');
    expect(element.querySelector('[aria-current="page"]').textContent).toContain('概览');
    expect(element.querySelector('.yoya-vsubmenu-trigger').textContent).toContain('系统设置');

    const configured = vSidebar({ collapsed: true, responsive: false }).renderDom();
    expect(configured.dataset.collapsed).toBe('true');
    expect(configured.dataset.responsive).toBeUndefined();
  });

  it('keeps sidebar submenu popups visible outside the sidebar edge', () => {
    const sidebar = vSidebar((navigation) => {
      navigation.title('企业管理平台');
      navigation.menuContent((menu) => {
        menu.vSubMenu((submenu) => {
          submenu.label('系统设置');
          submenu.menuContent((nested) => nested.vMenuItem('参数配置'));
        });
      });
    }).bindTo(document.body);
    const element = sidebar.renderDom();
    const trigger = element.querySelector('.yoya-vsubmenu-trigger');

    expect(element.classList.contains('yoya-vsidebar')).toBe(true);
    trigger.click();
    expect(element.style.overflow).toBe('visible');
    trigger.click();
    expect(element.style.overflow).toBe('hidden');

    sidebar.destroy();
  });

  it('expands sidebar submenus inline with vertical layout', () => {
    const sidebar = vSidebar((navigation) => {
      navigation.title('企业管理平台');
      navigation.menuContent((menu) => {
        menu.vSubMenu({
          inline: true,
          label: '系统设置',
          menuContent: (nested) => nested.vMenuItem('参数配置')
        });
      });
    }).bindTo(document.body);
    const element = sidebar.renderDom();
    const submenu = element.querySelector('.yoya-vsubmenu');
    const trigger = element.querySelector('.yoya-vsubmenu-trigger');
    const panel = element.querySelector('.yoya-vsubmenu-panel');
    const shortcut = trigger.querySelector('.yoya-vmenu-item-shortcut');
    const item = panel.querySelector('.yoya-vmenu-item');

    expect(submenu.dataset.inline).toBe('true');
    expect(panel.classList.contains('yoya-vsubmenu-panel')).toBe(true);
    expect(submenu.dataset.open).toBeUndefined();
    expect(shortcut.textContent).toBe('▸');

    trigger.click();
    expect(submenu.dataset.open).toBe('true');
    expect(shortcut.textContent).toBe('▾');
    expect(element.style.overflow).toBe('hidden');

    item.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    expect(item.dataset.hovered).toBe('true');
    item.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(item.dataset.hovered).toBeUndefined();

    item.click();
    expect(submenu.dataset.open).toBe('true');
    expect(item.getAttribute('aria-current')).toBe('page');

    trigger.click();
    expect(submenu.dataset.open).toBeUndefined();
    expect(shortcut.textContent).toBe('▸');

    sidebar.destroy();
  });

  it('switches the active sidebar item globally when clicking menu items', () => {
    const sidebar = vSidebar((navigation) => {
      navigation.menuContent((menu) => {
        menu.vMenuItem((item) => {
          item.id('sidebar-overview').text('数据概览').active(true);
        });
        menu.vMenuItem((item) => item.id('sidebar-todo').text('待办审批'));
        menu.vSubMenu({
          inline: true,
          label: '系统设置',
          menuContent: (nested) =>
            nested.vMenuItem((item) => item.id('sidebar-param').text('参数配置'))
        });
      });
    }).bindTo(document.body);
    const element = sidebar.renderDom();
    const overview = element.querySelector('#sidebar-overview');
    const todo = element.querySelector('#sidebar-todo');
    const param = element.querySelector('#sidebar-param');

    expect(overview.getAttribute('aria-current')).toBe('page');

    todo.click();
    expect(overview.getAttribute('aria-current')).toBeNull();
    expect(todo.getAttribute('aria-current')).toBe('page');

    element.querySelector('.yoya-vsubmenu-trigger').click();
    param.click();
    expect(todo.getAttribute('aria-current')).toBeNull();
    expect(param.getAttribute('aria-current')).toBe('page');

    sidebar.destroy();
  });

  it('toggles sidebar collapse without removing accessible menu labels', () => {
    const sidebar = vSidebar((navigation) => {
      navigation.title('运维中心');
      navigation.menuContent((menu) => {
        menu.vMenuItem({ icon: 'O', text: '概览' });
        menu.vSubMenu((submenu) => {
          submenu.label('系统设置');
          submenu.menuContent((nested) => nested.vMenuItem('成员管理'));
          submenu.open(true);
        });
      });
    }).bindTo(document.body);
    const element = sidebar.renderDom();
    const toggle = element.querySelector('.yoya-vsidebar-toggle');
    const label = element.querySelector('.yoya-vmenu-item-label');
    const submenu = element.querySelector('.yoya-vsubmenu');
    const submenuTrigger = element.querySelector('.yoya-vsubmenu-trigger');
    const submenuShortcut = submenuTrigger.querySelector('.yoya-vmenu-item-shortcut');

    toggle.click();

    expect(element.dataset.collapsed).toBe('true');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-label')).toBe('展开侧边导航');
    expect(toggle.textContent).toBe('›');
    expect(label.textContent).toBe('概览');
    expect(label.style.position).toBe('absolute');
    expect(submenu.dataset.open).toBeUndefined();
    expect(submenuShortcut.textContent).toBe('›');
    expect(submenuShortcut.style.position).toBe('');

    submenuTrigger.click();
    expect(element.dataset.collapsed).toBeUndefined();
    expect(label.style.position).toBe('');
    expect(submenu.dataset.open).toBe('true');

    sidebar.collapsed(true);
    submenuTrigger.focus();
    submenuTrigger.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' })
    );
    expect(element.dataset.collapsed).toBeUndefined();
    expect(submenu.dataset.open).toBe('true');
  });

  it('keeps menu roving focus and collapses the sidebar with Escape', () => {
    const sidebar = vSidebar((navigation) => {
      navigation.menuContent((menu) => {
        menu.vMenuItem((item) => item.id('sidebar-overview').text('概览'));
        menu.vMenuItem((item) => item.id('sidebar-disabled').text('禁用').disabled(true));
        menu.vMenuItem((item) => item.id('sidebar-services').text('服务'));
      });
    }).bindTo(document.body);
    const element = sidebar.renderDom();
    const overview = element.querySelector('#sidebar-overview');
    const services = element.querySelector('#sidebar-services');
    const toggle = element.querySelector('.yoya-vsidebar-toggle');

    overview.focus();
    overview.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
    expect(document.activeElement).toBe(services);

    services.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Home' }));
    expect(document.activeElement).toBe(overview);

    overview.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    expect(element.dataset.collapsed).toBe('true');
    expect(document.activeElement).toBe(toggle);
  });

  it('responds to sidebar breakpoints and releases the media listener', () => {
    const originalMatchMedia = window.matchMedia;
    let changeListener;
    const media = {
      matches: false,
      media: '(max-width: 720px)',
      addEventListener: vi.fn((type, listener) => {
        if (type === 'change') changeListener = listener;
      }),
      removeEventListener: vi.fn()
    };
    window.matchMedia = vi.fn(() => media);

    try {
      const sidebar = vSidebar((navigation) => {
        navigation.menuContent((menu) => {
          menu.vSubMenu((submenu) => {
            submenu.label('系统设置');
            submenu.menuContent((nested) => {
              nested.vMenuItem((item) => item.id('sidebar-responsive-member').text('成员管理'));
            });
          });
        });
        navigation.responsive('(max-width: 720px)');
      }).bindTo(document.body);
      const element = sidebar.renderDom();
      const trigger = element.querySelector('.yoya-vsubmenu-trigger');
      const nestedItem = element.querySelector('#sidebar-responsive-member');

      expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 720px)');
      expect(element.dataset.responsive).toBe('true');
      expect(element.dataset.collapsed).toBeUndefined();

      trigger.click();
      nestedItem.focus();
      expect(document.activeElement).toBe(nestedItem);

      media.matches = true;
      changeListener({ matches: true });
      expect(element.dataset.collapsed).toBe('true');
      expect(document.activeElement).toBe(trigger);

      media.matches = false;
      changeListener({ matches: false });
      expect(element.dataset.collapsed).toBeUndefined();

      sidebar.destroy();
      expect(media.removeEventListener).toHaveBeenCalledWith('change', changeListener);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('keeps sidebar content collapsed when it is added after responsive state', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn(() => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {}
    }));

    try {
      let group;
      let submenu;
      const sidebar = vSidebar((navigation) => {
        navigation.responsive('(max-width: 720px)');
        navigation.menuContent((menu) => {
          menu.vMenuItem('概览');
          menu.vMenuGroup((navigationGroup) => {
            group = navigationGroup;
            group.label('工作台');
          });
          menu.vSubMenu((navigationSubmenu) => {
            submenu = navigationSubmenu;
            submenu.label('系统设置');
            submenu.menuContent(() => {});
          });
        });
      });

      group.vMenuItem('渲染前分组项目');
      submenu.menuContent((nested) => nested.vMenuItem('渲染前嵌套项目'));
      const element = sidebar.renderDom();

      let labels = element.querySelectorAll('.yoya-vmenu-item-label');
      expect(labels).toHaveLength(4);
      labels.forEach((label) => expect(label.style.position).toBe('absolute'));

      group.vMenuItem('渲染后分组项目');
      submenu.menuContent().vMenuItem('渲染后嵌套项目');
      labels = element.querySelectorAll('.yoya-vmenu-item-label');
      expect(labels).toHaveLength(6);
      labels.forEach((label) => expect(label.style.position).toBe('absolute'));

      sidebar.menuContent((menu) => menu.vMenuItem('审计日志'));
      labels = element.querySelectorAll('.yoya-vmenu-item-label');
      expect(labels).toHaveLength(1);
      expect(labels[0].textContent).toBe('审计日志');
      expect(labels[0].style.position).toBe('absolute');

      sidebar.menuContent().vMenuItem('告警中心');
      labels = element.querySelectorAll('.yoya-vmenu-item-label');
      expect(labels).toHaveLength(2);
      labels.forEach((label) => expect(label.style.position).toBe('absolute'));

      sidebar.destroy();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('toggles nested submenus from the pointer and blocks disabled triggers', () => {
    const submenu = vSubMenu((menu) => {
      menu.label('更多操作');
      menu.menuContent((nested) => nested.vMenuItem('导出'));
    });
    const element = submenu.renderDom();
    const trigger = element.querySelector('.yoya-vsubmenu-trigger');

    trigger.click();
    expect(element.dataset.open).toBe('true');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    trigger.click();
    expect(element.dataset.open).toBeUndefined();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    submenu.disabled(true);
    trigger.click();
    expect(trigger.disabled).toBe(true);
    expect(element.dataset.open).toBeUndefined();
  });

  it('enters and exits nested submenus with keyboard focus management', () => {
    const menu = vMenu((commands) => {
      commands.vSubMenu((submenu) => {
        submenu.label('更多操作');
        submenu.menuContent((nested) => {
          nested.vMenuItem((item) => item.id('nested-disabled').text('禁用项').disabled(true));
          nested.vMenuItem((item) => item.id('nested-first').text('导出'));
          nested.vMenuItem((item) => item.id('nested-second').text('归档'));
        });
      });
    }).bindTo(document.body);
    const element = menu.renderDom();
    const submenu = element.querySelector('.yoya-vsubmenu');
    const trigger = element.querySelector('.yoya-vsubmenu-trigger');
    const first = element.querySelector('#nested-first');
    const second = element.querySelector('#nested-second');

    trigger.focus();
    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' })
    );
    expect(submenu.dataset.open).toBe('true');
    expect(document.activeElement).toBe(first);

    first.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
    expect(document.activeElement).toBe(second);

    second.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowLeft' })
    );
    expect(submenu.dataset.open).toBeUndefined();
    expect(document.activeElement).toBe(trigger);

    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' })
    );
    expect(document.activeElement).toBe(first);

    first.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' })
    );
    expect(submenu.dataset.open).toBeUndefined();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes nested submenus outside and on leaf selection but keeps ancestor levels open', () => {
    const menu = vMenu((commands) => {
      commands.vSubMenu((submenu) => {
        submenu.label('更多操作');
        submenu.menuContent((nested) => {
          nested.vMenuItem((item) => item.id('submenu-leaf').text('导出'));
          nested.vSubMenu((child) => {
            child.label('高级操作');
            child.menuContent((deep) => deep.vMenuItem('清理缓存'));
          });
        });
      });
    }).bindTo(document.body);
    const element = menu.renderDom();
    const submenus = element.querySelectorAll('.yoya-vsubmenu');
    const triggers = element.querySelectorAll('.yoya-vsubmenu-trigger');

    triggers[0].click();
    expect(submenus[0].dataset.open).toBe('true');
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(submenus[0].dataset.open).toBeUndefined();

    triggers[0].click();
    element.querySelector('#submenu-leaf').click();
    expect(submenus[0].dataset.open).toBeUndefined();

    triggers[0].click();
    triggers[1].click();
    expect(submenus[0].dataset.open).toBe('true');
    expect(submenus[1].dataset.open).toBe('true');
  });

  it('closes an open sibling when another submenu trigger is selected', () => {
    const menu = vMenu((commands) => {
      commands.vSubMenu((submenu) => {
        submenu.label('导出');
        submenu.menuContent((nested) => nested.vMenuItem('导出 CSV'));
      });
      commands.vSubMenu((submenu) => {
        submenu.label('共享');
        submenu.menuContent((nested) => nested.vMenuItem('复制链接'));
      });
    }).bindTo(document.body);
    const element = menu.renderDom();
    const submenus = element.querySelectorAll('.yoya-vsubmenu');
    const triggers = element.querySelectorAll('.yoya-vsubmenu-trigger');

    triggers[0].click();
    triggers[1].click();

    expect(submenus[0].dataset.open).toBeUndefined();
    expect(submenus[1].dataset.open).toBe('true');
  });

  it('exits one nested submenu level at a time from a child trigger', () => {
    const menu = vMenu((commands) => {
      commands.vSubMenu((parent) => {
        parent.label('父级');
        parent.menuContent((nested) => {
          nested.vSubMenu((child) => {
            child.label('子级');
            child.menuContent((deep) => deep.vMenuItem('叶子'));
          });
        });
      });
    }).bindTo(document.body);
    const element = menu.renderDom();
    const submenus = element.querySelectorAll('.yoya-vsubmenu');
    const triggers = element.querySelectorAll('.yoya-vsubmenu-trigger');

    triggers[0].click();
    triggers[1].click();
    triggers[1].focus();
    triggers[1].dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowLeft' })
    );
    expect(submenus[0].dataset.open).toBe('true');
    expect(submenus[1].dataset.open).toBeUndefined();
    expect(document.activeElement).toBe(triggers[1]);

    triggers[1].dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowLeft' })
    );
    expect(submenus[0].dataset.open).toBeUndefined();
    expect(document.activeElement).toBe(triggers[0]);

    triggers[0].click();
    triggers[1].click();
    triggers[1].focus();
    triggers[1].dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' })
    );
    expect(submenus[0].dataset.open).toBe('true');
    expect(submenus[1].dataset.open).toBeUndefined();
    expect(document.activeElement).toBe(triggers[1]);
  });

  it('closes descendant submenu state when a parent closes or becomes disabled', () => {
    let parentSubMenu;
    let childSubMenu;
    const menu = vMenu((commands) => {
      commands.vSubMenu((parent) => {
        parentSubMenu = parent;
        parent.label('父级');
        parent.menuContent((nested) => {
          nested.vSubMenu((child) => {
            childSubMenu = child;
            child.label('子级');
            child.menuContent((deep) => deep.vMenuItem('叶子'));
          });
        });
      });
    });
    const element = menu.renderDom();
    const submenus = element.querySelectorAll('.yoya-vsubmenu');
    const triggers = element.querySelectorAll('.yoya-vsubmenu-trigger');

    parentSubMenu.open();
    childSubMenu.open();
    parentSubMenu.close();
    expect(submenus[0].dataset.open).toBeUndefined();
    expect(submenus[1].dataset.open).toBeUndefined();
    expect(triggers[1].getAttribute('aria-expanded')).toBe('false');

    parentSubMenu.open();
    childSubMenu.open();
    parentSubMenu.disabled(true);
    expect(submenus[0].dataset.open).toBeUndefined();
    expect(submenus[1].dataset.open).toBeUndefined();
    expect(triggers[1].getAttribute('aria-expanded')).toBe('false');
  });

  it('navigates vertical structured menus while skipping disabled and structural elements', () => {
    const menu = vMenu((commands) => {
      commands.vMenuItem((item) => item.id('menu-first').text('第一项'));
      commands.vMenuDivider();
      commands.vMenuGroup((group) => {
        group.label('分组');
        group.vMenuItem((item) => item.id('menu-disabled').text('禁用项').disabled(true));
        group.vMenuItem((item) => item.id('menu-grouped').text('分组项'));
      });
      commands.vMenuItem((item) => item.id('menu-last').text('最后一项'));
    }).bindTo(document.body);
    const element = menu.renderDom();
    const first = element.querySelector('#menu-first');
    const grouped = element.querySelector('#menu-grouped');
    const last = element.querySelector('#menu-last');
    const disabled = element.querySelector('#menu-disabled');

    expect(first.tabIndex).toBe(0);
    expect(grouped.tabIndex).toBe(-1);
    expect(last.tabIndex).toBe(-1);
    expect(disabled.tabIndex).toBe(-1);

    first.focus();
    first.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
    expect(document.activeElement).toBe(grouped);

    grouped.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'End' }));
    expect(document.activeElement).toBe(last);

    last.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
    expect(document.activeElement).toBe(first);

    first.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowUp' }));
    expect(document.activeElement).toBe(last);

    last.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Home' }));
    expect(document.activeElement).toBe(first);
  });

  it('uses left and right arrows for horizontal structured menus', () => {
    const menu = vMenu((commands) => {
      commands.horizontal();
      commands.vMenuItem((item) => item.id('horizontal-first').text('第一项'));
      commands.vMenuDivider();
      commands.vMenuGroup((group) => {
        group.label('分组');
        group.vMenuItem((item) => item.id('horizontal-second').text('第二项'));
      });
    }).bindTo(document.body);
    const element = menu.renderDom();
    const first = element.querySelector('#horizontal-first');
    const second = element.querySelector('#horizontal-second');
    const divider = element.querySelector('.yoya-vmenu-divider');

    expect(divider.getAttribute('aria-orientation')).toBe('vertical');

    first.focus();
    first.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
    expect(document.activeElement).toBe(second);

    second.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowLeft' }));
    expect(document.activeElement).toBe(first);

    const down = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'ArrowDown'
    });
    first.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(first);
  });

  it('updates the roving menu tab stop when an enabled item receives focus', () => {
    const menu = vMenu((commands) => {
      commands.vMenuItem((item) => item.id('focus-first').text('第一项'));
      commands.vMenuItem((item) => item.id('focus-second').text('第二项'));
    }).bindTo(document.body);
    const element = menu.renderDom();
    const first = element.querySelector('#focus-first');
    const second = element.querySelector('#focus-second');

    second.focus();

    expect(first.tabIndex).toBe(-1);
    expect(second.tabIndex).toBe(0);
  });

  it('moves the roving tab stop when the current menu item is disabled', () => {
    let firstItem;
    const menu = vMenu((commands) => {
      commands.vMenuItem((item) => {
        firstItem = item;
        item.id('disable-first').text('第一项');
      });
      commands.vMenuItem((item) => item.id('disable-second').text('第二项'));
    }).bindTo(document.body);
    const element = menu.renderDom();
    const first = element.querySelector('#disable-first');
    const second = element.querySelector('#disable-second');

    expect(first.tabIndex).toBe(0);
    expect(second.tabIndex).toBe(-1);

    firstItem.disabled(true);

    expect(first.disabled).toBe(true);
    expect(first.tabIndex).toBe(-1);
    expect(second.tabIndex).toBe(0);
  });

  it('keeps nested menu tab stops and keyboard navigation independent', () => {
    const menu = vMenu((outer) => {
      outer.vMenuItem((item) => item.id('outer-first').text('外层第一项'));
      outer.vMenu((inner) => {
        inner.vMenuItem((item) => item.id('inner-first').text('内层第一项'));
        inner.vMenuItem((item) => item.id('inner-second').text('内层第二项'));
      });
      outer.vMenuItem((item) => item.id('outer-last').text('外层最后一项'));
    }).bindTo(document.body);
    const element = menu.renderDom();
    const outerFirst = element.querySelector('#outer-first');
    const innerFirst = element.querySelector('#inner-first');
    const innerSecond = element.querySelector('#inner-second');
    const outerLast = element.querySelector('#outer-last');

    expect(outerFirst.tabIndex).toBe(0);
    expect(innerFirst.tabIndex).toBe(0);
    expect(innerSecond.tabIndex).toBe(-1);
    expect(outerLast.tabIndex).toBe(-1);

    innerFirst.focus();
    innerFirst.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
    expect(document.activeElement).toBe(innerSecond);

    innerSecond.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
    expect(document.activeElement).toBe(innerFirst);
  });

  it('keeps one roving tab stop when an item is appended to a rendered group', () => {
    let group;
    const menu = vMenu((commands) => {
      commands.vMenuGroup((items) => {
        group = items;
        items.label('动态分组');
        items.vMenuItem((item) => item.id('dynamic-first').text('第一项'));
      });
    }).bindTo(document.body);
    const element = menu.renderDom();

    group.vMenuItem((item) => item.id('dynamic-second').text('第二项'));

    expect(element.querySelector('#dynamic-first').tabIndex).toBe(0);
    expect(element.querySelector('#dynamic-second').tabIndex).toBe(-1);
  });

  it('keeps one roving tab stop when an item is appended to a rendered menu', () => {
    const menu = vMenu((commands) => {
      commands.vMenuItem((item) => item.id('direct-first').text('第一项'));
    }).bindTo(document.body);
    const element = menu.renderDom();

    menu.vMenuItem((item) => item.id('direct-second').text('第二项'));

    expect(element.querySelector('#direct-first').tabIndex).toBe(0);
    expect(element.querySelector('#direct-second').tabIndex).toBe(-1);
  });

  it('preserves danger styling when active state is turned off', () => {
    const item = vMenuItem('删除服务').danger(true).active(true).active(false);
    const element = item.renderDom();

    expect(element.dataset.danger).toBe('true');
    expect(element.dataset.active).toBeUndefined();
    expect(element.classList.contains('yoya-vmenu-item')).toBe(true);
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
    expect(items[0].classList.contains('yoya-vmenu-item')).toBe(true);
    expect(items[1].classList.contains('yoya-vmenu-item')).toBe(true);
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
    expect(panel.classList.contains('yoya-vdropdown-panel')).toBe(true);
    expect(panel.getAttribute('aria-hidden')).toBe('true');
    expect(element.dataset.placement).toBe('bottom-end');

    trigger.click();

    expect(element.dataset.open).toBe('true');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(panel.getAttribute('aria-hidden')).toBe('false');

    element.querySelector('#dropdown-refresh').click();

    expect(clicked).toHaveBeenCalledTimes(1);
    expect(element.dataset.open).toBeUndefined();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(panel.getAttribute('aria-hidden')).toBe('true');
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

  it('opens dropdown menus from trigger keyboard and focuses the first item', () => {
    const dropdown = vDropdownMenu((menu) => {
      menu.trigger((button) => button.attr('id', 'dropdown-keyboard-trigger').label('更多'));
      menu.menuContent((commands) => {
        commands.vMenuItem((item) => item.id('dropdown-first-item').text('导出'));
        commands.vMenuItem((item) => item.id('dropdown-second-item').text('归档'));
      });
    }).bindTo(document.body);
    const element = dropdown.renderDom();
    const trigger = element.querySelector('#dropdown-keyboard-trigger');
    const firstItem = element.querySelector('#dropdown-first-item');

    trigger.focus();
    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' })
    );

    expect(element.dataset.open).toBe('true');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(firstItem);

    document.activeElement.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' })
    );

    expect(element.dataset.open).toBeUndefined();
    expect(document.activeElement).toBe(trigger);
  });

  it('composes nested submenus with dropdown and context menu selection closing', () => {
    const dropdown = vDropdownMenu((overlay) => {
      overlay.trigger((button) => button.id('submenu-dropdown-trigger').label('更多'));
      overlay.menuContent((menu) => {
        menu.vSubMenu((submenu) => {
          submenu.label('导出');
          submenu.menuContent((nested) => {
            nested.vMenuItem((item) => item.id('submenu-dropdown-leaf').text('导出 CSV'));
          });
        });
      });
    }).bindTo(document.body);
    const dropdownElement = dropdown.renderDom();

    dropdownElement.querySelector('#submenu-dropdown-trigger').click();
    dropdownElement.querySelector('.yoya-vsubmenu-trigger').click();
    expect(dropdownElement.dataset.open).toBe('true');
    expect(dropdownElement.querySelector('.yoya-vsubmenu').dataset.open).toBe('true');

    dropdownElement.querySelector('#submenu-dropdown-leaf').click();
    expect(dropdownElement.dataset.open).toBeUndefined();

    const contextMenu = vContextMenu((overlay) => {
      overlay.target((target) => target.id('submenu-context-target').text('右键区域'));
      overlay.menuContent((menu) => {
        menu.vSubMenu((submenu) => {
          submenu.label('服务操作');
          submenu.menuContent((nested) => {
            nested.vMenuItem((item) => item.id('submenu-context-leaf').text('重启'));
          });
        });
      });
    }).bindTo(document.body);
    const contextElement = contextMenu.renderDom();

    contextElement
      .querySelector('#submenu-context-target')
      .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    contextElement.querySelector('.yoya-vsubmenu-trigger').click();
    expect(contextElement.dataset.open).toBe('true');

    contextElement.querySelector('#submenu-context-leaf').click();
    expect(contextElement.dataset.open).toBeUndefined();
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
    expect(panel.style.left).toBe('24px');
    expect(panel.style.top).toBe('48px');

    element.querySelector('#restart-service').click();

    expect(selected).toHaveBeenCalledTimes(1);
    expect(element.dataset.open).toBeUndefined();
  });

  it('closes context menus from outside clicks and Escape', () => {
    const contextMenu = vContextMenu((menu) => {
      menu.target((target) => target.attr('id', 'context-close-target').text('右键区域'));
      menu.menuContent((commands) => commands.vMenuItem('查看详情'));
    }).bindTo(document.body);
    const element = contextMenu.renderDom();
    const target = element.querySelector('#context-close-target');

    target.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 12,
        clientY: 18
      })
    );
    expect(element.dataset.open).toBe('true');

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(element.dataset.open).toBeUndefined();

    target.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 24,
        clientY: 36
      })
    );
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

  it('creates detail components with label and value pairs', () => {
    const page = div((root) => {
      root.vDetail((detail) => {
        detail.vDetailItem((item) => {
          item.label('主机');
          item.value('api-gateway-01');
        });
        detail.vDetailItem(vDetailItem('状态', '运行中'));
      });
    });

    const element = page.renderDom();
    const items = element.querySelectorAll('.yoya-vdetail-item');

    expect(element.querySelector('.yoya-vdetail')).not.toBeNull();
    expect(items).toHaveLength(2);
    expect(items[0].querySelector('dt').textContent).toBe('主机');
    expect(items[0].querySelector('dd').textContent).toBe('api-gateway-01');
    expect(items[1].querySelector('dt').textContent).toBe('状态');
    expect(items[1].querySelector('dd').textContent).toBe('运行中');
    expect(vDetailItem('版本', '1.2.3').toHTML()).toContain('1.2.3');
  });

  it('dynamically changes how many detail items are shown per row', () => {
    const page = div((root) => {
      root.vDetail({
        columns: 2,
        items: [
          ['服务名称', 'api-gateway'],
          ['状态', '运行中'],
          ['负责人', 'SRE 团队']
        ]
      });
    });
    const element = page.renderDom();
    const detail = page.children()[0];
    const detailElement = element.querySelector('.yoya-vdetail');

    expect(detail.columns()).toBe(2);
    expect(detailElement.dataset.columns).toBe('2');
    expect(detailElement.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
    expect(detailElement.querySelectorAll('.yoya-vdetail-item')).toHaveLength(3);
    expect(detailElement.querySelector('.yoya-vdetail-item').style.gridTemplateColumns).toBe(
      'minmax(96px, 1fr) minmax(0, 1.5fr)'
    );

    detail.column(3);

    expect(detail.columns()).toBe(3);
    expect(detailElement.dataset.columns).toBe('3');
    expect(detailElement.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');

    detail.columns(0);

    expect(detail.columns()).toBe(1);
    expect(detailElement.style.gridTemplateColumns).toBe('repeat(1, minmax(0, 1fr))');
  });

  it('renders copyable code snippets and copies text from the code block', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const originalClipboard = navigator.clipboard;

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    });

    try {
      const snippet = vCode((code) => {
        code.language('sql');
        code.content('SELECT * FROM services;');
      });

      const element = snippet.renderDom();
      element.querySelector('.yoya-vcode-copy').click();

      expect(element.classList.contains('yoya-vcode')).toBe(true);
      expect(element.dataset.language).toBe('sql');
      expect(element.querySelector('pre code').textContent).toBe('SELECT * FROM services;');
      expect(writeText).toHaveBeenCalledWith('SELECT * FROM services;');
    } finally {
      if (originalClipboard === undefined) {
        delete navigator.clipboard;
      } else {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: originalClipboard
        });
      }
    }
  });

  it('renders tables with row actions and empty states', () => {
    const clicked = vi.fn();
    const table = vTable({
      caption: '服务列表',
      columns: [
        { key: 'name', label: '名称' },
        { key: 'status', label: '状态' },
        {
          key: 'actions',
          label: '操作',
          render: (row) =>
            vButton((button) => {
              button.label(row.status === '运行中' ? '重启' : '启动');
              button.variant('secondary');
              button.on('click', () => clicked(row.name));
            })
        }
      ],
      emptyText: '暂无服务',
      rows: [
        { name: 'api-gateway', status: '运行中' },
        { name: 'worker', status: '停止' }
      ]
    });

    const element = table.renderDom();
    const rows = element.querySelectorAll('tbody tr');

    expect(element.classList.contains('yoya-vtable')).toBe(true);
    expect(element.querySelector('caption').textContent).toBe('服务列表');
    expect(element.querySelectorAll('thead th')).toHaveLength(3);
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelectorAll('td')[2].textContent).toBe('重启');

    rows[0].querySelector('button').click();
    expect(clicked).toHaveBeenCalledWith('api-gateway');

    table.rows([]);

    expect(element.querySelector('.yoya-vtable-empty').textContent).toBe('暂无服务');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('renders pagination controls, updates its state, and emits page changes', () => {
    const changed = vi.fn();
    const direct = VPagination();
    const pagination = vPagination((pager) => {
      pager.pageSizes([10, 20, 50]);
      pager.update({
        page: 2,
        pageSize: 10,
        total: 35,
        totalPages: 4
      });
      pager.change(changed);
    });
    const page = div((root) => {
      root.vPagination(pagination);
    });

    const element = page.renderDom();
    const paginationRoot = element.querySelector('.yoya-vpagination');
    const first = paginationRoot.querySelector('[data-action="first"]');
    const previous = paginationRoot.querySelector('[data-action="previous"]');
    const next = paginationRoot.querySelector('[data-action="next"]');
    const last = paginationRoot.querySelector('[data-action="last"]');
    const jumpInput = paginationRoot.querySelector('[data-role="page-input"]');
    const jumpButton = paginationRoot.querySelector('[data-action="jump"]');
    const pageSize = paginationRoot.querySelector('[data-role="page-size"]');

    expect(pagination).toBeInstanceOf(Object);
    expect(typeof pagination.render).toBe('function');
    expect(typeof pagination.update).toBe('function');
    expect(typeof pagination.change).toBe('function');
    expect(paginationRoot.getAttribute('aria-label')).toBe('分页');
    expect(typeof direct.render).toBe('function');
    expect(typeof direct.update).toBe('function');
    expect(paginationRoot.querySelector('.yoya-vpagination-summary').textContent).toContain(
      '共 35 条'
    );
    expect(paginationRoot.querySelector('.yoya-vpagination-summary').textContent).toContain(
      '第 2 / 4 页'
    );
    expect(first.disabled).toBe(false);
    expect(previous.disabled).toBe(false);
    expect(next.disabled).toBe(false);
    expect(last.disabled).toBe(false);
    expect(jumpInput.value).toBe('2');
    expect(pageSize.value).toBe('10');

    pageSize.value = '20';
    pageSize.dispatchEvent(new Event('change', { bubbles: true }));
    expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: 20 }));

    jumpInput.value = '4';
    jumpButton.click();
    expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, pageSize: 20 }));

    pagination.update({
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1
    });

    expect(paginationRoot.querySelector('.yoya-vpagination-summary').textContent).toContain(
      '共 0 条'
    );
    expect(first.disabled).toBe(true);
    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(true);
    expect(last.disabled).toBe(true);
  });

  it('enables next and last pages when initialized with total and pageSize', () => {
    const pagination = vPagination({
      page: 1,
      pageSize: 2,
      total: 5
    });
    const element = pagination.render().renderDom();
    const next = element.querySelector('[data-action="next"]');
    const last = element.querySelector('[data-action="last"]');

    expect(element.dataset.totalPages).toBe('3');
    expect(next.disabled).toBe(false);
    expect(last.disabled).toBe(false);

    next.click();
    expect(pagination.page()).toBe(2);
  });

  it('renders form inputs with values, placeholders and options', () => {
    const input = vInput({
      name: 'serviceName',
      placeholder: '服务名',
      value: 'api-gateway'
    });
    const select = vSelect({
      name: 'status',
      options: ['运行中', ['stopped', '停止']],
      value: '运行中'
    });
    const textarea = vTextarea({
      name: 'notes',
      value: '初始说明'
    }).readonly(true);
    const page = div((root) => {
      root.child(input, select, textarea);
    });

    const element = page.renderDom();

    expect(element.querySelector('.yoya-vinput').name).toBe('serviceName');
    expect(element.querySelector('.yoya-vinput').placeholder).toBe('服务名');
    expect(element.querySelector('.yoya-vinput').value).toBe('api-gateway');
    expect(element.querySelector('.yoya-vselect').value).toBe('运行中');
    expect(element.querySelector('.yoya-vselect option[selected]').textContent).toBe('运行中');
    expect(element.querySelector('.yoya-vtextarea').value).toBe('初始说明');
    expect(element.querySelector('.yoya-vtextarea').readOnly).toBe(true);

    input.value('worker');
    textarea.value('更新说明');

    expect(input.value()).toBe('worker');
    expect(textarea.value()).toBe('更新说明');
  });

  it('shows clear controls and clears input, select, textarea and timer values', () => {
    const input = vInput({
      name: 'serviceName',
      value: 'api-gateway'
    });
    const select = vSelect({
      name: 'status',
      options: ['运行中', '停止'],
      value: '运行中'
    });
    const textarea = vTextarea({
      name: 'notes',
      value: '初始说明'
    });
    const timer = vTimer({
      mode: 'date',
      name: 'scheduledAt',
      value: '2026-08-19'
    });
    const changed = vi.fn();
    input.on('change', changed);

    const page = div((root) => {
      root.child(input, select, textarea, timer);
    });
    const element = page.renderDom();
    const clearButtons = element.querySelectorAll('.yoya-control-clear');

    expect(clearButtons).toHaveLength(4);
    clearButtons.forEach((button) => {
      expect(button.style.display).not.toBe('none');
    });

    const inputClear = element.querySelector('.yoya-vinput-clear');
    inputClear.click();

    expect(input.value()).toBe('');
    expect(inputClear.style.display).toBe('none');
    expect(changed).toHaveBeenCalledTimes(1);

    element.querySelector('.yoya-vselect-clear').click();
    element.querySelector('.yoya-vtextarea-clear').click();
    element.querySelector('.yoya-vtimer-clear').click();

    expect(select.value()).toBe('');
    expect(textarea.value()).toBe('');
    expect(timer.value()).toBe('');
  });

  it('hides clear controls when disabled or configured off', () => {
    const disabled = vInput({ value: 'api-gateway' }).disabled(true);
    const fixed = vInput({ value: 'api-gateway', clearable: false });
    const readonly = vInput({ value: 'api-gateway' }).readonly(true);

    const page = div((root) => {
      root.child(disabled, fixed, readonly);
    });
    const element = page.renderDom();
    const clearButtons = element.querySelectorAll('.yoya-vinput-clear');

    expect(clearButtons).toHaveLength(3);
    clearButtons.forEach((button) => {
      expect(button.style.display).toBe('none');
    });
  });

  it('creates vTimer with supported date and time modes and live values', () => {
    const timer = vTimer({
      mode: 'datetime-local',
      name: 'scheduledAt',
      value: '2026-08-19T14:30'
    });
    const element = timer.renderDom().querySelector('.yoya-vtimer');

    expect(timer).toBeInstanceOf(VTimer);
    expect(timer).toBeInstanceOf(HtmlElementNode);
    expect(element.classList.contains('yoya-vtimer')).toBe(true);
    expect(element.type).toBe('datetime-local');
    expect(element.name).toBe('scheduledAt');
    expect(timer.value()).toBe('2026-08-19T14:30');

    element.value = '2026-08-20T09:15';
    expect(timer.value()).toBe('2026-08-20T09:15');

    timer.mode('time').value('18:45');
    expect(element.type).toBe('time');
    expect(element.value).toBe('18:45');

    timer.mode('unsupported');
    expect(element.type).toBe('date');
  });

  it('applies vTimer availability states and existing change events', () => {
    const changed = vi.fn();
    const timer = vTimer((control) => {
      control.mode('date');
      control.value('2026-08-19');
      control.disabled(true);
      control.readonly(true);
      control.required(true);
      control.on('change', changed);
    });
    const element = timer.renderDom().querySelector('.yoya-vtimer');

    expect(element.disabled).toBe(true);
    expect(element.readOnly).toBe(true);
    expect(element.required).toBe(true);

    element.dispatchEvent(new Event('change', { bubbles: true }));
    expect(changed).toHaveBeenCalledTimes(1);

    timer.disabled(false).readonly(false).required(false);
    expect(element.disabled).toBe(false);
    expect(element.readOnly).toBe(false);
    expect(element.required).toBe(false);
  });

  it('registers vTimer as a v-prefixed parent shortcut', () => {
    const page = div((root) => {
      root.vTimer({ mode: 'time', value: '08:30' });
    });
    const element = page.renderDom();

    expect(element.querySelector('.yoya-vtimer').type).toBe('time');
    expect(element.querySelector('.yoya-vtimer').value).toBe('08:30');
  });

  it('reads and writes vTimerRange start, end and unified values', () => {
    const range = vTimerRange({
      end: '2026-08-21',
      mode: 'date',
      name: 'deployment',
      start: '2026-08-19'
    });
    const element = range.renderDom();
    const controls = element.querySelectorAll('.yoya-vtimer');

    expect(range).toBeInstanceOf(VTimerRange);
    expect(controls).toHaveLength(2);
    expect(controls[0].type).toBe('date');
    expect(controls[0].name).toBe('deploymentStart');
    expect(controls[0].getAttribute('aria-label')).toBe('开始值');
    expect(controls[1].name).toBe('deploymentEnd');
    expect(controls[1].getAttribute('aria-label')).toBe('结束值');
    expect(range.start()).toBe('2026-08-19');
    expect(range.end()).toBe('2026-08-21');
    expect(range.value()).toEqual({ start: '2026-08-19', end: '2026-08-21' });

    range.value({ start: '2026-08-20', end: '2026-08-22' });
    expect(range.value()).toEqual({ start: '2026-08-20', end: '2026-08-22' });

    range.value(['2026-08-23', '2026-08-24']);
    expect(range.start()).toBe('2026-08-23');
    expect(range.end()).toBe('2026-08-24');
  });

  it('registers vTimerRange as a v-prefixed parent shortcut', () => {
    const page = div((root) => {
      root.vTimerRange({ mode: 'time', value: ['08:30', '17:30'] });
    });
    const element = page.renderDom();
    const range = element.querySelector('.yoya-vtimer-range');

    expect(range).not.toBeNull();
    expect(range.querySelectorAll('input')).toHaveLength(2);
    expect(range.querySelectorAll('input')[0].type).toBe('time');
    expect(range.querySelectorAll('input')[1].value).toBe('17:30');
  });

  it('reports an end value earlier than the start value', () => {
    const range = vTimerRange({ value: ['2026-08-21', '2026-08-19'] });
    const element = range.renderDom();

    expect(element.dataset.error).toBe('true');
    expect(element.dataset.invalid).toBe('true');
    expect(element.getAttribute('aria-invalid')).toBe('true');
    const errorMessage = element.querySelector('.yoya-vtimer-range-error');
    const controls = element.querySelectorAll('input');
    expect(errorMessage.id).not.toBe('');
    expect(errorMessage.textContent).toBe('结束值不能早于开始值');
    controls.forEach((control) => {
      expect(control.getAttribute('aria-invalid')).toBe('true');
      expect(control.getAttribute('aria-describedby')).toBe(errorMessage.id);
    });

    range.end('2026-08-22');
    expect(element.dataset.error).toBeUndefined();
    expect(element.dataset.invalid).toBeUndefined();
    expect(element.getAttribute('aria-invalid')).toBeNull();
    expect(errorMessage.textContent).toBe('');
    controls.forEach((control) => {
      expect(control.getAttribute('aria-invalid')).toBeNull();
      expect(control.getAttribute('aria-describedby')).toBe(errorMessage.id);
    });
  });

  it('emits one unified change event when either range control changes', () => {
    const changed = vi.fn();
    const range = vTimerRange({ value: ['2026-08-19', '2026-08-21'] }).on('change', changed);
    const element = range.renderDom();
    const endControl = element.querySelector('.yoya-vtimer-range-end');

    endControl.value = '2026-08-22';
    endControl.dispatchEvent(new Event('change', { bubbles: true }));

    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed.mock.calls[0][0].detail).toEqual({
      start: '2026-08-19',
      end: '2026-08-22'
    });
    expect(range.value()).toEqual({ start: '2026-08-19', end: '2026-08-22' });
  });

  it('propagates vTimerRange availability states to both controls', () => {
    const range = vTimerRange({ disabled: true, readonly: true, required: true });
    const controls = range.renderDom().querySelectorAll('input');

    controls.forEach((control) => {
      expect(control.disabled).toBe(true);
      expect(control.readOnly).toBe(true);
      expect(control.required).toBe(true);
    });

    range.disabled(false).readonly(false).required(false);
    controls.forEach((control) => {
      expect(control.disabled).toBe(false);
      expect(control.readOnly).toBe(false);
      expect(control.required).toBe(false);
    });
  });

  it('renders checkbox, switch and checkbox group states', () => {
    const checkbox = vCheckbox({
      checked: true,
      label: '启用服务',
      name: 'enabled'
    });
    const sw = vSwitch({
      checked: false,
      label: '自动部署',
      name: 'autoDeploy'
    });
    const group = vCheckboxes({
      name: 'regions',
      options: [
        { checked: true, label: '上海', value: 'sh' },
        { label: '杭州', value: 'hz' }
      ]
    });
    const page = div((root) => {
      root.child(checkbox, sw, group);
    });

    const element = page.renderDom();

    expect(element.querySelector('.yoya-vcheckbox').dataset.checked).toBe('true');
    expect(element.querySelector('.yoya-vswitch').dataset.checked).toBeUndefined();
    expect(group.value()).toEqual(['sh']);

    group.value(['hz']);

    expect(group.value()).toEqual(['hz']);
  });

  it('switches field modes and keeps control values in sync', () => {
    const field = vField((item) => {
      item.label('服务名');
      item.display('api-gateway');
      item.editor((editor) => {
        editor.vInput({
          name: 'serviceName',
          value: 'api-gateway'
        });
      });
    }).mode('edit');

    const element = field.renderDom();

    expect(element.dataset.mode).toBe('edit');
    expect(element.querySelector('.yoya-vfield-display').style.display).toBe('none');
    expect(element.querySelector('.yoya-vfield-editor').style.display).toBe('');

    field.value('worker');

    expect(element.querySelector('.yoya-vinput').value).toBe('worker');

    field.mode('view');

    expect(element.dataset.mode).toBe('view');
    expect(element.querySelector('.yoya-vfield-display').textContent).toBe('worker');
  });

  it('reveals an edit button on hover and enters edit mode when clicked', () => {
    const field = vField((item) => {
      item.label('负责人');
      item.display('SRE Team');
      item.editor((editor) => {
        editor.vInput({
          name: 'owner',
          value: 'SRE Team'
        });
      });
    });

    const element = field.renderDom();
    const action = element.querySelector('.yoya-vfield-action');

    expect(action).not.toBeNull();
    expect(action.parentElement.classList.contains('yoya-vfield-header')).toBe(true);
    expect(action.previousElementSibling.classList.contains('yoya-vfield-label')).toBe(true);
    expect(action.textContent).toBe('✎');
    expect(action.getAttribute('aria-label')).toBe('编辑');
    expect(action.style.opacity).toBe('0');

    element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));

    expect(action.style.opacity).toBe('1');

    action.click();

    expect(element.dataset.mode).toBe('edit');
    expect(action.textContent).toBe('✓');
    expect(action.getAttribute('aria-label')).toBe('完成');
    expect(element.querySelector('.yoya-vfield-editor').style.display).toBe('');
    expect(element.querySelector('.yoya-vinput').value).toBe('SRE Team');
  });

  it('collects and applies values through vForm', () => {
    const form = vForm((root) => {
      root.vField((field) => {
        field.label('服务名');
        field.control((editor) => {
          editor.vInput({
            name: 'serviceName',
            required: true,
            value: 'api-gateway'
          });
        });
      });
      root.vField((field) => {
        field.label('状态');
        field.control((editor) => {
          editor.vSelect({
            name: 'status',
            options: ['运行中', '停止'],
            value: '运行中'
          });
        });
      });
      root.vField((field) => {
        field.label('开关');
        field.control((editor) => {
          editor.vSwitch({
            checked: true,
            name: 'enabled'
          });
        });
      });
      root.vField((field) => {
        field.label('区域');
        field.control((editor) => {
          editor.vCheckboxes({
            name: 'regions',
            options: [
              { checked: true, label: '上海', value: 'sh' },
              { label: '杭州', value: 'hz' }
            ]
          });
        });
      });
    });

    const element = form.renderDom();

    expect(form.values()).toEqual({
      enabled: true,
      regions: ['sh'],
      serviceName: 'api-gateway',
      status: '运行中'
    });
    expect(form.validate()).toBe(true);

    form.values({
      enabled: false,
      regions: ['hz'],
      serviceName: 'worker',
      status: '停止'
    });

    expect(form.values()).toEqual({
      enabled: false,
      regions: ['hz'],
      serviceName: 'worker',
      status: '停止'
    });
    expect(element.querySelector('.yoya-vinput').value).toBe('worker');
    expect(element.querySelector('.yoya-vselect').value).toBe('停止');

    form.values({
      enabled: false,
      regions: [],
      serviceName: '',
      status: '停止'
    });

    expect(form.validate()).toBe(false);
  });

  it('validates vFormItem with required rules and custom callbacks', () => {
    const form = vForm((root) => {
      root.vFormItem((item) => {
        item
          .name('projectName')
          .label('项目名称')
          .hint('请输入项目名称')
          .required('项目名称不能为空');
        item.control((editor) => editor.vInput({ name: 'projectName' }));
      });
      root.vFormItem((item) => {
        item.name('role').label('负责人角色').hint('请选择负责人角色').required('请选择负责人角色');
        item.validate((value) => (value === '运维' ? null : '运维角色必须选择'));
        item.control((editor) =>
          editor.vSelect({
            clearable: false,
            name: 'role',
            options: ['开发', '运维']
          })
        );
      });
    });
    const element = form.renderDom();

    expect(form.validate()).toBe(false);
    expect(element.querySelectorAll('.yoya-vform-item[data-error="true"]')).toHaveLength(2);
    expect(element.textContent).toContain('项目名称不能为空');
    expect(element.textContent).toContain('运维角色必须选择');
    element.querySelectorAll('.yoya-vform-item-hint').forEach((hint) => {
      expect(hint.style.display).toBe('none');
    });

    form.values({ projectName: '网关', role: '运维' });
    expect(form.validate()).toBe(true);
    expect(element.querySelectorAll('.yoya-vform-item[data-error="true"]')).toHaveLength(0);
    element.querySelectorAll('.yoya-vform-item-hint').forEach((hint) => {
      expect(hint.style.display).not.toBe('none');
    });
  });

  it('uses collectValue callbacks for custom editor values', () => {
    const form = vForm((root) => {
      root.vFormItem((item) => {
        item.name('custom').label('自定义值');
        item.control((editor) => {
          const custom = div().text('自定义组件');
          custom.value = () => 'custom-result';
          editor.collectValue(() => custom.value());
          editor.child(custom);
        });
      });
      root.vFormItem((item) => {
        item.name('standard').label('标准值');
        item.control((editor) => editor.vInput({ name: 'standard', value: 'api-gateway' }));
      });
    });

    form.renderDom();

    expect(form.values()).toEqual({
      custom: 'custom-result',
      standard: 'api-gateway'
    });
  });

  it('shows a required indicator only when configured', () => {
    const form = vForm((root) => {
      root.vFormItem((item) => {
        item.name('plain').label('普通必填').required('不能为空');
      });
      root.vFormItem((item) => {
        item.name('star').label('星号必填').required({ message: '不能为空', indicator: '*' });
      });
      root.vFormItem((item) => {
        item
          .name('node')
          .label('节点必填')
          .required({ message: '不能为空', indicator: div((node) => node.text('必填')) });
      });
    });
    const element = form.renderDom();
    const indicators = element.querySelectorAll('.yoya-vform-item-required-indicator');

    expect(indicators[0].style.display).toBe('none');
    expect(indicators[1].style.display).not.toBe('none');
    expect(indicators[1].textContent).toBe('*');
    expect(indicators[2].style.display).not.toBe('none');
    expect(indicators[2].textContent).toBe('必填');
  });
});
