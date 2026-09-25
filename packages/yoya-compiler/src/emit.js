/**
 * 把结构分析结果渲染成 plan + 生成模块源码。
 *
 * 两条通道（`plan.mode`）：
 * - `element`：行就是原生元素——值位置直接写 DOM，活值订阅后就地写，没有包装节点；
 * - `node`：行还是 ViewNode——静态节点只存在于片段里，活结点按位置 `adopt` 既有 DOM。
 *
 * 片段永远由框架自己的工厂 + `toHTML()` 产出（不手写 HTML、不拼字符串），编译器只判断
 * 「哪些值算静态」。生成的模块只 import 运行期钩子，不含编译器本身。
 */
import { freeIdentifiers, isBindableName } from './analyze.js';
import { isElementFactory } from '@yoyaflow/yoya-core/internal/core/node.js';
import { createHash } from 'node:crypto';
import { isAbsolute, relative } from 'node:path';

/**
 * 文本位置的**采样哨兵**与**片段锚点**。
 *
 * 片段是"框架序列化 → `innerHTML` 再解析"出来的，而 HTML 解析器会把**相邻的两段文本并成一个**
 * 文本节点；位置表按 `childNodes` 下标寻址，于是 `child('a'); child(props.x)` 这种相邻写法会整体前移
 * （读到 `undefined`，或把值写进隔壁元素）。所以片段里的文本位置必须是**不参与文本合并的注释锚点**：
 * 采样时写一个控制字符（用户静态文本里几乎不可能出现），序列化后换成 `<!---->`——
 * 解析后是一个注释节点，位置表照旧对齐；写入时由运行期把它换成真文本节点（`textAt`）。
 */
const TEXT_SENTINEL = '\u0001';
const TEXT_ANCHOR = '<!---->';

/** 直接带活内容（绑定 / 事件 / 活文本）的 op 种类。 */
const DIRECT_LIVE = [
  'dynamicAttr',
  'dynamicClass',
  'dynamicArg',
  'dynamicOptions',
  'holeCall',
  'childValue',
  'dynamicStyle',
  'liveClass',
  'liveEvent',
  'liveMountable',
  'keyedRows',
  'bindText'
];

/** 只存在于片段里的 op（两条通道都不再写它们）；其余 op 认不出就必须抛错，不许静默丢。 */
const FRAGMENT_ONLY = new Set(['staticAttr', 'staticClass', 'staticStyle', 'staticText']);

/**
 * 形态 C 骨架的内容位置（`applyComponentSetup(this, setup)`）：内容由**调用方**提供，
 * 构件只编"没有内容"的用法（带内容时 `bind` 返回 null，走通用路径回落），产物里不写。
 */
const CALLER_CONTENT = new Set(['content']);

const indentOf = (depth) => '  '.repeat(depth);

/**
 * 元素 / SVG 工厂的查找：**顶层导出 → `htmls` 表 → `svgs` 表**。
 *
 * SVG 子标签工厂（`path` / `circle` / `rect` …）不在 core 顶层导出，只注册在 `svgs` 表里
 * （「只有 `<svg>` 是 HTML DSL 可见入口，SVG 子标签通过 svg 节点内部方法添加」），
 * 但它们在白名单里是合法工厂——片段构建与节点物化都要能找到它们。
 */
function elementFactoryOf(core, name) {
  const factory = core?.[name] ?? core?.htmls?.[name] ?? core?.svgs?.[name] ?? null;
  if (factory === null) {
    return null;
  }
  // 基础元素工厂标识（票 21）：这份核心"自报"了标记时，表里的名字必须真的是带标记的基础工厂——
  // 表与标记不一致（漂移）就按"不是元素工厂"回落，绝不拿非工厂函数去搭片段。
  // 旧核心 / 第三方 core 没有标记时不强制（那时仍按名字表工作）。
  if (coreAdvertisesElementFactoryMark(core) && !isElementFactory(factory)) {
    return null;
  }
  return factory;
}

/** 这份 core 是不是"带标记时代"的核心：表里任意一个是基础元素工厂即算。 */
function coreAdvertisesElementFactoryMark(core) {
  if (coreMarkCache.has(core)) {
    return coreMarkCache.get(core);
  }
  const values = [...Object.values(core?.htmls ?? {}), ...Object.values(core?.svgs ?? {})];
  const advertised = values.some((value) => isElementFactory(value));
  coreMarkCache.set(core, advertised);
  return advertised;
}

/** core → 是否带标记（每次编译只算一次；core 是模块级对象，缓存不会过期）。 */
const coreMarkCache = new WeakMap();

/** 生成代码里怎么写这个工厂：顶层导出直接写名字；只在 `svgs` 表里就写 `svgs.<名字>`。 */
function factoryExpressionOf(core, name) {
  if (typeof core?.[name] === 'function') {
    return name;
  }
  if (typeof core?.svgs?.[name] === 'function') {
    return `svgs.${name}`;
  }
  return null;
}

/** 把一段（可能多行的）源码按给定缩进铺进产物，保留原有换行。 */
const indentBlock = (text, indent) =>
  text
    .split('\n')
    .map((line) => (line.length > 0 ? `${indent}${line}` : line))
    .join('\n');

/**
 * 产物里的源码标签（票 C6）：**绝不嵌机器绝对路径**，否则同一份源码在两台机器/两个目录编出来的
 * 产物不逐字节相同，还会泄漏本地路径。绝对路径一律折算成相对 cwd 的写法；真在项目之外就只留文件名。
 */
export function sourceLabelOf(file) {
  if (typeof file !== 'string' || file.length === 0) {
    return file;
  }
  if (!isAbsolute(file)) {
    return file.replace(/\\/g, '/');
  }

  const rel = relative(process.cwd(), file).replace(/\\/g, '/');
  return rel.startsWith('..') ? file.split(/[\\/]/).pop() : rel;
}

/** 静态值 → 生成代码里的字面量写法（`null` / `false` / `true` 原样，正是 attr 的口径）。 */
const jsLiteral = (value) => (value === undefined ? 'undefined' : JSON.stringify(value));

/** 调用点内联的内容：把构件 ops 里的内容位置就地换成调用方编译出来的内容 ops（没有就原样）。 */
function withInlinedContent(entryOps, content) {
  if (!content) {
    return entryOps;
  }

  const merged = [];
  for (const op of entryOps) {
    if (op.kind === 'content' && (op.index ?? 0) === content.index) {
      merged.push(...content.ops);
      continue;
    }
    merged.push(op);
  }
  return merged;
}

/**
 * 链接的组件**在调用点内联**（插件路径：同一次构建、同一个模块，没有"另一个构建的注册表"要对哈希）。
 *
 * 做法：把 `component` op 换成「组件根元素的 element op + 形参帧」——子组件的 ops 按调用点路径**重定基**
 * （+ 调用方实参的值），发射器照普通元素递归，位置表 / 挂载锚点 / 局部绑定的口径全部复用。
 * 内联不了（条目没带形参表 / 组件内部有 `keyed` 行子单元）就抛错，让整个形状回落，不产半成品。
 */
function inlineComponentOps(ops, label) {
  return ops.map((op) => {
    if (op.kind === 'element') {
      return { ...op, ops: inlineComponentOps(op.ops, label) };
    }
    if (op.kind !== 'component') {
      return op;
    }
    // 只有**同一个模块**里的组件才内联：跨模块条目的 scope 是它自己模块的命名空间，
    // 业务模块里根本没有那些名字。跨模块走注册表 + `bindComponent`（票 07 第二档）。
    if (label !== null && !op.key.startsWith(`${label}#`)) {
      return op;
    }
    if (typeof op.params !== 'string') {
      throw new Error(
        `内联链接需要注册表条目提供 ${op.key} 的形参表（params）：这个形状走通用路径`
      );
    }
    // 定义没有形参、调用点却传了实参：那些实参是"调用方 setup 值"（回调 / options / 文本…），
    // 内联进产物无处安放（会静默丢）→ 整体回落，交给运行期按组件语义应用。
    if (op.params.trim() === '' && op.args.length > 0) {
      throw new Error(
        `组件 ${op.key} 的定义没有形参，调用点却传了 ${op.args.length} 个 setup 实参：内联会丢，这个形状走通用路径`
      );
    }
    // 第二道保险：产物是**组件节点**（vNode / 形态 B）的条目一律不摊平——包装上挂着命令与钩子，
    // 摊平后 DOM 一样、行为不一样（票 15 的静默半成品）。调用点应该走运行期子节点。
    if (op.product === 'node') {
      throw new Error(
        `组件 ${op.key} 的产物是组件节点（命令 / 钩子挂在包装上）：调用点不内联，走通用路径`
      );
    }
    const entryOps = rebaseOps(op.entryOps, op.path);
    const content = op.content ? rebaseOps(op.content.ops, op.path) : null;
    const merged = content
      ? withInlinedContent(entryOps, { index: op.content.index ?? 0, ops: content })
      : entryOps;
    if (hasOpKind(merged, 'keyedRows')) {
      throw new Error(
        `组件 ${op.key} 内部有 keyed 行子单元：调用点内联需要把行子单元一起接线，本轮先回落通用路径`
      );
    }
    return {
      kind: 'element',
      factory: op.entryFactory,
      path: op.path,
      ops: merged,
      frame: {
        paramsSource: op.params,
        paramNames: op.paramNames ?? [],
        values: op.args
      }
    };
  });
}

/** 路径重定基：子单元的 op 路径是「相对子组件根」的，内联后要加上它在调用方的位置。 */
function rebaseOps(ops, prefix) {
  return ops.map((op) => {
    const next = { ...op, path: [...prefix, ...(op.path ?? [])] };
    if (next.kind === 'element') {
      next.ops = rebaseOps(op.ops, prefix);
    }
    return next.kind === 'component' ? inlineComponentOps([next])[0] : next;
  });
}

/**
 * 渲染一个形状。
 *
 * @returns {{ plan: object, module: string, scope: string[], liveNodes: number, slots: number }}
 */
export function renderModule(options) {
  const {
    core,
    entry,
    mode = 'element',
    thin = false,
    file = '(inline)',
    fn,
    runtime = './compiler-runtime.js',
    kind = 'row',
    componentsSpecifier = './components.registry.js',
    scopeSpecifier = null,
    paramsSource = '',
    hash = null,
    templatesOnly = false,
    // `keyed` 行子单元的模块路径（构建期插件给）：主模块 import 它们的 createRowFactory
    rowSpecifiers = [],
    // 结构锚点的子单元（`if` / `for…of` 里的结构）：同样按模块路径 import
    controlSpecifiers = [],
    // 每个锚点子单元需要的名字（父产物按帧把父这边的名字传进去）
    controlFrames = [],
    // 行单元需要的名字（父模块一并解构，再交给行工厂）
    scopeExtras = [],
    // 调用点链接的口径：`bind`（注册表 + bindComponent + 哈希回落，跨构建）或
    // `inline`（同一次构建、同一个模块 → 直接内联，运行期零新增）
    linking = 'bind',
    // 节点模式：即使这根是纯静态也建包装对象（调用方要把它当 ViewNode 用，例如结构锚点的子单元）
    nodeAlways = false,
    // 节点通道要给活结点建包装对象（tr / td / a …）：产物**自己 import**这些元素工厂，
    // 不再让调用方塞进 scope（票 13 / R4：编译产物不是业务接口）。
    coreSpecifier = '@yoyaflow/yoya-core',
    contentGuard = false
  } = options;

  // 内联链接：`component` op 就地换成「根元素 + 形参帧」，后面的发射照普通元素递归。
  // 同模块（注册表键的文件部分 == 本模块标签）才内联；跨模块的 `component` op 留给 `bindComponent`。
  if (linking === 'inline') {
    entry.ops = inlineComponentOps(entry.ops, sourceLabelOf(file));
  }

  const scope = new Set();
  const coreImportNames = new Set();
  // 形参绑定的名字（解构 / 默认值 / rest 全展开）都算已绑定：它们出现在值表达式里也不进 scope。
  const bound = new Set([
    entry.builderParam,
    entry.setupParam,
    'node',
    'event',
    ...(entry.boundParams ?? [])
  ]);
  const addExpression = (expression) => {
    freeIdentifiers(expression, bound).forEach((name) => {
      // 局部声明名：产物里不执行组件函数体，读到它就是 undefined → 整形状回落，绝不静默编错
      // **例外**：结构表达式被**就地替换**的组件单元（形态 B / vNode）——替换后的代码在原函数体里，
      // 同一层的局部量（`const liveDemo = demo.component()` 这类组件实例变量）闭包可见 → 可以进 scope。
      const replacedInPlace = (entry.structure?.shape ?? 'row') !== 'row';
      if (!replacedInPlace && entry.localNames?.has(name)) {
        throw new Error(`值位置引用了局部变量 ${name}：产物不执行组件函数体，这个形状走通用路径`);
      }
      // `arguments` / `eval` / 关键字 / 元属性碎片都不是绑定名：收进 scope 的产物直接语法错误，
      // 而且 `arguments` / `new.target` 的语义依赖调用形态、逐字复刻不了 → 整形状回落（票 21）
      // 嵌套 setup 的形参是**节点对象**（产物里没有这些对象）：进 scope 就是运行期 TypeError
      if (entry.nestedParams?.has(name)) {
        throw new Error(
          `值位置引用了嵌套 setup 的节点参数 ${name}：节点对象不是一段值，这个形状走通用路径`
        );
      }
      if (!isBindableName(name)) {
        throw new Error(
          `产物无法承载 ${name}：它不是合法的绑定名（arguments / eval / 关键字 / 元属性），` +
            '这个形状走通用路径'
        );
      }
      scope.add(name);
    });
  };
  const addName = (name) => scope.add(name);
  const addCoreName = (name) => coreImportNames.add(name);
  const scopeList = () => [...scope].sort().join(', ');

  /**
   * 形参帧的绑定名：内联进来的子组件体在它的形参帧里求值——那些名字**不是**本产物的作用域依赖
   * （由帧赋值），但同一个名字在外层仍可能是。所以按子树临时并入 / 退出，不做全局标记。
   */
  const withBound = (names, emit) => {
    const added = [];
    (names ?? []).forEach((name) => {
      if (!bound.has(name)) {
        bound.add(name);
        added.push(name);
      }
    });
    try {
      return emit();
    } finally {
      added.forEach((name) => bound.delete(name));
    }
  };

  // 行子单元用同一份 scope：父模块要把它们需要的名字也解构出来
  scopeExtras.forEach((name) => scope.add(name));

  // 形参的默认值 / 计算键要在产物里求值，里面的自由标识符照旧进 scope（票 21）。
  (entry.paramExpressions ?? []).forEach(addExpression);

  if (mode === 'element' && hasOpKind(entry.ops, 'dynamicStyle')) {
    // 元素模式把静态样式留在片段里（`toHTML()` 的紧凑格式），动态值只能走 CSSOM，
    // 一旦写一个属性，整个 style 属性会被重新序列化 → 与通用路径不再逐字节相同。
    throw new Error(
      '动态样式只支持节点模式（node）：元素模式的动态样式会按 CSSOM 序列化，' +
        '与片段里的紧凑格式不一致。可改用字面量、状态类用 toggleClass(name, 值)，' +
        '或把这一行编成 --mode node'
    );
  }

  const fragmentHtml = buildFragment(core, entry, mode);
  const emit = mode === 'element' ? emitElementMode : emitNodeMode;
  const emitted = emit({
    entry,
    thin,
    addExpression,
    addName,
    addCoreName,
    withBound,
    controlFrames,
    nodeAlways,
    core,
    rootName: kind === 'component' ? 'root' : 'el'
  });

  /**
   * 逻辑帧 / 洞 / 控制流里**直接写**了 `scope` 里的名字（组件体局部量 / 模块级名字）：
   * 产物拿到的是**值**（`scope` 解构成 `const`），赋值要么抛错（Assignment to constant variable），
   * 要么写不回外层（命令随后读到的还是旧值）→ 整形状回落。
   *
   * 成员写（`state.root = node`）不受影响：`state` 是同一个对象引用，写进去就生效。
   * 放在发射**之后**：`scope` 到这里才是全集，顺序无关（实测 `VSymbolButton` 的 `rootNode = root`、
   * `demos/checkbox.js` 洞里回调写的 `boxes = b`）。
   */
  const outerWrites = [];
  const collectWrites = (ops) =>
    (ops ?? []).forEach((op) => {
      (op.writes ?? []).forEach((name) => outerWrites.push(name));
      if (op.ops) {
        collectWrites(op.ops);
      }
    });
  collectWrites(entry.ops);
  const writtenOuterName = outerWrites.find((name) => scope.has(name));
  if (writtenOuterName) {
    throw new Error(
      `产物要写外层名字 ${writtenOuterName}：产物拿到的是值（scope 解构），写不回去，这个形状走通用路径`
    );
  }

  /**
   * 运行期 import 名单 = 通道基线（如 `cloneFragment`）+ **产物实际用到的钩子**。
   * 钩子名由各条发射分支在自己那一行登记（见 `emitElementMode` / `emitNodeMode` 的 hooks），
   * 所以加新 op 只改一处，产物也不会 import 用不到的东西。
   */
  const hookImports = (baseline = []) =>
    [...new Set([...baseline, ...(emitted.hooks ?? [])])].sort();

  const plan = {
    version: 1,
    mode,
    source: { file: sourceLabelOf(file), fn },
    // templates-only：片段由页面里的 <template> 提供，产物不再内联 html（运行期只按签名克隆）
    ...(templatesOnly ? {} : { html: fragmentHtml }),
    // 片段签名：构建期写页面 <template data-yoya-fragment="签名"> 时用它对号（票 45）
    signature: createHash('sha256').update(fragmentHtml).digest('hex').slice(0, 12),
    liveNodes: emitted.liveNodes,
    slots: emitted.slots
  };

  const destructure = scope.size > 0 ? `  const { ${scopeList()} } = scope;\n` : '';
  const header = `// 由 @yoyaflow/yoya-ui/compiler 从源码 AST 生成 —— 请勿手改。\n`;
  const runtimeImport = (names) =>
    `import { ${names.join(', ')} } from ${JSON.stringify(runtime)};\n`;
  const planExport = `\nexport const plan = ${JSON.stringify(plan, null, 2)};\n\n`;
  // 产物自己 import 元素工厂（票 13 / R4）。HTML 与 SVG 工厂都在 core 主入口（含 svg 元素面）。
  const coreImport =
    coreImportNames.size > 0
      ? `import { ${[...coreImportNames].sort().join(', ')} } from ${JSON.stringify(
          coreSpecifier
        )};\n`
      : '';

  // 组件产物：绑定函数写进已有的占位子树（调用方片段里嵌进来的那一棵），
  // scope 是组件原模块的命名空间（只允许 import 绑定的自由标识符）。
  if (mode === 'element' && kind === 'component') {
    // 组件产物写进调用方片段里的占位子树，自己不克隆 → 只 import 实际用到的钩子
    const names = hookImports([]);
    // 参数表以源码为准；`paramsSource` 是注册表从原模块切出来的同一份文本（合成源码的形参）
    const componentParams = paramsSource || entry.builderParams || '';
    const body = emitted.lines.map((line) => line.replace(/^ {4}/, '  ')).join('\n');
    const module =
      header +
      '// 组件片段链接产物：片段 + 位置写；`scope` 是组件原模块的命名空间。\n' +
      (scopeSpecifier ? `import * as scope from ${JSON.stringify(scopeSpecifier)};\n` : '') +
      (emitted.usesComponents
        ? `import { components } from ${JSON.stringify(componentsSpecifier)};\n`
        : '') +
      runtimeImport(names) +
      planExport +
      `export const hash = ${JSON.stringify(hash)};\n\n` +
      'export function bind(root, values, options) {\n' +
      destructure +
      // scope 先解构：形参默认值可能引用 scope 里的名字，反过来会撞 TDZ（票 21）。
      `  const [${componentParams}] = values ?? [];\n` +
      (contentGuard
        ? '  // 骨架只编"没有内容"的用法。调用方自带内容时：\n' +
          '  // - 内容已由调用方内联进片段（contentInlined）→ 守卫与形状校验都跳过；\n' +
          '  // - 否则拒收，让调用方用原组件重建（内容不会被静默丢掉）。\n' +
          '  if (\n' +
          '    !options?.contentInlined &&\n' +
          '    (values ?? []).some((value) => value !== null && value !== undefined)\n' +
          '  ) {\n' +
          '    return null;\n' +
          '  }\n' +
          '  if (!options?.contentInlined && (!root || root.childNodes.length !== ' +
          `${emitted.childCount})) {\n` +
          '    return null; // 形状与片段不符：交给调用方走通用路径回落\n' +
          '  }\n'
        : `  if (!root || root.childNodes.length !== ${emitted.childCount}) {\n` +
          '    return null; // 形状与片段不符：交给调用方走通用路径回落\n' +
          '  }\n') +
      '  const offs = [];\n' +
      `${body}${emitted.lines.length > 0 ? '\n' : ''}` +
      '  let disposed = false;\n' +
      '  return () => {\n' +
      '    if (disposed) {\n' +
      '      return;\n' +
      '    }\n' +
      '    disposed = true;\n' +
      '    offs.forEach((off) => off());\n' +
      '  };\n' +
      '}\n\n' +
      '/** 通用路径回落：用原组件重建这一棵。 */\n' +
      `export function render(...values) {\n  return scope[${JSON.stringify(fn)}](...values);\n}\n`;

    return {
      plan,
      module,
      fragmentHtml,
      scope: [...scope].sort(),
      liveNodes: plan.liveNodes,
      slots: plan.slots
    };
  }

  const componentImport = emitted.usesComponents
    ? `import { components } from ${JSON.stringify(componentsSpecifier)};\n`
    : '';
  const rowImport = rowSpecifiers
    .map(
      (specifier, index) =>
        `import { createRowFactory as __yoyaRow${index} } from ${JSON.stringify(specifier)};\n`
    )
    .join('');
  const controlImport = controlSpecifiers
    .map(
      (specifier, index) =>
        `import { createRowFactory as __yoyaCtl${index} } from ${JSON.stringify(specifier)};\n`
    )
    .join('');

  const module =
    mode === 'element'
      ? header +
        '// 元素模式：行就是原生元素，值位置直接写 DOM，活值订阅后就地写。\n' +
        runtimeImport(hookImports(['cloneFragment'])) +
        componentImport +
        rowImport +
        controlImport +
        planExport +
        `export function createRowFactory(scope) {\n${destructure}` +
        `  return function ${fn}(${entry.builderParams ?? entry.builderParam}) {\n` +
        `    const el = cloneFragment(plan.html, plan.signature);\n` +
        `    const offs = [];\n` +
        `${emitted.lines.join('\n')}${emitted.lines.length > 0 ? '\n' : ''}` +
        '    let disposed = false;\n' +
        '    return {\n' +
        '      el,\n' +
        '      isMounted: () => el.__yoyaMounted !== false,\n' +
        '      destroy() {\n' +
        '        if (disposed) {\n' +
        '          return;\n' +
        '        }\n' +
        '        disposed = true;\n' +
        '        offs.forEach((off) => off());\n' +
        '      }\n' +
        '    };\n' +
        '  };\n' +
        '}\n'
      : header +
        '// 节点模式：静态节点只存在于片段里，活结点按位置接管既有 DOM。\n' +
        runtimeImport(hookImports(['cloneFragment'])) +
        coreImport +
        rowImport +
        controlImport +
        (emitted.usesComponents
          ? `import { components } from ${JSON.stringify(componentsSpecifier)};\n`
          : '') +
        planExport +
        `export function createRowFactory(scope) {\n${destructure}` +
        // 参数表：默认按源码参数表复刻（行工厂按原实参调用）；就地替换的组件产物改按**绑定名**
        // 收参（`paramsSource`），因为调用点只有绑定值（见 plugin.js 的 `paramBindings`）。
        `  return function ${fn}(${paramsSource || entry.builderParams || entry.builderParam}) {\n` +
        `    const element = cloneFragment(plan.html, plan.signature);\n` +
        `${emitted.positionLines.map((line) => `    ${line}`).join('\n')}` +
        `${emitted.positionLines.length > 0 ? '\n' : ''}` +
        `${emitted.lines.join('\n')}${emitted.lines.length > 0 ? '\n' : ''}` +
        `${emitted.slotLines.map((line) => `    ${line}`).join('\n')}` +
        `${emitted.slotLines.length > 0 ? '\n' : ''}` +
        `    return ${emitted.rootVar ?? 'element'};\n` +
        '  };\n' +
        '}\n';

  return {
    plan,
    module,
    fragmentHtml,
    scope: [...scope].sort(),
    liveNodes: plan.liveNodes,
    slots: plan.slots
  };
}

/**
 * 递归搭静态样板：动态值留**锚点**，活绑定 / 事件不参与序列化。
 *
 * 采样时计数器与占位写入点**同源**，序列化后按计数校验哨兵出现次数：不一致就抛错
 * （`compileSource` 会把它记成 bail）——静态文本里混进哨兵字符这类情况绝不猜。
 */
function buildFragment(core, entry, mode = 'element') {
  const counter = { text: 0 };
  const html = buildSample(core, entry.factory, entry.ops, mode, counter).toHTML();
  const found = html.split(TEXT_SENTINEL).length - 1;
  if (found !== counter.text) {
    throw new Error(
      `片段里的文本锚点数量与位置数不一致（哨兵 ${found} / 位置 ${counter.text}）：` +
        '静态文本里可能混进了哨兵字符，整形状回落'
    );
  }
  return html.split(TEXT_SENTINEL).join(TEXT_ANCHOR);
}

function buildSample(core, factoryName, ops, mode = 'element', counter = null) {
  const factory = elementFactoryOf(core, factoryName);
  if (typeof factory !== 'function') {
    throw new Error(`入口模块里没有工厂 ${factoryName}`);
  }
  return factory((element) => {
    for (const op of ops) {
      if (op.kind === 'staticAttr') {
        // 原样交给框架的 attr：`null` / `false` 是「移除」、`true` 写成同名——都是 applyAttribute
        // 的口径；这里若自己 String() / 填 ''，片段就会与通用路径静默不一致。
        element.attr(op.name, op.value);
      } else if (op.kind === 'staticClass') {
        op.names.forEach((name) => element.className(name));
      } else if (op.kind === 'staticStyle') {
        element.style(op.name, op.value === null || op.value === undefined ? '' : String(op.value));
      } else if (op.kind === 'staticText') {
        element.child(op.text);
      } else if (op.kind === 'dynamicAttr') {
        element.attr(op.name, '');
      } else if (op.kind === 'dynamicOptions') {
        // 带 `...rest` 的 options：构建期不 bake 任何键（键要运行期才知道，且 attrs / style
        // 是整包覆盖）——片段里什么都不留，由运行期那条合并 op 落到元素上（票 18）
      } else if (op.kind === 'dynamicStyle') {
        // 动态样式不写占位：值由运行期写（节点模式的节点快照 / 绑定），片段里留空反而多一次对账
      } else if (op.kind === 'holeCall') {
        // 父方法调用的洞：片段里什么都不留（那棵子树运行期才建，按边界插回）
      } else if (op.kind === 'content') {
        // 调用方内容：片段里不留位置，带内容的用法由运行期回落通用路径
      } else if (
        op.kind === 'slotText' ||
        op.kind === 'bindText' ||
        // `child(<变量>)`：元素通道里按"一段文本"留占位；节点通道里是运行期子节点，片段里不留
        (op.kind === 'childValue' && mode === 'element')
      ) {
        element.child(TEXT_SENTINEL);
        if (counter) {
          counter.text += 1;
        }
      } else if (op.kind === 'element') {
        element.child(buildSample(core, op.factory, op.ops, mode, counter));
      } else if (op.kind === 'component') {
        // 链接进来的组件：它的片段来自注册表里的纯数据 ops，仍由框架工厂序列化产出；
        // 调用点内联的内容把构件 ops 里的内容位置就地换成调用方的内容 ops
        element.child(
          buildSample(
            core,
            op.entryFactory,
            withInlinedContent(op.entryOps, op.content),
            mode,
            counter
          )
        );
      }
    }
  });
}

/** 元素模式：所有值位置都编成对既有 DOM 的直接写。 */
function emitElementMode({ entry, addExpression, withBound, controlFrames = [], rootName = 'el' }) {
  let lines = [];
  let liveCount = 0;
  /** 内联形参帧的实参临时名：每次内联一个（同名会被帧自身的绑定遮蔽）。 */
  let frameCounter = 0;
  let usesComponents = false;
  // 产物实际用到的运行期钩子（唯一的"按 op 收集"入口，产物只 import 这些）
  const hooks = new Set();

  const domPath = (path) => `${rootName}${path.map((index) => `.childNodes[${index}]`).join('')}`;
  // 位置**一次性预解析**：所有 op 引用的元素在跑任何 op 之前取到变量。
  // 否则前面的 op（`mountable` 摘节点 / 组件挂载）会让后面的 `childNodes[i]` 指错元素。
  const nodeVars = new Map();
  const nodeRef = (path) => {
    const key = (path ?? []).join(',');
    if (key === '') {
      return rootName;
    }
    if (!nodeVars.has(key)) {
      nodeVars.set(key, `n${nodeVars.size}`);
    }
    return nodeVars.get(key);
  };
  /** 这条写挂在谁身上：`op.owner` 是显式宿主（预留），否则就是当前递归到的宿主。 */
  const hostRef = (op, ownerPath) => nodeRef(op.owner ?? ownerPath);

  const visit = (ops, ownerPath) => {
    // 片段里已排到的子节点位：锚点的边界就是"它后面的那个片段子节点"（没有就是容器末尾）
    let fragmentIndex = 0;
    const fragmentTotal = countChildren(ops);
    // 这一层有动态类名时：静态类名也改成运行期写（按源码顺序），否则"动态写在静态之前"的
    // 类名顺序会和通用路径不同（片段里的静态类名总在前面）。先把片段里的类名清掉再按序写回。
    const runtimeClasses = ops.some((op) => op.kind === 'dynamicClass');
    if (runtimeClasses) {
      lines.push(`    ${nodeRef(ownerPath)}.removeAttribute('class');`);
    }
    for (const op of ops) {
      if (countsAsFragmentChild(op, 'element')) {
        fragmentIndex += 1;
      }
      if (op.kind === 'element') {
        if (op.frame) {
          // 内联进来的子组件：调用方实参在外层求值，子组件的 ops 在**形参帧**里求值。
          //
          // 实参必须先落到外层的唯一临时变量里：帧里的 `const [props] = …` 会在整个块内遮蔽同名绑定，
          // 直接写 `const [props] = [props]` 求值到的是**帧自己**（TDZ）——调用方也把参数叫 props 时必炸。
          op.frame.values.forEach(addExpression);
          const argsVar = `__yoyaFrameArgs${frameCounter}`;
          frameCounter += 1;
          lines.push(`    const ${argsVar} = [${op.frame.values.join(', ')}];`);
          withBound(op.frame.paramNames, () => {
            lines.push('    {');
            lines.push(`      const [${op.frame.paramsSource}] = ${argsVar};`);
            visit(op.ops, op.path);
            lines.push('    }');
          });
          continue;
        }
        visit(op.ops, op.path);
        continue;
      }
      if (op.kind === 'logic') {
        // 逻辑帧：源码原样搬进产物，按源码顺序执行（值位置引用的自由标识符照旧进 scope）
        op.expressions.forEach(addExpression);
        lines.push(`    ${op.source}`);
        continue;
      }
      if (op.kind === 'staticClass' && (runtimeClasses || op.owner)) {
        // 运行期按源码顺序写回静态类名（与动态类名同一份保序去重实现）
        // 别名写（`body.className('x')`）同样走这里：片段里只有元素**自己**的类名，别名的类名在运行期加。
        hooks.add('addClassText');
        lines.push(
          `    addClassText(${hostRef(op, ownerPath)}, ${JSON.stringify(op.names.join(' '))});`
        );
        continue;
      }
      if (op.kind === 'control') {
        // 控制语句：语句原样，里面的结构换成"实例化子单元 + 插到边界之前"
        // 语句里的**自由标识符**（`definitions.forEach(…)` 里的模块级常量这类）照旧进 scope——
        // 本层自己声明的名字（循环变量 / 块内声明）要按边界排除，否则会去外层找一个不存在的名字。
        withBound([...(op.locals ?? []), ...(op.handles ?? [])], () =>
          op.expressions.forEach(addExpression)
        );
        const container = nodeRef(ownerPath);
        const boundary =
          fragmentIndex < fragmentTotal ? nodeRef([...ownerPath, fragmentIndex]) : 'null';
        const text = spliceControlSource(op, (edit) => {
          // 节点句柄改名（票 21 §2.1.15）：这条语句里的句柄名换成产物句柄 `node`
          if (edit.rename) {
            return edit.rename;
          }
          // 条件 / 循环里的 `child(…)` 需要节点对象（核心 `child()` 的分派 + 边界摆位）→ 元素通道
          // 撑不起：这条单元在分析期就已经要求节点产物，走到这里说明通道切换被关掉了（防重入）——
          // 明确报错，绝不静默丢。
          if (edit.hole) {
            throw new Error(
              '条件 / 循环里的 child(…) 只支持节点通道（元素通道没有节点对象，做不了核心 child() 的分派）'
            );
          }
          // 组件调用当结构：运行期按注册表实例化（片段克隆 + 位置写），父片段里不留
          if (edit.component) {
            edit.component.args.forEach(addExpression);
            usesComponents = true;
            hooks.add('pushOff');
            hooks.add('instantiateComponent');
            return (
              `{\n` +
              `      const unit = instantiateComponent(components[${JSON.stringify(
                edit.component.key
              )}], [${edit.component.args.join(', ')}]);\n` +
              `      pushOff(offs, unit.destroy);\n` +
              `      ${container}.insertBefore(unit.el, ${boundary});\n` +
              `    }`
            );
          }
          const unit = edit.unit;
          const name = `__yoyaCtl${unit}`;
          const frameNames = controlFrames[unit] ?? [];
          // 帧里出现的名字：父产物自己的形参 / 局部量直接用；模块级名字（`computed` 这类）进 scope
          frameNames.forEach(addExpression);
          const frame = `{ ${frameNames.join(', ')} }`;
          return (
            `{\n` +
            `      const ${name}Unit = ${name}(${frame})();\n` +
            `      pushOff(offs, ${name}Unit.destroy);\n` +
            `      ${container}.insertBefore(${name}Unit.el, ${boundary});\n` +
            `    }`
          );
        });
        hooks.add('pushOff');
        lines.push(indentBlock(text, '    '));
        liveCount += 1;
        continue;
      }
      if (op.kind === 'component') {
        op.args.forEach(addExpression);
        usesComponents = true;
        hooks.add('pushOff');
        hooks.add('bindComponent');
        // 调用点内联了内容 → 告诉构件「内容和形状都在调用方片段里」，跳过它的内容守卫与形状校验
        const options = op.content ? ', { contentInlined: true }' : '';
        lines.push(
          `    pushOff(offs, bindComponent(components[${JSON.stringify(op.key)}], ${nodeRef(
            op.path
          )}, [${op.args.join(', ')}], ${JSON.stringify(op.hash ?? null)}${options}));`
        );
        liveCount += 1;
        if (op.content) {
          // 内联内容自己的位置写（动态值 / 绑定）挂在组件根元素之下
          visit(op.content.ops, op.path);
        }
        continue;
      }
      if (op.kind === 'dynamicAttr') {
        addExpression(op.expression);
        hooks.add('pushOff');
        hooks.add('setAttr');
        lines.push(
          `    pushOff(offs, setAttr(${hostRef(op, ownerPath)}, ${JSON.stringify(op.name)}, ${
            op.expression
          }));`
        );
        liveCount += 1;
      } else if (op.kind === 'dynamicOptions') {
        // 带 `...rest` 的 options（票 18）：整段对象交给运行期那张分类表，键序照对象自身。
        // 构建期不 bake 任何键，所以这里也不需要"清占位"这类对账。
        addExpression(op.expression);
        hooks.add('pushOff');
        hooks.add('applyRuntimeOptions');
        lines.push(
          `    pushOff(offs, applyRuntimeOptions(${nodeRef(op.path)}, ${op.expression}));`
        );
        liveCount += 1;
      } else if (op.kind === 'slotText') {
        addExpression(op.expression);
        // 片段里这个位置是注释锚点：先换成真文本节点再写
        hooks.add('textAt');
        lines.push(`    textAt(${nodeRef(op.path)}).textContent = ${op.expression};`);
        liveCount += 1;
      } else if (op.kind === 'bindText') {
        addExpression(op.expression);
        hooks.add('pushOff');
        hooks.add('bindText');
        lines.push(`    pushOff(offs, bindText(${nodeRef(op.path)}, ${op.expression}));`);
        liveCount += 1;
      } else if (op.kind === 'childValue') {
        // 运行期子节点（元素通道）：没有节点对象，只能按"位置 = 一段文本"落地——
        // 字符串 / 数字 / 句柄 / 零参 reader 写进占位，数组摊平成多段文本；
        // 收到节点 / 组件这类要进视图树的值时响亮报错（要节点语义就把这个单元编节点通道）。
        addExpression(op.expression);
        hooks.add('pushOff');
        hooks.add('bindChildText');
        lines.push(`    pushOff(offs, bindChildText(${nodeRef(op.path)}, ${op.expression}));`);
        liveCount += 1;
      } else if (op.kind === 'liveClass') {
        addExpression(op.expression);
        hooks.add('pushOff');
        hooks.add('bindClass');
        lines.push(
          `    pushOff(offs, bindClass(${hostRef(op, ownerPath)}, ${JSON.stringify(op.name)}, ${
            op.expression
          }));`
        );
        liveCount += 1;
      } else if (op.kind === 'dynamicClass') {
        // 动态类名：元素通道没有节点对象，落到 classList（与核心的保序去重同口径）
        addExpression(op.expression);
        hooks.add('addClassText');
        lines.push(`    addClassText(${hostRef(op, ownerPath)}, ${op.expression});`);
        liveCount += 1;
      } else if (op.kind === 'dynamicArg') {
        // 动态实参：元素通道没有节点对象，按"位置 = 一段文本"落地（句柄订阅 / 普通值写一次；
        // 收到节点或对象明确报错——与 `bindText` 同一条规矩）。节点通道走核心的参数分派。
        addExpression(op.expression);
        hooks.add('pushOff');
        hooks.add('applyDynamicChild');
        lines.push(
          `    pushOff(offs, applyDynamicChild(${hostRef(op, ownerPath)}, ${op.expression}));`
        );
        liveCount += 1;
      } else if (op.kind === 'liveEvent') {
        op.args.forEach(addExpression);
        lines.push(`    ${hostRef(op, ownerPath)}.addEventListener(${op.args.join(', ')});`);
        liveCount += 1;
      } else if (op.kind === 'liveMountable') {
        addExpression(op.expression);
        hooks.add('pushOff');
        hooks.add('mountableAt');
        // 目标节点就是这条 op 的宿主（与 toggleClass / attr 同一口径）
        lines.push(`    pushOff(offs, mountableAt(${hostRef(op, ownerPath)}, ${op.expression}));`);
        liveCount += 1;
      } else if (op.kind === 'keyedRows') {
        // 行工厂是**子单元**（`__yoyaRow<n>`：与普通行单元同一套产物），列表对账交给运行期钩子
        addExpression(op.source);
        if (op.keyOf !== null) {
          addExpression(op.keyOf);
        }
        hooks.add('pushOff');
        hooks.add('keyedRows');
        lines.push(
          `    pushOff(offs, keyedRows(${hostRef(op, ownerPath)}, ${op.keyOf ?? 'null'}, ${
            op.source
          }, __yoyaRow${op.rowIndex}(scope)));`
        );
        liveCount += 1;
      } else if (!FRAGMENT_ONLY.has(op.kind) && !CALLER_CONTENT.has(op.kind)) {
        // 认不出的 op 绝不能静默丢掉（静默少一个值，比不编危险得多）
        throw new Error(`元素模式的产物里没有 ${op.kind} 的写法`);
      }
      // FRAGMENT_ONLY 的几种已在片段里，不必再写
    }
  };

  visit(entry.ops, entry.path ?? []);
  // 位置表放在所有 op 之前（顺序：片段 → 位置 → op）
  const declarationLines = [...nodeVars].map(
    ([key, name]) => `    const ${name} = ${domPath(key.split(',').map(Number))};`
  );
  lines.unshift(...declarationLines);
  return {
    lines,
    slotLines: [],
    liveNodes: liveCount,
    slots: 0,
    usesComponents,
    hooks,
    childCount: countChildren(entry.ops)
  };
}

/** 片段根的直接子节点数（组件产物的形状校验用）。 */
function countChildren(ops) {
  return ops.filter(
    (op) =>
      op.kind === 'element' ||
      op.kind === 'staticText' ||
      op.kind === 'slotText' ||
      op.kind === 'bindText' ||
      op.kind === 'component'
  ).length;
}

/** 是否含某种 op（递归，跨过嵌套元素）。 */
function hasOpKind(ops, kind) {
  return ops.some((op) => op.kind === kind || (op.kind === 'element' && hasOpKind(op.ops, kind)));
}

/** 这个 op 在片段里占一个子节点位（位置表 / 锚点边界都要按同一份口径数）。 */
const countsAsFragmentChild = (op, mode = 'element') =>
  op.kind === 'element' ||
  op.kind === 'staticText' ||
  op.kind === 'slotText' ||
  op.kind === 'bindText' ||
  // `child(<变量>)`：元素通道里是"一段文本"（片段里有占位），节点通道里是运行期子节点（不占位置）
  (op.kind === 'childValue' && mode === 'element') ||
  op.kind === 'component';

/**
 * 控制语句（`if` / `for…of`）：源码原样搬进产物，里面的结构语句按 `edits` 换成调用方给的代码。
 * 位置写与逻辑帧因此天然按源码顺序交织——这正是票 04 要的那条语义。
 */
function spliceControlSource(op, replace) {
  const edits = [...(op.edits ?? [])];
  // 表达式体回调：先把回调体内部的替换做掉，再把它整体包成块（`(item) => <结构>` → 块体）
  if (op.bodyWrap) {
    const { start, end } = op.bodyWrap;
    const bodyText = op.source.slice(start, end);
    const inner = applyControlEdits(bodyText, edits, start, replace);
    return `${op.source.slice(0, start)}{ ${inner} }${op.source.slice(end)}`;
  }
  return applyControlEdits(op.source, edits, 0, replace);
}

/** 把 `edits`（偏移相对语句起点）应用到 `text` 上；`base` = text 在语句里的起点。 */
function applyControlEdits(text, edits, base, replace) {
  const ordered = [...edits].sort((first, second) => first.start - second.start);
  let cursor = 0;
  let out = '';
  ordered.forEach((edit) => {
    out += text.slice(cursor, edit.start - base) + replace(edit);
    cursor = edit.end - base;
  });
  return out + text.slice(cursor);
}

/** 节点模式：只给「有活内容」的节点建包装对象，其余静态节点只存在于片段里。 */
function emitNodeMode({
  entry,
  thin,
  addExpression,
  addCoreName,
  withBound,
  controlFrames = [],
  nodeAlways = false,
  core
}) {
  let lines = [];
  const slotLines = [];
  let liveCounter = 0;
  /** 内联形参帧的实参临时名：每次内联一个，避免同名（同名会被帧自身的绑定遮蔽）。 */
  let frameCounter = 0;
  let usesComponents = false;
  // 产物实际用到的节点接线钩子（按实际发射收集）
  const hooks = new Set();
  /** 把一段发射导向一个临时数组（下层节点的构建要搬进本节点的 setup 闭包时用）。 */
  const withLines = (emit) => {
    const outer = lines;
    lines = [];
    try {
      emit();
      return lines;
    } finally {
      lines = outer;
    }
  };

  // 位置**一次性预解析**（与 element 通道同一条纪律）：所有 op 引用到的元素 / 文本节点在跑任何
  // op 之前取到变量。否则前面的 op（挂载条件摘节点 / 组件挂载）会让后面的 `childNodes[i]` 指错元素，
  // 甚至指到 undefined（`adopt(n, undefined)` → 凭空建一个空元素）。
  const positions = new Map();
  const pathExprOf = (path) => {
    const key = (path ?? []).join(',');
    if (key === '') {
      return 'element';
    }
    if (!positions.has(key)) {
      positions.set(key, `p${positions.size}`);
    }
    return positions.get(key);
  };

  /**
   * 要不要为这个节点建包装对象。
   * 保真（默认）：活结点**以及活结点到根的路径上的祖先**都建——节点树与 DSL 写法同构，
   * `children()` / `destroy()` / 区域语义一致；`thin` 只建直接带活内容的节点，
   * 活结点挂到最近的活祖先下（省包装对象，但节点树比 DOM 浅）。
   */
  /**
   * 这个节点的**直接子元素**里有没有挂载条件（`mountable` → `node.mountable`）。
   * 挂载条件为假时元素要离场、转真时要回原位，而"原位"要靠视图树里的后续兄弟当锚点
   * （核心的 `resolveInsertAnchor` 只看 `_children`）：所以带条件的子节点的父节点必须留在
   * 视图树里（`thin` 下也要），紧跟其后的兄弟也要物化。
   */
  const hostsMount = (ops) => ops.some((op) => op.kind === 'liveMountable');
  /** 逻辑帧（局部声明提升）只在本节点的 setup 闭包里有效 → 这个节点必须物化。 */
  const hostsLogic = (ops) => ops.some((op) => op.kind === 'logic');
  /** 控制流里的结构（锚点）也要在节点的 setup 闭包里执行 → 这个节点必须物化。 */
  const hostsControl = (ops) => ops.some((op) => op.kind === 'control');
  /** 链接组件（跨模块）的实例化写进宿主节点的 setup 闭包 → 这个节点必须物化。 */
  const hostsComponent = (ops) => ops.some((op) => op.kind === 'component');

  /** `dynamicOptions` 的临时名序号：同一个节点闭包里可能出现不止一条（内联 / 帧），不许重名。 */
  let optionsCounter = 0;

  const isLiveNode = (ops) => {
    // 逻辑帧 / 锚点也要承载闭包（局部声明的可见范围、锚点的插入时机都在 setup 闭包里）→ 必须物化
    if (
      ops.some((op) => DIRECT_LIVE.includes(op.kind)) ||
      hostsLogic(ops) ||
      hostsControl(ops) ||
      hostsComponent(ops)
    ) {
      return true;
    }
    // `thin` 只省「纯静态祖先」，不省挂载条件的父链：父链不在视图树里，回场就没有锚点。
    if (thin) {
      return ops.some(
        (op) =>
          op.kind === 'element' &&
          (hostsMount(op.ops) ||
            hostsLogic(op.ops) ||
            hostsControl(op.ops) ||
            hostsComponent(op.ops))
      );
    }
    return ops.some((op) => op.kind === 'element' && isLiveNode(op.ops));
  };

  /**
   * 纯静态节点的一次性写（`slotText`）。
   * `skipLive` 表示"这段子树里的活结点已经由活祖先登记过"——只收静态部分，不再报错；
   * 否则遇到任何活内容都必须抛错让调用方整体回落，不允许静默丢绑定。
   */
  const collectSlotWrites = (op, skipLive = false) => {
    for (const child of op.ops) {
      if (child.kind === 'slotText') {
        addExpression(child.expression);
        hooks.add('textAt');
        slotLines.push(`textAt(${pathExprOf(child.path)}).textContent = ${child.expression};`);
      } else if (child.kind === 'bindText') {
        if (skipLive) {
          continue;
        }
        // 静态子节点里的活文本没有节点承载绑定：这一形状不编（调用方整体回落）
        throw new Error('静态子节点里的活文本（需要活祖先承载绑定）');
      } else if (child.kind === 'element') {
        // 活结点（或底下还有活结点的元素）同样不能靠一次性 slot 写：认不出承载它的活祖先就整体回落，
        // 绝不静默丢掉绑定（票 14 附带发现：以前这一支会跳过，`--thin` 于是直接 `return element`）。
        const hostsLive = isLiveNode(child.ops) || liveDescendants(child.ops).length > 0;
        if (hostsLive && !skipLive) {
          throw new Error('静态节点下挂着活结点（需要活祖先承载绑定）');
        }
        collectSlotWrites(child, skipLive || hostsLive);
      } else if (DIRECT_LIVE.includes(child.kind) && !skipLive) {
        // 其余活内容（动态属性 / 类 / 事件 …）同样需要活祖先承载
        throw new Error(`静态节点下挂着 ${child.kind}（需要活祖先承载绑定）`);
      } else if (child.kind === 'logic') {
        // 局部声明要有承载它的闭包（`hostsLogic` 已保证这种节点会物化）——走到这里就是漏了
        throw new Error('静态节点下挂着逻辑帧（局部声明需要活祖先承载）');
      } else if (child.kind === 'control') {
        throw new Error('静态节点下挂着控制流里的结构（需要活祖先承载）');
      } else if (child.kind === 'component') {
        // 链接组件要在宿主节点的闭包里实例化——静态节点承载不了（静默丢掉 = 不产半成品）
        throw new Error('静态节点下挂着链接组件（需要活祖先承载）');
      } else if (child.kind === 'childValue') {
        throw new Error('静态节点下挂着运行期子节点（需要活祖先承载）');
      }
    }
  };

  /** 最近的活后代（跨过纯静态节点）。 */
  const liveDescendants = (ops) => {
    const found = [];
    for (const op of ops) {
      if (op.kind !== 'element') {
        continue;
      }
      if (isLiveNode(op.ops)) {
        found.push(op);
      } else {
        found.push(...liveDescendants(op.ops));
      }
    }
    return found;
  };

  const emitNode = (op, depth, ownerVar, forceLive = false) => {
    // 内联进来的子组件：形参帧挂在**节点 setup 闭包**里，整个子树的写都在帧的作用域内求值。
    if (op.frame) {
      return withBound(op.frame.paramNames, () => emitNodeBody(op, depth, ownerVar, forceLive));
    }
    return emitNodeBody(op, depth, ownerVar, forceLive);
  };

  const emitNodeBody = (op, depth, ownerVar, forceLive = false) => {
    // `forceLive`：行根即使自己不带活内容，只要有活后代也得建包装对象（工厂要返回节点，
    // 活结点也要有活祖先可挂）。祖先节点仍按 thin 口径保持静态。
    // 形参帧同样要求包装对象：帧要有个闭包承载（`thin` 下纯静态的帧节点也要建）。
    const live =
      forceLive ||
      Boolean(op.frame) ||
      hostsLogic(op.ops) ||
      hostsControl(op.ops) ||
      isLiveNode(op.ops);
    if (!live) {
      collectSlotWrites(op);
      return;
    }

    const inner = [];
    // 控制流里的结构（锚点）：元素已经在片段里由核心的渲染负责追加，位置要等 adopt 之后按边界摆回来
    const placeLines = [];
    let placeArray = null;
    let fragmentIndex = 0;
    const fragmentTotal = countChildren(op.ops);
    /**
     * 接管之后按边界摆位的数组：控制流里的结构（锚点）与运行期子节点共用一条——
     * 两者都在 setup 闭包里登记 `[节点, 它后面的那个片段兄弟]`，`adopt()` 之后统一插回去。
     */
    const ensurePlaces = (owner) => {
      if (placeArray === null) {
        placeArray = `__yoyaPlaces${liveCounter + 1}`;
        lines.push(`${indentOf(depth)}const ${placeArray} = [];`);
        placeLines.push(
          `${indentOf(depth)}${placeArray}.forEach(([unit, before]) => mountNodeAt(unit, ${pathExprOf(
            owner.path
          )}, before));`
        );
        hooks.add('mountNodeAt');
      }
      return placeArray;
    };
    if (op.frame) {
      // 实参在外层（本闭包可见的外层作用域）求值，子组件的 ops 在帧里。
      // 同元素通道：实参先落到外层临时变量，避免帧绑定遮蔽自己的初始化器（TDZ）。
      op.frame.values.forEach(addExpression);
      const argsVar = `__yoyaFrameArgs${frameCounter}`;
      frameCounter += 1;
      lines.push(`${indentOf(depth)}const ${argsVar} = [${op.frame.values.join(', ')}];`);
      inner.push(`${indentOf(depth + 1)}const [${op.frame.paramsSource}] = ${argsVar};`);
    }
    // 物化节点的 setup 必须把它自己的**静态快照**也登记上：接管时引擎会拿节点快照
    // 与既有 DOM 对账，快照空着就会把片段里的静态类名 / 属性抹掉（票 39 实测踩到）。
    // 这些调用不产生 DOM 写：值本来就一致，先比后写。
    for (const child of op.ops) {
      if (countsAsFragmentChild(child, 'node')) {
        fragmentIndex += 1;
      }
      if (child.kind === 'staticAttr') {
        // 快照与片段同一口径：原样写（`null` / `false` 移除、`true` 写成同名）
        inner.push(
          `${indentOf(depth + 1)}node.attr(${JSON.stringify(child.name)}, ${jsLiteral(
            child.value
          )});`
        );
      } else if (child.kind === 'staticClass') {
        child.names.forEach((name) =>
          inner.push(`${indentOf(depth + 1)}node.className(${JSON.stringify(name)});`)
        );
      } else if (child.kind === 'staticStyle') {
        inner.push(
          `${indentOf(depth + 1)}node.style(${JSON.stringify(child.name)}, ${JSON.stringify(
            child.value === null || child.value === undefined ? '' : String(child.value)
          )});`
        );
      } else if (child.kind === 'dynamicAttr') {
        addExpression(child.expression);
        inner.push(
          `${indentOf(depth + 1)}node.attr(${JSON.stringify(child.name)}, ${child.expression});`
        );
      } else if (child.kind === 'dynamicOptions') {
        // 带 `...rest` 的 options（票 18）：节点通道直接复用核心的对象分派（`_setupObject`），
        // 与元素通道共用 `packages/yoya-core/src/core/setup-keys.js` 那张分类表——不新增第二套语义。
        // `children` 若落在对象里，位置必须与通用路径一致（内容在结构之前）：取出来按
        // "片段里第一个子节点"当边界摆位（与 `child(<表达式>)` 同一条 `mountRuntimeChildren` 通道）。
        addExpression(child.expression);
        const optionsPlaces = ensurePlaces(child);
        const optionsBoundary = fragmentTotal > 0 ? pathExprOf([...op.path, 0]) : 'null';
        optionsCounter += 1;
        const childrenName = `__yoyaOptionsChildren${optionsCounter}`;
        const restName = `__yoyaOptionsRest${optionsCounter}`;
        inner.push(
          `${indentOf(depth + 1)}const { children: ${childrenName}, ...${restName} } = ${
            child.expression
          };`,
          `${indentOf(depth + 1)}node.setup(${restName});`,
          `${indentOf(depth + 1)}if (${childrenName} !== undefined && ${childrenName} !== null) {`,
          `${indentOf(depth + 2)}mountRuntimeChildren(node, ${childrenName}, ${optionsPlaces}, ${optionsBoundary});`,
          `${indentOf(depth + 1)}}`
        );
        hooks.add('mountRuntimeChildren');
      } else if (child.kind === 'dynamicStyle') {
        addExpression(child.expression);
        inner.push(
          `${indentOf(depth + 1)}node.style(${JSON.stringify(child.name)}, ${child.expression});`
        );
      } else if (child.kind === 'liveClass') {
        addExpression(child.expression);
        inner.push(
          `${indentOf(depth + 1)}node.toggleClass(${JSON.stringify(child.name)}, ${
            child.expression
          });`
        );
      } else if (child.kind === 'dynamicClass') {
        // 动态类名：节点通道直接复用核心的 `className`（保序去重，与通用路径同一份实现）
        addExpression(child.expression);
        inner.push(`${indentOf(depth + 1)}node.className(${child.expression});`);
      } else if (child.kind === 'dynamicArg') {
        // 动态实参：复用核心的参数分派（字符串 / 句柄 / 数组 / options / 回调）
        addExpression(child.expression);
        hooks.add('applyDynamicArg');
        inner.push(`${indentOf(depth + 1)}applyDynamicArg(node, ${child.expression});`);
      } else if (child.kind === 'liveEvent') {
        child.args.forEach(addExpression);
        inner.push(`${indentOf(depth + 1)}node.on(${child.args.join(', ')});`);
      } else if (child.kind === 'liveMountable') {
        // 节点通道复用节点自己的 `mountable`：包装对象在**入树之前**就地声明条件，
        // 由父节点在收养时建绑定——与通用路径同一条时序（元素通道走 `mountableAt`）。
        addExpression(child.expression);
        inner.push(`${indentOf(depth + 1)}node.mountable(${child.expression});`);
      } else if (child.kind === 'keyedRows') {
        // 节点通道：复用节点自己的 keyed，行工厂是 node 模式的子单元（返回 ViewNode 的行）。
        // 两参形式要照原样发两参调用——核心自己按"keySet 用容器 keyOf / 信号源按行身份"补 keyFn。
        addExpression(child.source);
        if (child.keyOf !== null) {
          addExpression(child.keyOf);
        }
        inner.push(
          child.keyOf === null
            ? `${indentOf(depth + 1)}node.keyed(${child.source}, __yoyaRow${
                child.rowIndex
              }(scope));`
            : `${indentOf(depth + 1)}node.keyed(${child.source}, ${child.keyOf}, __yoyaRow${
                child.rowIndex
              }(scope));`
        );
      } else if (child.kind === 'bindText') {
        addExpression(child.expression);
        hooks.add('bindChild');
        inner.push(
          `${indentOf(depth + 1)}bindChild(node, ${pathExprOf(child.path)}, ${child.expression});`
        );
      } else if (child.kind === 'childValue') {
        // 运行期子节点（节点通道）：值分派**不复制第二套**，直接交给核心 `child()`（字符串 /
        // 数字 / 句柄 / 零参 reader / 节点 / 组件对象 / 数组 / 认不出的值报错都是它自己的口径）。
        // 位置要等接管（adopt → renderDom）之后按"片段里它后面的那个兄弟"摆回来：静态兄弟不在
        // 视图树里，核心自己的插入锚点看不到它们；子节点句柄也不能用 `child()` 的返回值
        // （它返回父节点——拿它当子节点就会把本片段元素当子节点，DOM 出现嵌套 / 重复片段）。
        const places = ensurePlaces(child);
        const boundary =
          fragmentIndex < fragmentTotal ? pathExprOf([...op.path, fragmentIndex]) : 'null';
        addExpression(child.expression);
        hooks.add('mountRuntimeChildren');
        inner.push(
          `${indentOf(depth + 1)}mountRuntimeChildren(node, ${child.expression}, ${places}, ${boundary});`
        );
      } else if (child.kind === 'component') {
        // 跨模块组件：调用点只做链接（片段已嵌进本片段，运行期按注册表实例化 + 哈希回落）。
        // 节点通道里退订函数挂到节点自己的清理名单上——节点销毁即释放（与核心的 `_cleanup` 同源）。
        child.args.forEach(addExpression);
        usesComponents = true;
        hooks.add('bindComponent');
        hooks.add('bindNodeCleanup');
        const options = child.content ? ', { contentInlined: true }' : '';
        inner.push(
          `${indentOf(depth + 1)}bindNodeCleanup(node, bindComponent(components[${JSON.stringify(
            child.key
          )}], ${pathExprOf(child.path)}, [${child.args.join(', ')}], ${JSON.stringify(
            child.hash ?? null
          )}${options}));`
        );
        if (child.content) {
          // 形态 C 的内容位置在节点通道里没有对应的写法（内容是调用方结构，已在片段里）
          throw new Error('链接组件的调用方内容在节点通道里本轮不编');
        }
      } else if (child.kind === 'logic') {
        // 逻辑帧：源码原样搬进节点 setup 闭包（局部声明的可见范围就是它所在的 builder）
        child.expressions.forEach(addExpression);
        inner.push(`${indentOf(depth + 1)}${child.source}`);
      } else if (child.kind === 'holeCall') {
        // **父方法调用的洞**（票 21 §2.1.7）：这条调用原样在产物节点上跑（调的就是通用路径那个方法），
        // 跑完把**新加的子节点**按"片段里它后面的那个兄弟"当边界摆回来。
        const places = ensurePlaces(child);
        const boundary =
          fragmentIndex < fragmentTotal ? pathExprOf([...op.path, fragmentIndex]) : 'null';
        child.args.forEach(addExpression);
        hooks.add('mountRuntimeChildrenFrom');
        inner.push(
          `${indentOf(depth + 1)}mountRuntimeChildrenFrom(node, () => node.${child.method}(${child.args.join(
            ', '
          )}), ${places}, ${boundary});`
        );
      } else if (child.kind === 'control') {
        // 控制流里的结构：进节点树（销毁 / `toHTML()` 都对），位置在 adopt 之后按边界摆回来
        withBound([...(child.locals ?? []), ...(child.handles ?? [])], () =>
          child.expressions.forEach(addExpression)
        );
        ensurePlaces(child);
        const boundary =
          fragmentIndex < fragmentTotal ? pathExprOf([...op.path, fragmentIndex]) : 'null';
        const text = spliceControlSource(child, (edit) => {
          // 节点句柄改名（票 21 §2.1.15）：这条语句里的句柄名换成产物句柄 `node`
          if (edit.rename) {
            return edit.rename;
          }
          // 条件 / 循环里的 `child(<认不出的值>)`（票 21 §2.1.14）：这条调用**原样在产物节点上跑**，
          // 跑完把新加的子节点按边界摆回来（与无条件那条 `childValue` 同一套摆位）。
          if (edit.hole) {
            edit.hole.args.forEach(addExpression);
            ensurePlaces(child);
            hooks.add('mountRuntimeChildrenFrom');
            return (
              `{\n` +
              `        mountRuntimeChildrenFrom(node, () => node.${edit.hole.method}(${edit.hole.args.join(
                ', '
              )}), ${placeArray}, ${boundary});\n` +
              `      }`
            );
          }
          // 组件调用当结构（节点通道）：注册表条目的 `render` 就是原组件 → 拿到 ViewNode 收养
          if (edit.component) {
            edit.component.args.forEach(addExpression);
            usesComponents = true;
            hooks.add('instantiateComponentNode');
            return (
              `{\n` +
              `        const unit = instantiateComponentNode(components[${JSON.stringify(
                edit.component.key
              )}], [${edit.component.args.join(', ')}]);\n` +
              `        node.child(unit);\n` +
              `        ${placeArray}.push([unit, ${boundary}]);\n` +
              `      }`
            );
          }
          const unit = edit.unit;
          const name = `__yoyaCtl${unit}`;
          const frameNames = controlFrames[unit] ?? [];
          frameNames.forEach(addExpression);
          const frame = `{ ${frameNames.join(', ')} }`;
          return (
            `{\n` +
            `        const ${name}Unit = ${name}(${frame})();\n` +
            `        node.child(${name}Unit);\n` +
            `        ${placeArray}.push([${name}Unit, ${boundary}]);\n` +
            `      }`
          );
        });
        hooks.add('mountNodeAt');
        inner.push(indentBlock(text, indentOf(depth + 1)));
      } else if (child.kind === 'slotText') {
        addExpression(child.expression);
        hooks.add('textAt');
        slotLines.push(`textAt(${pathExprOf(child.path)}).textContent = ${child.expression};`);
      } else if (
        child.kind !== 'element' &&
        !FRAGMENT_ONLY.has(child.kind) &&
        !CALLER_CONTENT.has(child.kind)
      ) {
        // 同上：认不出的 op 不许静默丢
        throw new Error(`节点模式的产物里没有 ${child.kind} 的写法`);
      }
    }

    const varName = `n${++liveCounter}`;
    // 物化节点要用元素工厂建包装对象：工厂由产物自己 import（票 13 / R4），不进业务 scope。
    // SVG 子标签只在 `svgs` 表里：产物 import `svgs` 命名空间，写成 `svgs.path(...)`。
    const factoryExpr = factoryExpressionOf(core, op.factory);
    if (factoryExpr === null) {
      throw new Error(`入口模块里没有工厂 ${op.factory}`);
    }
    addCoreName(factoryExpr.includes('.') ? 'svgs' : op.factory);
    const openIndex = lines.length;
    lines.push(
      `${indentOf(depth)}const ${varName} = ${factoryExpr}((node) => {`,
      ...inner,
      `${indentOf(depth)}});`
    );
    const closeIndex = openIndex + inner.length + 1;
    // 片段里的活属性占位要跟着节点快照对账：值为 null / undefined / false 时快照里没有这一项，
    // 占位必须删掉（通用路径的 DOM 也没有这个属性）——所以把活属性名一并交给 `adopt`。
    const liveAttrNames = op.ops
      .filter((child) => child.kind === 'dynamicAttr')
      .map((child) => child.name);
    const adoptArgs = [varName, pathExprOf(op.path)];
    if (liveAttrNames.length > 0) {
      adoptArgs.push(`[${liveAttrNames.map((name) => JSON.stringify(name)).join(', ')}]`);
    }
    lines.push(`${indentOf(depth)}adopt(${adoptArgs.join(', ')});`);
    hooks.add('adopt');
    placeLines.forEach((line) => lines.push(line));
    if (ownerVar) {
      lines.push(`${indentOf(depth)}appendNodeChild(${ownerVar}, ${varName});`);
      hooks.add('appendNodeChild');
    }

    const emitted = new Set(liveDescendants(op.ops));
    // 本节点声明的逻辑帧只在**它的 setup 闭包**里可见。下层节点的闭包若是平级的就看不见它们，
    // 所以本节点一有逻辑帧 / 锚点，就把下层节点的构建**搬进本节点的 setup 闭包**（闭包套闭包），
    // 局部量的可见性与源码一致；没逻辑帧时保持原样（产物更扁、更小）。
    const ownFrames = op.ops
      .filter((child) => child.kind === 'logic')
      .flatMap((child) => child.declared ?? []);
    const nestDescendants = ownFrames.length > 0 || hostsControl(op.ops) || Boolean(op.frame);
    const emitDescendants = () => {
      const childDepth = nestDescendants ? depth + 1 : depth;
      const childOwner = nestDescendants ? 'node' : varName;
      for (const child of emitted) {
        emitNode(child, childDepth, childOwner);
      }
      // 挂载条件的锚点：带条件的子元素**后面的第一个元素兄弟**进视图树——它离场 / 回场时
      // 核心按 `_children` 找插入锚点，静态兄弟不物化就会「回场追加到末尾」。
      emitAnchorOps(op.ops).forEach((anchor) => {
        if (emitted.has(anchor)) {
          return;
        }
        emitted.add(anchor);
        emitNode(anchor, childDepth, childOwner, true);
      });
    };
    if (nestDescendants) {
      // 下层节点的构建行搬进本闭包：重新缩进一层（闭合括号在 `const nX = …` 那几行里）
      const nestedLines = withLines(emitDescendants);
      lines.splice(closeIndex, 0, ...nestedLines.map((line) => `  ${line}`));
    } else {
      emitDescendants();
    }
    for (const child of op.ops) {
      if (child.kind === 'element' && !emitted.has(child)) {
        // 活结点已经由上面的 liveDescendants 登记过：这里只补它所在静态子树的静态写。
        collectSlotWrites(child, liveDescendants(child.ops).length > 0);
      }
    }
  };

  /** 带挂载条件的直接子元素 → 紧随其后的第一个元素兄弟（锚点）。 */
  const emitAnchorOps = (ops) => {
    const anchors = new Set();
    ops.forEach((child, index) => {
      if (child.kind !== 'element' || !hostsMount(child.ops)) {
        return;
      }
      const next = ops.slice(index + 1).find((sibling) => sibling.kind === 'element');
      if (next) {
        anchors.add(next);
      }
    });
    return anchors;
  };

  // 行根只要有活内容（自己的或藏在下层静态节点里的），就必须建包装对象：工厂要返回节点，
  // 活结点也得有个活祖先挂上去。纯静态行才直接返回片段元素。
  const rootLive = nodeAlways || isLiveNode(entry.ops) || liveDescendants(entry.ops).length > 0;
  if (rootLive) {
    emitNode(entry, 2, null, true);
  } else {
    collectSlotWrites(entry);
  }
  const rootVar = rootLive ? 'n1' : null;

  // 位置声明放在所有节点构建之前（顺序：片段 → 位置 → 节点 / 写操作）
  const positionLines = [...positions].map(([key, name]) => {
    const path = key.split(',').map(Number);
    return `const ${name} = element${path.map((index) => `.childNodes[${index}]`).join('')};`;
  });

  return {
    lines,
    slotLines,
    positionLines,
    liveNodes: liveCounter,
    slots: slotLines.length,
    rootVar,
    usesComponents,
    hooks
  };
}
