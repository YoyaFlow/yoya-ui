/**
 * 票 16 / R1 / R2 / R4：构建期 transform——业务源码零改动，产物进虚拟模块，认不准就不动。
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '../yoya.core.js';
import { tbody } from '../html/index.js';
import { ref } from '../core/signals/handle.js';
import { wireRowModule, yoyaCompilePlugin } from './plugin.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-plugin-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(join(process.cwd(), 'src/compiler/runtime.js')).href;

const businessSource = [
  "import { keySet, ref, table, tr, vText } from '@yoyaflow/yoya-ui/core';",
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
  ''
].join('\n');

const target = { file: 'src/main.js', fn: 'buildRow', mode: 'element' };

describe('wireRowModule (pure transform)', () => {
  it('renames the source function, appends a same-name wrapper and keeps the rest verbatim', () => {
    const wired = wireRowModule({ source: businessSource, target, core, runtime: runtimeUrl });

    expect(wired).not.toBeNull();
    expect(wired.code.startsWith(businessSource.split('export function buildRow')[0])).toBe(true);
    expect(wired.code).toContain('function buildRowSource(item) {');
    expect(wired.code).toContain('export function buildRow(item) {');
    expect(wired.code).not.toContain('export function buildRowSource(item) {');
    expect(wired.code).toContain('__yoyaRowFactory ??= createRowFactory({ removeRow });');
    // 业务语句逐行保留（除了那一处函数声明改名）
    const bodyLines = businessSource
      .split('\n')
      .filter((line) => line.trim() !== '' && !line.includes('function buildRow'));
    bodyLines.forEach((line) => expect(wired.code).toContain(line));
  });

  it('leaves the module alone when the target is missing, duplicated or unbuildable', () => {
    expect(wireRowModule({ source: 'export const x = 1;\n', target, core })).toBeNull();
    expect(
      wireRowModule({
        source: `${businessSource}\nexport function buildRow(other) {\n  return tr((line) => line.td('x'));\n}\n`,
        target,
        core
      })
    ).toBeNull();
    expect(
      wireRowModule({
        source: businessSource.replace('(item)', '({ data, api })'),
        target,
        core
      })
    ).toBeNull();
    expect(
      wireRowModule({
        source: businessSource.replace(
          "line.td((cell) => cell.className('col-md-1').child(String(item.data.id)));",
          'if (item.data.id) {\n      line.td((cell) => cell.child(String(item.data.id)));\n    }'
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
    const wired = wireRowModule({ source, target, core, runtime: runtimeUrl });

    expect(wired).not.toBeNull();
    expect(wired.code).toContain("const note = 'function buildRow(item) {}';");
    expect(wired.code).toContain('function buildRowSource(item) {');
  });
});

describe('yoyaCompilePlugin (esbuild protocol)', () => {
  it('registers the virtual artifact and returns transformed contents for the target file', () => {
    const file = join(workDir, 'main.js');
    const plugin = yoyaCompilePlugin({
      core,
      runtime: runtimeUrl,
      rows: [{ ...target, file }]
    });
    const loaders = [];
    const resolvers = [];
    plugin.setup({
      onLoad: (options, callback) => loaders.push({ ...options, callback }),
      onResolve: (options, callback) => resolvers.push({ ...options, callback })
    });

    expect(plugin.name).toBe('yoya-ui-compile');
    expect(resolvers).toHaveLength(1);

    writeFileSync(file, businessSource, 'utf8');
    const loader = loaders.find((entry) => entry.filter.test(file) && !entry.filter.test('x.css'));
    const loaded = loader.callback({ path: file });

    expect(loaded.resolveDir).toBe(workDir);
    expect(loaded.contents).toContain('function buildRowSource(item) {');
    expect(plugin.virtualModules.size).toBe(1);

    const [virtualId, moduleSource] = [...plugin.virtualModules.entries()][0];
    expect(moduleSource).toContain('export function createRowFactory(scope)');
    expect(virtualId.startsWith('\0yoya-row:buildRow-')).toBe(true);
    // 产物里的 import 字面量把 NUL 转义成 \u0000（JSON.stringify 的口径）
    expect(loaded.contents).toContain(virtualId.replace('\0', '\\u0000'));
  });
});

describe('compiled row through keyed (ticket 15 + 16 together)', () => {
  it('mounts compiled element rows declared with the untouched business source', async () => {
    const file = join(workDir, 'mount-main.js');
    writeFileSync(file, businessSource, 'utf8');
    const wired = wireRowModule({ source: businessSource, target, core, runtime: runtimeUrl });
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
    await import(runtimeUrl); // 产物的 runtime 钩子已在模块里 import
    expect(readFileSync(file, 'utf8')).toBe(businessSource); // 业务源码文件没有被改
  });
});
