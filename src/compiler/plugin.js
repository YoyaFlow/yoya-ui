/**
 * 构建期 transform（票 16 / R1 / R2 / R3 / R4）：把 yoya-ui 的**组件工厂**就地换成编译产物。
 *
 * **写一次，到处运行**：用 [`unplugin`](https://unplugin.unjs.io/) 写一遍，自动导出
 * Vite / Rollup / Webpack / esbuild / Rspack / Rolldown / Farm 各自的入口——使用者在已有的构建配置里
 * 加一行，不需要项目脚本、也不需要认识编译产物：
 *
 *     import { yoyaCompile } from '@yoyaflow/yoya-ui/compiler';
 *     import * as core from '@yoyaflow/yoya-ui/core';
 *
 *     export default defineConfig({          // vite.config.js
 *       plugins: [yoyaCompile.vite({ core })] // 默认：按组件边界自动发现编译单元
 *     });
 *
 * **编译单元 = yoya-ui 自己的组件边界**（不需要花名册）：被打包器交给插件的模块里
 * （`node_modules` 跳过），顶层**返回 UI 视图的工厂函数**就是编译单元——
 *
 * - 大驼峰（`Card` / `StatusPill`）＝组件；
 * - 小驼峰里也是工厂函数的（`buildRow` / `vBadge` 这类薄工厂、快捷工厂）＝同样算；
 * - 返回的不是视图（助手、命令、数据处理）→ 不是编译单元，原样保留。
 *
 * 通道（`element` / `node`）按**用法**推断，不靠人指定：该工厂在模块里被当行工厂交给 `keyed`
 * （`keyed(rows, Row)`，或 `body.keyed(rows, Row)` 且接收者是核心元素工厂产出的节点）→ 行语义，
 * 走 `element`（最快）；只被当组件调用（`child(Card())`）→ 走 `node`（ViewNode 在 `child` 与
 * `keyed` 里都成立，最安全）。显式 `rows: [{ file, fn, mode, thin }]` 只作为**内部特殊函数的逃生口**。
 *
 * 业务源码零改动：插件只把函数改名（`Card` → `CardSource`，真源留给编译器）并在文件末尾追加同名函数
 * 转调产物；产物进虚拟模块、不落盘，业务代码不 import 任何生成物。改写用 `magic-string`，产出
 * **hires sourcemap**，线上报错的定位链不断。
 *
 * 认不准就不动（R6）：工厂形状编不了（bail）→ 该单元原样保留，走通用路径。
 */
import { resolve } from 'node:path';
import { parse } from '@babel/parser';
import MagicString from 'magic-string';
import { createUnplugin } from 'unplugin';
import { compileSource, DEFAULT_RUNTIME, elementWhitelistOf } from './compile.js';

/** 虚拟产物模块的命名空间前缀（NUL 开头：普通的包名解析器不会碰它）。 */
const VIRTUAL_PREFIX = '\0yoya-row:';
/** 打包器语境下的运行期钩子默认入口（`compileSource` / CLI 的 `./compiler-runtime.js` 是给手写模块用的）。 */
const PACKAGE_RUNTIME = '@yoyaflow/yoya-ui/compiler-runtime';
/** 库 core 入口的默认说明符（导入来源判定用）。 */
const PACKAGE_CORE = '@yoyaflow/yoya-ui/core';

const normalizePath = (path) => resolve(path).replace(/\\/g, '/');

/** 这个导入来源算不算「库的 core」：包路径、或仓库内的 yoya.core.js。 */
function isCoreSpecifier(specifier) {
  return (
    typeof specifier === 'string' &&
    (specifier === PACKAGE_CORE ||
      specifier.endsWith('/yoya-ui/core') ||
      specifier.endsWith('yoya.core.js'))
  );
}

/** 收集模块里「从 core 导入的元素工厂 / `vNode`」等名字：判定「返回的是不是视图」用。 */
function coreBindingsOf(ast, whitelist) {
  const bindings = new Map();
  ast.program.body.forEach((statement) => {
    if (statement.type !== 'ImportDeclaration' || !isCoreSpecifier(statement.source.value)) {
      return;
    }
    statement.specifiers.forEach((specifier) => {
      if (specifier.type !== 'ImportSpecifier') {
        return;
      }
      const imported = specifier.imported.name ?? specifier.imported.value;
      const local = specifier.local.name;
      if (whitelist.has(imported)) {
        bindings.set(local, 'element');
      } else if (imported === 'vNode') {
        bindings.set(local, 'vNode');
      } else if (imported === 'keyed') {
        bindings.set(local, 'keyed');
      } else if (imported === 'vText') {
        bindings.set(local, 'text');
      }
    });
  });
  return bindings;
}

/** 顶层函数声明（含 `export function`），返回 `{ node, statement, name }`。 */
function topLevelFunctions(ast) {
  const found = [];
  ast.program.body.forEach((statement) => {
    const exported = statement.type === 'ExportNamedDeclaration';
    const inner = exported ? statement.declaration : statement;
    if (inner?.type === 'FunctionDeclaration' && inner.id?.name) {
      found.push({ exported, name: inner.id.name, node: inner, start: statement.start });
    }
  });
  return found;
}

/** 函数体是不是「单个 return 视图」：返回视图表达式本身或 null。 */
function returnedView(fn) {
  if (fn.body.type !== 'BlockStatement') {
    return fn.body;
  }
  const returns = fn.body.body.filter((statement) => statement.type === 'ReturnStatement');
  return returns.length === 1 && fn.body.body.length === 1 ? returns[0].argument : null;
}

/** 这个表达式是不是一个 UI 视图（元素工厂调用 / vNode / 带 render() 的对象）。 */
function isViewExpression(expression, bindings) {
  if (!expression) {
    return false;
  }
  if (expression.type === 'ObjectExpression') {
    return expression.properties.some(
      (property) =>
        property.type === 'ObjectMethod' && (property.key.name ?? property.key.value) === 'render'
    );
  }
  if (expression.type !== 'CallExpression') {
    return false;
  }
  if (expression.callee.type === 'Identifier') {
    const kind = bindings.get(expression.callee.name);
    return kind === 'element' || kind === 'vNode';
  }
  // 组件之间的薄工厂：`Card(options)` 直接转调另一个（已发现的）工厂
  return expression.callee.type === 'Identifier';
}

/**
 * 收集模块里「接收者是核心元素工厂产出的节点」的标识符：`node.tbody((body) => …)` 的 `body`、
 * `const table = table(…)` 这类。用于判定 `.keyed(...)` 是不是核心 DSL 上的调用。
 */
function coreNodeNames(ast, bindings, whitelist) {
  const names = new Set();
  const collectParams = (call) => {
    call.arguments.forEach((argument) => {
      if (
        (argument.type === 'ArrowFunctionExpression' || argument.type === 'FunctionExpression') &&
        argument.params[0]?.type === 'Identifier'
      ) {
        names.add(argument.params[0].name);
      }
    });
  };

  /** 这次遍历里有没有新名字：链式 DSL（`node.tbody((body) => …)`）要迭代到不动点。 */
  const walk = (node) => {
    let added = false;
    if (!node || typeof node !== 'object') {
      return false;
    }
    if (Array.isArray(node)) {
      node.forEach((child) => {
        added = walk(child) || added;
      });
      return added;
    }
    if (node.type === 'CallExpression') {
      const callee = node.callee;
      // 核心元素工厂：`table((node) => …)`
      if (callee.type === 'Identifier' && bindings.get(callee.name) === 'element') {
        const before = names.size;
        collectParams(node);
        added = added || names.size > before;
      }
      // 链式子工厂：`body.tbody((tbody) => …)` / `node.td((cell) => …)`
      if (
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.object.type === 'Identifier' &&
        names.has(callee.object.name) &&
        whitelist.has(callee.property.name ?? callee.property.value)
      ) {
        const before = names.size;
        collectParams(node);
        added = added || names.size > before;
      }
    }
    if (
      node.type === 'VariableDeclarator' &&
      node.init?.type === 'Identifier' &&
      node.id?.type === 'Identifier'
    ) {
      if (names.has(node.init.name) && !names.has(node.id.name)) {
        names.add(node.id.name);
        added = true;
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') {
        continue;
      }
      if (node[key] && typeof node[key] === 'object') {
        added = walk(node[key]) || added;
      }
    }
    return added;
  };
  for (let pass = 0; pass < 8; pass += 1) {
    if (!walk(ast.program)) {
      break;
    }
  }
  return names;
}

/** 该工厂在模块里被当**行工厂**交给了核心 `keyed`（决定要不要走 element 通道）。 */
function usedAsKeyedRow(ast, name, bindings, nodeNames) {
  const isRowFactoryArg = (call) => {
    const candidates = [call.arguments[1], call.arguments[2]];
    return candidates.some((argument) => argument?.type === 'Identifier' && argument.name === name);
  };

  let found = false;
  const walk = (node) => {
    if (found || !node || typeof node !== 'object') {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node.type === 'CallExpression') {
      const callee = node.callee;
      const direct = callee.type === 'Identifier' && bindings.get(callee.name) === 'keyed';
      const member =
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        (callee.property.name ?? callee.property.value) === 'keyed' &&
        callee.object.type === 'Identifier' &&
        nodeNames.has(callee.object.name);
      if ((direct || member) && isRowFactoryArg(node)) {
        found = true;
        return;
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') {
        continue;
      }
      if (node[key] && typeof node[key] === 'object') {
        walk(node[key]);
      }
    }
  };
  walk(ast.program);
  return found;
}

/**
 * 默认发现规则：模块顶层的**视图工厂**（大驼峰组件 / 小驼峰薄工厂）都是编译单元，
 * 通道按用法推断（`keyed` 的行工厂 → element，其余 → node）。
 */
export function viewFactoryUnits(
  source,
  { core, mode = null, thin = false, templatesOnly = false, file }
) {
  let ast;
  try {
    ast = parse(source, { sourceType: 'module' });
  } catch {
    return [];
  }
  const whitelist = elementWhitelistOf(core);
  const bindings = coreBindingsOf(ast, whitelist);
  const nodeNames = coreNodeNames(ast, bindings, whitelist);
  const units = [];

  topLevelFunctions(ast).forEach((declaration) => {
    if (!isViewExpression(returnedView(declaration.node), bindings)) {
      return;
    }
    const channel =
      mode ?? (usedAsKeyedRow(ast, declaration.name, bindings, nodeNames) ? 'element' : 'node');
    units.push({ file, fn: declaration.name, mode: channel, thin, templatesOnly });
  });
  return units;
}

/**
 * 纯函数部分：给出模块源码与目标声明（一个或多个）→ 改写后的模块 + 各自的产物模块。
 * 不该编 / 编不了时返回 null（源码原样交给打包器走通用路径）。
 */
export function wireRowModule({
  source,
  target = null,
  targets = null,
  core,
  runtime = DEFAULT_RUNTIME,
  coreSpecifier
}) {
  const list = (targets ?? (target ? [target] : [])).filter(Boolean);
  if (list.length === 0) {
    return null;
  }

  let ast;
  try {
    ast = parse(source, { sourceType: 'module' });
  } catch {
    return null;
  }
  const declarations = new Map(topLevelFunctions(ast).map((entry) => [entry.name, entry]));

  const magic = new MagicString(source);
  const units = [];
  let changed = false;

  list.forEach((unit) => {
    const declaration = declarations.get(unit.fn);
    const param = declaration?.node.params[0];
    if (!declaration || declaration.node.async || declaration.node.generator) {
      return;
    }
    if (declaration.node.params.length !== 1 || param?.type !== 'Identifier') {
      return; // 形参不是单个标识符：和编译器同一口径，不动这个单元
    }

    const result = compileSource({
      source,
      file: unit.file ?? target?.file,
      fn: unit.fn,
      mode: unit.mode ?? 'element',
      thin: unit.thin ?? false,
      templatesOnly: unit.templatesOnly ?? false,
      core,
      runtime,
      coreSpecifier
    });
    if (!result.compiled || !result.module) {
      return; // bail：这个单元整形状回落
    }

    // 真源留在文件里（编译器读它），改名 + 不再导出；对外名字由追加的同名函数顶上。
    const paramsStart = source.indexOf('(', declaration.node.start);
    magic.overwrite(declaration.start, paramsStart, `function ${unit.fn}Source`);
    const virtual = `${VIRTUAL_PREFIX}${unit.fn}-${result.plan.signature}`;
    magic.append(
      [
        '',
        `// 构建期由 @yoyaflow/yoya-ui/compiler 追加：同名函数转调编译产物（真源见上面的 ${unit.fn}Source）。`,
        `import { createRowFactory } from ${JSON.stringify(virtual)};`,
        `let __yoyaFactory_${units.length} = null;`,
        `${declaration.exported ? 'export ' : ''}function ${unit.fn}(${param.name}) {`,
        `  __yoyaFactory_${units.length} ??= createRowFactory({ ${result.scope.join(', ')} });`,
        `  return __yoyaFactory_${units.length}(${param.name});`,
        '}',
        ''
      ].join('\n')
    );
    units.push({
      module: result.module,
      moduleMap: sourceMapForGenerated(
        result.module,
        source.slice(declaration.node.start, declaration.node.end),
        unit.file ?? unit.fn
      ),
      virtual
    });
    changed = true;
  });

  if (!changed) {
    return null;
  }
  return {
    code: magic.toString(),
    map: magic.generateMap({
      source: list[0].file ?? '(inline)',
      includeContent: true,
      hires: true
    }),
    units,
    // 单单元时的兼容字段
    module: units[0].module,
    moduleMap: units[0].moduleMap,
    virtual: units[0].virtual
  };
}

/**
 * 生成代码的近似 sourcemap：把整段生成代码映射回「原工厂函数」那一段源码。
 * 不做逐语句对齐（生成代码与源码不同构），但保证栈里出现的是业务文件与行区间，而不是虚拟模块名。
 */
function sourceMapForGenerated(generated, originalSnippet, file) {
  if (originalSnippet.length === 0) {
    return null;
  }
  const magic = new MagicString(originalSnippet);
  magic.overwrite(0, originalSnippet.length, generated);
  return magic.generateMap({ source: file, includeContent: true, hires: true });
}

/** 校验选项：显式 `rows` 是逃生口；不给就按组件边界自动发现。 */
function normalizeOptions(options = {}) {
  const {
    core,
    rows = [],
    runtime = PACKAGE_RUNTIME,
    coreSpecifier,
    onArtifact = null,
    // 逃生口的默认通道；不给就按用法推断（不存在全局默认覆盖）
    mode = null,
    thin = false,
    templatesOnly = false,
    exclude = ['node_modules']
  } = options;
  if (!core) {
    throw new TypeError('yoyaCompile() requires the core namespace (import * as core …)');
  }

  const targets = new Map();
  rows.forEach((row) => {
    if (!row?.file || !row?.fn) {
      throw new TypeError('yoyaCompile() rows need { file, fn }');
    }
    targets.set(normalizePath(row.file), row);
  });
  const skip = exclude.map((pattern) =>
    pattern instanceof RegExp
      ? pattern
      : new RegExp(String(pattern).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&'))
  );

  return {
    core,
    coreSpecifier,
    onArtifact,
    runtime,
    /** 该模块要编的编译单元（可能多个）；没有就返回空数组（源码原样透传）。 */
    unitsFor(id, source) {
      const path = normalizePath(id);
      if (targets.size > 0) {
        const explicit = targets.get(path);
        return explicit ? [explicit] : [];
      }
      if (skip.some((pattern) => pattern.test(path))) {
        return [];
      }
      return viewFactoryUnits(source, { core, file: id, mode, templatesOnly, thin });
    }
  };
}

/**
 * unplugin 工厂：`yoyaCompile.vite() / .rollup() / .webpack() / .esbuild() / .rspack() /
 * .rolldown() / .farm()`。产物通过 `onArtifact(name, source)` 可选回调暴露（测试 / 调试）——
 * 不挂在插件对象上，因为 esbuild 会校验收到的插件对象、多一个属性就报错（0.6.7 实机踩到）。
 */
export const yoyaCompile = createUnplugin((options = {}) => {
  const { core, coreSpecifier, onArtifact, runtime, unitsFor } = normalizeOptions(options);
  const virtualModules = new Map();

  const virtualOf = (id) => (typeof id === 'string' && id.startsWith(VIRTUAL_PREFIX) ? id : null);

  return {
    name: 'yoya-ui-compile',
    enforce: 'pre',
    transform(code, id) {
      const units = typeof id === 'string' ? unitsFor(id, code) : [];
      if (units.length === 0) {
        return null;
      }
      const wired = wireRowModule({ source: code, targets: units, core, runtime, coreSpecifier });
      if (!wired) {
        return null; // 全部单元都 bail：源码原样交给打包器
      }
      wired.units.forEach((unit) => {
        virtualModules.set(unit.virtual, { code: unit.module, map: unit.moduleMap });
        onArtifact?.(unit.virtual, unit.module);
      });
      return { code: wired.code, map: wired.map };
    },
    resolveId(id) {
      return virtualOf(id) ? { id, external: false } : null;
    },
    load(id) {
      if (!virtualOf(id)) {
        return null;
      }
      const artifact = virtualModules.get(id);
      return artifact ? { code: artifact.code, map: artifact.map } : { code: '' };
    }
  };
});

/** esbuild 形态的快捷导出（等价于 `yoyaCompile.esbuild(options)`），保留给已有配置直接用。 */
export function yoyaCompilePlugin(options) {
  return yoyaCompile.esbuild(options);
}
