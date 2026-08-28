import { describe, expect, it } from 'vitest';
import { div, vBody, VThemeShell, vThemeShell } from '../index.js';

describe('VThemeShell', () => {
  it('applies themed container defaults', () => {
    const element = vThemeShell().renderDom();

    expect(element.classList.contains('yoya-vtheme-shell')).toBe(true);
    expect(element.style.background).toBe('var(--yoya-color-surface, #ffffff)');
    expect(element.style.border).toBe('1px solid var(--yoya-color-border, #d8dee8)');
    expect(element.style.borderRadius).toBe('var(--yoya-radius-md, 6px)');
    expect(element.style.boxSizing).toBe('border-box');
    expect(element.style.overflow).toBe('');
  });

  it('supports per-instance overrides', () => {
    const element = vThemeShell()
      .background('#f5f5f5')
      .radius('12px')
      .border('2px dashed #d8dee8')
      .renderDom();

    expect(element.style.background).toBe('rgb(245, 245, 245)');
    expect(element.style.borderRadius).toBe('12px');
    expect(element.style.border).toContain('2px dashed');
  });

  it('toggles scrollable mode', () => {
    const shell = vThemeShell();
    expect(shell.renderDom().style.overflow).toBe('');

    shell.scrollable();
    expect(shell.renderDom().style.overflow).toBe('auto');

    shell.scrollable(false);
    expect(shell.renderDom().style.overflow).toBe('visible');
  });

  it('supports background opacity through color-mix', () => {
    const element = vThemeShell().backgroundOpacity(0.5).renderDom();

    expect(element.style.background).toContain('color-mix');
    expect(element.style.background).toContain('50%');
  });

  it('supports children and the parent shortcut', () => {
    const root = div((page) => page.vThemeShell('Inside'));
    const child = root.children()[0];

    expect(child).toBeInstanceOf(VThemeShell);
    expect(root.renderDom().textContent).toBe('Inside');

    const direct = vThemeShell((shell) => {
      shell.className('custom');
      shell.p('Text');
    });
    expect(direct.renderDom().innerHTML).toContain('<p>Text</p>');
  });
});

describe('VThemeShell virtual mode', () => {
  it('acts as the shell of its single child without its own DOM node', () => {
    const body = vBody('内容');
    const shell = vThemeShell(body).virtual();

    const element = shell.renderDom();

    expect(element).toBe(body.renderDom());
    expect(element.classList.contains('yoya-vbody')).toBe(true);
    expect(element.style.background).toBe('var(--yoya-color-surface, #ffffff)');
    expect(element.style.border).toBe('1px solid var(--yoya-color-border, #d8dee8)');
    expect(element.style.borderRadius).toBe('var(--yoya-radius-md, 6px)');
  });

  it('keeps per-instance shell overrides applied to the child node', () => {
    const body = vBody('内容');
    const shell = vThemeShell(body).virtual().background('#f5f5f5').radius('12px').scrollable();

    const element = shell.renderDom();

    expect(element.style.background).toBe('rgb(245, 245, 245)');
    expect(element.style.borderRadius).toBe('12px');
    expect(element.style.overflow).toBe('auto');
  });

  it('serializes through the child node in virtual mode', () => {
    const body = vBody('内容');
    const shell = vThemeShell(body).virtual();

    expect(shell.toHTML()).toBe(body.toHTML());
  });

  it('requires exactly one child in virtual mode when rendering', () => {
    expect(() => vThemeShell().virtual().renderDom()).toThrow(/exactly one child/i);
    expect(() =>
      vThemeShell((shell) => {
        shell.virtual();
        shell.child(div('a'));
        shell.child(div('b'));
      }).renderDom()
    ).toThrow(/exactly one child/i);
  });

  it('supports the declarative setup style for virtual mode', () => {
    const shell = vThemeShell((s) => {
      s.virtual();
      s.child(vBody('内容'));
    });

    const element = shell.renderDom();

    expect(element.classList.contains('yoya-vbody')).toBe(true);
    expect(element.style.background).toBe('var(--yoya-color-surface, #ffffff)');
    expect(element.style.borderRadius).toBe('var(--yoya-radius-md, 6px)');
  });

  it('renders its own node again when virtual is disabled', () => {
    const body = vBody('内容');
    const shell = vThemeShell(body);
    shell.virtual();
    shell.virtual(false);

    const element = shell.renderDom();

    expect(element).not.toBe(body.renderDom());
    expect(element.classList.contains('yoya-vtheme-shell')).toBe(true);
  });
});
