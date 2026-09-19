/**
 * 组件级片段链接：把**组件**当成编译单元，产出「片段 + 位置写」的实例化模块，登记进
 * 组件注册表；调用点只查表（键 = 模块路径#导出名），查不到就回落通用路径。
 *
 * 第一档只吃**叶子组件**（不收 children）且结构恒定：
 * - 形态 A / 薄工厂：`return <工厂>(setup)`；
 * - 形态 B：`return { render() { return <工厂>(setup); } }`；
 * - vNode：`return vNode((api) => <工厂>(setup))`，且 setup 只 return 视图、不用 api
 *   （带命令方法的组件要保留组件对象，属于票 42 的槽与钩子那一档）。
 *
 * 结构分支、模块私有标识符（非 import 绑定的自由变量）、命令方法、收 children 的容器组件
 * 一律不编——注册表里没有它，调用点就照旧走今天的运行时构造。
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, posix, relative, resolve } from 'node:path';
import { parse } from '@babel/parser';
import { collectImports, findBuilderFunction } from './analyze.js';
import { componentKeyOf, normalizeModulePath } from './component-key.js';
import { compileSource, DEFAULT_RUNTIME } from './compile.js';
import { isStaticLibraryModule } from './static-values.js';

export const REGISTRY_VERSION = 1;

const sha12 = (text) => createHash('sha256').update(text).digest('hex').slice(0, 12);

/** 函数节点的类型：对象简写方法（`render() {}`）与函数表达式 / 箭头函数。 */
const FUNCTION_TYPES = new Set(['ObjectMethod', 'FunctionExpression', 'ArrowFunctionExpression']);

const withDotPrefix = (path) => (path.startsWith('.') ? path : `./${path}`);

/**
 * 形态 C 的工厂调用：`createComponentFactory(VCard, …)`，且这个名字确实是从库内
 * `components/shared.js` 导入的（按导入来源认，业务里同名函数不参与）。
 */
function isComponentFactoryCall(imports, call) {
  if (call.callee.type !== 'Identifier') {
    return false;
  }
  const record = imports?.get(call.callee.name);
  return Boolean(record) && isStaticLibraryModule(record.specifier);
}

/**
 * 找组件的「视图表达式」：返回 `{ callSource, paramsSource }` 或 `{ error }`。
 * 视图表达式原样来自源码切片——源码是唯一真源，生成器只搬运文本。
 */
export function findViewExpression(source, fn, imports = null) {
  const statements = fn.body.type === 'BlockStatement' ? fn.body.body : [];
  const returned =
    fn.body.type === 'BlockStatement'
      ? statements.find((statement) => statement.type === 'ReturnStatement')?.argument
      : fn.body;
  const paramsSource = fn.params.map((param) => source.slice(param.start, param.end)).join(', ');

  if (!returned) {
    return { error: '组件函数没有 return（叶子组件要求单一 return 视图）' };
  }

  if (returned.type === 'CallExpression' && returned.callee.type === 'Identifier') {
    if (returned.callee.name !== 'vNode') {
      // 形态 C：`return createComponentFactory(VCard, first, second, third, arguments)` ——
      // 编译单元是 VCard 这个**类**的构造体（工厂只做参数转发），交给分析器的 className 通道。
      if (
        isComponentFactoryCall(imports, returned) &&
        returned.arguments[0]?.type === 'Identifier'
      ) {
        return { componentClass: returned.arguments[0].name, paramsSource };
      }
      return { callSource: source.slice(returned.start, returned.end), paramsSource };
    }

    const setup = returned.arguments[0];
    if (setup?.type !== 'ArrowFunctionExpression') {
      return { error: 'vNode 组件只支持 `vNode((api) => …)` 箭头形式' };
    }
    const setupReturn =
      setup.body.type === 'BlockStatement'
        ? setup.body.body.length === 1 && setup.body.body[0].type === 'ReturnStatement'
          ? setup.body.body[0].argument
          : null
        : setup.body;
    if (!setupReturn) {
      return { error: 'vNode 组件只支持「setup 只 return 视图」（命令方法 / 额外语句本轮不编）' };
    }
    if (setupReturn.type !== 'CallExpression' || setupReturn.callee.type !== 'Identifier') {
      return { error: 'vNode 组件只支持返回单一视图（数组 / 多根本轮不编）' };
    }

    const callSource = source.slice(setupReturn.start, setupReturn.end);
    const apiName = setup.params[0]?.name;
    if (apiName && new RegExp(`\\b${apiName}\\b`).test(callSource)) {
      return { error: 'vNode 组件在视图里用了 api（命令方法要保留，本轮不编）' };
    }
    return { callSource, paramsSource };
  }

  if (returned.type === 'ObjectExpression') {
    if (returned.properties.length !== 1) {
      return {
        error: '形态 B 组件的额外成员（状态 / 命令方法）本轮不编（要保留组件对象，见票 42）'
      };
    }
    const render = returned.properties.find(
      (property) => (property.key?.name ?? property.key?.value) === 'render'
    );
    const renderFn = render?.type === 'ObjectMethod' ? render : render?.value;
    if (!renderFn || !FUNCTION_TYPES.has(renderFn.type)) {
      return { error: '组件对象没有 render() 方法（形态 B 要求 render 返回视图）' };
    }
    const body =
      renderFn.body.type === 'BlockStatement'
        ? renderFn.body.body.length === 1 && renderFn.body.body[0].type === 'ReturnStatement'
          ? renderFn.body.body[0].argument
          : null
        : renderFn.body;
    if (!body) {
      return { error: 'render() 只支持单一 return 视图（分支 / 多语句本轮不编）' };
    }
    return { callSource: source.slice(body.start, body.end), paramsSource };
  }

  return { error: '组件只支持返回单一视图（return 工厂调用 / { render() } / vNode(setup)）' };
}

const failed = (file, exportName, reason) => ({
  compiled: false,
  file,
  fn: exportName,
  hash: null,
  plan: null,
  module: null,
  scope: [],
  factory: null,
  ops: null,
  bails: [{ reason, at: null }]
});

/**
 * 编译一个叶子组件。
 *
 * 做法是把组件的**视图表达式**原样搬进一份合成源码（`export function Name(参数) { return 视图; }`），
 * 再复用行编译器的分析 / 生成——bail 规则、片段序列化、位置写全部同一套，不另写第二份实现。
 */
export function compileComponent(options) {
  const {
    source,
    file,
    export: exportName,
    core,
    runtime = DEFAULT_RUNTIME,
    whitelist,
    components = null,
    componentsSpecifier,
    scopeSpecifier = null
  } = options;

  let ast;
  try {
    ast = parse(source, { sourceType: 'module' });
  } catch (error) {
    return failed(file, exportName, `源码解析失败：${error.message}`);
  }

  const fn = findBuilderFunction(ast, exportName);
  if (!fn) {
    return failed(file, exportName, `找不到组件函数 ${exportName}`);
  }

  const view = findViewExpression(source, fn, collectImports(ast));
  if (view.error) {
    return failed(file, exportName, view.error);
  }

  // 形态 C（类节点组件）：工厂只是把参数转发给类，编译单元是**类构造体** —— 直接在原模块上
  // 分析（import / const 都在手边，不用合成源码），`className` 让分析器去读构造体。
  // 形态 A / B / vNode：视图表达式原样搬进合成源码，**模块级的 import 与 const 一并带上**：
  // 静态值折叠（库内常量 / `themeValue` 这类主题助手）靠它们把值在构建期算出来，否则组件里
  // 只剩写死的字面量能编。其它声明不搬——分析只读目标函数。
  const carried = ast.program.body
    .filter(
      (statement) =>
        statement.type === 'ImportDeclaration' ||
        (statement.type === 'VariableDeclaration' && statement.kind === 'const')
    )
    .map((statement) => source.slice(statement.start, statement.end));
  const synthetic =
    `${carried.join('\n')}\n` +
    `export function ${exportName}(${view.paramsSource}) {\n  return ${view.callSource};\n}\n`;
  const result = compileSource({
    source: view.componentClass ? source : synthetic,
    file,
    fn: exportName,
    className: view.componentClass ?? null,
    mode: 'element',
    core,
    runtime,
    whitelist,
    components,
    componentsSpecifier,
    kind: 'component',
    scopeSpecifier,
    paramsSource: view.paramsSource,
    hash: sha12(source.slice(fn.start, fn.end))
  });

  if (!result.compiled) {
    return { ...result, hash: null };
  }

  // 形态 A / B：`child(<参数本身>)` = 把调用方的 children 当子内容 → 容器组件，本轮不编（票 42 的槽）。
  // 形态 C 的构造参数已经由分析器记成"内容位置"（骨架 + 运行期回落），不走这条。
  if (!view.componentClass) {
    const paramNames = fn.params.map((param) => param.name).filter(Boolean);
    const childrenLike = collectValueExpressions(result.ops).filter((expression) =>
      paramNames.some((name) => expression.trim() === name)
    );
    if (childrenLike.length > 0) {
      return failed(file, exportName, '组件把入参当子内容（收 children 的容器组件本轮不编）');
    }
  }

  // 运行期 scope 是组件原模块的命名空间：自由标识符必须来自 import，模块私有辅助不编
  const imported = collectImports(ast);
  const external = result.scope.filter((name) => !imported.has(name) && name !== exportName);
  if (external.length > 0) {
    return failed(
      file,
      exportName,
      `组件里的模块私有标识符（非 import 绑定）：${external.join(', ')}`
    );
  }

  return result;
}

/** 递归收集 ops 里的值表达式（组件把入参当子内容的检查用）。 */
function collectValueExpressions(ops) {
  const found = [];
  const visit = (list) => {
    for (const op of list) {
      if (typeof op.expression === 'string') {
        found.push(op.expression);
      }
      if (op.kind === 'element') {
        visit(op.ops);
      } else if (op.kind === 'component') {
        found.push(...op.args);
      }
    }
  };

  visit(ops);
  return found;
}

/** 单文件 slug：目录 + 导出名，去掉不安全字符，避免互相覆盖。 */
function slugOf(file, exportName) {
  const base = posix.basename(normalizeModulePath(file)).replace(/\.[^.]+$/, '');
  return `${base}.${exportName}`.replace(/[^\w.-]/g, '_');
}

/**
 * 构建组件注册表：编译每个条目 → 写出实例化模块 + 注册表模块 → 返回**纯数据**注册表。
 *
 * @param {object} options
 * @param {Array<{file: string, export: string}>} options.entries 组件清单（路径按项目根书写）
 * @param {string} options.dir 产物目录（实例化模块与注册表模块都写在这里）
 * @param {object} options.core 核心入口命名空间
 */
export function buildComponentRegistry(options) {
  const {
    entries,
    dir,
    core,
    runtime = DEFAULT_RUNTIME,
    registryName = 'components.registry.js',
    dataName = 'components.registry.json',
    whitelist
  } = options;

  mkdirSync(dir, { recursive: true });

  const registry = {
    version: REGISTRY_VERSION,
    runtime,
    components: {}
  };
  const written = [];
  const skipped = [];
  const bindings = [];

  entries.forEach((entry, index) => {
    const file = normalizeModulePath(entry.file);
    const key = componentKeyOf(file, entry.export);
    const slug = slugOf(file, entry.export);
    const entryFile = `${slug}.compiled.js`;
    const source = readFileSync(entry.file, 'utf8');

    const compiled = compileComponent({
      source,
      file,
      export: entry.export,
      core,
      runtime,
      whitelist,
      // 实例化模块里的 scope import 由**绝对路径**算相对（平台感知），避免相对基准不同算出怪路径
      scopeSpecifier: withDotPrefix(relative(resolve(dir), resolve(entry.file)).replace(/\\/g, '/'))
    });

    if (!compiled.compiled) {
      skipped.push({ key, bails: compiled.bails });
      return;
    }

    writeFileSync(join(dir, entryFile), compiled.module, 'utf8');
    written.push(entryFile);

    registry.components[key] = {
      file,
      export: entry.export,
      hash: compiled.hash,
      factory: compiled.factory,
      ops: compiled.ops,
      plan: {
        html: compiled.plan.html,
        liveNodes: compiled.plan.liveNodes,
        slots: compiled.plan.slots
      },
      scope: compiled.scope,
      entry: `./${entryFile}`
    };
    bindings.push({ index, key, entryFile });
  });

  const registryModule =
    '// 由 @yoyaflow/yoya-ui/compiler 生成 —— 请勿手改。\n' +
    '// 组件注册表：调用点只做链接（取片段 + 实例化），未命中就走通用路径。\n' +
    bindings.map((item) => `import * as c${item.index} from './${item.entryFile}';\n`).join('') +
    '\nexport const components = {\n' +
    bindings
      .map(
        (item) =>
          `  ${JSON.stringify(item.key)}: ` +
          `{ bind: c${item.index}.bind, render: c${item.index}.render, hash: c${item.index}.hash, ` +
          `plan: c${item.index}.plan }`
      )
      .join(',\n') +
    '};\n';

  writeFileSync(join(dir, registryName), registryModule, 'utf8');
  writeFileSync(join(dir, dataName), `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  written.push(registryName, dataName);

  return { registry, written, skipped };
}
