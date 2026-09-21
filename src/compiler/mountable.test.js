/**
 * 票 43 的"操作识别"门禁：`mountable(...)` 是**操作**，不是元素工厂。
 * 两条通道的产物与通用路径逐字节一致——尤其是"离场 → 回场后回到原位"。
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '../yoya.core.js';
import { ref } from '../core/signals/handle.js';
import { Panel } from './fixtures/panel-fixture.js';
import { compileSource } from './index.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-mountable-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(join(process.cwd(), 'src/compiler/runtime.js')).href;
const source = readFileSync(join(import.meta.dirname, 'fixtures/panel-fixture.js'), 'utf8');

const load = (mode, name) => {
  const result = compileSource({
    source,
    file: 'panel-fixture.js',
    fn: 'Panel',
    mode,
    core,
    runtime: runtimeUrl
  });
  expect(result.bails).toEqual([]);
  expect(result.compiled).toBe(true);
  const path = join(workDir, name);
  writeFileSync(path, result.module, 'utf8');
  return import(pathToFileURL(path).href);
};

describe('mountable 作为操作的编译产物', () => {
  it('元素通道走 mountableAt；节点通道复用节点自己的 mountable', () => {
    const element = compileSource({ source, file: 'panel-fixture.js', fn: 'Panel', core });
    expect(element.compiled).toBe(true);
    expect(element.module).toContain('mountableAt(');

    const node = compileSource({
      source,
      file: 'panel-fixture.js',
      fn: 'Panel',
      mode: 'node',
      core
    });
    expect(node.bails).toEqual([]);
    expect(node.compiled).toBe(true);
    // 节点通道：包装对象在入树前就地声明条件，由父节点收养时建绑定（与通用路径同一时序）
    expect(node.module).toContain('node.mountable(');
  });

  it('元素通道：离场 / 回场的 DOM 与通用路径逐字节一致', async () => {
    const generated = await load('element', 'panel.element.js');
    const factory = generated.createRowFactory({});
    const visible = ref(false);
    const label = ref('body');
    const compiled = factory({ visible, label }).el;
    const dsl = Panel({ visible, label }).renderDom();

    expect(compiled.outerHTML).toBe(dsl.outerHTML); // 初始离场

    visible.value = true;
    expect(compiled.outerHTML).toBe(dsl.outerHTML); // 回场（必须在 head 与 tail 之间）
    expect(compiled.children[1].className).toBe('panel-body');

    visible.value = false;
    expect(compiled.outerHTML).toBe(dsl.outerHTML); // 再次离场

    visible.value = true;
    expect(compiled.outerHTML).toBe(dsl.outerHTML);

    label.value = 'body!';
    expect(compiled.outerHTML).toBe(dsl.outerHTML); // 回场后活值照旧
  });

  it('节点通道：离场 / 回场的 DOM 与通用路径逐字节一致', async () => {
    const generated = await load('node', 'panel.node.js');
    const factory = generated.createRowFactory({});
    const visible = ref(false);
    const label = ref('body');
    const compiled = factory({ visible, label });
    const dsl = Panel({ visible, label }).renderDom();

    expect(compiled.renderDom().outerHTML).toBe(dsl.outerHTML); // 初始离场

    visible.value = true;
    expect(compiled.renderDom().outerHTML).toBe(dsl.outerHTML); // 回场（必须在 head 与 tail 之间）
    expect(compiled.renderDom().children[1].className).toBe('panel-body');

    visible.value = false;
    expect(compiled.renderDom().outerHTML).toBe(dsl.outerHTML); // 再次离场

    visible.value = true;
    label.value = 'body!';
    expect(compiled.renderDom().outerHTML).toBe(dsl.outerHTML); // 回场后活值照旧
  });
});
