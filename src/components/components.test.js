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
});
