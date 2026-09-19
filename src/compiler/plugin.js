/**
 * 构建期 transform（票 16 / R1 / R2 / R4）：把业务模块里的行工厂**就地**换成编译产物。
 *
 * 业务源码零改动：插件只做两件事——把源码里那个目标函数改名（`buildRow` → `buildRowSource`，
 * 真源留在文件里供编译器读），并在文件末尾追加一个同名函数，它懒建编译产物的行工厂再转调。
 * 其余语句逐行透传；产物（片段 + 位置写）作为虚拟模块交给打包器，不落盘。
 *
 * 认不准就不动（R6）：找不到目标函数、同一文件里出现多个同名声明、形参不是单个标识符、
 * 形状不可编（bail）→ 返回 null，源码原样交给打包器走通用路径。
 *
 * 用法（esbuild 插件协议；vite 可复用 `wireRowModule` 写自己的适配）：
 *
 *     import * as core from '@yoyaflow/yoya-ui/core';
 *     import { yoyaCompilePlugin } from '@yoyaflow/yoya-ui/compiler';
 *
 *     plugins: [
 *       yoyaCompilePlugin({
 *         core,
 *         rows: [{ file: 'src/main.js', fn: 'buildRow', mode: 'element' }]
 *       })
 *     ]
 *
 * 库里不引入新的构建期依赖：插件对象只是按 esbuild 协议写的一个普通对象。
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { compileSource, DEFAULT_RUNTIME } from './compile.js';

/** 虚拟产物模块的命名空间前缀（NUL 开头：普通的包名解析器不会碰它）。 */
const VIRTUAL_PREFIX = '\0yoya-row:';
/** 虚拟产物模块在 esbuild 里的命名空间。 */
const VIRTUAL_NAMESPACE = 'yoya-row';

const normalizePath = (path) => resolve(path).replace(/\\/g, '/');

/**
 * 纯函数部分：给出模块源码与目标声明 → `{ code, module }`；不该编 / 编不了时返回 null。
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
  const declaration = new RegExp(
    `(^|\\n)([ \\t]*)(export\\s+)?function\\s+${fn}\\s*\\(([^)]*)\\)`,
    'g'
  );
  const matches = [...source.matchAll(declaration)];
  if (matches.length !== 1) {
    // 找不到目标函数（0 次）或同名声明不止一处（≥2 次）都认不准：不动源码。
    return null;
  }

  const paramSource = matches[0][4].trim();
  if (!/^[A-Za-z_$][\w$]*$/.test(paramSource)) {
    return null; // 形参不是单个标识符：和编译器同一口径，不动源码
  }

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

  const renamed = source.replace(
    declaration,
    (match, lead, indent, exported, params) =>
      // 真源留在文件里（编译器读它），但不再导出：对外名字由下面追加的同名函数顶上。
      `${lead}${indent}function ${fn}Source(${params})`
  );
  const wasExported = Boolean(matches[0][3]);
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

  return { code: `${renamed}${wiring}`, module: result.module, virtual };
}

/**
 * esbuild 插件对象：命中登记的模块就走上面的 transform，其余一律不碰；
 * 虚拟产物模块由插件自己的 `onResolve` / `onLoad` 提供。
 */
export function yoyaCompilePlugin(options = {}) {
  const { core, rows = [], runtime = DEFAULT_RUNTIME, coreSpecifier } = options;
  if (!core) {
    throw new TypeError('yoyaCompilePlugin() requires the core namespace (import * as core …)');
  }

  const targets = new Map();
  rows.forEach((row) => {
    if (!row?.file || !row?.fn) {
      throw new TypeError('yoyaCompilePlugin() rows need { file, fn }');
    }
    targets.set(normalizePath(row.file), row);
  });
  const virtualModules = new Map();

  return {
    name: 'yoya-ui-compile',
    /** 供测试 / 调试查看虚拟产物（键是虚拟模块名）。 */
    virtualModules,
    setup(build) {
      build.onResolve({ filter: /^\0yoya-row:/ }, (args) => ({
        path: args.path,
        namespace: VIRTUAL_NAMESPACE
      }));
      build.onLoad({ filter: /.*/, namespace: VIRTUAL_NAMESPACE }, (args) => ({
        contents: virtualModules.get(args.path) ?? '',
        loader: 'js',
        resolveDir: process.cwd()
      }));
      build.onLoad({ filter: /\.(m?js|jsx|ts|tsx)$/ }, (args) => {
        const target = targets.get(normalizePath(args.path));
        if (!target) {
          return null;
        }
        const source = readFileSync(args.path, 'utf8');
        const wired = wireRowModule({ source, target, core, runtime, coreSpecifier });
        if (!wired) {
          return null; // bail：源码原样交给打包器（通用路径）
        }
        virtualModules.set(wired.virtual, wired.module);
        return { contents: wired.code, loader: 'js', resolveDir: dirname(args.path) };
      });
    }
  };
}
