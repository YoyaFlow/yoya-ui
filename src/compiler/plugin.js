/**
 * 构建期 transform（票 16 / R1 / R2 / R3 / R4）：把业务模块里的行工厂**就地**换成编译产物。
 *
 * **写一次，到处运行**：插件用 [`unplugin`](https://unplugin.unjs.io/) 写一遍，自动导出
 * Vite / Rollup / Webpack / esbuild / Rspack / Rolldown / Farm 各自的入口——使用者只在自己已有的
 * 构建配置里加一行，不需要额外的脚本、也不需要认识编译产物：
 *
 *     import { yoyaCompile } from '@yoyaflow/yoya-ui/compiler';
 *     import * as core from '@yoyaflow/yoya-ui/core';
 *
 *     export default defineConfig({                     // vite.config.js
 *       plugins: [yoyaCompile.vite({ core })]           // 默认：模块里名为 buildRow 的行工厂自动编
 *     });
 *
 * 默认规则**不需要花名册**：凡是被打包器交给插件的模块（`node_modules` 一律跳过），只要模块顶层有
 * 名为 `rowName`（默认 `buildRow`）的函数声明，就按 `mode`（默认 `element`）编译它。名字不叫
 * `buildRow`、或同一文件里有多份不同模式的编译单元时，才用显式 `rows: [{ file, fn, mode }]` 列表。
 *
 *     // rollup.config.js   → yoyaCompile.rollup({ … })
 *     // webpack.config.js  → yoyaCompile.webpack({ … })
 *     // esbuild 脚本 / CLI → yoyaCompile.esbuild({ … })
 *
 * 业务源码零改动：插件只做两件事——把源码里那个目标函数改名（`buildRow` → `buildRowSource`，真源留
 * 在文件里供编译器读），并在文件末尾追加一个同名函数转调编译产物；产物本身进虚拟模块，不落盘，
 * 业务代码不 import 任何生成物。
 *
 * 认不准就不动（R6）：找不到目标函数、同一文件里出现多个同名声明、形参不是单个标识符、形状不可编
 * （bail）→ 原样返回 null，源码交给打包器走通用路径。
 */
import { resolve } from 'node:path';
import { parse } from '@babel/parser';
import MagicString from 'magic-string';
import { createUnplugin } from 'unplugin';
import { compileSource, DEFAULT_RUNTIME } from './compile.js';

/** 虚拟产物模块的命名空间前缀（NUL 开头：普通的包名解析器不会碰它）。 */
const VIRTUAL_PREFIX = '\0yoya-row:';
/** 打包器语境下的运行期钩子默认入口（`compileSource` / CLI 的 `./compiler-runtime.js` 是给手写模块用的）。 */
const PACKAGE_RUNTIME = '@yoyaflow/yoya-ui/compiler-runtime';

const normalizePath = (path) => resolve(path).replace(/\\/g, '/');

/**
 * 纯函数部分：给出模块源码与目标声明 → `{ code, module, virtual }`；不该编 / 编不了时返回 null。
 * `code` 是改写后的模块（业务其余部分逐行不变），`module` 是编译产物模块源码。
 */
export function wireRowModule({
  source,
  target,
  core,
  runtime = DEFAULT_RUNTIME,
  coreSpecifier,
  virtualId
}) {
  const { fn, mode = 'element', thin = false, templatesOnly = false, file = target.file } = target;
  // 目标定位按 **AST 符号身份**（R1）：只认模块顶层的同名函数声明，注释 / 字符串里的同名文本
  // 不算，声明 0 处或 ≥2 处都认不准 → 不动源码。
  let ast;
  try {
    ast = parse(source, { sourceType: 'module' });
  } catch {
    return null;
  }
  const declarations = [];
  ast.program.body.forEach((statement) => {
    if (statement.type === 'FunctionDeclaration') {
      if (statement.id?.name === fn) {
        declarations.push({ exported: false, node: statement, start: statement.start });
      }
      return;
    }
    const inner = statement.type === 'ExportNamedDeclaration' ? statement.declaration : null;
    if (inner?.type === 'FunctionDeclaration' && inner.id?.name === fn) {
      // 从 `export` 起改名：真源不再导出（对外名字由追加的同名函数顶上）。
      declarations.push({ exported: true, node: inner, start: statement.start });
    }
  });
  if (declarations.length !== 1) {
    return null;
  }

  const [{ exported: wasExported, node: declaration, start }] = declarations;
  const param = declaration.params[0];
  if (
    declaration.async ||
    declaration.generator ||
    declaration.params.length !== 1 ||
    param?.type !== 'Identifier'
  ) {
    return null; // 形参不是单个标识符：和编译器同一口径，不动源码
  }
  const paramSource = param.name;

  const result = compileSource({
    source,
    file,
    fn,
    mode,
    thin,
    templatesOnly,
    core,
    runtime,
    coreSpecifier
  });
  if (!result.compiled || !result.module) {
    return null;
  }

  // 真源留在文件里（编译器读它），但不再导出：对外名字由下面追加的同名函数顶上。
  // **用 MagicString 改写并产出 hires sourcemap**：改写只覆盖那一个声明头，其余位置逐字符保留映射，
  // 线上报错的栈因此仍然落在业务源码的正确行列上（返回 `map: null` 会打断整条定位链）。
  const paramsStart = source.indexOf('(', declaration.start);
  if (paramsStart === -1) {
    return null;
  }
  const magic = new MagicString(source);
  magic.overwrite(start, paramsStart, `function ${fn}Source`);
  const virtual = virtualId ?? `${VIRTUAL_PREFIX}${fn}-${result.plan.signature}`;
  const wiring = [
    '',
    `// 构建期由 @yoyaflow/yoya-ui/compiler 追加：同名函数转调编译产物（真源见上面的 ${fn}Source）。`,
    `import { createRowFactory } from ${JSON.stringify(virtual)};`,
    'let __yoyaRowFactory = null;',
    `${wasExported ? 'export ' : ''}function ${fn}(${paramSource}) {`,
    `  __yoyaRowFactory ??= createRowFactory({ ${result.scope.join(', ')} });`,
    `  return __yoyaRowFactory(${paramSource});`,
    '}',
    ''
  ].join('\n');
  magic.append(wiring);

  return {
    code: magic.toString(),
    map: magic.generateMap({ source: file, includeContent: true, hires: true }),
    module: result.module,
    // 产物是生成代码：整段映射回原行函数的起点（近似但可用——栈会落进业务文件，而不是虚拟模块名）
    moduleMap: sourceMapForGenerated(
      result.module,
      source.slice(declaration.start, declaration.end),
      file
    ),
    virtual
  };
}

/**
 * 生成代码的近似 sourcemap：把整段生成代码映射回「原行函数」那一段源码。
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

/**
 * 校验选项：显式 `rows` 列表优先；不传时退到**默认规则**——被打包器交进来的模块（排除
 * `node_modules`）里名为 `rowName`（默认 `buildRow`）的顶层函数自动成为编译单元，不需要花名册。
 */
function normalizeOptions(options = {}) {
  const {
    core,
    rows = [],
    // 插件只跑在打包器里：运行期钩子默认按包子路径解析。
    runtime = PACKAGE_RUNTIME,
    coreSpecifier,
    onArtifact = null,
    rowName = 'buildRow',
    mode = 'element',
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
  const excluded = (path) => skip.some((pattern) => pattern.test(path));
  return {
    core,
    coreSpecifier,
    onArtifact,
    runtime,
    targets,
    /** 该模块要编的目标声明；没有就返回 undefined（源码原样透传）。 */
    targetFor(id, source) {
      const path = normalizePath(id);
      const explicit = targets.get(path);
      if (explicit) {
        return explicit;
      }
      if (targets.size > 0 || excluded(path)) {
        return undefined; // 给了花名册就只认花名册；node_modules 一律不碰
      }
      return hasTopLevelFunction(source, rowName)
        ? { file: id, fn: rowName, mode, thin, templatesOnly }
        : undefined;
    }
  };
}

/** 模块顶层有没有这个名字的函数声明（AST 判定，注释 / 字符串里的同名文本不算）。 */
function hasTopLevelFunction(source, name) {
  let ast;
  try {
    ast = parse(source, { sourceType: 'module' });
  } catch {
    return false;
  }
  return ast.program.body.some((statement) => {
    if (statement.type === 'FunctionDeclaration') {
      return statement.id?.name === name;
    }
    const inner = statement.type === 'ExportNamedDeclaration' ? statement.declaration : null;
    return inner?.type === 'FunctionDeclaration' && inner.id?.name === name;
  });
}

/**
 * unplugin 工厂：`yoyaCompile.vite() / .rollup() / .webpack() / .esbuild() / .rspack() /
 * .rolldown() / .farm()`。虚拟产物通过 `onArtifact(name, source)` 可选回调暴露（测试 / 调试用）——
 * 不挂在插件对象上，因为 esbuild 会校验收到的插件对象、多一个属性就报错（0.6.7 实机踩到）。
 */
export const yoyaCompile = createUnplugin((options = {}) => {
  const { core, coreSpecifier, onArtifact, runtime, targetFor } = normalizeOptions(options);
  const virtualModules = new Map();

  const virtualOf = (id) => (typeof id === 'string' && id.startsWith(VIRTUAL_PREFIX) ? id : null);

  return {
    name: 'yoya-ui-compile',
    enforce: 'pre',
    transform(code, id) {
      const target = typeof id === 'string' ? targetFor(id, code) : undefined;
      if (!target) {
        return null;
      }
      const wired = wireRowModule({ source: code, target, core, runtime, coreSpecifier });
      if (!wired) {
        return null; // bail：源码原样交给打包器（通用路径）
      }
      virtualModules.set(wired.virtual, { code: wired.module, map: wired.moduleMap });
      onArtifact?.(wired.virtual, wired.module);
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

/**
 * esbuild 形态的快捷导出（等价于 `yoyaCompile.esbuild(options)`），保留给已有配置直接用；
 * 新配置建议走 `yoyaCompile.<bundler>()`。
 */
export function yoyaCompilePlugin(options) {
  return yoyaCompile.esbuild(options);
}
