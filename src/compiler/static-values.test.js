/**
 * 构建期静态值折叠：同模块字面量常量、库内常量与主题助手在构建期算成字面量。
 *
 * 两条底线：折出来的值与运行期**同一份实现**一致（逐字节对账，不抄公式）；认不出的形状
 * 一律不折——同名局部函数、被参数遮蔽的导入名都照旧走 bail。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as core from '../yoya.core.js';
import { div } from '../html/index.js';
import { componentClass, themeBorder, themeValue } from '../components/shared.js';
import { ThemeTag } from './fixtures/theme-tag.js';
import { compileComponent, compileSource } from './index.js';

const fixtureFile = 'src/compiler/fixtures/theme-tag.js';
const fixtureSource = readFileSync(join(import.meta.dirname, 'fixtures/theme-tag.js'), 'utf8');
const helpers =
  "import { componentClass, themeBorder, themeValue } from '../../components/shared.js';\n";

const compileRow = (body, extra = '') =>
  compileSource({
    source: `import { div } from '../../yoya.core.js';\n${extra}export function Item(item) {\n  return ${body};\n}\n`,
    file: 'item-fixture.js',
    fn: 'Item',
    core
  });

describe('build-time static values', () => {
  it('folds module constants and theme helpers into the fragment', () => {
    const result = compileRow(
      'div((node) => {\n' +
        '    node.className(CARD_CLASS);\n' +
        "    node.style('background', themeValue('color-surface', '#ffffff'));\n" +
        "    node.style('border', themeBorder('color-border', '#d8dee8'));\n" +
        '    node.attr("data-tone", row.tone);\n' +
        '  })',
      `const CARD_CLASS = \`\${componentClass} yoya-card\`;\n${helpers}`
    );

    expect(result.bails).toEqual([]);
    expect(result.compiled).toBe(true);

    const generic = div((node) => {
      node.className(`${componentClass} yoya-card`);
      node.style('background', themeValue('color-surface', '#ffffff'));
      node.style('border', themeBorder('color-border', '#d8dee8'));
      node.attr('data-tone', '');
    });
    expect(result.plan.html).toBe(generic.toHTML());
    expect(result.plan.html).toContain('class="yoya-component yoya-card"');
    expect(result.plan.html).toContain('var(--yoya-color-surface, #ffffff)');
  });

  it('folds them inside a component unit too', () => {
    const result = compileComponent({
      source: fixtureSource,
      file: fixtureFile,
      export: 'ThemeTag',
      core
    });

    expect(result.bails).toEqual([]);
    expect(result.compiled).toBe(true);
    // 折出来的值 = 运行期同一份实现（空属性值也对得上）；只有文本位置换成**注释锚点**（票 13）
    const genericHtml = ThemeTag({ tone: '', label: 0 }).toHTML();
    expect(result.plan.html).toBe(genericHtml.replace('>0<', '><!----><'));
    // 库内私有标识符（TAG_CLASS / themeValue）折没了，scope 里不会夹带模块私有名
    expect(result.scope).toEqual([]);
  });

  it('does not fold a local function that shares the helper name', () => {
    const result = compileRow(
      "div((node) => node.style('background', themeValue('a', 'b')))",
      'function themeValue(token, fallback) {\n  return token + fallback;\n}\n'
    );

    expect(result.compiled).toBe(false);
    expect(result.bails.map((bail) => bail.reason).join(' | ')).toContain('动态样式');
  });

  // 形参名遮蔽导入的助手 → 不折（只认从已知模块导入、且未被遮蔽的名字）。
  it('does not fold when the parameter shadows the imported helper', () => {
    const result = compileSource({
      source:
        "import { div } from '../../yoya.core.js';\n" +
        helpers +
        'export function Item(themeValue) {\n' +
        "  return div((node) => node.style('background', themeValue('a', 'b')));\n" +
        '}\n',
      file: 'item-fixture.js',
      fn: 'Item',
      core
    });

    expect(result.compiled).toBe(false);
    expect(result.bails.map((bail) => bail.reason).join(' | ')).toContain('动态样式');
  });
});
