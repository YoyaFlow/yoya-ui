// 认不出的父方法调用当"洞"（票 21 §2.1.7）：表达式原样留到运行期，结果按边界插回原位。
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '@yoyaflow/yoya-core';
import { compileSource } from './index.js';
import * as dsl from './fixtures/hole-call.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-hole-call-'));
const runtimeUrl = pathToFileURL(
  join(process.cwd(), 'packages/yoya-core/src/core/compiler-runtime.js')
).href;
const coreUrl = pathToFileURL(join(process.cwd(), 'packages/yoya-ui/src/index.js')).href;
const source = readFileSync(join(import.meta.dirname, 'fixtures/hole-call.js'), 'utf8');

afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const compile = (mode) =>
  compileSource({
    source,
    file: 'hole-call.js',
    fn: 'Panel',
    mode,
    core,
    runtime: runtimeUrl,
    coreSpecifier: coreUrl
  });

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

describe('认不出的父方法调用当洞', () => {
  it('编译并自动换节点产物；洞里那句留到运行期，位置与通用路径一致', async () => {
    const compiled = compile('element');
    expect(compiled.compiled, JSON.stringify(compiled.bails)).toBe(true);
    // 洞里的值是节点 → 产物必须是节点（元素通道的 { el, … } 撑不起）
    expect(compiled.plan.mode).toBe('node');
    // 片段里只有静态兄弟，没有洞那棵子树（它是运行期建的）
    expect(compiled.plan.html).toContain('前');
    expect(compiled.plan.html).toContain('后');
    expect(compiled.plan.html).not.toContain('helper');

    const out = join(workDir, 'panel.node.js');
    writeFileSync(out, compiled.module, 'utf8');
    const module = await import(pathToFileURL(out).href);
    // 洞里的表达式引用了模块级名字（`helper`）→ 产物按 scope 拿它（插件就是这么喂的）
    const element = module.createRowFactory({ helper: dsl.helper })().renderDom();

    expect(signature(element)).toBe(signature(dsl.Panel().renderDom()));
  });

  it('通用路径就是这个语义：`root.helper(args)` ≡ `root.child(helper(args))`', () => {
    const element = dsl.Panel().renderDom();
    expect([...element.childNodes].map((child) => child.outerHTML ?? child.textContent)).toEqual([
      expect.stringContaining('前'),
      '<div class="helper">洞</div>',
      expect.stringContaining('后')
    ]);
  });
});
