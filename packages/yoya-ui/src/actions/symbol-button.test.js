import { afterEach, describe, expect, it, vi } from 'vitest';
import { div, vSymbolButton } from '../index.js';
import { SearchOutlined } from '@yoyaflow/yoya-core/internal/svg/icons.js';

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
    expect(element.getAttribute('vn')).toBe('VSymbolButton');
    expect(element.getAttribute('type')).toBe('button');
    // 静态样式（无边框 / 透明底 / hover 底色）在 yoya.ui.css，由 css-contract 守
    expect(element.style.border).toBe('');
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

    expect(element.querySelector('[vn~="VSymbolButton"]')).not.toBeNull();
  });
});
