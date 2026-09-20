/**
 * 票 16 / R1 / R2 / R4：构建期 transform——业务源码零改动，产物进虚拟模块，认不准就不动。
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
import { wireRowModule, yoyaCompile, yoyaCompilePlugin } from './plugin.js';

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
      rows: [{ ...target, file }]
    });
    expect(plugin.name).toBe('yoya-ui-compile');
    // esbuild 会校验插件对象：unplugin 生成的 esbuild 插件只能有 name / setup
    expect(Object.keys(plugin).sort()).toEqual(['name', 'setup']);

    const artifacts = [];
    const vite = yoyaCompile.vite({
      core,
      rows: [{ ...target, file }],
      onArtifact: (name, source) => artifacts.push([name, source])
    });
    expect(vite.name).toBe('yoya-ui-compile');

    writeFileSync(file, businessSource, 'utf8');
    const loaded = vite.transform(businessSource, file);

    expect(loaded.code).toContain('function buildRowSource(item) {');
    // sourcemap：改写不能打断定位链（改写点之后的业务行仍映射回原文件的原行）
    expect(loaded.map).toBeTruthy();
    const originalLineOf = (needle) => {
      const index = loaded.code.indexOf(needle);
      const before = loaded.code.slice(0, index);
      const line = before.split('\n').length;
      const column = index - (before.lastIndexOf('\n') + 1);
      return originalPositionFor(new TraceMap(JSON.parse(String(loaded.map))), { line, column });
    };
    // 改写点之后的业务行逐字符保持映射：`col-md-4` 那一行在源码里是第 10 行
    expect(originalLineOf('col-md-4')).toMatchObject({ line: 10 });
    expect(originalLineOf('col-md-4').source).toContain('main.js');
    // 追加的接线代码是生成代码（没有原文对应）→ 不产生映射
    expect(originalLineOf('__yoyaRowFactory ??=').source).toBeNull();
    expect(artifacts).toHaveLength(1);

    const [virtualId, moduleSource] = artifacts[0];
    expect(moduleSource).toContain('export function createRowFactory(scope)');
    // 插件跑在打包器里：运行期钩子默认按包子路径解析（不是 ./compiler-runtime.js）
    expect(moduleSource).toContain('from "@yoyaflow/yoya-ui/compiler-runtime"');
    expect(virtualId.startsWith('\0yoya-row:buildRow-')).toBe(true);
    // 产物里的 import 字面量把 NUL 转义成 \u0000（JSON.stringify 的口径）
    expect(loaded.code).toContain(virtualId.replace('\0', '\\u0000'));
    // 虚拟模块：resolveId 认出、load 取到产物
    expect(vite.resolveId(virtualId)).toEqual({ id: virtualId, external: false });
    const artifact = vite.load(virtualId);
    expect(artifact.code).toBe(moduleSource);
    expect(artifact.map).toBeTruthy();
    expect(artifact.map.sources[0]).toContain('main.js');
    // 非目标文件：transform 返回 null（一律不碰）
    expect(vite.transform('export const x = 1;\n', join(workDir, 'other.js'))).toBeNull();
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
