/**
 * 等价性门禁：同一份源码，编译路径与通用 DSL 路径必须产出**逐字节相同**的 DOM，
 * 并且活值、事件、销毁的行为一致。
 *
 * 这里刻意走「生成模块 → 落盘 → 真实 import」的消费者路径（不是把生成代码在测试里求值），
 * 这样导入形态、运行期钩子解析、模块边界都一起被验证。
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '../yoya.core.js';
import { Item as buildDslItem, removed, removeItem, selectedId } from './fixtures/item-fixture.js';
import { compileSource } from './index.js';

// 临时产物留在仓库内（vitest 不允许 import 项目根之外的模块），
// 但 `.scratch/` 不进 git —— 干净检出里没有它，所以先建出来。
const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-compile-'));
const generatedPath = join(workDir, 'row.generated.js');
const runtimePath = join(process.cwd(), 'src/compiler/runtime.js');
const runtimeUrl = pathToFileURL(runtimePath).href;

const source = readFileSync(join(import.meta.dirname, 'fixtures/item-fixture.js'), 'utf8');
const compiled = compileSource({
  source,
  file: 'item-fixture.js',
  fn: 'Item',
  core,
  runtime: runtimeUrl
});
writeFileSync(generatedPath, compiled.module, 'utf8');

const generated = await import(pathToFileURL(generatedPath).href);

afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const clickOn = (element) => {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
};

/** 两条路径各建一行：DSL 路径把节点渲染成 DOM，编译路径克隆片段。 */
const buildBoth = (row) => {
  const dslElement = buildDslItem(row).renderDom();
  const factory = generated.createRowFactory({ computed: core.computed, removeItem, selectedId });
  const compiledRow = factory({ ...row });

  return { dslElement, compiledRow };
};

describe('compiled path equivalence', () => {
  it('ships a plan whose source module is the only truth', () => {
    expect(relative(process.cwd(), generatedPath)).toContain('.scratch');
    expect(compiled.compiled).toBe(true);
    expect(generated.plan.html).toBe(compiled.plan.html);
    expect(generated.plan.source).toEqual({ file: 'item-fixture.js', fn: 'Item' });
  });

  it('renders byte-identical DOM for the same row', () => {
    const row = { id: 7, label: core.ref('label 7') };
    const { dslElement, compiledRow } = buildBoth(row);

    expect(compiledRow.el.tagName).toBe('LI');
    expect(compiledRow.el.outerHTML).toBe(dslElement.outerHTML);
  });

  it('keeps live text, live class and dynamic attributes in sync', () => {
    const row = { id: 8, label: core.ref('label 8') };
    const { dslElement, compiledRow } = buildBoth(row);

    row.label.value = 'label 8 !!!';
    expect(compiledRow.el.innerHTML).toBe(dslElement.innerHTML);

    selectedId.value = row.id;
    expect(compiledRow.el.classList.contains('active')).toBe(true);
    expect(dslElement.classList.contains('active')).toBe(true);
    expect(compiledRow.el.outerHTML).toBe(dslElement.outerHTML);

    selectedId.value = null;
    expect(compiledRow.el.classList.contains('active')).toBe(false);
    expect(dslElement.classList.contains('active')).toBe(false);
    expect(compiledRow.el.getAttribute('data-item-id')).toBe('8');
  });

  it('fires row and remove events with the same observable effects', () => {
    const row = { id: 9, label: core.ref('label 9') };
    const { dslElement, compiledRow } = buildBoth(row);

    selectedId.value = null;
    removed.length = 0;
    clickOn(compiledRow.el);
    const compiledSelected = selectedId.value;
    const compiledRemoved = removed.slice();

    selectedId.value = null;
    removed.length = 0;
    clickOn(dslElement);

    expect(compiledSelected).toBe(row.id);
    expect(selectedId.value).toBe(row.id);
    expect(compiledRemoved).toEqual(removed);

    // 行内删除链接：stopPropagation 之后不能再触发选中
    const compiledLink = compiledRow.el.childNodes[2].childNodes[0];
    const dslLink = dslElement.childNodes[2].childNodes[0];
    selectedId.value = null;
    removed.length = 0;
    clickOn(compiledLink);
    const compiledLinkResult = { selected: selectedId.value, removed: removed.slice() };

    selectedId.value = null;
    removed.length = 0;
    clickOn(dslLink);

    expect(compiledLinkResult.selected).toBeNull();
    expect(compiledLinkResult.removed).toEqual([row.id]);
    expect(selectedId.value).toBeNull();
    expect(removed).toEqual([row.id]);
  });

  it('destroys idempotently and stops writing after destroy', () => {
    const row = { id: 10, label: core.ref('label 10') };
    const { dslElement, compiledRow } = buildBoth(row);

    compiledRow.destroy();
    compiledRow.destroy();
    const afterDestroy = compiledRow.el.innerHTML;

    dslElement.remove();
    row.label.value = 'label 10 !!!';

    expect(compiledRow.el.innerHTML).toBe(afterDestroy);
    expect(compiledRow.el.querySelector('a').textContent).toBe('label 10');
  });

  it('builds the same DOM with the node mode', async () => {
    const nodePath = join(workDir, 'row.node.generated.js');
    const nodeCompiled = compileSource({
      source,
      file: 'item-fixture.js',
      fn: 'Item',
      mode: 'node',
      core,
      runtime: runtimeUrl
    });
    writeFileSync(nodePath, nodeCompiled.module, 'utf8');
    const nodeModule = await import(pathToFileURL(nodePath).href);

    // plan.scope 只列**应用符号**：元素工厂由产物自己 import（票 13 / R4，产物不是业务接口）。
    const scope = Object.fromEntries(
      nodeCompiled.scope.map((name) => [
        name,
        { computed: core.computed, removeItem, selectedId, ...core }[name]
      ])
    );
    // 静态节点（span：只有静态类名与属性）不建包装对象；物化节点的工厂由产物 import。
    expect(nodeCompiled.scope).toEqual(['computed', 'removeItem', 'selectedId']);
    // 中性夹具是 li + span + a + i：物化节点的工厂由产物自己 import（票 13 / R4）
    expect(nodeCompiled.module).toContain('from "@yoyaflow/yoya-ui/core";');

    const row = { id: 11, label: core.ref('label 11') };
    const dslElement = buildDslItem(row).renderDom();
    const factory = nodeModule.createRowFactory(scope);
    const node = factory({ ...row });

    // 节点模式的契约：节点树只含活结点及其祖先（静态子树只存在于片段里），
    // 与通用路径逐字节一致的是 DOM（`_el`），不是节点树的序列化结果。
    expect(node._el.outerHTML).toBe(dslElement.outerHTML);
    expect(node.children()).toHaveLength(2);

    selectedId.value = row.id;
    expect(node._el.classList.contains('active')).toBe(true);
    node.destroy();
  });

  // 票 14 / C2：`--thin` 只给"直接带活内容"的节点建包装对象，静态父节点（td）没有节点对象。
  // 这种形状下生成代码若仍把活节点 append 到祖先节点上，会把片段里已就位的元素搬走。
  it('builds the same DOM with the thin node mode', async () => {
    const thinPath = join(workDir, 'row.thin.generated.js');
    const thinCompiled = compileSource({
      source,
      file: 'item-fixture.js',
      fn: 'Item',
      mode: 'node',
      thin: true,
      core,
      runtime: runtimeUrl
    });
    writeFileSync(thinPath, thinCompiled.module, 'utf8');
    const thinModule = await import(pathToFileURL(thinPath).href);

    const scope = Object.fromEntries(
      thinCompiled.scope.map((name) => [
        name,
        { computed: core.computed, removeItem, selectedId, ...core }[name]
      ])
    );

    const row = { id: 12, label: core.ref('label 12') };
    const dslElement = buildDslItem(row).renderDom();
    const node = thinModule.createRowFactory(scope)({ ...row });

    // 关键：挂到父节点上才会走「把子节点 DOM 落进父元素」那一趟。
    // thin 模式的活节点躲在静态父节点（td）里，放置时必须原地留人，不能被搬到 <tr> 末尾。
    const hostElement = core.tbody((body) => body.child(node)).renderDom();
    expect(hostElement.innerHTML).toBe(dslElement.outerHTML);
    node.destroy();
  });

  // 票 14 附带发现：行根没有直接活内容、活文本藏在静态父节点里时，`--thin` 曾直接 `return element`，
  // 把 row.label 的绑定整个丢掉（静默丢活值）。行根因此必须建包装对象，活结点挂到它下面。
  it('keeps live text alive in thin mode when the row root itself is static', async () => {
    const thinPath = join(workDir, 'row.thin-static-root.generated.js');
    const thinCompiled = compileSource({
      source:
        'export function Item(item) {\n' +
        '  return tr((line) => {\n' +
        "    line.td((cell) => {\n      cell.className('item-label');\n      cell.a((link) => link.child(vText(item.label)));\n    });\n" +
        '  });\n' +
        '}\n',
      file: 'thin-static-root.js',
      fn: 'Item',
      mode: 'node',
      thin: true,
      core,
      runtime: runtimeUrl
    });

    expect(thinCompiled.compiled).toBe(true);
    writeFileSync(thinPath, thinCompiled.module, 'utf8');
    const thinModule = await import(pathToFileURL(thinPath).href);
    const scope = Object.fromEntries(
      thinCompiled.scope.map((name) => [
        name,
        { computed: core.computed, removeItem, selectedId, ...core }[name]
      ])
    );

    const label = core.ref('first');
    const node = thinModule.createRowFactory(scope)({ id: 13, label });

    expect(node._el.querySelector('a').textContent).toBe('first');
    label.value = 'second';
    expect(node._el.querySelector('a').textContent).toBe('second');
    node.destroy();
  });

  it('falls back to the generic path instead of shipping a partial fragment', () => {
    const partial = compileSource({
      source:
        "import { tr, vCard } from './x.js';\n" +
        'export function Item(item) {\n' +
        '  return tr((line) => {\n' +
        "    line.td((cell) => cell.className('col').child(String(row.id)));\n" +
        '    line.td((cell) => cell.child(vCard(row)));\n' +
        '  });\n' +
        '}\n',
      file: 'partial.js',
      fn: 'Item',
      core,
      runtime: runtimeUrl
    });

    expect(partial.compiled).toBe(false);
    expect(partial.module).toBeNull();
    expect(partial.bails[0].reason).toContain('组件调用');
  });
});

describe('compiled list reuse', () => {
  it('keeps DOM order aligned with the data after a reorder', async () => {
    const { createElementList } = await import(runtimeUrl);
    const container = document.createElement('tbody');
    const factory = generated.createRowFactory({ computed: core.computed, removeItem, selectedId });
    const list = createElementList(container, (row) => row.id);
    const rows = [1, 2, 3, 4].map((id) => ({ id, label: core.ref(`label ${id}`) }));

    list.sync(rows, factory);
    const first = list.elements()[0];
    expect([...container.children].map((el) => el.getAttribute('data-item-id'))).toEqual([
      '1',
      '2',
      '3',
      '4'
    ]);

    const swapped = [rows[3], rows[1], rows[2], rows[0]];
    list.sync(swapped, factory);
    expect([...container.children].map((el) => el.getAttribute('data-item-id'))).toEqual([
      '4',
      '2',
      '3',
      '1'
    ]);
    expect(list.elements()[3]).toBe(first);

    list.destroy();
    expect(container.children).toHaveLength(0);
  });
});

describe('live attribute placeholders', () => {
  it('removes the fragment placeholder when a live attribute resolves to nothing', async () => {
    const source =
      "import { computed, div, vText } from '../../src/yoya.core.js';\n" +
      'export function Chip(props) {\n' +
      '  return div((root) => {\n' +
      "    root.className('chip');\n" +
      "    root.attr('data-empty', computed(() => (props.total.value === 0 ? 'true' : null)));\n" +
      '    root.child(vText(computed(() => String(props.total.value))));\n' +
      '  });\n' +
      '}\n';
    const file = 'chip-live-attr.js';
    const compiled = compileSource({
      source,
      file,
      fn: 'Chip',
      mode: 'node',
      core,
      runtime: runtimeUrl
    });
    expect(compiled.bails).toEqual([]);
    const path = join(workDir, 'chip-live-attr.generated.js');
    writeFileSync(path, compiled.module, 'utf8');
    const generated = await import(pathToFileURL(path).href);
    const sourcePath = join(workDir, file);
    writeFileSync(sourcePath, source, 'utf8');
    const generic = await import(pathToFileURL(sourcePath).href);

    const props = { total: core.ref(5) };
    const compiledEl = generated.createRowFactory({ computed: core.computed })(props).renderDom();
    const genericEl = generic.Chip({ total: core.ref(5) }).renderDom();

    // 通用路径的 DOM 里没有这个属性 → 片段里的空占位必须对账掉（节点通道）
    expect(compiledEl.outerHTML).toBe('<div class="chip">5</div>');
    expect(compiledEl.outerHTML).toBe(genericEl.outerHTML);

    props.total.value = 0;
    expect(compiledEl.outerHTML).toBe('<div class="chip" data-empty="true">0</div>');
    props.total.value = 5;
    expect(compiledEl.outerHTML).toBe('<div class="chip">5</div>');
  });
});
