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

/** 动态值在片段里的占位文本；运行期改写它。 */
const TEXT_PLACEHOLDER = '0';

/** 直接带活内容（绑定 / 事件 / 活文本）的 op 种类。 */
const DIRECT_LIVE = ['dynamicAttr', 'liveClass', 'liveEvent', 'bindText'];

const indentOf = (depth) => '  '.repeat(depth);

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
    runtime = './compiler-runtime.js'
  } = options;

  const scope = new Set();
  const bound = new Set([entry.builderParam, entry.setupParam, 'node', 'event']);
  const addExpression = (expression) => {
    freeIdentifiers(expression, bound).forEach((name) => scope.add(name));
  };
  const addName = (name) => scope.add(name);
  const scopeList = () => [...scope].sort().join(', ');

  const fragmentHtml = buildFragment(core, entry);
  const emit = mode === 'element' ? emitElementMode : emitNodeMode;
  const emitted = emit({ entry, thin, addExpression, addName });

  const plan = {
    version: 1,
    mode,
    source: { file, fn },
    html: fragmentHtml,
    liveNodes: emitted.liveNodes,
    slots: emitted.slots
  };

  const destructure = scope.size > 0 ? `  const { ${scopeList()} } = scope;\n` : '';
  const header = `// 由 @yoyaflow/yoya-ui/compiler 从源码 AST 生成 —— 请勿手改。\n`;
  const runtimeImport = (names) =>
    `import { ${names.join(', ')} } from ${JSON.stringify(runtime)};\n`;
  const planExport = `\nexport const plan = ${JSON.stringify(plan, null, 2)};\n\n`;

  const module =
    mode === 'element'
      ? header +
        '// 元素模式：行就是原生元素，值位置直接写 DOM，活值订阅后就地写。\n' +
        runtimeImport(['bindClass', 'bindText', 'cloneFragment', 'pushOff', 'setAttr']) +
        planExport +
        `export function createRowFactory(scope) {\n${destructure}` +
        `  return function ${fn}(${entry.builderParam}) {\n` +
        `    const el = cloneFragment(plan.html);\n` +
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
        planExport +
        `export function createRowFactory(scope) {\n${destructure}` +
        `  return function ${fn}(${entry.builderParam}) {\n` +
        `    const element = cloneFragment(plan.html);\n` +
        `${emitted.lines.join('\n')}${emitted.lines.length > 0 ? '\n' : ''}` +
        `${emitted.slotLines.map((line) => `    ${line}`).join('\n')}` +
        `${emitted.slotLines.length > 0 ? '\n' : ''}` +
        `    return ${emitted.rootVar ?? 'element'};\n` +
        '  };\n' +
        '}\n';

  return { plan, module, scope: [...scope].sort(), liveNodes: plan.liveNodes, slots: plan.slots };
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
        element.attr(op.name, op.value === null || op.value === undefined ? '' : String(op.value));
      } else if (op.kind === 'staticClass') {
        op.names.forEach((name) => element.className(name));
      } else if (op.kind === 'staticStyle') {
        element.style(op.name, op.value === null || op.value === undefined ? '' : String(op.value));
      } else if (op.kind === 'staticText') {
        element.child(op.text);
      } else if (op.kind === 'dynamicAttr') {
        element.attr(op.name, '');
      } else if (op.kind === 'slotText' || op.kind === 'bindText') {
        element.child(TEXT_PLACEHOLDER);
      } else if (op.kind === 'element') {
        element.child(buildSample(core, op.factory, op.ops));
      }
    }
  });
}

/** 元素模式：所有值位置都编成对既有 DOM 的直接写。 */
function emitElementMode({ entry, addExpression }) {
  const lines = [];
  let liveCount = 0;

  const domPath = (path) => `el${path.map((index) => `.childNodes[${index}]`).join('')}`;

  const visit = (ops, ownerPath) => {
    for (const op of ops) {
      if (op.kind === 'element') {
        visit(op.ops, op.path);
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
      }
      // staticAttr / staticClass / staticStyle / staticText 已在片段里，不必再写
    }
  };

  visit(entry.ops, entry.path ?? []);
  return { lines, slotLines: [], liveNodes: liveCount, slots: 0 };
}

/** 节点模式：只给「有活内容」的节点建包装对象，其余静态节点只存在于片段里。 */
function emitNodeMode({ entry, thin, addExpression, addName }) {
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

  const collectSlotWrites = (op) => {
    for (const child of op.ops) {
      if (child.kind === 'slotText') {
        addExpression(child.expression);
        slotLines.push(`${pathExprOf(child.path)}.textContent = ${child.expression};`);
      } else if (child.kind === 'bindText') {
        // 静态子节点里的活文本没有节点承载绑定：这一形状不编（调用方整体回落）
        throw new Error('静态子节点里的活文本（需要活祖先承载绑定）');
      } else if (child.kind === 'element' && !isLiveNode(child.ops)) {
        collectSlotWrites(child);
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

  const emitNode = (op, depth, ownerVar) => {
    const live = isLiveNode(op.ops);
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
        inner.push(
          `${indentOf(depth + 1)}node.attr(${JSON.stringify(child.name)}, ${JSON.stringify(
            child.value === null || child.value === undefined ? '' : String(child.value)
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
      }
    }

    const varName = `n${++liveCounter}`;
    // 物化节点要用元素工厂建包装对象：工厂名进 scope（元素模式不需要，行就是原生元素）。
    addName(op.factory);
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
        collectSlotWrites(child);
      }
    }
  };

  emitNode(entry, 2, null);
  const rootVar = isLiveNode(entry.ops) ? 'n1' : null;

  return { lines, slotLines, liveNodes: liveCounter, slots: slotLines.length, rootVar };
}
