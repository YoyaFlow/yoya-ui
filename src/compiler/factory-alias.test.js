// 别名导入（`import { div as box }`）与别名包装（`import { vNode as wrapComponent }`）：
// 编译器按"绑定来源 + 导出名"认核心契约，本地拼写不影响能不能编，也不影响产物标签。
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '../yoya.core.js';
import { compileSource } from './index.js';
import { componentUnits, wireComponentModule } from './plugin.js';
import * as dsl from './fixtures/factory-alias.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-factory-alias-'));
const runtimeUrl = pathToFileURL(join(process.cwd(), 'src/compiler/runtime.js')).href;
const coreUrl = pathToFileURL(join(process.cwd(), 'src/yoya.core.js')).href;
const source = readFileSync(join(import.meta.dirname, 'fixtures/factory-alias.js'), 'utf8');

afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const compile = async (fn, mode) => {
  const result = compileSource({
    source,
    file: 'factory-alias.js',
    fn,
    mode,
    core,
    runtime: runtimeUrl,
    coreSpecifier: coreUrl
  });
  if (!result.compiled) {
    return { compiled: false, bails: result.bails };
  }
  const file = join(workDir, `${fn}.${mode}.js`);
  writeFileSync(file, result.module, 'utf8');
  return { compiled: true, generated: await import(pathToFileURL(file).href), plan: result.plan };
};

/** 属性顺序无关的签名（元素通道按对象键序写、通用路径按引擎落盘顺序写，属票 41 未决口径）。 */
const signature = (element) => {
  const attrs = [...element.attributes]
    .map((item) => `${item.name}=${item.value}`)
    .sort()
    .join(' ');
  const children = [...element.childNodes].map((child) =>
    child.nodeType === 3 ? `#text:${child.textContent}` : signature(child)
  );
  return `<${element.tagName.toLowerCase()} ${attrs}>${children.join('')}`;
};

describe('工厂别名（票 21 §2.1.1）', () => {
  it('别名导入的元素工厂照编，且标签用规范名（与规范写法逐字节一致）', async () => {
    for (const mode of ['element', 'node']) {
      const aliased = await compile('AliasedCard', mode);
      expect(aliased.compiled, `AliasedCard@${mode}: ${JSON.stringify(aliased.bails)}`).toBe(true);
      // 片段里必须是规范标签 div / span，而不是别名 box / cell
      expect(aliased.plan.html).toContain('<div class="card"');
      expect(aliased.plan.html).toContain('<span class="label"');
      expect(aliased.plan.html).not.toContain('box');

      const plain = await compile('PlainCard', mode);
      expect(plain.compiled).toBe(true);

      const props = () => ({ label: core.ref('别名') });
      const aliasedEl =
        mode === 'element'
          ? aliased.generated.createRowFactory({})(props()).el
          : aliased.generated.createRowFactory({})(props()).renderDom();
      const plainEl =
        mode === 'element'
          ? plain.generated.createRowFactory({})(props()).el
          : plain.generated.createRowFactory({})(props()).renderDom();
      const dslEl = dsl.AliasedCard(props()).renderDom();

      expect(signature(aliasedEl), mode).toBe(signature(plainEl));
      expect(signature(aliasedEl), mode).toBe(signature(dslEl));
    }
  });

  it('别名包装（vNode as wrapComponent）+ 别名工厂：识别成组件单元', async () => {
    const built = await compile('AliasedWidget', 'node');
    expect(built.compiled, JSON.stringify(built.bails)).toBe(true);

    // 插件路径：包装那一层与命令体原样保留，只把内层视图表达式换成产物
    const units = componentUnits(source, { core, file: 'factory-alias.js' });
    expect(units.map((unit) => unit.component)).toContain('AliasedWidget');

    const unit = units.find((entry) => entry.component === 'AliasedWidget');
    const wired = wireComponentModule({
      source,
      targets: [unit],
      core,
      runtime: runtimeUrl,
      file: 'factory-alias.js'
    });
    expect(wired).not.toBeNull();
    expect(wired.code).toContain('api.ping');
    expect(wired.code).toContain('wrapComponent((api, self) =>');
    expect(wired.code).not.toContain("box({ class: 'widget' }");
  });
});
