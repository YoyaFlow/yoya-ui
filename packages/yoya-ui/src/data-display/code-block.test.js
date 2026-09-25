import { describe, expect, it } from 'vitest';
import { CodeBlock, codeBlock, div, hasComponentIdentity } from '../index.js';

describe('CodeBlock', () => {
  it('wraps VCode with a stable hook and preserves language/content/copy behavior', async () => {
    const block = codeBlock({
      content: 'SELECT * FROM services;',
      copyLabel: '复制 SQL',
      language: 'sql'
    });
    const element = block.renderDom();

    // 身份 = 多值 `vn`（`CodeBlock` 与 `VCode` 任一名命中）
    expect(hasComponentIdentity(block, 'CodeBlock')).toBe(true);
    expect(hasComponentIdentity(block, 'VCode')).toBe(true);
    expect(element.getAttribute('vn')).toBe('CodeBlock VCode');
    expect(element.dataset.language).toBe('sql');
    expect(element.querySelector('[vn~="VCodeContent"]').textContent).toBe(
      'SELECT * FROM services;'
    );
    expect(element.querySelector('[vn~="VCodeCopy"]').textContent).toBe('复制 SQL');

    block.content('SELECT id FROM services;');
    expect(block.renderDom().querySelector('[vn~="VCodeContent"]').textContent).toBe(
      'SELECT id FROM services;'
    );
    expect(await block.copy()).toBe('SELECT id FROM services;');
  });

  it('supports the parent codeBlock shortcut and direct CodeBlock construction', () => {
    const direct = new CodeBlock({ content: 'const ready = true;', language: 'js' });
    const root = div((page) => page.codeBlock({ content: 'console.log(ready);', language: 'js' }));

    expect(direct.toHTML()).toContain('vn="CodeBlock VCode"');
    expect(hasComponentIdentity(root.children()[0], 'CodeBlock')).toBe(true);
    expect(root.children()[0].language()).toBe('js');
  });
});
