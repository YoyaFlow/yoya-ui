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
 * - 小驼峰里也是工厂函数的（`Card` / `vBadge` 这类薄工厂、快捷工厂）＝同样算；
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
 *
 * 调用点链接的两条安全线（票 15）：**产物是裸结构**（薄工厂）的组件才允许就地摊平；
 * 产物是**组件节点**的（`vNode` / 形态 B）摊平会丢命令与钩子，因此改记"运行期子节点"——
 * 表达式原样进产物、组件符号走 scope，它自己的视图表达式照旧是编译产物。
 */
import { parse } from '@babel/parser';
import { readFileSync } from 'node:fs';
import MagicString from 'magic-string';
import { createUnplugin } from 'unplugin';
import { compileSource, DEFAULT_RUNTIME } from './compile.js';
import { componentUnits, normalizePath, topLevelFunctions } from './discover.js';
import { paramBoundNames, shortcutDefinitionsOf } from './analyze.js';
import { sourceLabelOf } from './emit.js';
import { componentKeyOf } from './component-key.js';

/** 虚拟产物模块的命名空间前缀（NUL 开头：普通的包名解析器不会碰它）。 */
const VIRTUAL_PREFIX = '\0yoya-row:';
/** 打包器语境下的运行期钩子默认入口（`compileSource` / CLI 的 `./compiler-runtime.js` 是给手写模块用的）。 */
const PACKAGE_RUNTIME = '@yoyaflow/yoya-ui/compiler-runtime';
/** 随包发布的库内组件注册表（`npm run build:registry` 产出；见 scripts/compiler-registry.mjs）。 */
export const PACKAGE_REGISTRY = '@yoyaflow/yoya-ui/compiled-registry';

/**
 * 默认加载**随包发布**的库内组件注册表（票 11）：业务侧不用自己跑一遍 `buildComponentRegistry`。
 *
 * 三条纪律：
 * - **显式优先**：调用方给了 `components` 就用它的，这里根本不看包；
 * - **找不到就算了**：包没发布注册表 / 解析不到（例如仓库内跑、别名指向 src）→ 返回 null，
 *   保持今天的行为（跨包链接关闭），不报错、不猜；
 * - **不混用核心入口**：注册表是按某个 `coreSpecifier` 编的，调用方配了别的 core 就**不用它**
 *   （两份核心实例的后果在票 14 的 D3 里踩过：冻结哨兵身份不匹配）。
 */
export async function loadPackagedRegistry({
  coreSpecifier = null,
  specifier = PACKAGE_REGISTRY,
  importModule = (id) => import(id),
  readData = readPackagedRegistryData
} = {}) {
  let module;
  try {
    module = await importModule(specifier);
  } catch {
    return null;
  }
  if (!module?.components || typeof module.components !== 'object') {
    return null;
  }
  if (coreSpecifier && module.coreSpecifier && coreSpecifier !== module.coreSpecifier) {
    return null;
  }

  // 嵌入调用方片段要用**构建期数据**（`ops` / `factory`）。它读的是与模块同目录的纯数据 JSON，
  // 只在构建期（Node 里）读一次——不进使用者的 bundle；读不到就整体不用（缺 ops 会产出半成品）。
  const data = readData?.(specifier) ?? null;
  if (!data?.components) {
    return null;
  }
  const components = {};
  for (const [key, entry] of Object.entries(module.components)) {
    const build = data.components[key];
    if (!build?.ops || !build.factory) {
      return null;
    }
    components[key] = {
      ...build,
      bind: entry.bind,
      render: entry.render,
      hash: entry.hash,
      plan: entry.plan
    };
  }
  return {
    components: {
      version: module.registryVersion ?? 1,
      runtime: module.runtimeSpecifier ?? PACKAGE_RUNTIME,
      components
    },
    componentsSpecifier: specifier
  };
}

/** 注册表纯数据（构建期）：与模块同目录的 `<模块名>.json`。解析不到就返回 null。 */
function readPackagedRegistryData(specifier) {
  if (typeof import.meta.resolve !== 'function') {
    return null; // 老运行时 / 被打包器改写过的环境：宁可不链接，也不产出半成品
  }
  let moduleUrl;
  try {
    moduleUrl = import.meta.resolve(specifier);
  } catch {
    return null;
  }
  if (!moduleUrl?.startsWith('file:')) {
    return null;
  }
  try {
    const dataUrl = new URL(moduleUrl).href.replace(/(\.min)?\.js$/, '.json');
    return JSON.parse(readFileSync(new URL(dataUrl), 'utf8'));
  } catch {
    return null;
  }
}

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
  coreSpecifier,
  // 预构建的组件注册表（纯数据，见 `buildComponentRegistry`）+ 生成产物 import 它的路径。
  // 有它就能**跨模块 / 跨包**链接：同模块的条目仍然走内联，其余走 `bindComponent`（含哈希回落）。
  components = null,
  componentsSpecifier = null
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

  /** 模块标签：与编译器内部同一条口径（相对 cwd），注册表键 / plan.source 都用它。 */
  const fileLabelOf = (unit) => sourceLabelOf(unit.file ?? target?.file ?? '(inline)');
  const { compileWith, compiledByUnit } = compileModuleRegistry({
    ast,
    source,
    list,
    declarations,
    core,
    runtime,
    coreSpecifier,
    components,
    componentsSpecifier,
    fileLabelOf
  });

  list.forEach((unit) => {
    const name = unit.component;
    const declaration = declarations.get(name);
    if (!declaration || declaration.node.async || declaration.node.generator) {
      return;
    }

    const rowVirtual = rowSpecifierOf(name);
    const controlVirtual = controlSpecifierOf(name);

    // 形状由分析器给出（唯一真源）。组件单元（形态 B / vNode）的产物要能当 ViewNode 用 →
    // 必须是 node 通道，而且**静态根也要建包装对象**（`nodeAlways`：纯静态的组件体在 node 通道里
    // 默认只返回片段元素，那会让 `render()` 返回一个 Element）。纯行工厂保持推断通道。
    const params = declaration.node.params;
    const paramsSource = params.map((item) => source.slice(item.start, item.end)).join(', ');
    // 就地替换路径的产物**按绑定名收参**（票 21 §2.1.12）：外层函数已经把默认值 / 解构 / rest
    // 应用过了，调用点只有这些绑定值可传。把形参表原文当实参传（`(props = {})`）会**重新求值默认值**
    // （传进来的对象被 `{}` 顶掉），解构 / rest 形状还会变成对不存在变量的赋值（严格模式直接 ReferenceError）。
    const paramBindings = [...paramBoundNames(params)].join(', ');
    const first = compiledByUnit.get(unit) ?? compileWith(unit, unit.mode ?? 'element');
    if (!first.compiled || !first.module) {
      return; // bail：这个组件整形状回落
    }
    const shape = first.structure?.shape ?? 'row';
    const result =
      shape !== 'row'
        ? compileWith(unit, 'node', { nodeAlways: true, paramsSource: paramBindings })
        : // 行形状但**通道是 node**（这个组件不是"只在 keyed 列表里用"）：包装函数直接交回产物，
          // 而调用方（`createComponentShortcut(VXxx)` / `child(VXxx())` / 直接调用）要的是 ViewNode
          // —— 纯静态结构在 node 通道默认只返回片段元素，会让 shortcut 的 `instanceof ViewNode` 校验
          // 直接抛错（实测 `fixtures/shortcut-link.js` 的 `vThing()`）→ 这条路径也要 `nodeAlways`。
          unit.mode === 'element'
          ? first
          : compileWith(unit, 'node', { nodeAlways: true });
    if (!result.compiled || !result.module) {
      return;
    }
    // 发现口径是 **element**（这个组件只被 `keyed(rows, X)` 当行工厂用）→ 运行期拿它建行的是
    // `keyedRows`，它要 `{ el, isMounted, destroy }`。可如果产物变成了 **node**（分析期要求节点：
    // 运行期子节点 / 洞 / 被读的视图句柄），交回去的是 ViewNode，行就没法对账了 ——
    // 这种单元**整形状回落**走通用路径，绝不塞半成品给列表。
    if (unit.mode === 'element' && result.plan?.mode === 'node') {
      return;
    }
    const resolvedShape = result.structure?.shape ?? 'row';

    /** `keyed` 的行工厂子单元：各自落成虚拟模块（主模块按路径 import 它们的 createRowFactory）。 */
    const registerRows = (compiled) => {
      (compiled.rows ?? []).forEach((row) => {
        units.push({
          module: row.module,
          moduleMap: sourceMapForGenerated(
            row.module,
            source.slice(declaration.node.start, declaration.node.end),
            unit.file ?? name
          ),
          virtual: rowVirtual(row.index, row)
        });
      });
    };
    /** 结构锚点的子单元（`if` / `for…of` 里的结构）：同样各自落成虚拟模块。 */
    const registerControls = (compiled) => {
      (compiled.controls ?? []).forEach((control) => {
        units.push({
          module: control.module,
          moduleMap: sourceMapForGenerated(
            control.module,
            source.slice(declaration.node.start, declaration.node.end),
            unit.file ?? name
          ),
          virtual: controlVirtual(control.index, control)
        });
      });
    };

    // 行工厂的包装函数按源码参数表原样转发实参（票 21）：全是标识符时签名与转发都照抄（函数 length
    // 不变），解构 / 默认值 / rest 形状用 rest 转发——绝不在包装函数里重新拼实参对象，那会让默认值求值两次。
    const virtual = `${VIRTUAL_PREFIX}${name}-${result.plan.signature}`;

    // 组件单元：**就地替换结构表达式**——组件体、命令、状态、钩子一行不动，只把视图换成产物。
    // 于是命令 / `instanceof` / 生命周期天然保留（比"提取命令 + 造壳"更简单也更强）。
    if (resolvedShape !== 'row') {
      // 组件体局部量（实例变量等）是**每次调用**才有的值：此时不能把工厂缓存到模块级
      // （`??=` 会把第一次调用时的实例留给下一位调用者），改成每次调用现建一次工厂——
      // 对象字面量就在函数体里求值，闭包照旧可见。
      const perCall = (result.perCallScope ?? []).length > 0;
      const factoryImport = `__yoyaCreateRowFactory_${units.length}`;
      const factoryExpr = perCall
        ? `${factoryImport}({ ${result.scope.join(', ')} })`
        : `(__yoyaFactory_${units.length} ??= ${factoryImport}({ ${result.scope.join(', ')} }))`;
      magic.overwrite(
        result.structure.start,
        result.structure.end,
        `(${factoryExpr})(${paramBindings})`
      );
      magic.append(
        [
          '',
          `// 构建期由 @yoyaflow/yoya-ui/compiler 追加：${name} 的视图表达式已就地替换为编译产物。`,
          `import { createRowFactory as ${factoryImport} } from ${JSON.stringify(virtual)};`,
          ...(perCall ? [] : [`let __yoyaFactory_${units.length} = null;`]),
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
      registerRows(result);
      registerControls(result);
      changed = true;
      return;
    }

    const plainParams = params.every((item) => item.type === 'Identifier');
    const signature = plainParams ? paramsSource : '...__yoyaArgs';
    const forwarded = plainParams ? paramsSource : '...__yoyaArgs';

    // 真源留在文件里（编译器读它），改名 + 不再导出；对外名字由追加的同名函数顶上。
    const paramsStart = source.indexOf('(', declaration.node.start);
    magic.overwrite(declaration.start, paramsStart, `function ${name}Source`);
    // 每个单元一个**独立的 import 绑定名**：同一模块里有多个编译单元时，重复声明同名绑定
    // （`import { createRowFactory }` 写两次）是 ESM 的语法错误，业务模块会被打包器直接拒收。
    const factoryImport = `__yoyaCreateRowFactory_${units.length}`;
    magic.append(
      [
        '',
        `// 构建期由 @yoyaflow/yoya-ui/compiler 追加：同名函数转调编译产物（真源见上面的 ${name}Source）。`,
        `import { createRowFactory as ${factoryImport} } from ${JSON.stringify(virtual)};`,
        `let __yoyaFactory_${units.length} = null;`,
        `${declaration.exported ? 'export ' : ''}function ${name}(${signature}) {`,
        `  __yoyaFactory_${units.length} ??= ${factoryImport}({ ${result.scope.join(', ')} });`,
        `  return __yoyaFactory_${units.length}(${forwarded});`,
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
    registerRows(result);
    registerControls(result);
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
 * **同模块组件注册表（定点）**：插件与覆盖率扫描共用同一份实现。
 *
 * 被引用组件先编（它自己可能也引用别的组件），编不出"未链接的组件调用"以外的原因就出局；
 * 登记的是**纯数据**（形参表 / 入口工厂 / ops / scope），同一次构建里的同模块引用直接**内联**。
 */
export function compileModuleRegistry({
  ast,
  source,
  list,
  declarations,
  core,
  runtime = DEFAULT_RUNTIME,
  coreSpecifier,
  components = null,
  componentsSpecifier = null,
  fileLabelOf
}) {
  const registry = new Map();
  const compiledByUnit = new Map();
  const registryData = () => ({
    version: 1,
    runtime,
    // 用户给的注册表（跨模块 / 跨包）+ 本模块现场发现的条目（同模块，后写覆盖）
    components: { ...(components?.components ?? {}), ...Object.fromEntries(registry) }
  });
  const registryScope = () => [
    ...new Set([...registry.values()].flatMap((entry) => entry.scope ?? []))
  ];
  const compileWith = (unit, mode, extra = null) =>
    compileSource({
      source,
      file: fileLabelOf(unit),
      fn: unit.component,
      mode,
      ...(extra ?? {}),
      thin: unit.thin ?? false,
      templatesOnly: unit.templatesOnly ?? false,
      rowSpecifier: rowSpecifierOf(unit.component),
      controlSpecifier: controlSpecifierOf(unit.component),
      // 同模块引用走内联：命中注册表就地展开，未命中照旧 bail 回落
      linking: 'inline',
      components: registryData(),
      scopeExtras: registryScope(),
      core,
      runtime,
      coreSpecifier,
      ...(componentsSpecifier ? { componentsSpecifier } : {})
    });

  /** 被 `child(<本地组件>(…))` 引用到的组件（分析器只在这一处认组件调用）。 */
  const referenced = referencedComponents(ast, declarations);
  // 快捷名索引（票 15 §Q4）：`vXxx → VXxx`，注册表补别名条目用
  const shortcuts = shortcutDefinitionsOf(ast);
  const pending = new Map(
    list.filter((unit) => referenced.has(unit.component)).map((unit) => [unit.component, unit])
  );
  let progress = pending.size > 0;
  while (pending.size > 0 && progress) {
    progress = false;
    [...pending].forEach(([name, unit]) => {
      const compiled = compileWith(unit, unit.mode ?? 'element');
      compiledByUnit.set(unit, compiled);
      const unlinked = compiled.bails.some((bail) => bail.code === 'unlinked-component');
      if (!compiled.compiled || !compiled.module) {
        if (!unlinked) {
          pending.delete(name); // 这个组件本身编不了 → 它不是可链接的条目
        }
        return;
      }
      if ((compiled.rows ?? []).length > 0) {
        pending.delete(name); // 内部有 keyed 行子单元的组件：调用点内联还要接线行子单元，本轮不登记
        return;
      }
      if ((compiled.perCallScope ?? []).length > 0) {
        // 视图用到**组件体局部量**（实例变量）：链接到别的模块时那些名字不存在（编译产物只拿到值，
        // 跨模块连值都拿不到），还会被调用点当"模块级名字"提升进自己的 scope（实测 docs 页面的
        // `liveDemo is not defined`）→ 这个组件不登记，调用点照旧走通用路径。
        pending.delete(name);
        return;
      }
      const declaration = declarations.get(name);
      // 产物类型决定调用点能不能**摊平**：`row` 是薄工厂（产物就是元素 / 节点本身），
      // 内联后与源码语义一致；`render` / `vNode` 的产物是**组件节点**，命令、钩子、身份都挂在
      // 那层包装上，摊平就是静默丢语义（票 15）→ 调用点按"运行期子节点"处理。
      const shape = compiled.structure?.shape ?? 'row';
      registry.set(componentKeyOf(fileLabelOf(unit), name), {
        // 形参表原文 + 绑定名：内联时按它做形参帧（逐字复刻子组件的参数表）
        params: declaration.node.params
          .map((param) => source.slice(param.start, param.end))
          .join(', '),
        paramNames: [...paramBoundNames(declaration.node.params)],
        product: shape === 'row' ? 'element' : 'node',
        factory: compiled.factory,
        ops: compiled.ops,
        scope: compiled.scope
      });
      // 快捷名别名条目（票 15 §Q4）：调用点写 `child(vXxx(…))` 时按同一个键空间查表，
      // 所以别名也要有权重相同的条目（形参表就是定义函数的形参表）。
      shortcuts.forEach((definition, shortcut) => {
        if (definition === name) {
          registry.set(componentKeyOf(fileLabelOf(unit), shortcut), {
            params: declaration.node.params
              .map((param) => source.slice(param.start, param.end))
              .join(', '),
            paramNames: [...paramBoundNames(declaration.node.params)],
            product: shape === 'row' ? 'element' : 'node',
            factory: compiled.factory,
            ops: compiled.ops,
            scope: compiled.scope
          });
        }
      });
      pending.delete(name);
      progress = true;
    });
  }
  return { registry, compiledByUnit, registryData, registryScope, compileWith };
}

/** 行工厂子单元的虚拟路径：按"组件名 + 行序号 + 行片段签名"生成。 */
const rowSpecifierOf = (name) => (index, row) =>
  `${VIRTUAL_PREFIX}${name}-row${index}-${row.plan?.signature ?? 'unknown'}`;
/** 结构锚点子单元（`if` / `for…of` / `forEach` 里的结构）的虚拟路径。 */
const controlSpecifierOf = (name) => (index, unit) =>
  `${VIRTUAL_PREFIX}${name}-ctl${index}-${unit.plan?.signature ?? 'unknown'}`;

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

/**
 * 模块里「被当子节点调用的本地组件」名单：`child(<名字>(…))`。
 * 只有这一处会被分析器认成组件调用（`child()` 的实参是本地顶层函数调用），所以注册表按它裁剪：
 * 没人引用的组件不必编链接条目（同模块内联不需要跨构建的注册表）。
 */
function referencedComponents(ast, declarations) {
  const found = new Set();
  // 快捷名索引（票 15 §Q4）：`const vXxx = createComponentShortcut(VXxx)`——
  // 调用点写的是快捷名，登记/编译的却是定义名，先按索引换算过去。
  const shortcuts = shortcutDefinitionsOf(ast);
  const visit = (node) => {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (
      node.type === 'CallExpression' &&
      node.callee?.type === 'MemberExpression' &&
      node.callee.property?.name === 'child'
    ) {
      const argument = node.arguments[0];
      if (
        argument?.type === 'CallExpression' &&
        argument.callee?.type === 'Identifier' &&
        (declarations.has(argument.callee.name) ||
          declarations.has(shortcuts.get(argument.callee.name)))
      ) {
        const callee = argument.callee.name;
        found.add(declarations.has(callee) ? callee : shortcuts.get(callee));
      }
    }
    Object.keys(node).forEach((key) => {
      if (key === 'loc' || key === 'start' || key === 'end') {
        return;
      }
      const value = node[key];
      if (value && typeof value === 'object') {
        visit(value);
      }
    });
  };
  visit(ast.program);
  return found;
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
    // 预构建组件注册表（跨模块 / 跨包链接用）：纯数据 + 生成产物 import 它的路径
    components = null,
    componentsSpecifier = null,
    // 随包发布的库内组件注册表：`true`（默认，按包内路径尝试）/ `false`（不用）/ 字符串（自定义入口）
    registry = true,
    registrySpecifier = null,
    exclude = ['node_modules']
  } = options;
  if (!core) {
    throw new TypeError('yoyaCompile() requires the core namespace (import * as core …)');
  }
  if (components && !componentsSpecifier) {
    throw new TypeError(
      'yoyaCompile(): 传了 components 注册表就必须同时给 componentsSpecifier' +
        '（生成产物 import 注册表模块的路径，例如 ./src/generated/components/components.registry.js）'
    );
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
  // 显式 `components` 压过包内注册表；`registry: false` 整个关掉（不加载、不引）
  const registryEnabled = registry !== false && !components;
  const packagedSpecifier =
    typeof registry === 'string' ? registry : (registrySpecifier ?? PACKAGE_REGISTRY);

  return {
    core,
    coreSpecifier,
    onArtifact,
    runtime,
    components,
    componentsSpecifier,
    registry: registryEnabled,
    registrySpecifier: packagedSpecifier,
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
  const {
    core,
    coreSpecifier,
    onArtifact,
    runtime,
    components,
    componentsSpecifier,
    registry,
    registrySpecifier,
    unitsFor
  } = normalizeOptions(options);
  const virtualModules = new Map();

  const virtualOf = (id) => (typeof id === 'string' && id.startsWith(VIRTUAL_PREFIX) ? id : null);
  /**
   * 用哪份注册表：显式传入的优先；否则按包内路径懒加载一次（票 11）。
   * `registry: false` 可以整个关掉（不引、不加载）。
   */
  let registryPromise = null;
  const registryFor = async () => {
    if (components) {
      return { components, componentsSpecifier };
    }
    if (registry === false) {
      return { components: null, componentsSpecifier: null };
    }
    if (registryPromise === null) {
      registryPromise = loadPackagedRegistry({
        coreSpecifier: coreSpecifier ?? null,
        specifier: registrySpecifier ?? PACKAGE_REGISTRY
      });
    }
    return (await registryPromise) ?? { components: null, componentsSpecifier: null };
  };

  return {
    name: 'yoya-ui-compile',
    enforce: 'pre',
    async transform(code, id) {
      const units = typeof id === 'string' ? unitsFor(id, code) : [];
      if (units.length === 0) {
        return null;
      }
      const linked = await registryFor();
      const wired = wireComponentModule({
        source: code,
        targets: units,
        core,
        runtime,
        coreSpecifier,
        components: linked.components,
        componentsSpecifier: linked.componentsSpecifier
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
