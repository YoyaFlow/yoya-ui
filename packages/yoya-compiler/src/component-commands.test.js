/**
 * 票 02（compiler-landing）：带命令 / 状态的组件能编。
 *
 * 做法是**就地替换结构表达式**：组件体与 `vNode` setup / 对象组件的成员一行不动，
 * 只把"视图表达式"换成编译产物——于是命令、状态、钩子、`instanceof` 全部天然保留。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '@yoyaflow/yoya-core';
import { componentUnits, wireComponentModule } from './plugin.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-component-commands-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(
  join(process.cwd(), 'packages/yoya-core/src/core/compiler-runtime.js')
).href;
const click = (element) =>
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

/** 把源码写成模块 → 走插件改写 → 落盘 import（消费者路径）。 */
const wire = async (name, source, targets = null) => {
  const file = join(workDir, `${name}.js`);
  writeFileSync(file, source, 'utf8');
  const units = targets ?? componentUnits(source, { core, file });
  const wired = wireComponentModule({ source, targets: units, core, runtime: runtimeUrl });
  if (!wired) {
    return { wired: null };
  }
  const modulePath = join(workDir, `${name}.generated.js`);
  writeFileSync(modulePath, wired.module, 'utf8');
  const wiredPath = join(workDir, `${name}.wired.js`);
  writeFileSync(
    wiredPath,
    wired.code.replace(
      /from "\\u0000yoya-row:[^"]*"/g,
      `from ${JSON.stringify(pathToFileURL(modulePath).href)}`
    ),
    'utf8'
  );
  return {
    wired,
    code: wired.code,
    generic: await import(pathToFileURL(file).href),
    compiled: await import(pathToFileURL(wiredPath).href)
  };
};

const clock = (host) => host.querySelector('.count')?.textContent;

describe('组件的命令 / 状态保留（票 02）', () => {
  it('vNode 组件：命令照旧可用，DOM 与通用路径逐帧一致', async () => {
    const source = [
      "import { div, ref, span, vNode, vText } from '@yoyaflow/yoya-core';",
      '',
      'export function Counter(props) {',
      '  return vNode((api) => {',
      '    api.bump = () => {',
      '      props.count.value += 1;',
      '    };',
      '    return div((box) => {',
      "      box.className('counter');",
      "      box.span((out) => out.className('count').child(vText(props.count)));",
      "      box.button((btn) => btn.className('bump').on('click', () => api.bump()).child('+1'));",
      '    });',
      '  });',
      '}',
      ''
    ].join('\n');

    const { wired, code, generic, compiled } = await wire('counter', source);
    expect(wired, '带命令的 vNode 组件应该能编').not.toBeNull();
    expect(code).toContain('api.bump = () => {'); // 命令原样留在源码里

    const count = core.ref(0);
    const genericNode = generic.Counter({ count }).renderDom();
    const compiledNode = compiled.Counter({ count }).renderDom();

    expect(compiledNode.outerHTML).toBe(genericNode.outerHTML);
    expect(clock(compiledNode)).toBe('0');

    // 命令仍挂在组件实例上：直接调用 + 点按钮两条路都要生效
    const instance = compiled.Counter({ count });
    instance.bump();
    expect(clock(instance.renderDom())).toBe('1');
    expect(clock(generic.Counter({ count }).renderDom())).toBe('1'); // 两条路看同一份状态

    click(compiledNode.querySelector('.bump'));
    expect(count.value).toBe(2);
    expect(clock(genericNode)).toBe('2');
  });

  it('vNode 组件：命令方法照旧可用，DOM 与通用路径一致', async () => {
    const source = [
      "import { div, ref, vNode, vText } from '@yoyaflow/yoya-core';",
      '',
      'export function Stepper(props) {',
      '  return vNode((api) => {',
      '    api.step = () => {',
      '      props.value.value += 1;',
      '      return api;',
      '    };',
      "    return div((box) => box.className('stepper').child(vText(props.value)));",
      '  });',
      '}',
      ''
    ].join('\n');

    const { wired, generic, compiled } = await wire('stepper', source);
    expect(wired, '带命令的 vNode 组件应该能编').not.toBeNull();

    const value = core.ref(0);
    const genericElement = generic.Stepper({ value }).renderDom();
    const compiledElement = compiled.Stepper({ value }).renderDom();
    expect(compiledElement.outerHTML).toBe(genericElement.outerHTML);

    const instance = compiled.Stepper({ value });
    instance.step();
    expect(value.value).toBe(1);
    expect(instance.renderDom().textContent).toBe('1');
  });

  it('组件体有分支 / 多条 return 时不改写源码（整形状回落）', () => {
    const source = [
      "import { div } from '@yoyaflow/yoya-core';",
      '',
      'export function Loose(props) {',
      '  if (props.dense) {',
      "    return div((root) => root.className('dense'));",
      '  }',
      '',
      "  return div((root) => root.className('loose'));",
      '}',
      ''
    ].join('\n');

    const units = componentUnits(source, { core, file: 'loose.js' });
    const wired = wireComponentModule({
      source,
      targets: units,
      core,
      runtime: runtimeUrl
    });

    expect(wired).toBeNull();
  });
});
