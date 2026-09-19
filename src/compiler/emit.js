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
import { freeIdentifiers } from './analyze.js';
import { createHash } from 'node:crypto';

/** 动态值在片段里的占位文本；运行期改写它。 */
const TEXT_PLACEHOLDER = '0';

/** 直接带活内容（绑定 / 事件 / 活文本）的 op 种类。 */
const DIRECT_LIVE = ['dynamicAttr', 'dynamicStyle', 'liveClass', 'liveEvent', 'bindText'];

/** 只存在于片段里的 op（两条通道都不再写它们）；其余 op 认不出就必须抛错，不许静默丢。 */
const FRAGMENT_ONLY = new Set(['staticAttr', 'staticClass', 'staticStyle', 'staticText']);

/**
 * 形态 C 骨架的内容位置（`applyComponentSetup(this, setup)`）：内容由**调用方**提供，
 * 构件只编"没有内容"的用法（带内容时 `bind` 返回 null，走通用路径回落），产物里不写。
 */
const CALLER_CONTENT = new Set(['content']);

const indentOf = (depth) => '  '.repeat(depth);

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
    fn = 'buildRow',
    runtime = './compiler-runtime.js',
    kind = 'row',
    componentsSpecifier = './components.registry.js',
    scopeSpecifier = null,
    paramsSource = '',
    hash = null,
    templatesOnly = false,
    // 节点通道要给活结点建包装对象（tr / td / a …）：产物**自己 import**这些元素工厂，
    // 不再让调用方塞进 scope（票 13 / R4：编译产物不是业务接口）。
    coreSpecifier = '@yoyaflow/yoya-ui/core',
    contentGuard = false
  } = options;

  const scope = new Set();
  const coreImportNames = new Set();
  const bound = new Set([entry.builderParam, entry.setupParam, 'node', 'event']);
  const addExpression = (expression) => {
    freeIdentifiers(expression, bound).forEach((name) => scope.add(name));
  };
  const addName = (name) => scope.add(name);
  const addCoreName = (name) => coreImportNames.add(name);
  const scopeList = () => [...scope].sort().join(', ');

  if (mode === 'node' && hasComponentOp(entry.ops)) {
    // 链接组件的实例化写进「已有的元素位置」，节点模式没有这种位置写 → 明确回落，不静默丢
    throw new Error('链接组件只支持 element 模式（节点模式的行没有位置写）');
  }

  if (mode === 'element' && hasOpKind(entry.ops, 'dynamicStyle')) {
    // 元素模式把静态样式留在片段里（`toHTML()` 的紧凑格式），动态值只能走 CSSOM，
    // 一旦写一个属性，整个 style 属性会被重新序列化 → 与通用路径不再逐字节相同。
    throw new Error(
      '动态样式只支持节点模式（node）：元素模式的动态样式会按 CSSOM 序列化，' +
        '与片段里的紧凑格式不一致。可改用字面量、状态类用 toggleClass(name, 值)，' +
        '或把这一行编成 --mode node'
    );
  }

  const fragmentHtml = buildFragment(core, entry);
  const emit = mode === 'element' ? emitElementMode : emitNodeMode;
  const emitted = emit({
    entry,
    thin,
    addExpression,
    addName,
    addCoreName,
    rootName: kind === 'component' ? 'root' : 'el'
  });

  const plan = {
    version: 1,
    mode,
    source: { file, fn },
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
  const coreImport =
    coreImportNames.size > 0
      ? `import { ${[...coreImportNames].sort().join(', ')} } from ${JSON.stringify(
          coreSpecifier
        )};\n`
      : '';

  // 组件产物：绑定函数写进已有的占位子树（调用方片段里嵌进来的那一棵），
  // scope 是组件原模块的命名空间（只允许 import 绑定的自由标识符）。
  if (mode === 'element' && kind === 'component') {
    const names = ['bindClass', 'bindText', 'cloneFragment', 'pushOff', 'setAttr'];
    if (emitted.usesComponents) {
      names.splice(1, 0, 'bindComponent');
    }
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
      `  const [${paramsSource}] = values ?? [];\n` +
      destructure +
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

  const elementNames = ['bindClass', 'bindText', 'cloneFragment', 'pushOff', 'setAttr'];
  if (emitted.usesComponents) {
    elementNames.splice(1, 0, 'bindComponent');
  }
  const componentImport = emitted.usesComponents
    ? `import { components } from ${JSON.stringify(componentsSpecifier)};\n`
    : '';

  const module =
    mode === 'element'
      ? header +
        '// 元素模式：行就是原生元素，值位置直接写 DOM，活值订阅后就地写。\n' +
        runtimeImport(elementNames) +
        componentImport +
        planExport +
        `export function createRowFactory(scope) {\n${destructure}` +
        `  return function ${fn}(${entry.builderParam}) {\n` +
        `    const el = cloneFragment(plan.html, plan.signature);\n` +
        `    const offs = [];\n` +
        `${emitted.lines.join('\n')}${emitted.lines.length > 0 ? '\n' : ''}` +
        '    let disposed = false;\n' +
        '    return {\n' +
        '      el,\n' +
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
        runtimeImport(['adopt', 'appendNodeChild', 'bindChild', 'cloneFragment']) +
        coreImport +
        planExport +
        `export function createRowFactory(scope) {\n${destructure}` +
        `  return function ${fn}(${entry.builderParam}) {\n` +
        `    const element = cloneFragment(plan.html, plan.signature);\n` +
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

/** 递归搭静态样板：动态值留占位，活绑定 / 事件不参与序列化。 */
function buildFragment(core, entry) {
  return buildSample(core, entry.factory, entry.ops).toHTML();
}

function buildSample(core, factoryName, ops) {
  const factory = core?.[factoryName];
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
      } else if (op.kind === 'dynamicStyle') {
        // 动态样式不写占位：值由运行期写（节点模式的节点快照 / 绑定），片段里留空反而多一次对账
      } else if (op.kind === 'content') {
        // 调用方内容：片段里不留位置，带内容的用法由运行期回落通用路径
      } else if (op.kind === 'slotText' || op.kind === 'bindText') {
        element.child(TEXT_PLACEHOLDER);
      } else if (op.kind === 'element') {
        element.child(buildSample(core, op.factory, op.ops));
      } else if (op.kind === 'component') {
        // 链接进来的组件：它的片段来自注册表里的纯数据 ops，仍由框架工厂序列化产出；
        // 调用点内联的内容把构件 ops 里的内容位置就地换成调用方的内容 ops
        element.child(
          buildSample(core, op.entryFactory, withInlinedContent(op.entryOps, op.content))
        );
      }
    }
  });
}

/** 元素模式：所有值位置都编成对既有 DOM 的直接写。 */
function emitElementMode({ entry, addExpression, rootName = 'el' }) {
  const lines = [];
  let liveCount = 0;
  let usesComponents = false;

  const domPath = (path) => `${rootName}${path.map((index) => `.childNodes[${index}]`).join('')}`;

  const visit = (ops, ownerPath) => {
    for (const op of ops) {
      if (op.kind === 'element') {
        visit(op.ops, op.path);
        continue;
      }
      if (op.kind === 'component') {
        op.args.forEach(addExpression);
        usesComponents = true;
        // 调用点内联了内容 → 告诉构件「内容和形状都在调用方片段里」，跳过它的内容守卫与形状校验
        const options = op.content ? ', { contentInlined: true }' : '';
        lines.push(
          `    pushOff(offs, bindComponent(components[${JSON.stringify(op.key)}], ${domPath(
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
        lines.push(
          `    pushOff(offs, setAttr(${domPath(ownerPath)}, ${JSON.stringify(op.name)}, ${
            op.expression
          }));`
        );
        liveCount += 1;
      } else if (op.kind === 'slotText') {
        addExpression(op.expression);
        lines.push(`    ${domPath(op.path)}.textContent = ${op.expression};`);
        liveCount += 1;
      } else if (op.kind === 'bindText') {
        addExpression(op.expression);
        lines.push(`    pushOff(offs, bindText(${domPath(op.path)}, ${op.expression}));`);
        liveCount += 1;
      } else if (op.kind === 'liveClass') {
        addExpression(op.expression);
        lines.push(
          `    pushOff(offs, bindClass(${domPath(ownerPath)}, ${JSON.stringify(op.name)}, ${
            op.expression
          }));`
        );
        liveCount += 1;
      } else if (op.kind === 'liveEvent') {
        op.args.forEach(addExpression);
        lines.push(`    ${domPath(ownerPath)}.addEventListener(${op.args.join(', ')});`);
        liveCount += 1;
      } else if (!FRAGMENT_ONLY.has(op.kind) && !CALLER_CONTENT.has(op.kind)) {
        // 认不出的 op 绝不能静默丢掉（静默少一个值，比不编危险得多）
        throw new Error(`元素模式的产物里没有 ${op.kind} 的写法`);
      }
      // FRAGMENT_ONLY 的几种已在片段里，不必再写
    }
  };

  visit(entry.ops, entry.path ?? []);
  return {
    lines,
    slotLines: [],
    liveNodes: liveCount,
    slots: 0,
    usesComponents,
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

/** 是否含链接进来的组件（递归）。 */
const hasComponentOp = (ops) => hasOpKind(ops, 'component');

/** 节点模式：只给「有活内容」的节点建包装对象，其余静态节点只存在于片段里。 */
function emitNodeMode({ entry, thin, addExpression, addCoreName }) {
  const lines = [];
  const slotLines = [];
  let liveCounter = 0;

  const pathExprOf = (path) => `element${path.map((index) => `.childNodes[${index}]`).join('')}`;

  /**
   * 要不要为这个节点建包装对象。
   * 保真（默认）：活结点**以及活结点到根的路径上的祖先**都建——节点树与 DSL 写法同构，
   * `children()` / `destroy()` / 区域语义一致；`thin` 只建直接带活内容的节点，
   * 活结点挂到最近的活祖先下（省包装对象，但节点树比 DOM 浅）。
   */
  const isLiveNode = (ops) => {
    if (ops.some((op) => DIRECT_LIVE.includes(op.kind))) {
      return true;
    }
    if (thin) {
      return false;
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
        slotLines.push(`${pathExprOf(child.path)}.textContent = ${child.expression};`);
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
    // `forceLive`：行根即使自己不带活内容，只要有活后代也得建包装对象（工厂要返回节点，
    // 活结点也要有活祖先可挂）。祖先节点仍按 thin 口径保持静态。
    const live = forceLive || isLiveNode(op.ops);
    if (!live) {
      collectSlotWrites(op);
      return;
    }

    const inner = [];
    const textPaths = [];
    // 物化节点的 setup 必须把它自己的**静态快照**也登记上：接管时引擎会拿节点快照
    // 与既有 DOM 对账，快照空着就会把片段里的静态类名 / 属性抹掉（票 39 实测踩到）。
    // 这些调用不产生 DOM 写：值本来就一致，先比后写。
    for (const child of op.ops) {
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
      } else if (child.kind === 'liveEvent') {
        child.args.forEach(addExpression);
        inner.push(`${indentOf(depth + 1)}node.on(${child.args.join(', ')});`);
      } else if (child.kind === 'bindText') {
        addExpression(child.expression);
        inner.push(
          `${indentOf(depth + 1)}bindChild(node, ${pathExprOf(child.path)}, ${child.expression});`
        );
        textPaths.push(child.path);
      } else if (child.kind === 'slotText') {
        addExpression(child.expression);
        slotLines.push(`${pathExprOf(child.path)}.textContent = ${child.expression};`);
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
    addCoreName(op.factory);
    lines.push(
      `${indentOf(depth)}const ${varName} = ${op.factory}((node) => {`,
      ...inner,
      `${indentOf(depth)}});`
    );
    lines.push(
      `${indentOf(depth)}adopt(${varName}, ${pathExprOf(op.path)}${
        textPaths.length > 0 ? `, [${textPaths.map((path) => pathExprOf(path)).join(', ')}]` : ''
      });`
    );
    if (ownerVar) {
      lines.push(`${indentOf(depth)}appendNodeChild(${ownerVar}, ${varName});`);
    }

    for (const child of liveDescendants(op.ops)) {
      emitNode(child, depth, varName);
    }
    for (const child of op.ops) {
      if (child.kind === 'element' && !isLiveNode(child.ops)) {
        // 活结点已经由上面的 liveDescendants 登记过：这里只补它所在静态子树的静态写。
        collectSlotWrites(child, liveDescendants(child.ops).length > 0);
      }
    }
  };

  // 行根只要有活内容（自己的或藏在下层静态节点里的），就必须建包装对象：工厂要返回节点，
  // 活结点也得有个活祖先挂上去。纯静态行才直接返回片段元素。
  const rootLive = isLiveNode(entry.ops) || liveDescendants(entry.ops).length > 0;
  if (rootLive) {
    emitNode(entry, 2, null, true);
  } else {
    collectSlotWrites(entry);
  }
  const rootVar = rootLive ? 'n1' : null;

  return { lines, slotLines, liveNodes: liveCounter, slots: slotLines.length, rootVar };
}
