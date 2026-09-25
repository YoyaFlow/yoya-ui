// 快捷名索引（票 15 §Q4）：注册表按定义名登记单元，调用点写快捷名 —— 别名条目要把两者对上。
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from '@babel/parser';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '@yoyaflow/yoya-core';
import { componentUnits, compileModuleRegistry } from './plugin.js';
import { topLevelFunctions } from './discover.js';
import { sourceLabelOf } from './emit.js';
import * as dsl from './fixtures/shortcut-link.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-shortcut-link-'));
const runtimeUrl = pathToFileURL(
  join(process.cwd(), 'packages/yoya-core/src/core/compiler-runtime.js')
).href;
const coreUrl = pathToFileURL(join(process.cwd(), 'packages/yoya-ui/src/index.js')).href;
const file = 'packages/yoya-ui/src/compiler/fixtures/shortcut-link.js';
const source = readFileSync(join(import.meta.dirname, 'fixtures/shortcut-link.js'), 'utf8');

afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const buildRegistry = () => {
  const ast = parse(source, { sourceType: 'module' });
  const list = componentUnits(source, { core, file });
  const declarations = new Map(topLevelFunctions(ast).map((entry) => [entry.name, entry]));
  return {
    list,
    ...compileModuleRegistry({
      ast,
      source,
      list,
      declarations,
      core,
      runtime: runtimeUrl,
      coreSpecifier: coreUrl,
      fileLabelOf: (unit) => sourceLabelOf(unit?.file ?? file)
    })
  };
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

describe('快捷名索引（票 15 §Q4）', () => {
  it('注册表同时有定义名与快捷名条目', () => {
    const { registry } = buildRegistry();
    const keys = [...registry.keys()].map((key) => key.split('#')[1]);
    expect(keys).toContain('VThing');
    expect(keys).toContain('vThing');
  });

  it('`child(vThing())`（快捷名 + 零实参）能链接并编出来，DOM 与通用路径一致', async () => {
    const { list, compileWith } = buildRegistry();
    const unit = list.find((entry) => entry.component === 'Widget');
    const compiled = compileWith(unit, 'element');

    expect(compiled.compiled, JSON.stringify(compiled.bails)).toBe(true);
    // 链接成功：产物里不再出现"未链接的组件调用"这类 bail
    expect(compiled.bails).toEqual([]);

    const out = join(workDir, 'widget.element.js');
    writeFileSync(out, compiled.module, 'utf8');
    const module = await import(pathToFileURL(out).href);
    const element = module.createRowFactory({})().el;
    expect(signature(element)).toBe(signature(dsl.Widget().renderDom()));
  });

  it('`child(vThing({…}))`（快捷名 + 字面量 options 实参）摊平，实参落到那个元素上', async () => {
    const { list, compileWith } = buildRegistry();
    const unit = list.find((entry) => entry.component === 'WidgetWithArgs');
    const compiled = compileWith(unit, 'element');

    expect(compiled.compiled, JSON.stringify(compiled.bails)).toBe(true);
    // 实参是"对新元素的 options"：直接并进那块（`data-x="1"`）
    expect(compiled.plan.html).toContain('data-x="1"');

    const out = join(workDir, 'widget-args.element.js');
    writeFileSync(out, compiled.module, 'utf8');
    const module = await import(pathToFileURL(out).href);
    const element = module.createRowFactory({})().el;
    expect(signature(element)).toBe(signature(dsl.WidgetWithArgs().renderDom()));
  });

  it('实参认不出（变量）→ 不摊平，整体回落', () => {
    const { list, compileWith } = buildRegistry();
    const unit = list.find((entry) => entry.component === 'WidgetWithDynamicArgs');
    const compiled = compileWith(unit, 'element');

    expect(compiled.compiled).toBe(false);
  });
});
