/**
 * 等价性门禁：同一份源码，编译路径与通用 DSL 路径必须产出**逐字节相同**的 DOM，
 * 并且活值、事件、销毁的行为一致。
 *
 * 这里刻意走「生成模块 → 落盘 → 真实 import」的消费者路径（不是把生成代码在测试里求值），
 * 这样导入形态、运行期钩子解析、模块边界都一起被验证。
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '../yoya.core.js';
import { buildRow as buildDslRow, removed, removeRow, selectedId } from './fixtures/row-fixture.js';
import { compileSource } from './index.js';

const workDir = mkdtempSync(join(process.cwd(), '.scratch', 'tmp-compile-'));
const generatedPath = join(workDir, 'row.generated.js');
const runtimePath = join(process.cwd(), 'src/compiler/runtime.js');
const runtimeUrl = pathToFileURL(runtimePath).href;

const source = readFileSync(join(import.meta.dirname, 'fixtures/row-fixture.js'), 'utf8');
const compiled = compileSource({
  source,
  file: 'row-fixture.js',
  fn: 'buildRow',
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
  const dslElement = buildDslRow(row).renderDom();
  const factory = generated.createRowFactory({ computed: core.computed, removeRow, selectedId });
  const compiledRow = factory({ ...row });

  return { dslElement, compiledRow };
};

describe('compiled path equivalence', () => {
  it('ships a plan whose source module is the only truth', () => {
    expect(relative(process.cwd(), generatedPath)).toContain('.scratch');
    expect(compiled.compiled).toBe(true);
    expect(generated.plan.html).toBe(compiled.plan.html);
    expect(generated.plan.source).toEqual({ file: 'row-fixture.js', fn: 'buildRow' });
  });

  it('renders byte-identical DOM for the same row', () => {
    const row = { id: 7, label: core.ref('label 7') };
    const { dslElement, compiledRow } = buildBoth(row);

    expect(compiledRow.el.tagName).toBe('TR');
    expect(compiledRow.el.outerHTML).toBe(dslElement.outerHTML);
  });

  it('keeps live text, live class and dynamic attributes in sync', () => {
    const row = { id: 8, label: core.ref('label 8') };
    const { dslElement, compiledRow } = buildBoth(row);

    row.label.value = 'label 8 !!!';
    expect(compiledRow.el.innerHTML).toBe(dslElement.innerHTML);

    selectedId.value = row.id;
    expect(compiledRow.el.classList.contains('danger')).toBe(true);
    expect(dslElement.classList.contains('danger')).toBe(true);
    expect(compiledRow.el.outerHTML).toBe(dslElement.outerHTML);

    selectedId.value = null;
    expect(compiledRow.el.classList.contains('danger')).toBe(false);
    expect(dslElement.classList.contains('danger')).toBe(false);
    expect(compiledRow.el.getAttribute('data-row-id')).toBe('8');
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
      file: 'row-fixture.js',
      fn: 'buildRow',
      mode: 'node',
      core,
      runtime: runtimeUrl
    });
    writeFileSync(nodePath, nodeCompiled.module, 'utf8');
    const nodeModule = await import(pathToFileURL(nodePath).href);

    // plan.scope 就是生成模块要求调用方提供的符号：应用值 + 物化节点要用的元素工厂
    const scope = Object.fromEntries(
      nodeCompiled.scope.map((name) => [
        name,
        { computed: core.computed, removeRow, selectedId, ...core }[name]
      ])
    );
    // 静态节点（span：只有静态类名与属性）不建包装对象，工厂名因此不进 scope
    expect(nodeCompiled.scope).toEqual(['a', 'computed', 'removeRow', 'selectedId', 'td', 'tr']);

    const row = { id: 11, label: core.ref('label 11') };
    const dslElement = buildDslRow(row).renderDom();
    const factory = nodeModule.createRowFactory(scope);
    const node = factory({ ...row });

    // 节点模式的契约：节点树只含活结点及其祖先（静态子树只存在于片段里），
    // 与通用路径逐字节一致的是 DOM（`_el`），不是节点树的序列化结果。
    expect(node._el.outerHTML).toBe(dslElement.outerHTML);
    expect(node.children()).toHaveLength(2);

    selectedId.value = row.id;
    expect(node._el.classList.contains('danger')).toBe(true);
    node.destroy();
  });

  it('falls back to the generic path instead of shipping a partial fragment', () => {
    const partial = compileSource({
      source:
        "import { tr, vCard } from './x.js';\n" +
        'export function buildRow(row) {\n' +
        '  return tr((line) => {\n' +
        "    line.td((cell) => cell.className('col').child(String(row.id)));\n" +
        '    line.td((cell) => cell.child(vCard(row)));\n' +
        '  });\n' +
        '}\n',
      file: 'partial.js',
      fn: 'buildRow',
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
    const factory = generated.createRowFactory({ computed: core.computed, removeRow, selectedId });
    const list = createElementList(container, (row) => row.id);
    const rows = [1, 2, 3, 4].map((id) => ({ id, label: core.ref(`label ${id}`) }));

    list.sync(rows, factory);
    const first = list.elements()[0];
    expect([...container.children].map((el) => el.getAttribute('data-row-id'))).toEqual([
      '1',
      '2',
      '3',
      '4'
    ]);

    const swapped = [rows[3], rows[1], rows[2], rows[0]];
    list.sync(swapped, factory);
    expect([...container.children].map((el) => el.getAttribute('data-row-id'))).toEqual([
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
