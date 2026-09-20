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
 * 通道（`element` / `node`）按**用法**推断，不靠人指定：该组件在模块里被列表用（`keyed(items, Card)`，
 * 或 `body.keyed(items, Card)` 且接收者是核心元素工厂产出的节点）→ 走 `element`（最快）；只被当组件
 * 调用（`child(Card())`）→ 走 `node`（ViewNode 在 `child` 与 `keyed` 里都成立，最安全）。
 * 显式 `units: [{ file, component, mode, thin }]` 只作为**库内特殊组件的逃生口**，业务侧不需要它。
 *
 * 业务源码零改动：插件只把函数改名（`Card` → `CardSource`，真源留给编译器）并在文件末尾追加同名函数
 * 转调产物；产物进虚拟模块、不落盘，业务代码不 import 任何生成物。改写用 `magic-string`，产出
 * **hires sourcemap**，线上报错的定位链不断。
 *
 * 认不准就不动（R6）：组件形状编不了（bail）→ 该组件原样保留，走通用路径。
 */
import { parse } from '@babel/parser';
import MagicString from 'magic-string';
import { createUnplugin } from 'unplugin';
import { compileSource, DEFAULT_RUNTIME } from './compile.js';
import { componentUnits, normalizePath, topLevelFunctions } from './discover.js';

/** 虚拟产物模块的命名空间前缀（NUL 开头：普通的包名解析器不会碰它）。 */
const VIRTUAL_PREFIX = '\0yoya-row:';
/** 打包器语境下的运行期钩子默认入口（`compileSource` / CLI 的 `./compiler-runtime.js` 是给手写模块用的）。 */
const PACKAGE_RUNTIME = '@yoyaflow/yoya-ui/compiler-runtime';

/**
 * 纯函数部分：给出模块源码与目标声明（一个或多个）→ 改写后的模块 + 各自的产物模块。
 * 不该编 / 编不了时返回 null（源码原样交给打包器走通用路径）。
 */
export function wireComponentModule({
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
    const name = unit.component;
    const declaration = declarations.get(name);
    const param = declaration?.node.params[0];
    if (!declaration || declaration.node.async || declaration.node.generator) {
      return;
    }
    if (declaration.node.params.length !== 1 || param?.type !== 'Identifier') {
      return; // 形参不是单个标识符：和编译器同一口径，不动这个组件
    }

    const result = compileSource({
      source,
      file: unit.file ?? target?.file,
      fn: name,
      mode: unit.mode ?? 'element',
      thin: unit.thin ?? false,
      templatesOnly: unit.templatesOnly ?? false,
      core,
      runtime,
      coreSpecifier
    });
    if (!result.compiled || !result.module) {
      return; // bail：这个组件整形状回落
    }

    // 真源留在文件里（编译器读它），改名 + 不再导出；对外名字由追加的同名函数顶上。
    const paramsStart = source.indexOf('(', declaration.node.start);
    magic.overwrite(declaration.start, paramsStart, `function ${name}Source`);
    const virtual = `${VIRTUAL_PREFIX}${name}-${result.plan.signature}`;
    magic.append(
      [
        '',
        `// 构建期由 @yoyaflow/yoya-ui/compiler 追加：同名函数转调编译产物（真源见上面的 ${name}Source）。`,
        `import { createRowFactory } from ${JSON.stringify(virtual)};`,
        `let __yoyaFactory_${units.length} = null;`,
        `${declaration.exported ? 'export ' : ''}function ${name}(${param.name}) {`,
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
        unit.file ?? name
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

/** 校验选项：显式 `units` 是库内逃生口；不给就按组件边界自动发现。 */
function normalizeOptions(options = {}) {
  const {
    core,
    units = [],
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
  units.forEach((unit) => {
    if (!unit?.file || !unit?.component) {
      throw new TypeError('yoyaCompile() units need { file, component }（库内逃生口）');
    }
    targets.set(normalizePath(unit.file), unit);
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
      return componentUnits(source, { core, file: id, mode, templatesOnly, thin });
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
      const wired = wireComponentModule({
        source: code,
        targets: units,
        core,
        runtime,
        coreSpecifier
      });
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

/** 兼容别名（0.6.11 及更早的导出名）。 */
export const wireRowModule = wireComponentModule;
/** 兼容别名（0.6.11 及更早的导出名）。 */
export const viewFactoryUnits = componentUnits;
export { componentUnits };
