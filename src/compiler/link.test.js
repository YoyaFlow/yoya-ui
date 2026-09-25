/**
 * 票 41 的端到端门禁：注册表命中 → 调用点只做链接；未命中 / 版本不符 → 回落通用路径，
 * 两条路径的 DOM 逐字节一致。
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '../yoya.core.js';
import { Item as buildGenericItem } from './fixtures/item-with-component.js';
import { buildComponentRegistry, compileSource } from './index.js';

// 临时产物留在仓库内（vitest 不允许 import 项目根之外的模块），
// 但 `.scratch/` 不进 git —— 干净检出里没有它，所以先建出来。
const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-link-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(join(process.cwd(), 'src/compiler/runtime.js')).href;
const componentFile = posix.join('src/compiler/fixtures/status-dot.js');
const callerFile = posix.join('src/compiler/fixtures/item-with-component.js');
const callerSource = readFileSync(callerFile, 'utf8');

const registryDir = join(workDir, 'components');
const built = buildComponentRegistry({
  entries: [
    { file: componentFile, export: 'StatusDot' },
    { file: componentFile, export: 'StatusTag' },
    { file: componentFile, export: 'StatusBox' }
  ],
  dir: registryDir,
  core,
  runtime: runtimeUrl
});

const DOT_KEY = `${componentFile}#StatusDot`;
const TAG_KEY = `${componentFile}#StatusTag`;
const themeFile = posix.join('src/compiler/fixtures/theme-tag.js');

const compileCaller = (options) =>
  compileSource({
    source: callerSource,
    file: callerFile,
    fn: 'Item',
    core,
    runtime: runtimeUrl,
    components: built.registry,
    componentsSpecifier: './components.registry.js',
    ...options
  });

const loadRow = (compiled, dir) => {
  const path = join(dir, 'item.generated.js');
  writeFileSync(path, compiled.module, 'utf8');
  return import(pathToFileURL(path).href);
};

const sampleRow = () => ({
  id: 3,
  dot: { tone: 'ok', label: core.ref('在线') },
  tag: { label: core.ref('v1') }
});

/**
 * 属性顺序无关的 DOM 签名。
 *
 * 通用路径的 DOM 属性顺序跟随 builder 的**调用顺序**，编译路径是 `toHTML()` 的**规范顺序**
 * （属性 / 样式按名字排序，见 docs/ssr.md §8.1）。两者语义相同、字节不同；票 41 只声明
 * 「编译产物 == 框架的规范序列化」，通用路径的顺序差异作为发现记在票里，不在这里悄悄改核心。
 */
const signature = (node) => {
  if (node.nodeType === 3) {
    return `#text:${node.textContent}`;
  }
  const attrs = [...node.attributes]
    .map((item) => `${item.name}=${item.value}`)
    .sort()
    .join(' ');
  const children = [...node.childNodes].map(signature).join('');
  return `<${node.tagName.toLowerCase()} ${attrs}>${children}`;
};

describe('component registry', () => {
  it('compiles leaf components and keeps the registry pure data', () => {
    const keys = Object.keys(built.registry.components).sort();

    expect(keys).toEqual([`${componentFile}#StatusDot`, TAG_KEY]);
    expect(built.registry.components[DOT_KEY].hash).toMatch(/^[0-9a-f]{12}$/);
    expect(built.registry.components[DOT_KEY].plan.html).toBe(
      '<span class="status-dot" data-tone=""><!----></span>'
    );
    // 纯数据：可序列化、可缓存、不钉实例
    expect(JSON.parse(JSON.stringify(built.registry))).toEqual(built.registry);
  });

  it('skips container components with a recorded reason', () => {
    expect(built.skipped.map((item) => item.key)).toEqual([`${componentFile}#StatusBox`]);
    expect(built.skipped[0].bails[0].reason).toContain('子内容');
  });

  it('never links container components (slot routing stays on the generic path)', () => {
    const source =
      "import { tr } from '../../yoya.core.js';\n" +
      "import { StatusBox } from './status-dot.js';\n" +
      'export function Item(item) {\n' +
      '  return tr((line) => line.td((cell) => cell.child(StatusBox(row, item.body))));\n' +
      '}\n';

    const compiled = compileSource({
      source,
      file: callerFile,
      fn: 'Item',
      core,
      runtime: runtimeUrl,
      components: built.registry,
      componentsSpecifier: './components.registry.js'
    });

    expect(compiled.compiled).toBe(false);
    expect(compiled.bails.map((bail) => bail.reason).join(' | ')).toContain('组件调用（未编译）');
  });
});

describe('call-site linking', () => {
  it('embeds the linked component fragment into the caller fragment', () => {
    const compiled = compileCaller();

    expect(compiled.bails).toEqual([]);
    expect(compiled.compiled).toBe(true);
    expect(compiled.plan.html).toContain('<span class="status-dot" data-tone=""><!----></span>');
    expect(compiled.plan.html).toContain('<span class="status-tag"><!----></span>');
    expect(compiled.module).toContain(`components[${JSON.stringify(DOT_KEY)}]`);
    expect(compiled.module).toContain('bindComponent(');
  });

  it('falls back to the generic path when the component is not in the registry', () => {
    const compiled = compileCaller({
      components: { version: 1, runtime: runtimeUrl, components: {} }
    });

    expect(compiled.compiled).toBe(false);
    expect(compiled.bails.map((bail) => bail.reason).join(' | ')).toContain('组件调用（未编译）');
  });

  it('renders byte-identical DOM and keeps live values in sync', async () => {
    const compiled = compileCaller();
    const rowModule = await loadRow(compiled, registryDir);
    const row = sampleRow();

    const genericNode = buildGenericItem(row);
    const generic = genericNode.renderDom();
    const compiledRow = rowModule.createRowFactory({})(row);

    expect(compiledRow.el.outerHTML).toBe(genericNode.toHTML());
    expect(signature(compiledRow.el)).toBe(signature(generic));

    row.dot.label.value = '在线 !!!';
    row.tag.label.value = 'v2';
    expect(compiledRow.el.outerHTML).toBe(genericNode.toHTML());
    expect(signature(compiledRow.el)).toBe(signature(generic));
    expect(compiledRow.el.querySelector('.status-dot').textContent).toBe('在线 !!!');
    expect(compiledRow.el.getAttribute('data-item-id')).toBe('3');

    compiledRow.destroy();
    compiledRow.destroy();
    const frozen = compiledRow.el.innerHTML;
    row.dot.label.value = 'after destroy';
    expect(compiledRow.el.innerHTML).toBe(frozen);
  });

  it('falls back at runtime when the registry entry is from another build', async () => {
    // 伪造一份「版本对不上」的注册表：hash 故意错，并把 render 计数暴露出来
    const staleDir = join(workDir, 'stale');
    mkdirSync(staleDir, { recursive: true });
    const realRegistry = pathToFileURL(join(registryDir, 'components.registry.js')).href;
    writeFileSync(
      join(staleDir, 'components.registry.js'),
      'import * as real from ' +
        JSON.stringify(realRegistry) +
        ';\n' +
        'export const fallbacks = [];\n' +
        'const mark = (entry) => ({\n' +
        '  ...entry,\n' +
        '  hash: "stale-build",\n' +
        '  render: (...values) => {\n' +
        '    fallbacks.push(values);\n' +
        '    return entry.render(...values);\n' +
        '  }\n' +
        '});\n' +
        'export const components = Object.fromEntries(\n' +
        '  Object.entries(real.components).map(([key, entry]) => [key, mark(entry)])\n' +
        ');\n'
    );

    const compiled = compileCaller();
    const rowModule = await loadRow(compiled, staleDir);
    const row = sampleRow();
    const genericNode = buildGenericItem(row);
    const generic = genericNode.renderDom();
    const compiledRow = rowModule.createRowFactory({})(row);

    expect(signature(compiledRow.el)).toBe(signature(generic));

    const staleRegistry = await import(
      pathToFileURL(join(staleDir, 'components.registry.js')).href
    );
    // 两个链接组件都走了通用路径回落（拿到原组件的 DOM，而不是写进片段）
    expect(staleRegistry.fallbacks).toHaveLength(2);

    row.dot.label.value = '失效后仍活';
    expect(compiledRow.el.querySelector('.status-dot').textContent).toBe('失效后仍活');
    compiledRow.destroy();
  });
});

describe('static values in linked components', () => {
  it('folds library constants and theme helpers before linking the fragment', () => {
    const registry = buildComponentRegistry({
      entries: [{ file: themeFile, export: 'ThemeTag' }],
      dir: join(workDir, 'theme'),
      core,
      runtime: runtimeUrl
    }).registry;

    const compiled = compileSource({
      source:
        "import { tr } from '../../yoya.core.js';\n" +
        "import { ThemeTag } from './theme-tag.js';\n" +
        'export function Item(item) {\n' +
        '  return tr((line) => line.td((cell) => cell.child(ThemeTag(item.tag))));\n' +
        '}\n',
      file: callerFile,
      fn: 'Item',
      core,
      runtime: runtimeUrl,
      components: registry,
      componentsSpecifier: './components.registry.js'
    });

    expect(compiled.bails).toEqual([]);
    expect(compiled.compiled).toBe(true);
    // 库内常量 / 主题助手折成字面量后才进得了片段（不折叠时这里既没有类名也没有样式）
    expect(compiled.plan.html).toContain('class="yoya-component yoya-theme-tag"');
    expect(compiled.plan.html).toContain('var(--yoya-color-surface, #ffffff)');
    expect(compiled.module).toContain(`components[${JSON.stringify(`${themeFile}#ThemeTag`)}]`);
  });
});
