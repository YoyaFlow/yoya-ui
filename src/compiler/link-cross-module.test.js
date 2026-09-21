/**
 * 票 07 第二档：**跨模块 / 跨包**组件链接。
 *
 * 插件接一份预构建的组件注册表（`buildComponentRegistry` 产出的**纯数据**）+ 注册表模块路径：
 * 同模块的引用仍然**内联**（同一次构建、作用域可达），跨模块的引用走注册表 + `bindComponent`
 * （含哈希回落）——调用点只做链接，业务源码零改动。
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '../yoya.core.js';
import { Item as genericItem } from './fixtures/item-with-component.js';
import { buildComponentRegistry } from './registry.js';
import { componentUnits, wireComponentModule } from './plugin.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-cross-link-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(join(process.cwd(), 'src/compiler/runtime.js')).href;
const callerFile = posix.join('src/compiler/fixtures/item-with-component.js');
const leafFile = posix.join('src/compiler/fixtures/status-dot.js');

const registryDir = join(workDir, 'components');
const built = buildComponentRegistry({
  entries: [
    { file: leafFile, export: 'StatusDot' },
    { file: leafFile, export: 'StatusTag' }
  ],
  dir: registryDir,
  core,
  runtime: runtimeUrl
});
// 注册表模块在构建产物目录里，插件生成物 import 它的路径（相对 cwd 的书写形式由使用方给）
const registrySpecifier = pathToFileURL(join(registryDir, 'components.registry.js')).href;

const signature = (node) => {
  if (node.nodeType === 3) {
    return `#text:${node.textContent}`;
  }
  const attrs = [...node.attributes]
    .map((item) => `${item.name}=${item.value}`)
    .sort()
    .join(' ');
  return `<${node.tagName.toLowerCase()} ${attrs}>${[...node.childNodes].map(signature).join('')}`;
};

const sampleRow = () => ({
  id: 3,
  dot: { tone: 'ok', label: core.ref('在线') },
  tag: { label: core.ref('v1') }
});

/** 走插件把调用方模块接好线，然后 import **产物单元**（业务模块本身在 fixtures 里不动）。 */
const wireCaller = async (mode) => {
  const source = readFileSync(callerFile, 'utf8');
  const targets = componentUnits(source, { core, file: callerFile, mode });
  const wired = wireComponentModule({
    source,
    targets,
    core,
    runtime: runtimeUrl,
    components: built.registry,
    componentsSpecifier: registrySpecifier
  });
  expect(wired, '跨模块链接应该能编').not.toBeNull();

  const path = join(workDir, `item.${mode}.js`);
  writeFileSync(path, wired.units[0].module, 'utf8');
  return { wired, module: await import(pathToFileURL(path).href) };
};

describe('跨模块组件链接（票 07 第二档）', () => {
  it('element 通道：注册表命中 → 调用点只做链接，DOM 与通用路径逐帧一致', async () => {
    const { module } = await wireCaller('element');
    const row = sampleRow();
    const compiledEl = module.createRowFactory({})(row).el;
    const genericEl = genericItem(sampleRow()).renderDom();

    expect(signature(compiledEl)).toBe(signature(genericEl));
    expect([...compiledEl.querySelectorAll('.status-dot')].map((el) => el.textContent)).toEqual([
      '在线'
    ]);

    // 链接进来的活值跟着走（注册表条目的 bind 写着位置写）
    row.dot.label.value = '在线 !!!';
    expect(compiledEl.querySelector('.status-dot').textContent).toBe('在线 !!!');
  });

  it('node 通道：链接的退订跟着节点销毁一起释放', async () => {
    const { module } = await wireCaller('node');
    const row = sampleRow();
    const node = module.createRowFactory({})(row);
    const compiledEl = node.renderDom();
    const genericEl = genericItem(sampleRow()).renderDom();

    expect(signature(compiledEl)).toBe(signature(genericEl));
    // 链接组件的退订挂在**承载它的那个节点**（item-dot / item-tag 的 span）的清理名单上
    const hasCleanup = (current) =>
      (current._cleanup?.length ?? 0) > 0 || (current._children ?? []).some(hasCleanup);
    expect(hasCleanup(node)).toBe(true);
    expect(() => node.destroy()).not.toThrow();
  });

  it('没有注册表时，跨模块调用点原样保留（走通用路径）', async () => {
    const file = join(workDir, 'item-plain.js');
    const source = readFileSync(callerFile, 'utf8');
    writeFileSync(file, source, 'utf8');
    const targets = componentUnits(source, { core, file: callerFile, mode: 'element' });
    const wired = wireComponentModule({
      source,
      targets,
      core,
      runtime: runtimeUrl
    });
    expect(wired).toBeNull(); // 全部单元都回落 → 源码原样
  });
});
