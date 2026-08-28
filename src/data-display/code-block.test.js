import { describe, expect, it } from 'vitest';
import { CodeBlock, codeBlock, div } from '../index.js';

describe('CodeBlock', () => {
  it('wraps VCode with a stable hook and preserves language/content/copy behavior', async () => {
    const block = codeBlock({
      content: 'SELECT * FROM services;',
      copyLabel: '复制 SQL',
      language: 'sql'
    });
    const element = block.renderDom();

    expect(block).toBeInstanceOf(CodeBlock);
    expect(element.classList.contains('yoya-vcode-block')).toBe(true);
    expect(element.dataset.language).toBe('sql');
    expect(element.querySelector('.yoya-vcode-content').textContent).toBe(
      'SELECT * FROM services;'
    );
    expect(element.querySelector('.yoya-vcode-copy').textContent).toBe('复制 SQL');

    block.content('SELECT id FROM services;');
    expect(block.renderDom().querySelector('.yoya-vcode-content').textContent).toBe(
      'SELECT id FROM services;'
    );
    expect(await block.copy()).toBe('SELECT id FROM services;');
  });

  it('supports the parent codeBlock shortcut and direct CodeBlock construction', () => {
    const direct = new CodeBlock({ content: 'const ready = true;', language: 'js' });
    const root = div((page) => page.codeBlock({ content: 'console.log(ready);', language: 'js' }));

    expect(direct.toHTML()).toContain('yoya-vcode-block');
    expect(root.children()[0]).toBeInstanceOf(CodeBlock);
    expect(root.children()[0].language()).toBe('js');
  });
});
