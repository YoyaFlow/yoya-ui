/**
 * 形态 C 的"骨架可编"（第一档：**没有内容**的用法）。
 *
 * 工厂只做参数转发（`createComponentFactory(VCard, …)`），编译单元是类构造体：`super('<标签>')`
 * 之后的直线节点调用。构造参数出现在 `applyComponentSetup(this, setup)` 的位置 = 调用方内容，
 * 构件只编"没带内容"的用法——带内容时 `bind` 返回 null，由调用方回落通用路径（绝不静默丢内容）。
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '../yoya.core.js';
import { CardSkeleton, cardSkeleton } from './fixtures/card-skeleton.js';
import { buildComponentRegistry, compileComponent, compileSource } from './index.js';

// 临时产物留在仓库内（vitest 不允许 import 项目根之外的模块），
// 但 `.scratch/` 不进 git —— 干净检出里没有它，所以先建出来。
const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-class-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(join(process.cwd(), 'src/compiler/runtime.js')).href;
const surfaceFile = posix.join('src/compiler/fixtures/card-skeleton.js');
/** 「读不懂的构造体」夹具（与 `card-skeleton.js` 配对）——中性形状，不随包发布。 */
const COMPILER_FIXTURE_FILE = posix.join('src/compiler/fixtures/unreadable-constructor.js');
const surfaceSource = readFileSync(surfaceFile, 'utf8');
const callerFile = posix.join('src/compiler/fixtures/item-with-card.js');
const callerSource =
  "import { tr } from '../../yoya.core.js';\n" +
  "import { cardSkeleton } from './card-skeleton.js';\n" +
  'export function Item(item) {\n' +
  '  return tr((line) => line.td((cell) => cell.child(cardSkeleton(item.title))));\n' +
  '}\n';

const families = [['cardSkeleton', CardSkeleton]];

describe('form C skeletons', () => {
  it('reads the class constructor as the view and matches the class DOM byte for byte', () => {
    for (const [name, Component] of families) {
      const result = compileComponent({
        source: surfaceSource,
        file: surfaceFile,
        export: name,
        core
      });

      expect(result.bails, name).toEqual([]);
      expect(result.compiled, name).toBe(true);
      expect(result.plan.html, name).toBe(new Component().toHTML());
      expect(result.scope, name).toEqual([]);
      // 构造体里有内容位置 → 产物必须带内容守卫
      expect(result.module, name).toContain('return null;');
    }
  });

  it('records an actionable reason for a constructor it cannot read', () => {
    // 「构造体读不懂」要用**夹具**而不是库内组件：库内组件正在全部收敛到 A（薄工厂）/ B（vNode），
    // 没有一个会长期停留在"读不懂的形态 C"，拿库内组件当样例会让这条用例跟着每次迁移反复换
    // （导航栏 / 骨架屏都当过样例）。夹具是中性形状（WidgetSkeleton / CardSkeleton），只存在于测试里。
    const file = posix.join(COMPILER_FIXTURE_FILE);
    const result = compileComponent({
      source: readFileSync(file, 'utf8'),
      file,
      export: 'widgetSkeleton',
      core
    });

    expect(result.compiled).toBe(false);
    expect(result.bails.map((bail) => bail.reason).join(' | ')).toContain(
      '调用链不是从 setup 参数出发'
    );
  });

  it('inlines statically readable content at build time', async () => {
    const registryDir = join(workDir, 'inline');
    buildComponentRegistry({
      entries: [{ file: surfaceFile, export: 'cardSkeleton' }],
      dir: registryDir,
      core,
      runtime: runtimeUrl
    });
    const registry = JSON.parse(
      readFileSync(join(registryDir, 'components.registry.json'), 'utf8')
    );

    const cases = [
      ["cardSkeleton('标题')", () => cardSkeleton('标题')],
      [
        "cardSkeleton((card) => card.span('正文'))",
        () => cardSkeleton((card) => card.span('正文'))
      ],
      ["cardSkeleton(span('直接给节点'))", () => cardSkeleton(core.span('直接给节点'))]
    ];

    for (const [expression, generic] of cases) {
      const compiled = compileSource({
        source:
          "import { tr, span } from '../../yoya.core.js';\n" +
          "import { cardSkeleton } from './card-skeleton.js';\n" +
          'export function Item(item) {\n' +
          `  return tr((line) => line.td((cell) => cell.child(${expression})));\n` +
          '}\n',
        file: callerFile,
        fn: 'Item',
        core,
        runtime: runtimeUrl,
        components: registry,
        componentsSpecifier: './components.registry.js'
      });

      expect(compiled.bails, expression).toEqual([]);
      expect(compiled.compiled, expression).toBe(true);
      // 内容在构建期内联：调用方片段与通用路径的规范序列化逐字节一致
      expect(compiled.plan.html, expression).toBe(`<tr><td>${generic().toHTML()}</td></tr>`);
      expect(compiled.module, expression).toContain('contentInlined: true');

      const modulePath = join(registryDir, 'item.generated.js');
      writeFileSync(modulePath, compiled.module, 'utf8');
      const rowModule = await import(`${pathToFileURL(modulePath).href}?v=${expression.length}`);
      // 内容实参仍然照原样传给 bindComponent（回落时用它重建），所以 scope 里要有 span
      expect(rowModule.createRowFactory({ span: core.span })({}).el.outerHTML, expression).toBe(
        `<tr><td>${generic().toHTML()}</td></tr>`
      );
    }
  });

  it('links an empty skeleton and falls back when the caller passes content', async () => {
    const registryDir = join(workDir, 'components');
    buildComponentRegistry({
      entries: [{ file: surfaceFile, export: 'cardSkeleton' }],
      dir: registryDir,
      core,
      runtime: runtimeUrl
    });

    // 统计回落次数：绕过 bind 的调用会走 entry.render()
    const countingDir = join(workDir, 'counting');
    mkdirSync(countingDir, { recursive: true });
    const realRegistry = pathToFileURL(join(registryDir, 'components.registry.js')).href;
    writeFileSync(
      join(countingDir, 'components.registry.js'),
      'import * as real from ' +
        JSON.stringify(realRegistry) +
        ';\n' +
        'export const fallbacks = [];\n' +
        'const mark = (entry) => ({\n' +
        '  ...entry,\n' +
        '  render: (...values) => {\n' +
        '    fallbacks.push(values);\n' +
        '    return entry.render(...values);\n' +
        '  }\n' +
        '});\n' +
        'export const components = Object.fromEntries(\n' +
        '  Object.entries(real.components).map(([key, entry]) => [key, mark(entry)])\n' +
        ');\n'
    );

    const compiled = compileSource({
      source: callerSource,
      file: callerFile,
      fn: 'Item',
      core,
      runtime: runtimeUrl,
      components: JSON.parse(readFileSync(join(registryDir, 'components.registry.json'), 'utf8')),
      componentsSpecifier: './components.registry.js'
    });
    expect(compiled.bails).toEqual([]);
    expect(compiled.compiled).toBe(true);

    const modulePath = join(countingDir, 'item.generated.js');
    writeFileSync(modulePath, compiled.module, 'utf8');
    const rowModule = await import(pathToFileURL(modulePath).href);
    const factory = rowModule.createRowFactory({});

    // 不带内容 → 走骨架（片段 + 位置写）
    const empty = factory({ title: null });
    expect(empty.el.outerHTML).toBe(`<tr><td>${cardSkeleton().toHTML()}</td></tr>`);

    // 带内容 → 内容守卫让 bind 返回 null，调用方用原组件重建（DOM 仍逐字节一致）
    const filled = factory({ title: '标题' });
    expect(filled.el.outerHTML).toBe(
      `<tr><td>${cardSkeleton('标题').renderDom().outerHTML}</td></tr>`
    );

    const counting = await import(pathToFileURL(join(countingDir, 'components.registry.js')).href);
    expect(counting.fallbacks).toHaveLength(1); // 只有带内容那次回落

    empty.destroy();
    filled.destroy();
  });
});
