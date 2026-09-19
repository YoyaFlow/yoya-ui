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
import { VCard, VCardBody, VCardFooter, VCardHeader, vCard } from '../data-display/surface.js';
import { buildComponentRegistry, compileComponent, compileSource } from './index.js';

const workDir = mkdtempSync(join(process.cwd(), '.scratch', 'tmp-class-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(join(process.cwd(), 'src/compiler/runtime.js')).href;
const surfaceFile = posix.join('src/data-display/surface.js');
const surfaceSource = readFileSync(surfaceFile, 'utf8');
const callerFile = posix.join('src/compiler/fixtures/row-with-card.js');
const callerSource =
  "import { tr } from '../../yoya.core.js';\n" +
  "import { vCard } from '../../data-display/surface.js';\n" +
  'export function buildRow(row) {\n' +
  '  return tr((line) => line.td((cell) => cell.child(vCard(row.title))));\n' +
  '}\n';

const families = [
  ['vCard', VCard],
  ['vCardHeader', VCardHeader],
  ['vCardBody', VCardBody],
  ['vCardFooter', VCardFooter]
];

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
    // 表头 / 表体 / 表尾同形状 → 能编；单元格走模块私有助手 → 回落并给出原因
    const tableFile = posix.join('src/data-display/table.js');
    const tableSource = readFileSync(tableFile, 'utf8');

    for (const name of ['vThead', 'vTbody', 'vTfoot']) {
      const result = compileComponent({ source: tableSource, file: tableFile, export: name, core });
      expect(result.compiled, name).toBe(true);
    }

    const cell = compileComponent({ source: tableSource, file: tableFile, export: 'vTd', core });
    expect(cell.compiled).toBe(false);
    expect(cell.bails.map((bail) => bail.reason).join(' | ')).toContain('裸调用');
  });

  it('inlines statically readable content at build time', async () => {
    const registryDir = join(workDir, 'inline');
    buildComponentRegistry({
      entries: [{ file: surfaceFile, export: 'vCard' }],
      dir: registryDir,
      core,
      runtime: runtimeUrl
    });
    const registry = JSON.parse(
      readFileSync(join(registryDir, 'components.registry.json'), 'utf8')
    );

    const cases = [
      ["vCard('标题')", () => vCard('标题')],
      ["vCard((card) => card.span('正文'))", () => vCard((card) => card.span('正文'))],
      ["vCard(span('直接给节点'))", () => vCard(core.span('直接给节点'))]
    ];

    for (const [expression, generic] of cases) {
      const compiled = compileSource({
        source:
          "import { tr, span } from '../../yoya.core.js';\n" +
          "import { vCard } from '../../data-display/surface.js';\n" +
          'export function buildRow(row) {\n' +
          `  return tr((line) => line.td((cell) => cell.child(${expression})));\n` +
          '}\n',
        file: callerFile,
        fn: 'buildRow',
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

      const modulePath = join(registryDir, 'row.generated.js');
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
      entries: [{ file: surfaceFile, export: 'vCard' }],
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
      fn: 'buildRow',
      core,
      runtime: runtimeUrl,
      components: JSON.parse(readFileSync(join(registryDir, 'components.registry.json'), 'utf8')),
      componentsSpecifier: './components.registry.js'
    });
    expect(compiled.bails).toEqual([]);
    expect(compiled.compiled).toBe(true);

    const modulePath = join(countingDir, 'row.generated.js');
    writeFileSync(modulePath, compiled.module, 'utf8');
    const rowModule = await import(pathToFileURL(modulePath).href);
    const factory = rowModule.createRowFactory({});

    // 不带内容 → 走骨架（片段 + 位置写）
    const empty = factory({ title: null });
    expect(empty.el.outerHTML).toBe(`<tr><td>${vCard().toHTML()}</td></tr>`);

    // 带内容 → 内容守卫让 bind 返回 null，调用方用原组件重建（DOM 仍逐字节一致）
    const filled = factory({ title: '标题' });
    expect(filled.el.outerHTML).toBe(`<tr><td>${vCard('标题').renderDom().outerHTML}</td></tr>`);

    const counting = await import(pathToFileURL(join(countingDir, 'components.registry.js')).href);
    expect(counting.fallbacks).toHaveLength(1); // 只有带内容那次回落

    empty.destroy();
    filled.destroy();
  });
});
