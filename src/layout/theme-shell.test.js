import { describe, expect, it } from 'vitest';
import { div, hasComponentIdentity, vBody, vThemeShell } from '../index.js';

describe('VThemeShell', () => {
  it('applies themed container defaults', () => {
    const element = vThemeShell().renderDom();

    expect(element.getAttribute('vn')).toContain('VThemeShell');
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

  it('writes background opacity as data for the skin to compose', () => {
    const element = vThemeShell().backgroundOpacity(0.5).renderDom();

    // 命令只写数据（基色 + 百分比），合成由预设皮肤算（规则由 css-contract 守）。
    expect(element.style.getPropertyValue('--yoya-shell-bg')).toBe(
      'var(--yoya-color-surface, #ffffff)'
    );
    expect(element.style.getPropertyValue('--yoya-shell-alpha')).toBe('50%');
    expect(element.style.background).toBe(
      'var(--yoya-shell-composed, var(--yoya-color-surface, #ffffff))'
    );
  });

  it('keeps the configured base color and drops opacity when the base is reset', () => {
    const shell = vThemeShell().background('#f5f5f5').backgroundOpacity(0.25);
    const element = shell.renderDom();

    expect(element.style.getPropertyValue('--yoya-shell-bg')).toBe('#f5f5f5');
    expect(element.style.getPropertyValue('--yoya-shell-alpha')).toBe('25%');
    expect(element.style.background).toBe('var(--yoya-shell-composed, #f5f5f5)');

    // 重新设基色 = 之前的透明度数据作废，背景回到实色。
    const reset = shell.background('#00f').renderDom();

    expect(reset.style.background).toBe('rgb(0, 0, 255)');
    expect(reset.style.getPropertyValue('--yoya-shell-alpha')).toBe('');
  });

  it('does not read its own composed expression as the base on repeated calls', () => {
    const element = vThemeShell().backgroundOpacity(0.5).backgroundOpacity(0.8).renderDom();

    // 第二次调用若把上次的 var() 表达式当基色，会自引用成环。
    expect(element.style.getPropertyValue('--yoya-shell-bg')).toBe(
      'var(--yoya-color-surface, #ffffff)'
    );
    expect(element.style.getPropertyValue('--yoya-shell-alpha')).toBe('80%');
  });

  it('supports children and the parent shortcut', () => {
    const root = div((page) => page.vThemeShell('Inside'));
    const child = root.children()[0];

    expect(hasComponentIdentity(child, 'VThemeShell')).toBe(true);
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
    expect(element.getAttribute('vn')).toBe('VBody');
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

  it('composes opacity inline when the target has no VThemeShell identity', () => {
    const body = vBody('内容');
    const shell = vThemeShell(body).virtual().backgroundOpacity(0.5);

    // 虚拟模式把样式投影到别的身份上，皮肤的组合规则命中不了目标节点，所以这条路径
    // 仍在 JS 侧组合——与改动前逐字节一致（含它在低基线浏览器里的退化）。
    expect(shell.renderDom().style.background).toBe(
      'color-mix(in srgb, var(--yoya-color-surface, #ffffff) 50%, transparent)'
    );
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

    expect(element.getAttribute('vn')).toBe('VBody');
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
    expect(element.getAttribute('vn')).toContain('VThemeShell');
  });
});
