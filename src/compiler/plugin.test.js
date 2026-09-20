/**
 * 票 16 / R1 / R2 / R4：构建期 transform——按 yoya-ui 自己的组件边界发现编译单元，
 * 业务源码零改动，产物进虚拟模块，认不准就不动，改写保留 hires sourcemap。
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
// 只给测试解码 sourcemap 用（vite / vitest 已带）。断言的是「改写点之后的业务行仍映射回原行」。
import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';
import * as core from '../yoya.core.js';
import { tbody } from '../html/index.js';
import { ref } from '../core/signals/handle.js';
import { componentUnits, wireComponentModule, yoyaCompile, yoyaCompilePlugin } from './plugin.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-plugin-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(join(process.cwd(), 'src/compiler/runtime.js')).href;

/** 一份普通业务源码：一个被当 keyed 行工厂的薄工厂 + 一个被 child() 调用的组件 + 一个助手。 */
const businessSource = [
  "import { div, keySet, ref, table, tr, vText } from '@yoyaflow/yoya-ui/core';",
  '',
  'export function removeRow(id) {',
  '  return id;',
  '}',
  '',
  'export function buildRow(item) {',
  '  return tr((line) => {',
  "    line.td((cell) => cell.className('col-md-1').child(String(item.data.id)));",
  "    line.td((cell) => cell.className('col-md-4').a((link) => link.child(vText(item.data.label))));",
  "    line.td((cell) => cell.className('col-md-1').a((link) => link.on('click', () => removeRow(item.data.id))));",
  '  });',
  '}',
  '',
  'export function StatusPill(props) {',
  "  return div((pill) => pill.className('status-pill').child(String(props.label)));",
  '}',
  '',
  'const rows = keySet([], (row) => row.id);',
  '',
  'const tableView = table((node) => {',
  '  node.tbody((body) => {',
  "    body.attr('id', 'tbody');",
  '    body.keyed(rows, buildRow);',
  '  });',
  '});',
  '',
  'const shell = div((root) => root.child(StatusPill({ label: 1 })));',
  'void [tableView, shell];',
  ''
].join('\n');

const target = { component: 'buildRow', file: 'src/main.js', mode: 'element' };

describe('componentUnits (component boundary discovery)', () => {
  it('takes view-returning top-level factories as units and infers the channel from usage', () => {
    const units = componentUnits(businessSource, { core, file: 'src/main.js' });

    expect(units.map((unit) => `${unit.component}:${unit.mode}`)).toEqual([
      'buildRow:element', // 被当 keyed 的行工厂 → element（最快）
      'StatusPill:node' // 只被 child(...) 调用 → node（ViewNode 在 child / keyed 里都成立）
    ]);
  });

  it('ignores PascalCase functions that do not return a view and plain helpers', () => {
    const source = [
      "import { div } from '@yoyaflow/yoya-ui/core';",
      'export function NotAView() { return 1; }',
      'function helper(id) { return id; }',
      'export function Card() { return div((box) => box); }',
      ''
    ].join('\n');

    expect(componentUnits(source, { core, file: 'x.js' }).map((unit) => unit.component)).toEqual([
      'Card'
    ]);
  });
});

describe('wireComponentModule (pure transform)', () => {
  it('renames the source factory, appends a same-name wrapper and keeps the rest verbatim', () => {
    const wired = wireComponentModule({
      source: businessSource,
      target,
      core,
      runtime: runtimeUrl
    });

    expect(wired).not.toBeNull();
    expect(wired.code.startsWith(businessSource.split('export function buildRow')[0])).toBe(true);
    expect(wired.code).toContain('function buildRowSource(item) {');
    expect(wired.code).toContain('export function buildRow(item) {');
    expect(wired.code).not.toContain('export function buildRowSource(item) {');
    expect(wired.code).toContain('__yoyaFactory_0 ??= createRowFactory({ removeRow });');
    // 业务语句逐行保留（除了那一处函数声明改名）
    const bodyLines = businessSource
      .split('\n')
      .filter((line) => line.trim() !== '' && !line.includes('function buildRow'));
    bodyLines.forEach((line) => expect(wired.code).toContain(line));
  });

  it('wires several units of one module in one pass', () => {
    const units = componentUnits(businessSource, { core, file: 'src/main.js' });
    const wired = wireComponentModule({
      source: businessSource,
      targets: units,
      core,
      runtime: runtimeUrl
    });

    expect(wired.units).toHaveLength(2);
    expect(wired.code).toContain('function buildRowSource(item) {');
    expect(wired.code).toContain('function StatusPillSource(props) {');
    // 两个单元的产物不同：行工厂走 element，组件走 node
    expect(wired.units[0].module).toContain('"mode": "element"');
    expect(wired.units[1].module).toContain('"mode": "node"');
  });

  it('leaves the module alone when the target is missing, duplicated or unbuildable', () => {
    expect(wireComponentModule({ source: 'export const x = 1;\n', target, core })).toBeNull();
    expect(
      wireComponentModule({
        source: `${businessSource}\nexport function buildRow(other) {\n  return tr((line) => line.td('x'));\n}\n`,
        target,
        core
      })
    ).toBeNull();
    // 形参解构：编译器整形状 bail（票 12），插件也就不动它
    expect(
      wireComponentModule({
        source: businessSource.replace('(item)', '({ data, api })'),
        target,
        core
      })
    ).toBeNull();
    // 结构不恒定（含 if）：同样整形状回落
    expect(
      wireComponentModule({
        source: businessSource.replace(
          "    line.td((cell) => cell.className('col-md-1').child(String(item.data.id)));",
          '    if (item.data.id) {\n      line.td((cell) => cell.child(String(item.data.id)));\n    }'
        ),
        target,
        core
      })
    ).toBeNull();
  });

  // R1：定位按 AST 符号身份——注释 / 字符串里的同名文本不算声明。
  it('ignores the target name when it only appears in comments or strings', () => {
    const source = [
      '// function buildRow(item) { return tr(() => {}); }',
      "const note = 'function buildRow(item) {}';",
      businessSource
    ].join('\n');
    const wired = wireComponentModule({ source, target, core, runtime: runtimeUrl });

    expect(wired).not.toBeNull();
    expect(wired.code).toContain("const note = 'function buildRow(item) {}';");
    expect(wired.code).toContain('function buildRowSource(item) {');
  });
});

describe('yoyaCompile (unplugin)', () => {
  it('wires discovered units with hires source maps and serves them as virtual modules', () => {
    const file = join(workDir, 'main.js');
    const artifacts = [];
    const vite = yoyaCompile.vite({
      core,
      onArtifact: (name, source) => artifacts.push([name, source])
    });

    expect(vite.name).toBe('yoya-ui-compile');
    writeFileSync(file, businessSource, 'utf8');
    const loaded = vite.transform(businessSource, file);

    expect(loaded.code).toContain('function buildRowSource(item) {');
    expect(loaded.code).toContain('function StatusPillSource(props) {');
    // sourcemap：改写不能打断定位链（改写点之后的业务行仍映射回原文件的原行）
    expect(loaded.map).toBeTruthy();
    const originalLineOf = (needle) => {
      const index = loaded.code.indexOf(needle);
      const before = loaded.code.slice(0, index);
      const line = before.split('\n').length;
      const column = index - (before.lastIndexOf('\n') + 1);
      return originalPositionFor(new TraceMap(JSON.parse(String(loaded.map))), { line, column });
    };
    expect(originalLineOf('col-md-4')).toMatchObject({ line: 10 });
    expect(originalLineOf('col-md-4').source).toContain('main.js');
    // 追加的接线代码是生成代码（没有原文对应）→ 不产生映射
    expect(originalLineOf('__yoyaFactory_0 ??=').source).toBeNull();

    expect(artifacts).toHaveLength(2);
    const [virtualId, moduleSource] = artifacts[0];
    expect(virtualId.startsWith('\0yoya-row:buildRow-')).toBe(true);
    expect(moduleSource).toContain('export function createRowFactory(scope)');
    // 插件跑在打包器里：运行期钩子默认按包子路径解析（不是 ./compiler-runtime.js）
    expect(moduleSource).toContain('from "@yoyaflow/yoya-ui/compiler-runtime"');
    // 产物里的 import 字面量把 NUL 转义成 \u0000（JSON.stringify 的口径）
    expect(loaded.code).toContain(virtualId.replace('\0', '\\u0000'));

    artifacts.forEach(([name, source]) => {
      expect(vite.resolveId(name)).toEqual({ id: name, external: false });
      const artifact = vite.load(name);
      expect(artifact.code).toBe(source);
      expect(artifact.map).toBeTruthy();
      expect(artifact.map.sources[0]).toContain('main.js');
    });
    // 不认识的模块一律不碰
    expect(
      vite.transform('export function helper(id) { return id; }\n', join(workDir, 'plain.js'))
    ).toBeNull();
    expect(
      vite.transform(businessSource, join(workDir, 'node_modules', 'dep', 'index.js'))
    ).toBeNull();
  });

  it('keeps esbuild-plain plugin objects and the explicit escape-hatch roster', () => {
    const plugin = yoyaCompilePlugin({ core });
    expect(plugin.name).toBe('yoya-ui-compile');
    // esbuild 会校验插件对象：unplugin 生成的 esbuild 插件只能有 name / setup
    expect(Object.keys(plugin).sort()).toEqual(['name', 'setup']);

    const scoped = yoyaCompile.vite({
      core,
      units: [{ component: 'internalRow', file: join(workDir, 'internal.js'), mode: 'element' }]
    });
    const internal = businessSource.replace('buildRow', 'internalRow');
    writeFileSync(join(workDir, 'internal.js'), internal, 'utf8');
    // 给了花名册就只认花名册：只编列表里写明的那个函数，文件里其它工厂原样不动
    const scopedResult = scoped.transform(internal, join(workDir, 'internal.js'));
    expect(scopedResult.code).toContain('function internalRowSource(item) {');
    expect(scopedResult.code).not.toContain('StatusPillSource');
  });
});

describe('compiled row through keyed (ticket 15 + 16 together)', () => {
  it('mounts compiled element rows declared with the untouched business source', async () => {
    const file = join(workDir, 'mount-main.js');
    writeFileSync(file, businessSource, 'utf8');
    const [unit] = componentUnits(businessSource, { core, file }).filter(
      (candidate) => candidate.component === 'buildRow'
    );
    const wired = wireComponentModule({
      source: businessSource,
      targets: [unit],
      core,
      runtime: runtimeUrl
    });
    const modulePath = join(workDir, 'row.generated.js');
    writeFileSync(modulePath, wired.module, 'utf8');
    // 虚拟模块 → 落盘文件（打包器交给插件，这里直接指到文件）
    const code = wired.code.replace(
      /from "\\u0000yoya-row:[^"]*"/,
      `from ${JSON.stringify(pathToFileURL(modulePath).href)}`
    );
    const wiredPath = join(workDir, 'main.wired.js');
    writeFileSync(wiredPath, code, 'utf8');

    const wiredModule = await import(pathToFileURL(wiredPath).href);
    const rows = ref([]);
    const host = tbody((body) => body.attr('id', 'tbody').keyed(rows, wiredModule.buildRow));
    const element = host.renderDom();

    rows.value = [
      { data: { id: 1, label: ref('label 1') } },
      { data: { id: 2, label: ref('label 2') } }
    ];

    expect([...element.querySelectorAll('tr')].map((tr) => tr.textContent)).toEqual([
      '1label 1',
      '2label 2'
    ]);
    expect(readFileSync(file, 'utf8')).toBe(businessSource); // 业务源码文件没有被改
  });
});
