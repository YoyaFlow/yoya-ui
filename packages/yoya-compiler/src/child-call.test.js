/**
 * `child(<元素工厂>(…))`（票 21 §2.1.11）：它与前缀写法 `cell.span(…)` 同义，
 * 所以带 options 的 `cell.child(span({…}, (box) => …))` 也照编，且与通用路径逐字节一致。
 *
 * 比对用**顺序无关签名**：元素通道的属性顺序按对象键序写、通用路径按引擎落盘顺序写
 * （`class` 的位置），这是票 41 / 票 18 §8 的既有口径，与本刀无关。
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '@yoyaflow/yoya-core';
import * as dsl from './fixtures/child-call.js';
import { compileSource } from './index.js';
import { componentUnits, wireComponentModule } from './plugin.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-child-call-'));
const runtimeUrl = pathToFileURL(
  join(process.cwd(), 'packages/yoya-core/src/core/compiler-runtime.js')
).href;
const coreUrl = pathToFileURL(join(process.cwd(), 'packages/yoya-ui/src/index.js')).href;
const source = readFileSync(join(import.meta.dirname, 'fixtures/child-call.js'), 'utf8');

afterAll(() => rmSync(workDir, { recursive: true, force: true }));

/** 消费者路径：走插件改写 → 落盘 → import（与通用路径同一份源码对照）。 */
const wire = async (label) => {
  const units = componentUnits(source, { core, file: 'child-call.js' });
  const wired = wireComponentModule({
    source,
    targets: units,
    core,
    runtime: runtimeUrl,
    coreSpecifier: coreUrl
  });
  if (!wired) {
    return { wired: null };
  }
  const replacements = new Map();
  wired.units.forEach((unit, index) => {
    const path = join(workDir, `${label}.unit${index}.js`);
    replacements.set(JSON.stringify(unit.virtual), JSON.stringify(pathToFileURL(path).href));
    writeFileSync(path, unit.module, 'utf8');
  });
  const rewrite = (text) => {
    let out = text;
    replacements.forEach((to, from) => {
      out = out.replaceAll(from, to);
    });
    // 夹具源码写在 `packages/yoya-ui/src/compiler/fixtures/` 里，落到 `.scratch/` 后相对路径会指错 —— 把 core 指回去。
    return out.replaceAll("'../../yoya.core.js'", JSON.stringify(coreUrl));
  };
  const wiredPath = join(workDir, `${label}.wired.js`);
  writeFileSync(wiredPath, rewrite(wired.code), 'utf8');
  return { wired, compiled: await import(pathToFileURL(wiredPath).href) };
};

const compile = async (fn, mode) => {
  const result = compileSource({
    source,
    file: 'child-call.js',
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

describe('child(<元素工厂>(…))（票 21 §2.1.11）', () => {
  it('带 options 的 child 实参照编，两条通道都与通用路径一致', async () => {
    for (const mode of ['element', 'node']) {
      const built = await compile('ChildCallCard', mode);
      expect(built.compiled, `ChildCallCard@${mode}: ${JSON.stringify(built.bails)}`).toBe(true);

      const props = () => ({ label: core.ref('子元素') });
      const el =
        mode === 'element'
          ? built.generated.createRowFactory({})(props()).el
          : built.generated.createRowFactory({})(props()).renderDom();
      expect(signature(el), mode).toBe(signature(dsl.ChildCallCard(props()).renderDom()));
    }
  });

  it('vNode 里的同一形状：命令体保留，产物照样与通用路径一致', async () => {
    const { wired, compiled } = await wire('child-call');
    expect(wired, 'child-call 夹具应该有可编单元').not.toBeNull();

    const props = () => ({ label: core.ref('部件') });
    const instance = compiled.ChildCallWidget(props());
    expect(signature(instance.renderDom())).toBe(
      signature(dsl.ChildCallWidget(props()).renderDom())
    );
    // 命令面还在（就地替换，`api.tag` 一行没动）
    instance.tag();
    expect(instance.renderDom().getAttribute('data-tag')).toBe('yes');
  });

  it('认不出的形状仍整体回落（不猜）', async () => {
    const noParam = await compile('NoParamChildCard', 'node');
    expect(noParam.compiled).toBe(false);
    expect(noParam.bails.map((bail) => bail.reason)).toContain('子工厂 span 的 setup 没有参数');

    const outOfOrder = await compile('OrderUnknownCard', 'node');
    expect(outOfOrder.compiled).toBe(false);
    expect(outOfOrder.bails.map((bail) => bail.reason)).toContain(
      '子工厂 span 的动态实参后面还有参数（顺序无法保证）'
    );
  });
});
