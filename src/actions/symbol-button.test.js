import { afterEach, describe, expect, it, vi } from 'vitest';
import { div, vSymbolButton } from '../index.js';
import { SearchOutlined } from '../svg/icons.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('vSymbolButton', () => {
  it('renders a borderless, outline-free button with symbol content', () => {
    const button = vSymbolButton((entry) => {
      entry.icon(SearchOutlined());
      entry.ariaLabel('搜索');
    });
    const element = button.renderDom();

    expect(element.tagName).toBe('BUTTON');
    expect(element.className).toContain('yoya-vsymbol-button');
    expect(element.getAttribute('type')).toBe('button');
    expect(element.style.border).toBe('0px');
    expect(element.style.outline).toBe('none');
    expect(element.style.boxShadow).toBe('none');
    expect(element.style.background).toBe('transparent');
    expect(element.querySelector('svg')).not.toBeNull();
    expect(element.getAttribute('aria-label')).toBe('搜索');
  });

  it('supports object config, icon updates and click events', () => {
    const onClick = vi.fn();
    const button = vSymbolButton({
      ariaLabel: '复制',
      icon: SearchOutlined(),
      title: '复制'
    });
    button.on('click', onClick);

    const element = button.renderDom();
    document.body.appendChild(element);

    expect(element.getAttribute('aria-label')).toBe('复制');
    expect(element.getAttribute('title')).toBe('复制');
    expect(element.querySelector('svg')).not.toBeNull();

    element.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('registers as a parent shortcut', () => {
    const root = div((page) => {
      page.vSymbolButton((entry) => {
        entry.ariaLabel('符号按钮');
      });
    });
    const element = root.renderDom();

    expect(element.querySelector('.yoya-vsymbol-button')).not.toBeNull();
  });
});
