// 命名根 / 赋值流（票 21 §2.1 第 3 / 5 条）：基础元素的组合块先存进变量再交出，
// 只要"唯一声明 + 唯一消费"就照编，且产物与直接 return 的写法逐字节一致。
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '../yoya.core.js';
import { compileSource } from './index.js';
import { componentUnits, wireComponentModule } from './plugin.js';
import * as dsl from './fixtures/view-alias.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-view-alias-'));
const runtimeUrl = pathToFileURL(join(process.cwd(), 'src/compiler/runtime.js')).href;
const coreUrl = pathToFileURL(join(process.cwd(), 'src/yoya.core.js')).href;
const source = readFileSync(join(import.meta.dirname, 'fixtures/view-alias.js'), 'utf8');

afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const compile = async (fn, mode) => {
  const result = compileSource({
    source,
    file: 'view-alias.js',
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

/** 走消费者路径 import 改写后的模块（虚拟子单元落盘 + specifier 替换）。 */
const importWired = async (wired, label) => {
  const replacements = new Map();
  wired.units.forEach((unit, index) => {
    const path = join(workDir, `${label}.unit${index}.js`);
    replacements.set(JSON.stringify(unit.virtual), JSON.stringify(pathToFileURL(path).href));
    writeFileSync(path, unit.module, 'utf8');
  });
  let code = wired.code;
  replacements.forEach((to, from) => {
    code = code.replaceAll(from, to);
  });
  // 夹具在 `src/compiler/fixtures/` 下，搬进 `.scratch/` 后相对路径会指错
  code = code.replaceAll("'../../yoya.core.js'", JSON.stringify(coreUrl));
  const path = join(workDir, `${label}.wired.js`);
  writeFileSync(path, code, 'utf8');
  return import(pathToFileURL(path).href);
};

describe('命名根 / 赋值流（票 21 §2.1）', () => {
  it('`const view = div(…); return view;` 照编，且与通用路径一致', async () => {
    for (const mode of ['element', 'node']) {
      const built = await compile('NamedCard', mode);
      expect(built.compiled, `NamedCard@${mode}: ${JSON.stringify(built.bails)}`).toBe(true);
      // 插件就地替换的是**初始化表达式**，`const view = …; return view;` 这一行不动
      expect(built.plan.html).toContain('<div class="card"');

      const props = () => ({ label: core.ref('命名根') });
      const el =
        mode === 'element'
          ? built.generated.createRowFactory({})(props()).el
          : built.generated.createRowFactory({})(props()).renderDom();
      expect(signature(el), mode).toBe(signature(dsl.NamedCard(props()).renderDom()));
    }
  });

  it('vNode 里的命名根：命令体保留，只替换内层视图表达式', async () => {
    const units = componentUnits(source, { core, file: 'view-alias.js' });
    expect(units.map((unit) => unit.component)).toContain('NamedWidget');

    const unit = units.find((entry) => entry.component === 'NamedWidget');
    const wired = wireComponentModule({
      source,
      targets: [unit],
      core,
      runtime: runtimeUrl,
      file: 'view-alias.js'
    });
    expect(wired).not.toBeNull();
    expect(wired.code).toContain('api.mark');
    expect(wired.code).toContain('const view = (');
    expect(wired.code).toContain('return view;');
  });

  it('视图变量被读过 → 不拒绝，自动换**节点通道**（产物是节点，运行期读它照常）', async () => {
    const reused = await compile('ReusedCard', 'element');
    expect(reused.compiled, JSON.stringify(reused.bails)).toBe(true);
    // 走的是节点通道：元素通道的产物是 { el, … }，撑不起原文里的 view.attr(…)
    expect(reused.plan.mode).toBe('node');

    const product = reused.generated.createRowFactory({})({ label: core.ref('读视图') });
    // 产物是节点——源里那句 `view.attr('data-kind', 'demo')` 在运行期能照常执行
    expect(typeof product.attr).toBe('function');
    const element = product.renderDom();
    expect(element.className).toBe('card');
    expect(element.textContent).toBe('读视图');

    // 插件路径：那句运行期读法原样留在源码里，只把块换成产物
    const unit = componentUnits(source, { core, file: 'view-alias.js' }).find(
      (entry) => entry.component === 'ReusedCard'
    );
    const wired = wireComponentModule({
      source,
      targets: [unit],
      core,
      runtime: runtimeUrl,
      file: 'view-alias.js'
    });
    expect(wired.code).toContain("view.attr('data-kind', 'demo')");
  });

  it('多次赋值 → 不拒绝，取**源码最后那一处**（运行期生效的那份）', async () => {
    const reassigned = await compile('ReassignedCard', 'element');
    expect(reassigned.compiled, JSON.stringify(reassigned.bails)).toBe(true);
    expect(reassigned.plan.html).toContain('class="b"');

    const props = () => ({ label: core.ref('最后一处') });
    const product = reassigned.generated.createRowFactory({})(props());
    const element = reassigned.plan.mode === 'element' ? product.el : product.renderDom();
    expect(signature(element)).toBe(signature(dsl.ReassignedCard(props()).renderDom()));
    expect(element.className).toBe('b');
  });

  it('赋值流：`let view = null; view = div(…); return view;` 也照编', async () => {
    for (const mode of ['element', 'node']) {
      const built = await compile('AssignedCard', mode);
      expect(built.compiled, `AssignedCard@${mode}: ${JSON.stringify(built.bails)}`).toBe(true);

      const props = () => ({ label: core.ref('赋值流') });
      const el =
        mode === 'element'
          ? built.generated.createRowFactory({})(props()).el
          : built.generated.createRowFactory({})(props()).renderDom();
      expect(signature(el), mode).toBe(signature(dsl.AssignedCard(props()).renderDom()));
    }
  });

  it('节点通道：命令里读视图变量也照编（就地替换后命令照旧）', async () => {
    const units = componentUnits(source, { core, file: 'view-alias.js' });
    expect(units.map((unit) => unit.component)).toContain('CommandReadsView');

    const built = await compile('CommandReadsView', 'node');
    expect(built.compiled, JSON.stringify(built.bails)).toBe(true);

    const unit = units.find((entry) => entry.component === 'CommandReadsView');
    const wired = wireComponentModule({
      source,
      targets: [unit],
      core,
      runtime: runtimeUrl,
      file: 'view-alias.js'
    });
    expect(wired).not.toBeNull();
    // 就地替换：`const view = …` 与命令体都还在，只把初始化表达式换成产物
    expect(wired.code).toContain('view.attr(');
    expect(wired.code).toContain('const view = (');
  });

  it('形态 B（组件对象）：render() 里命名根也照编，另一个成员原样保留', async () => {
    const units = componentUnits(source, { core, file: 'view-alias.js' });
    const unit = units.find((entry) => entry.component === 'RenderObjectCard');
    expect(unit, 'RenderObjectCard 应该被认成组件单元').toBeTruthy();

    const wired = wireComponentModule({
      source,
      targets: [unit],
      core,
      runtime: runtimeUrl,
      file: 'view-alias.js'
    });
    expect(wired).not.toBeNull();
    expect(wired.code).toContain('touch()');
    expect(wired.code).toContain('const view = (');
    expect(wired.code).toContain('return view;');
  });

  it('形态 B（组件对象）：块声明在组件体、render 只交出它 → 照样定位到', async () => {
    for (const mode of ['element', 'node']) {
      const built = await compile('OuterRootCard', mode);
      expect(built.compiled, `OuterRootCard@${mode}: ${JSON.stringify(built.bails)}`).toBe(true);

      const props = () => ({ label: core.ref('外层声明') });
      const el =
        mode === 'element'
          ? built.generated.createRowFactory({})(props()).el
          : built.generated.createRowFactory({})(props()).renderDom();
      expect(signature(el), mode).toBe(signature(dsl.OuterRootCard(props()).render().renderDom()));
    }
  });

  it('候选只在**同层**：闭包 / 别的方法里的赋值不当"那一块"', async () => {
    const built = await compile('SameLevelCard', 'element');
    expect(built.compiled, JSON.stringify(built.bails)).toBe(true);
    // 同层那块是 `same-level`；闭包 / other-method 两块没被选中
    expect(built.plan.html).toContain('class="same-level"');

    const props = () => ({ label: core.ref('同层') });
    const el = built.generated.createRowFactory({})(props()).el;
    expect(signature(el)).toBe(signature(dsl.SameLevelCard(props()).render().renderDom()));
    expect(el.className).toBe('same-level');
  });

  it('视图句柄被读过 → 走**就地替换**：包装路径会把视图之外的语句悄悄丢掉', async () => {
    const unit = componentUnits(source, { core, file: 'view-alias.js' }).find(
      (entry) => entry.component === 'ReusedCard'
    );
    const wired = wireComponentModule({
      source,
      targets: [unit],
      core,
      runtime: runtimeUrl
    });
    expect(wired).not.toBeNull();
    // 源函数**不改名**（包装路径会改成 `ReusedCardSource` 再转调产物，视图之外的语句就不执行了）
    expect(wired.code).toContain('function ReusedCard(props = {})');
    expect(wired.code).not.toContain('ReusedCardSource');
    expect(wired.code).toContain("view.attr('data-kind', 'demo')");

    const compiled = await importWired(wired, 'reused-card');
    const props = () => ({ label: core.ref('读过') });
    const element = compiled.ReusedCard(props()).renderDom();
    // 那句运行期写入照常落地（等价于通用路径）
    expect(signature(element)).toBe(signature(dsl.ReusedCard(props()).renderDom()));
    expect(element.getAttribute('data-kind')).toBe('demo');
  });
});
