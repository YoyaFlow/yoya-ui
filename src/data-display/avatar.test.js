import { describe, expect, it } from 'vitest';
import { div, hasComponentIdentity, ref, vAvatar } from '../index.js';

describe('vAvatar', () => {
  it('renders text avatars with identity and data hooks', () => {
    const avatar = vAvatar('A');
    const element = avatar.renderDom();

    // 身份 = `vn` 属性 + 对象事实（类名已退场）
    expect(hasComponentIdentity(avatar, 'VAvatar')).toBe(true);
    expect(element.getAttribute('vn')).toBe('VAvatar');
    expect(element.dataset.shape).toBe('circle');
    expect(element.dataset.size).toBe('medium');
    expect(element.querySelector('[vn~="VAvatarContent"]').textContent).toBe('A');
    expect(element.getAttribute('aria-label')).toBe('A');
  });

  it('supports image, alt, size, shape, status, and custom color', () => {
    const avatar = vAvatar({
      alt: 'Alice',
      color: '#0f766e',
      shape: 'square',
      size: 'large',
      src: '/alice.png',
      status: 'online'
    });
    const element = avatar.renderDom();
    const image = element.querySelector('[vn~="VAvatarImage"]');

    expect(element.dataset.image).toBe('true');
    expect(image.getAttribute('src')).toBe('/alice.png');
    expect(image.getAttribute('alt')).toBe('Alice');
    expect(element.dataset.shape).toBe('square');
    expect(element.dataset.size).toBe('large');
    expect(element.dataset.status).toBe('online');
    // 自定义颜色是状态：JS 只注变量，背景 / 反色文字是 CSS 规则
    expect(element.dataset.color).toBe('#0f766e');
    expect(element.style.getPropertyValue('--yoya-avatar-color')).toBe('#0f766e');
    expect(element.querySelector('[vn~="VAvatarStatus"]')).not.toBeNull();
  });

  it('updates icon, size, shape, status, and text through public methods', () => {
    const avatar = vAvatar({ icon: '★' });
    const element = avatar.renderDom();
    const content = element.querySelector('[vn~="VAvatarContent"]');

    expect(content.textContent).toBe('★');

    avatar.size('xlarge').shape('square').status('busy').text('B');

    expect(element.dataset.size).toBe('xlarge');
    expect(element.dataset.shape).toBe('square');
    expect(element.dataset.status).toBe('busy');
    expect(content.textContent).toBe('B');
    expect(element.getAttribute('aria-label')).toBe('B');
  });

  it('keeps the image / text side in step with the last write', () => {
    const avatar = vAvatar({ text: 'A' });
    const element = avatar.renderDom();
    const content = element.querySelector('[vn~="VAvatarContent"]');

    avatar.src('/alice.png');

    expect(element.dataset.image).toBe('true');

    // 内容命令切回文字态（迁移前 `text()` 会清掉 data-image）
    avatar.text('B');

    expect(element.dataset.image).toBeUndefined();
    expect(content.textContent).toBe('B');

    avatar.src('');

    expect(element.querySelector('[vn~="VAvatarImage"]').getAttribute('src')).toBeNull();
  });

  it('rejects node content in the content commands', () => {
    const avatar = vAvatar({ text: 'A' });
    avatar.renderDom();

    expect(() => avatar.text(div('节点'))).toThrow(/只收文本/);
  });

  it('registers vAvatar as a parent shortcut', () => {
    const page = div((root) => {
      root.vAvatar('C');
    });
    const avatar = page.children()[0];

    expect(hasComponentIdentity(avatar, 'VAvatar')).toBe(true);
    expect(page.renderDom().querySelector('[vn~="VAvatarContent"]').textContent).toBe('C');
  });

  it('supports shared element options and final callbacks', () => {
    let callbackNode = null;
    const avatar = vAvatar(null, { attrs: { id: 'avatar-demo' } }, (node) => {
      callbackNode = node;
      node.status('away');
    });
    const element = avatar.renderDom();

    expect(callbackNode).toBe(avatar);
    expect(element.id).toBe('avatar-demo');
    expect(element.dataset.status).toBe('away');
  });

  it('merges the props style channel with its own variables', () => {
    const avatar = vAvatar({
      color: '#0f766e',
      src: '/gateway.png',
      style: { maxWidth: '48px' },
      text: '网关'
    });
    const element = avatar.renderDom();

    expect(element.style.maxWidth).toBe('48px');
    expect(element.style.getPropertyValue('--yoya-avatar-color')).toBe('#0f766e');
  });

  it('takes handles as props：给句柄就是活值，不用命令', () => {
    const text = ref('A');
    const size = ref('small');
    const status = ref('online');
    const avatar = vAvatar({ size, status, text });
    const element = avatar.renderDom();

    expect(element.querySelector('[vn~="VAvatarContent"]').textContent).toBe('A');
    expect(element.dataset.size).toBe('small');

    text.value = 'B';
    size.value = 'large';
    status.value = 'busy';

    expect(element.querySelector('[vn~="VAvatarContent"]').textContent).toBe('B');
    // 归一化的 props（尺寸白名单）也要保活：句柄不能被构建期的 includes() 吃掉
    expect(element.dataset.size).toBe('large');
    expect(element.dataset.status).toBe('busy');
    expect(element.getAttribute('aria-label')).toBe('B');
  });
});
