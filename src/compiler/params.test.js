/**
 * 票 21：编译单元的形参形状。
 *
 * 规则：产物**逐字复刻源码的参数表**，参数绑定的名字一律算已绑定名（不进 `scope`），
 * 参数默认值 / 计算键里出现的自由标识符仍然要进 `scope`（否则产物运行期会 ReferenceError）。
 * 行单元的调用口径不变——运行时按**一个实参**调用（`keyed(rows, Row)`、`child(Card(props))`），
 * 所以复刻参数表之后的语义与通用路径逐字一致。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '../yoya.core.js';
import { tbody } from '../html/index.js';
import { ref } from '../core/signals/handle.js';
import { compileSource } from './index.js';
import { componentUnits, wireComponentModule } from './plugin.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-params-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const coreUrl = pathToFileURL(join(process.cwd(), 'src/yoya.core.js')).href;
const runtimeUrl = pathToFileURL(join(process.cwd(), 'src/compiler/runtime.js')).href;

/** 同一份源码文本既走编译路径，也直接当业务模块 import——等价性比较的是同一份真源。 */
const moduleSource = (params, body) =>
  [
    `import { tr } from ${JSON.stringify(coreUrl)};`,
    '',
    `export function Item(${params}) {`,
    body,
    '}',
    ''
  ].join('\n');

const ROW_BODY = [
  '  return tr((line) => {',
  "    line.td((cell) => cell.className('cell-id').child(String(data.id)));",
  "    line.td((cell) => cell.className('cell-label').child(data.label));",
  '  });'
].join('\n');

const write = (name, code) => {
  const path = join(workDir, name);
  writeFileSync(path, code, 'utf8');
  return import(pathToFileURL(path).href);
};

/** 顺序无关的 DOM 签名（属性排序后比较；属性的**书写顺序**见票 41 / 票 18 §8）。 */
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

describe('parameter shapes (ticket 21)', () => {
  it('captures free identifiers from parameter defaults and computed keys', () => {
    const result = compileSource({
      source:
        'export function Item({ [field]: value = fallback }) {\n' +
        '  return tr((line) => line.td((cell) => cell.child(String(value))));\n' +
        '}\n',
      file: 'item-params.js',
      fn: 'Item',
      core,
      runtime: runtimeUrl
    });

    expect(result.bails).toEqual([]);
    expect(result.compiled).toBe(true);
    // field / fallback 是默认值与计算键里的自由标识符；value 是绑定名，不能进 scope
    expect(result.scope).toEqual(['fallback', 'field']);
    expect(result.module).toContain('const { fallback, field } = scope;');
    expect(result.module).toContain('return function Item({ [field]: value = fallback }) {');
  });

  it('destructures the scope before the parameters in a component unit', () => {
    const result = compileSource({
      source:
        'export function Tag({ label = fallbackLabel }) {\n' +
        '  return span((tag) => tag.child(vText(label)));\n' +
        '}\n',
      file: 'tag.js',
      fn: 'Tag',
      kind: 'component',
      paramsSource: '{ label = fallbackLabel }',
      scopeSpecifier: './component-scope.js',
      core,
      runtime: runtimeUrl
    });

    expect(result.compiled).toBe(true);
    // 默认值在 bind 里求值：scope 必须先解构完，否则引用 scope 名字会撞 TDZ
    expect(result.module.indexOf('const { fallbackLabel } = scope;')).toBeLessThan(
      result.module.indexOf('const [{ label = fallbackLabel }] = values ?? [];')
    );
  });

  it('renders destructured rows through keyed byte-identically to the generic path', async () => {
    const source = moduleSource('{ data }', ROW_BODY);
    const compiled = compileSource({
      source,
      file: 'item-params.js',
      fn: 'Item',
      core,
      runtime: runtimeUrl
    });
    expect(compiled.compiled).toBe(true);

    const [generic, generated] = await Promise.all([
      write('item.generic.js', source),
      write('item.generated.js', compiled.module)
    ]);

    const rows = ref([]);
    const host = tbody((body) =>
      body.attr('id', 'tbody').keyed(rows, generated.createRowFactory({}))
    );
    const element = host.renderDom();
    const genericRows = ref([]);
    const genericHost = tbody((body) => body.attr('id', 'tbody').keyed(genericRows, generic.Item));
    const genericElement = genericHost.renderDom();

    const items = [
      { data: { id: 1, label: ref('label 1') } },
      { data: { id: 2, label: ref('label 2') } }
    ];
    rows.value = items;
    genericRows.value = items;

    expect(element.outerHTML).toBe(genericElement.outerHTML);

    items[0].data.label.value = 'label 1 !!!';
    expect(element.outerHTML).toBe(genericElement.outerHTML);

    rows.value = [items[1]];
    genericRows.value = [items[1]];
    expect(element.outerHTML).toBe(genericElement.outerHTML);
  });

  // node 通道是另一份产物模板，参数表同样以源码为准
  it('reproduces the parameter list in the node channel', () => {
    const result = compileSource({
      source: moduleSource('{ data }', ROW_BODY),
      file: 'item-params.js',
      fn: 'Item',
      mode: 'node',
      core,
      runtime: runtimeUrl
    });

    expect(result.compiled).toBe(true);
    expect(result.module).toContain('return function Item({ data }) {');
  });

  // 自由名字里有些**不能当绑定名**（`arguments` / `eval` / 关键字），有些**语义复刻不了**
  // （`arguments` 是调用方实参对象，`new.target` 依赖调用形态）。收进 scope 会产出语法错误的
  // 模块（`const { arguments } = scope;`）或语义不同的产物——一律整形状回落。
  it('bails instead of collecting names that cannot be bound', () => {
    const cases = [
      ['line.td(String(arguments.length))', 'arguments'],
      ['line.td(String(new.target))', 'new']
    ];

    for (const [expression, name] of cases) {
      const result = compileSource({
        source: `export function Item(item) {\n  return tr((line) => ${expression});\n}\n`,
        file: 'item-args.js',
        fn: 'Item',
        core,
        runtime: runtimeUrl
      });

      const reasons = result.bails.map((bail) => bail.reason).join(' | ');
      expect(result.compiled, name).toBe(false);
      expect(result.module, name).toBeNull();
      expect(reasons, name).toContain('生成失败');
      expect(reasons, name).toContain(name);
    }
  });

  // 组件单元（`bind(root, values)`）的 props 也按位置解构：默认值引用 scope 里的名字时，
  // scope 必须先解构完再解构 values（否则撞 TDZ）。
  it('binds a component unit whose props are destructured, defaults included', async () => {
    const source = [
      'export function Tag({ label = fallbackLabel }) {',
      "  return span((tag) => tag.className('param-tag').child(vText(label)));",
      '}',
      ''
    ].join('\n');
    const compiled = compileSource({
      source,
      file: 'tag.js',
      fn: 'Tag',
      kind: 'component',
      paramsSource: '{ label = fallbackLabel }',
      scopeSpecifier: './param-scope.js',
      core,
      runtime: runtimeUrl
    });

    expect(compiled.bails).toEqual([]);
    expect(compiled.scope).toEqual(['fallbackLabel']);
    writeFileSync(
      join(workDir, 'param-scope.js'),
      'export const fallbackLabel = "fallback";\n',
      'utf8'
    );
    const generated = await write('tag.generated.js', compiled.module);

    const rootOf = (html) => {
      const template = document.createElement('template');
      template.innerHTML = html;
      return template.content.firstElementChild;
    };
    const generic = ({ label = 'fallback' }) =>
      core.span((tag) => tag.className('param-tag').child(core.vText(label))).renderDom();

    const filled = rootOf(compiled.plan.html);
    generated.bind(filled, [{ label: ref('v1') }]);
    expect(filled.outerHTML).toBe(generic({ label: ref('v1') }).outerHTML);

    const defaulted = rootOf(compiled.plan.html);
    generated.bind(defaulted, [{}]);
    expect(defaulted.outerHTML).toBe(generic({}).outerHTML);
  });

  // 就地替换（组件单元）的产物**按绑定名收参**：外层函数已经把默认值 / 解构 / rest 应用过了。
  // 旧写法把**形参表原文**当实参传（`(label = "默认", size = 1)`），默认值会被重新求值
  // （传进来的对象被 `{}` 顶掉），解构 / rest 形状还会变成对不存在变量的赋值（严格模式直接报错）。
  it('in-place replacement passes the parameter bindings, not the parameter list', async () => {
    const source = [
      `import { div, vNode, vText } from ${JSON.stringify(coreUrl)};`,
      '',
      'export function ParamWidget({ label = "默认", size = 1 } = {}) {',
      '  return vNode(() =>',
      "    div({ class: 'w', 'data-size': size, vn: 'ParamWidget' }, (root) =>",
      '      root.child(vText(label))',
      '    )',
      '  );',
      '}',
      '',
      'export function RestWidget({ label = "默认", ...rest } = {}) {',
      '  return vNode(() =>',
      "    div({ ...rest, vn: 'RestWidget' }, (root) => root.child(vText(label)))",
      '  );',
      '}',
      ''
    ].join('\n');

    const units = componentUnits(source, { core, file: 'param-widget.js' });
    const wired = wireComponentModule({
      source,
      targets: units,
      core,
      runtime: runtimeUrl,
      coreSpecifier: coreUrl
    });
    expect(wired, '两个组件都应该编出来').not.toBeNull();
    // 调用点传的是绑定名；`...rest` 只有一个绑定（对象），不是展开
    expect(wired.code).toContain(')(label, size)');
    expect(wired.code).toContain(')(label, rest)');
    expect(wired.code).not.toContain('= "默认", size = 1 } = {})(');

    const generic = await write('param-widget.generic.js', source);
    const replacements = new Map();
    wired.units.forEach((unit, index) => {
      const path = join(workDir, `param-widget.unit${index}.js`);
      replacements.set(JSON.stringify(unit.virtual), JSON.stringify(pathToFileURL(path).href));
      writeFileSync(path, unit.module, 'utf8');
    });
    let code = wired.code;
    replacements.forEach((to, from) => {
      code = code.replaceAll(from, to);
    });
    const wiredPath = join(workDir, 'param-widget.wired.js');
    writeFileSync(wiredPath, code, 'utf8');
    const compiled = await import(pathToFileURL(wiredPath).href);

    const props = () => ({ label: ref('标签'), size: 3 });
    // 比对用**顺序无关签名**：元素 / 节点通道的属性按 ops 顺序写，通用路径按引擎落盘顺序写
    // （`class` 的位置），是票 41 / 票 18 §8 的既有口径，与本刀无关。
    expect(signature(compiled.ParamWidget(props()).renderDom())).toBe(
      signature(generic.ParamWidget(props()).renderDom())
    );
    // 默认值路径：绑定值就是源码默认值（旧写法在这里会拿到 `{}`，文本变成空）
    expect(signature(compiled.ParamWidget().renderDom())).toBe(
      signature(generic.ParamWidget().renderDom())
    );
    expect(compiled.ParamWidget().renderDom().textContent).toBe('默认');

    const restProps = { label: ref('rest 标签'), class: 'from-rest', title: 't' };
    expect(signature(compiled.RestWidget(restProps).renderDom())).toBe(
      signature(generic.RestWidget(restProps).renderDom())
    );
    expect(compiled.RestWidget(restProps).renderDom().className).toBe('from-rest');
  });
});
