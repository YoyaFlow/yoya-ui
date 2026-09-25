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
import * as core from '@yoyaflow/yoya-core';
import { tbody } from '@yoyaflow/yoya-core/html';
import { ref } from '@yoyaflow/yoya-core/internal/core/signals/handle.js';
import { componentUnits, wireComponentModule, yoyaCompile, yoyaCompilePlugin } from './plugin.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-plugin-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(
  join(process.cwd(), 'packages/yoya-core/src/core/compiler-runtime.js')
).href;

/** 一份普通业务源码：一个被当 keyed 行工厂的薄工厂 + 一个被 child() 调用的组件 + 一个助手。 */
const businessSource = [
  "import { div, keySet, ref, table, tr, vText } from '@yoyaflow/yoya-core';",
  '',
  'export function removeItem(id) {',
  '  return id;',
  '}',
  '',
  'export function Card(item) {',
  '  return tr((line) => {',
  "    line.td((cell) => cell.className('item-id').child(String(item.data.id)));",
  "    line.td((cell) => cell.className('item-label').a((link) => link.child(vText(item.data.label))));",
  "    line.td((cell) => cell.className('item-id').a((link) => link.on('click', () => removeItem(item.data.id))));",
  '  });',
  '}',
  '',
  'export function StatusPill(props) {',
  "  return div((pill) => pill.className('status-pill').child(String(props.label)));",
  '}',
  '',
  'const items = keySet([], (row) => row.id);',
  '',
  'const tableView = table((node) => {',
  '  node.tbody((body) => {',
  "    body.attr('id', 'tbody');",
  '    body.keyed(items, Card);',
  '  });',
  '});',
  '',
  'const shell = div((root) => root.child(StatusPill({ label: 1 })));',
  'void [tableView, shell];',
  ''
].join('\n');

const target = { component: 'Card', file: 'src/main.js', mode: 'element' };

describe('componentUnits (component boundary discovery)', () => {
  it('takes view-returning top-level factories as units and infers the channel from usage', () => {
    const units = componentUnits(businessSource, { core, file: 'src/main.js' });

    expect(units.map((unit) => `${unit.component}:${unit.mode}`)).toEqual([
      'Card:element', // 被当 keyed 的行工厂 → element（最快）
      'StatusPill:node' // 只被 child(...) 调用 → node（ViewNode 在 child / keyed 里都成立）
    ]);
  });

  it('ignores PascalCase functions that do not return a view and plain helpers', () => {
    const source = [
      "import { div } from '@yoyaflow/yoya-core';",
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
    expect(wired.code.startsWith(businessSource.split('export function Card')[0])).toBe(true);
    expect(wired.code).toContain('function CardSource(item) {');
    expect(wired.code).toContain('export function Card(item) {');
    expect(wired.code).not.toContain('export function CardSource(item) {');
    expect(wired.code).toContain('__yoyaFactory_0 ??= __yoyaCreateRowFactory_0({ removeItem });');
    // 业务语句逐行保留（除了那一处函数声明改名）
    const bodyLines = businessSource
      .split('\n')
      .filter((line) => line.trim() !== '' && !line.includes('function Card'));
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
    expect(wired.code).toContain('function CardSource(item) {');
    expect(wired.code).toContain('function StatusPillSource(props) {');
    // 每个单元一个**独立的 import 绑定名**：`import { createRowFactory }` 写两次同名绑定
    // 是 ESM 的语法错误（业务模块会被打包器直接拒收）
    expect(wired.code).toContain('as __yoyaCreateRowFactory_0');
    expect(wired.code).toContain('as __yoyaCreateRowFactory_1');
    expect(wired.code).not.toContain('import { createRowFactory } from');
    // 两个单元的产物不同：行工厂走 element，组件走 node
    expect(wired.units[0].module).toContain('"mode": "element"');
    expect(wired.units[1].module).toContain('"mode": "node"');
  });

  it('leaves the module alone when the target is missing, duplicated or unbuildable', () => {
    expect(wireComponentModule({ source: 'export const x = 1;\n', target, core })).toBeNull();
    expect(
      wireComponentModule({
        source: `${businessSource}\nexport function Card(other) {\n  return tr((line) => line.td('x'));\n}\n`,
        target,
        core
      })
    ).toBeNull();
    // 根 builder 里的 `if` 现在能编（票 04 的结构锚点）：那段结构进子单元，不是整形状回落
    const conditional = wireComponentModule({
      source: businessSource.replace(
        "    line.td((cell) => cell.className('item-id').child(String(item.data.id)));",
        '    if (item.data.id) {\n      line.td((cell) => cell.child(String(item.data.id)));\n    }'
      ),
      target,
      core
    });
    expect(conditional).not.toBeNull();
    expect(conditional.units.some((unit) => unit.virtual.includes('-ctl'))).toBe(true);
  });

  // 票 21：形参解构不再整形状 bail；包装函数按 rest 转发，编译产物复刻源码的参数表。
  it('wires a row factory whose parameter is destructured', () => {
    const source = [
      "import { keySet, ref, table, tr } from '@yoyaflow/yoya-core';",
      '',
      'export function Row({ data }) {',
      "  return tr((line) => line.td((cell) => cell.className('item-id').child(String(data.id))));",
      '}',
      '',
      'const rows = keySet([], (row) => row.id);',
      'const tableView = table((node) => node.tbody((body) => body.keyed(rows, Row)));',
      'void [rows, tableView];',
      ''
    ].join('\n');
    const [unit] = componentUnits(source, { core, file: 'src/rows.js' });
    const wired = wireComponentModule({
      source,
      targets: [unit],
      core,
      runtime: runtimeUrl
    });

    expect(wired).not.toBeNull();
    expect(wired.code).toContain('function RowSource({ data }) {');
    expect(wired.code).toContain('export function Row(...__yoyaArgs) {');
    expect(wired.code).toContain('return __yoyaFactory_0(...__yoyaArgs);');
    expect(wired.units[0].module).toContain('return function Row({ data }) {');
    expect(wired.units[0].module).not.toContain('const { data } = scope;');
  });

  // 全是标识符的形参照旧原样转发：函数签名与 `length` 不变（rest 转发会把它变成 0）
  it('keeps the source signature when every parameter is an identifier', () => {
    const source = [
      "import { keySet, ref, table, tr } from '@yoyaflow/yoya-core';",
      '',
      'export function Row(item, index) {',
      '  return tr((line) => line.td((cell) => cell.child(String(item.id) + String(index))));',
      '}',
      '',
      'const rows = keySet([], (row) => row.id);',
      'const tableView = table((node) => node.tbody((body) => body.keyed(rows, Row)));',
      'void [rows, tableView];',
      ''
    ].join('\n');
    const [unit] = componentUnits(source, { core, file: 'src/rows.js' });
    const wired = wireComponentModule({ source, targets: [unit], core, runtime: runtimeUrl });

    expect(wired.code).toContain('export function Row(item, index) {');
    expect(wired.code).toContain('return __yoyaFactory_0(item, index);');
    expect(wired.code).not.toContain('...__yoyaArgs');
  });

  // R1：定位按 AST 符号身份——注释 / 字符串里的同名文本不算声明。
  it('ignores the target name when it only appears in comments or strings', () => {
    const source = [
      '// function Card(item) { return tr(() => {}); }',
      "const note = 'function Card(item) {}';",
      businessSource
    ].join('\n');
    const wired = wireComponentModule({ source, target, core, runtime: runtimeUrl });

    expect(wired).not.toBeNull();
    expect(wired.code).toContain("const note = 'function Card(item) {}';");
    expect(wired.code).toContain('function CardSource(item) {');
  });
});

describe('yoyaCompile (unplugin)', () => {
  it('wires discovered units with hires source maps and serves them as virtual modules', async () => {
    const file = join(workDir, 'main.js');
    const artifacts = [];
    const vite = yoyaCompile.vite({
      core,
      onArtifact: (name, source) => artifacts.push([name, source])
    });

    expect(vite.name).toBe('yoya-ui-compile');
    writeFileSync(file, businessSource, 'utf8');
    // transform 是异步的：默认会先尝试加载**随包发布**的库内组件注册表（票 11），找不到就照旧
    const loaded = await vite.transform(businessSource, file);

    expect(loaded.code).toContain('function CardSource(item) {');
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
    expect(originalLineOf('item-label')).toMatchObject({ line: 10 });
    expect(originalLineOf('item-label').source).toContain('main.js');
    // 追加的接线代码是生成代码（没有原文对应）→ 不产生映射
    expect(originalLineOf('__yoyaFactory_0 ??=').source).toBeNull();

    expect(artifacts).toHaveLength(2);
    const [virtualId, moduleSource] = artifacts[0];
    expect(virtualId.startsWith('\0yoya-row:Card-')).toBe(true);
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
      await vite.transform('export function helper(id) { return id; }\n', join(workDir, 'plain.js'))
    ).toBeNull();
    expect(
      await vite.transform(businessSource, join(workDir, 'node_modules', 'dep', 'index.js'))
    ).toBeNull();
  });

  it('keeps esbuild-plain plugin objects and the explicit escape-hatch roster', async () => {
    const plugin = yoyaCompilePlugin({ core });
    expect(plugin.name).toBe('yoya-ui-compile');
    // esbuild 会校验插件对象：unplugin 生成的 esbuild 插件只能有 name / setup
    expect(Object.keys(plugin).sort()).toEqual(['name', 'setup']);

    const scoped = yoyaCompile.vite({
      core,
      units: [{ component: 'internalRow', file: join(workDir, 'internal.js'), mode: 'element' }]
    });
    const internal = businessSource.replace('Card', 'internalRow');
    writeFileSync(join(workDir, 'internal.js'), internal, 'utf8');
    // 给了花名册就只认花名册：只编列表里写明的那个函数，文件里其它工厂原样不动
    const scopedResult = await scoped.transform(internal, join(workDir, 'internal.js'));
    expect(scopedResult.code).toContain('function internalRowSource(item) {');
    expect(scopedResult.code).not.toContain('StatusPillSource');
  });
});

describe('compiled row through keyed (ticket 15 + 16 together)', () => {
  it('mounts compiled element rows declared with the untouched business source', async () => {
    const file = join(workDir, 'mount-main.js');
    writeFileSync(file, businessSource, 'utf8');
    const [unit] = componentUnits(businessSource, { core, file }).filter(
      (candidate) => candidate.component === 'Card'
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
    const host = tbody((body) => body.attr('id', 'tbody').keyed(rows, wiredModule.Card));
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

  // 票 21：形参解构（`({ data })`）的行工厂经插件改写后，DOM 与活值行为照旧。
  it('mounts compiled rows whose parameter is destructured', async () => {
    const source = [
      "import { keySet, ref, table, tr } from '@yoyaflow/yoya-core';",
      '',
      'export function Row({ data }) {',
      '  return tr((line) => {',
      "    line.td((cell) => cell.className('item-id').child(String(data.id)));",
      "    line.td((cell) => cell.className('item-label').child(data.label));",
      '  });',
      '}',
      '',
      'const rows = keySet([], (row) => row.id);',
      'const tableView = table((node) => node.tbody((body) => body.keyed(rows, Row)));',
      'void [rows, tableView];',
      ''
    ].join('\n');
    const file = join(workDir, 'destructured-main.js');
    writeFileSync(file, source, 'utf8');
    const [unit] = componentUnits(source, { core, file }).filter(
      (candidate) => candidate.component === 'Row'
    );
    const wired = wireComponentModule({ source, targets: [unit], core, runtime: runtimeUrl });
    const modulePath = join(workDir, 'destructured-row.generated.js');
    writeFileSync(modulePath, wired.module, 'utf8');
    const wiredPath = join(workDir, 'destructured-main.wired.js');
    writeFileSync(
      wiredPath,
      wired.code.replace(
        /from "\\u0000yoya-row:[^"]*"/,
        `from ${JSON.stringify(pathToFileURL(modulePath).href)}`
      ),
      'utf8'
    );

    const wiredModule = await import(pathToFileURL(wiredPath).href);
    const rows = ref([]);
    const host = tbody((body) => body.attr('id', 'tbody').keyed(rows, wiredModule.Row));
    const element = host.renderDom();
    const label = ref('label 1');

    rows.value = [{ data: { id: 1, label } }];
    expect([...element.querySelectorAll('td')].map((td) => td.textContent)).toEqual([
      '1',
      'label 1'
    ]);

    label.value = 'label 1 !!!';
    expect(element.querySelector('.item-label').textContent).toBe('label 1 !!!');
    expect(readFileSync(file, 'utf8')).toBe(source); // 业务源码文件没有被改
  });
});
