/**
 * 构建期结构分析：把一份 setupFunction DSL 源码读成「按执行顺序的节点调用」（ops）。
 *
 * 只读源码、不执行它——「源码是唯一真源」是这条路径的前提（没有 eval、没有 new Function）。
 * 认不出的构造一律记进 `bails`：调用方据此让**整个形状**回落通用路径，绝不猜、不丢节点。
 */
import { parse, parseExpression } from '@babel/parser';
import { optionKindOf } from '../core/setup-keys.js';
import { STATIC_LIBRARY_EXPORTS, isStaticLibraryModule } from './static-values.js';

/** 节点级 API：这些不是子工厂，而是对当前节点自身的操作。 */
export const NODE_API = new Set([
  'attr',
  'child',
  'className',
  'class',
  'on',
  'style',
  'styles',
  'toggleClass'
]);

/** 语言内建 / 全局：生成代码不把它们从 scope 里解构。 */
export const GLOBALS = new Set([
  'String',
  'Number',
  'Boolean',
  'Object',
  'Array',
  'Math',
  'JSON',
  'console',
  'undefined',
  'NaN',
  'Infinity'
]);

/** 字面量判定：只有真正的字面量才算静态；模板串带表达式、标识符、成员访问都算动态。 */
function literalOf(node) {
  if (!node) {
    return { literal: false };
  }
  if (
    node.type === 'StringLiteral' ||
    node.type === 'NumericLiteral' ||
    node.type === 'BooleanLiteral'
  ) {
    return { literal: true, value: node.value };
  }
  if (node.type === 'NullLiteral') {
    return { literal: true, value: null };
  }
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return { literal: true, value: node.quasis.map((quasi) => quasi.value.cooked).join('') };
  }
  if (
    node.type === 'UnaryExpression' &&
    node.operator === '-' &&
    node.argument.type === 'NumericLiteral'
  ) {
    return { literal: true, value: -node.argument.value };
  }
  return { literal: false };
}

/**
 * 文本位置（`child(x)` / `vText(x)`）上「静态就认得出来不是一段文本」的形状。
 *
 * 数组在 DSL 里会摊平成多个子节点、对象会直接报错，两者都不是文本；编成位置写就是
 * **静默误编**（`String([a, b])` 变成 `"a,b"`、`String({…})` 变成 `"[object Object]"`），
 * 所以认出来就 bail，让整个形状回通用路径。
 */
function textPositionProblemOf(node) {
  if (node.type === 'ArrayExpression') {
    return '数组：数组在 DSL 里会摊平成多个子节点，不是一段文本';
  }
  if (node.type === 'ObjectExpression') {
    return '对象：文本位置只接受字符串 / 数字 / 值句柄';
  }
  return null;
}

/**
 * 收集「局部绑定」：函数形参 + 函数内的声明（模块级 `const` 不算——那是要折的常量）。
 *
 * 有同名局部绑定时一律不折：调用方可能是另一个函数，折错就是把不知道的值编成静态片段。
 */
function collectLocalBindings(ast) {
  const names = new Set();

  const addPattern = (pattern) => {
    if (!pattern) {
      return;
    }
    if (pattern.type === 'Identifier') {
      names.add(pattern.name);
      return;
    }
    if (pattern.type === 'ObjectPattern') {
      pattern.properties.forEach((property) => addPattern(property.value ?? property.argument));
      return;
    }
    if (pattern.type === 'ArrayPattern') {
      pattern.elements.forEach(addPattern);
      return;
    }
    if (pattern.type === 'AssignmentPattern') {
      addPattern(pattern.left);
      return;
    }
    if (pattern.type === 'RestElement') {
      addPattern(pattern.argument);
    }
  };

  const visit = (node, nested) => {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((child) => visit(child, nested));
      return;
    }

    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression'
    ) {
      node.params?.forEach(addPattern);
      visit(node.body, true);
      return;
    }

    if (node.type === 'VariableDeclaration') {
      if (nested) {
        node.declarations.forEach((declarator) => {
          addPattern(declarator.id);
          visit(declarator.init, true);
        });
      }
      return;
    }

    Object.keys(node).forEach((key) => {
      if (key === 'loc' || key === 'start' || key === 'end') {
        return;
      }
      visit(node[key], nested);
    });
  };

  visit(ast.program.body, false);
  return names;
}

/** 折叠上下文：模块级字面量常量、导入绑定、局部绑定（同名不折）。 */
function createStaticContext(ast, imports) {
  const consts = new Map();

  ast.program.body.forEach((statement) => {
    if (statement.type !== 'VariableDeclaration' || statement.kind !== 'const') {
      return;
    }
    statement.declarations.forEach((declarator) => {
      if (declarator.id?.type === 'Identifier' && declarator.init) {
        consts.set(declarator.id.name, declarator.init);
      }
    });
  });

  return { imports, consts, local: collectLocalBindings(ast), resolving: new Set() };
}

/** 名字是不是库内静态助手（且确实是从 `components/shared.js` 导入的）。 */
function staticLibraryOf(name, context) {
  const record = context.imports.get(name);
  if (!record || !isStaticLibraryModule(record.specifier)) {
    return null;
  }
  return STATIC_LIBRARY_EXPORTS.get(record.imported) ?? null;
}

/**
 * 构建期静态值：字面量，外加**可折叠**的模块级字面量常量、库内常量与库内主题助手。
 *
 * 折出来的值与运行期那份实现同源（调用的是同一个函数 / 同一个常量），不是抄一份公式；
 * 认不出的形状照旧返回「不是字面量」，由调用方的 bail 规则接管。
 */
function staticValueOf(node, context) {
  const direct = literalOf(node);
  if (direct.literal || !context) {
    return direct;
  }

  if (node.type === 'Identifier') {
    if (context.local.has(node.name)) {
      return direct;
    }
    const helper = staticLibraryOf(node.name, context);
    if (helper?.kind === 'value') {
      return { literal: true, value: helper.value };
    }
    const init = context.consts.get(node.name);
    if (!init || context.resolving.has(node.name)) {
      return direct;
    }
    context.resolving.add(node.name);
    try {
      return staticValueOf(init, context);
    } finally {
      context.resolving.delete(node.name);
    }
  }

  if (node.type === 'TemplateLiteral') {
    let text = '';
    for (let index = 0; index < node.quasis.length; index += 1) {
      text += node.quasis[index].value.cooked ?? '';
      const expression = node.expressions[index];
      if (!expression) {
        continue;
      }
      const folded = staticValueOf(expression, context);
      if (!folded.literal) {
        return direct;
      }
      text += folded.value === null || folded.value === undefined ? '' : String(folded.value);
    }
    return { literal: true, value: text };
  }

  if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
    if (context.local.has(node.callee.name)) {
      return direct;
    }
    const helper = staticLibraryOf(node.callee.name, context);
    if (helper?.kind !== 'call' || node.arguments.some((arg) => arg.type === 'SpreadElement')) {
      return direct;
    }
    const values = [];
    for (const argument of node.arguments) {
      const folded = staticValueOf(argument, context);
      if (!folded.literal) {
        return direct;
      }
      values.push(folded.value);
    }
    return { literal: true, value: helper.fn(...values) };
  }

  return direct;
}

/** 把 `a.b(…).c(…)` 链摊平成「按执行顺序的调用 + 链首」。 */
function flattenChain(expression) {
  const calls = [];
  let node = expression;
  while (
    node?.type === 'CallExpression' &&
    node.callee?.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.object
  ) {
    calls.unshift(node);
    node = node.callee.object;
  }
  return { calls, head: node };
}

/** 顶层找组件类：`export class VCard extends …`。 */
export function findClassDeclaration(ast, name) {
  for (const statement of ast.program.body) {
    const node =
      statement.type === 'ExportNamedDeclaration' && statement.declaration
        ? statement.declaration
        : statement;
    if (node.type === 'ClassDeclaration' && node.id?.name === name) {
      return node;
    }
  }
  return null;
}

/** 顶层找目标函数：函数声明或 `const fn = (…) => …` / `const fn = function () {}`。 */
export function findBuilderFunction(ast, name) {
  for (const statement of ast.program.body) {
    // `export function Card(…)` / `export const Card = …`
    const node =
      statement.type === 'ExportNamedDeclaration' && statement.declaration
        ? statement.declaration
        : statement;
    if (node.type === 'FunctionDeclaration' && node.id?.name === name) {
      return node;
    }
    if (node.type === 'VariableDeclaration') {
      for (const declarator of node.declarations) {
        const init = declarator.init;
        if (
          declarator.id?.name === name &&
          init &&
          (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')
        ) {
          return init;
        }
      }
    }
  }
  return null;
}

/**
 * 收集 import 绑定：本地名 → `{ specifier, imported }`。
 * 调用点链接靠它把 `StatusDot(...)` 解析成「模块路径#导出名」——解析不出就回落，不猜。
 */
export function collectImports(ast) {
  const imports = new Map();

  for (const statement of ast.program.body) {
    if (statement.type !== 'ImportDeclaration') {
      continue;
    }
    for (const item of statement.specifiers) {
      if (item.type === 'ImportSpecifier') {
        imports.set(item.local.name, {
          specifier: statement.source.value,
          imported: item.imported.name
        });
      } else if (item.type === 'ImportNamespaceSpecifier') {
        imports.set(item.local.name, { specifier: statement.source.value, imported: '*' });
      }
    }
  }

  return imports;
}

/**
 * 收集表达式里引用的自由标识符（生成代码要它们出现在 scope 里）。
 * 参数名 / 局部箭头函数的形参算已绑定；`String` 等内建不算自由。
 */
export function freeIdentifiers(expressionSource, bound = new Set(['row', 'node', 'event'])) {
  const names = new Set();
  const visit = (node, scope) => {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((child) => visit(child, scope));
      return;
    }
    if (node.type === 'Identifier') {
      if (!scope.has(node.name) && !GLOBALS.has(node.name)) {
        names.add(node.name);
      }
      return;
    }
    if (node.type === 'MemberExpression' && !node.computed) {
      visit(node.object, scope);
      return;
    }
    if (
      (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') &&
      node.params
    ) {
      const inner = new Set(scope);
      node.params.forEach((param) => param.type === 'Identifier' && inner.add(param.name));
      visit(node.body, inner);
      return;
    }
    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') {
        continue;
      }
      const value = node[key];
      if (value && typeof value === 'object') {
        visit(value, scope);
      }
    }
  };

  visit(parseExpression(expressionSource), new Set(bound));
  return names;
}

/**
 * 分析源码文本 → `{ entry, bails }`。
 *
 * `entry` 为 `{ factory, param, ops }`（ops 已带位置寻址路径）；有任何 bail 时调用方必须
 * 整体回落——片段里少一个节点就是静默的语义错误。
 */
export function analyzeSource(source, options = {}) {
  // 目标组件名必须显式给出：编译器不认识任何具体的业务函数名（发现规则在插件侧，按组件边界走）。
  const fnName = options.fn;
  if (typeof fnName !== 'string' || fnName.length === 0) {
    return { entry: null, bails: [{ reason: '缺少目标组件名（fn）', at: null }] };
  }
  const className = options.className ?? null;
  // 编译单元种类：行的形参只能是单个标识符；组件的形参由调用点逐个解构，允许多个。
  const kind = options.kind ?? 'row';
  const whitelist = options.whitelist ?? new Set();
  const resolveComponent = options.resolveComponent ?? null;
  const bails = [];

  let ast;
  try {
    ast = parse(source, { sourceType: 'module' });
  } catch (error) {
    return { entry: null, bails: [{ reason: `源码解析失败：${error.message}`, at: null }] };
  }

  const slice = (node) => source.slice(node.start, node.end);
  const recordBail = (reason, node) => {
    bails.push({ reason, at: node ? slice(node).slice(0, 80) : null });
  };
  const imports = collectImports(ast);
  // 静态值折叠：字面量之外，模块级字面量常量与库内主题助手也算「构建期就知道的值」
  const staticContext = createStaticContext(ast, imports);
  const staticOf = (node) => staticValueOf(node, staticContext);
  // 形态 C 的骨架：构造体里出现这些参数名的地方就是"调用方内容"（链接时走运行期回落）
  const contentParams = new Set();
  let hasContent = false;

  /** 构造参数 = 调用方内容：`applyComponentSetup(this, setup)` / `this.child(setup)` 里的那个名字。 */
  const isContentArg = (argument) =>
    argument?.type === 'Identifier' && contentParams.has(argument.name);

  /**
   * 形态 C 的内容助手：库内 `components/shared.js` 的 `applyComponentSetup` /
   * `applyComponentArguments`（按**导入来源**认，业务里的同名函数不参与）。
   */
  function contentHelperOf(call) {
    if (call.callee.type !== 'Identifier') {
      return null;
    }
    const record = imports.get(call.callee.name);
    if (!record || !isStaticLibraryModule(record.specifier)) {
      return null;
    }
    return record.imported === 'applyComponentSetup' ||
      record.imported === 'applyComponentArguments'
      ? record.imported
      : null;
  }

  /**
   * 调用点的组件内容（形态 C 骨架）：从内容位置起、往后的实参都是"接到组件根上的内容"。
   *
   * 能**全量**静态读懂的（构建回调 / 字面量文本 / 白名单元素工厂）就交给调用方内联：片段里就在
   * 内容位置，动态值按位置写；只要有一个读不懂，就整体不内联（软回落：链接照旧，产物拒收 →
   * 调用方用原组件重建）——绝不半内联，也绝不把调用方整行拖下水。
   */
  function inlineComponentContent(linked, args) {
    const contentOp = linked.ops?.find((op) => op.kind === 'content');
    if (!contentOp) {
      return null;
    }

    const from = contentOp.index ?? 0;
    const passed = args.slice(from);
    if (passed.length === 0 || passed.every((argument) => argument.type === 'NullLiteral')) {
      return null; // 没带内容 / 显式 null：产物守卫放行，直接走骨架
    }

    const outerBails = bails.length;
    const contentOps = [];
    for (const argument of passed) {
      const ops = contentArgumentOps(argument);
      if (!ops) {
        bails.length = outerBails; // 内容读不懂只是"不内联"，不是这一行编不了
        return null;
      }
      contentOps.push(...ops);
    }
    if (contentOps.some((op) => op.kind === 'dynamicStyle' || op.kind === 'content')) {
      bails.length = outerBails;
      return null;
    }

    assignPaths(contentOps, []);
    return { index: from, ops: contentOps };
  }

  /** 一个内容实参 → ops；认不出返回 null（调用方据此整体不内联）。 */
  function contentArgumentOps(argument) {
    const literal = staticOf(argument);
    if (literal.literal) {
      if (typeof literal.value === 'boolean' || literal.value === null) {
        return null;
      }
      return [{ kind: 'staticText', text: String(literal.value) }];
    }

    if (argument.type === 'ArrowFunctionExpression' || argument.type === 'FunctionExpression') {
      const param = argument.params[0]?.name;
      if (!param) {
        recordBail('内容回调没有参数（拿不到组件节点）', argument);
        return null;
      }
      return analyzeSetup(argument, param);
    }

    // 白名单元素工厂当内容（`vCard(span('x'))`）：与 `child(<工厂>(…))` 走同一条参数分派
    if (
      argument.type === 'CallExpression' &&
      argument.callee?.type === 'Identifier' &&
      whitelist.has(argument.callee.name)
    ) {
      const elementOps = analyzeElementArguments(
        argument.arguments,
        argument.callee.name,
        argument
      );
      if (!elementOps) {
        return null;
      }
      return [{ kind: 'element', factory: argument.callee.name, ops: elementOps }];
    }

    return null;
  }

  /** 分析一条节点调用 → op（不认识就 bail 并跳过）。 */
  function classifyCall(call, ops) {
    const method = call.callee.property.name;
    const args = call.arguments;

    if (args.some((argument) => argument.type === 'SpreadElement')) {
      recordBail(`spread 参数（${method}）`, call);
      return;
    }

    if (!NODE_API.has(method)) {
      // 形态 C 的构造体里，组件助手把构造参数接到节点上——那是**调用方内容**的位置
      if (contentHelperOf(call) && call.arguments.some((arg) => isContentArg(arg))) {
        const param = call.arguments.find((arg) => isContentArg(arg));
        ops.push({ kind: 'content', param: param.name });
        hasContent = true;
        return;
      }
      // 只有白名单里的元素工厂才能编；组件 / 父快捷方法 / 未知 API 一律 bail
      if (!whitelist.has(method)) {
        recordBail(`不是元素工厂（组件或未知 API）：${method}`, call);
        return;
      }
      const elementOps = analyzeElementArguments(args, method, call);
      if (elementOps) {
        ops.push({ kind: 'element', factory: method, ops: elementOps });
      }
      return;
    }

    if (method === 'child') {
      if (args.length !== 1) {
        recordBail(`child() 参数数量 ${args.length}`, call);
        return;
      }
      const argument = args[0];
      // 形态 C 的构造体：`this.child(setup)` 里的构造参数是**调用方内容**，不是一段文本
      if (argument.type === 'Identifier' && contentParams.has(argument.name)) {
        ops.push({ kind: 'content', param: argument.name });
        hasContent = true;
        return;
      }
      const literal = staticOf(argument);
      if (literal.literal) {
        // 通用路径里 child(true / false) 直接抛 TypeError（只接受节点 / 字符串 / 数字 / 句柄），
        // 编成文本就成了 `"true"` / `"false"` 的静默误编 → 认出来就回落，让错误照旧冒出来
        if (typeof literal.value === 'boolean') {
          recordBail('child() 收到布尔值：通用路径会直接报错', argument);
          return;
        }
        ops.push({ kind: 'staticText', text: literal.value === null ? '' : String(literal.value) });
        return;
      }
      // 组件调用（形态 A/B/vNode 或未编译的工厂）：不猜，直接 bail
      if (argument.type === 'CallExpression' && argument.callee?.type === 'Identifier') {
        const callee = argument.callee.name;
        const isComponentCallee =
          !whitelist.has(callee) && callee !== 'String' && callee !== 'vText';
        if (isComponentCallee) {
          // 注册表命中 → 链接（片段就地嵌入 + 运行期实例化）；未命中 → 今天的通用路径
          const linked = resolveComponent?.(callee, imports.get(callee), argument);
          if (linked) {
            // 形态 C 的骨架带内容位置：调用方内容能**构建期内联**就内联（片段 + 位置写），
            // 内联不了（动态值 / 认不出的写法）就留给运行期——产物会拒收并回落通用路径。
            const content = inlineComponentContent(linked, argument.arguments);
            ops.push({
              kind: 'component',
              key: linked.key,
              hash: linked.hash,
              entryFactory: linked.factory,
              entryOps: linked.ops,
              args: argument.arguments.map(slice),
              ...(content ? { content } : {})
            });
            return;
          }
          recordBail(`child() 里是组件调用（未编译）：${callee}`, call);
          return;
        }

        // 白名单内的元素工厂当 child 参数（`cell.child(span((s) => …))`）：与前缀写法
        // `cell.span(…)` 同义，编成子元素——当成文本写就是静默误编。
        if (whitelist.has(callee)) {
          const setup = argument.arguments[0];
          if (setup?.type === 'ArrowFunctionExpression' || setup?.type === 'FunctionExpression') {
            const param = setup.params[0]?.name;
            if (!param) {
              recordBail(`子工厂 ${callee} 的 setup 没有参数`, call);
              return;
            }
            ops.push({ kind: 'element', factory: callee, ops: analyzeSetup(setup, param) });
            return;
          }
          recordBail(`child() 里的元素工厂 ${callee} 不是 setup 回调形式`, call);
          return;
        }
      }
      if (argument.type === 'CallExpression' && argument.callee?.name === 'String') {
        ops.push({ kind: 'slotText', expression: slice(argument) });
        return;
      }
      if (argument.type === 'CallExpression' && argument.callee?.name === 'vText') {
        if (argument.arguments.length !== 1) {
          recordBail('vText() 参数数量 != 1', call);
          return;
        }
        const problem = textPositionProblemOf(argument.arguments[0]);
        if (problem) {
          recordBail(`vText() 收到${problem}`, argument.arguments[0]);
          return;
        }
        // vText(x) 的「值」是 x：句柄 → 绑定，零参 reader → 派生，普通值 → 写一次
        ops.push({ kind: 'bindText', expression: slice(argument.arguments[0]) });
        return;
      }
      if (argument.type === 'ArrowFunctionExpression') {
        recordBail('child(() => …) 组件槽', call);
        return;
      }
      const problem = textPositionProblemOf(argument);
      if (problem) {
        recordBail(`child() 收到${problem}`, argument);
        return;
      }
      // 其余表达式：句柄还是普通值构建期看不出来 → 运行期二选一
      ops.push({ kind: 'bindText', expression: slice(argument) });
      return;
    }

    if (method === 'attr') {
      if (args.length !== 2) {
        recordBail('attr() 只用「名字 + 值」两参形式', call);
        return;
      }
      const name = staticOf(args[0]);
      if (!name.literal || typeof name.value !== 'string') {
        recordBail('attr() 属性名不是字符串字面量', call);
        return;
      }
      const value = staticOf(args[1]);
      if (value.literal) {
        ops.push({ kind: 'staticAttr', name: name.value, value: value.value });
        return;
      }
      ops.push({ kind: 'dynamicAttr', name: name.value, expression: slice(args[1]) });
      return;
    }

    if (method === 'className' || method === 'class') {
      const names = [];
      for (const argument of args) {
        const literal = staticOf(argument);
        if (!literal.literal || typeof literal.value !== 'string') {
          recordBail('className() 参数不是字符串字面量', call);
          return;
        }
        names.push(literal.value);
      }
      ops.push({ kind: 'staticClass', names });
      return;
    }

    if (method === 'toggleClass') {
      if (args.length !== 2) {
        recordBail('toggleClass() 参数数量 != 2', call);
        return;
      }
      const name = staticOf(args[0]);
      if (!name.literal || typeof name.value !== 'string') {
        recordBail('toggleClass() 类名不是字符串字面量', call);
        return;
      }
      const value = staticOf(args[1]);
      if (value.literal) {
        if (value.value) {
          ops.push({ kind: 'staticClass', names: [name.value] });
        }
        return;
      }
      ops.push({ kind: 'liveClass', name: name.value, expression: slice(args[1]) });
      return;
    }

    if (method === 'on') {
      ops.push({ kind: 'liveEvent', args: args.map(slice) });
      return;
    }

    if (method === 'style') {
      const name = staticOf(args[0]);
      if (args.length !== 2 || !name.literal || typeof name.value !== 'string') {
        recordBail('style() 只用「样式名 + 值」两参形式，样式名要是字符串字面量', call);
        return;
      }
      const value = staticOf(args[1]);
      if (value.literal) {
        ops.push({ kind: 'staticStyle', name: name.value, value: value.value });
        return;
      }
      // 动态样式值：与手写同一个语义——节点模式编成 `node.style(name, expr)`（值可以是句柄）
      ops.push({ kind: 'dynamicStyle', name: name.value, expression: slice(args[1]) });
      return;
    }

    if (method === 'styles') {
      if (args.length !== 1 || args[0].type !== 'ObjectExpression') {
        recordBail('styles() 只用对象字面量形式', call);
        return;
      }
      for (const property of args[0].properties) {
        if (property.type !== 'ObjectProperty' || property.computed) {
          recordBail('styles() 里有非静态键', call);
          return;
        }
        const name = property.key.name ?? property.key.value;
        if (typeof name !== 'string') {
          recordBail('styles() 里有非字面量键', call);
          return;
        }
        const value = staticOf(property.value);
        if (value.literal) {
          ops.push({ kind: 'staticStyle', name, value: value.value });
        } else {
          ops.push({ kind: 'dynamicStyle', name, expression: slice(property.value) });
        }
      }
      return;
    }

    recordBail(`未知节点方法 ${method}`, call);
  }

  /** 分析一个 setup 回调：block 体或表达式体（链式调用）都支持。 */
  function analyzeSetup(fn, paramName, { staticOnly = false } = {}) {
    const ops = [];
    const statements =
      fn.body.type === 'BlockStatement'
        ? fn.body.body
        : [{ type: 'ExpressionStatement', expression: fn.body }];

    for (const statement of statements) {
      if (statement.type !== 'ExpressionStatement') {
        recordBail(`${statement.type} 语句（只支持表达式调用）`, statement);
        continue;
      }
      // 形态 C 的内容位置：`applyComponentSetup(this, setup)` / `applyComponentArguments(this, …)`
      // 这种裸调用不是从节点出发的链，单独认——构造参数在这里就是"调用方内容"。
      if (statement.expression.type === 'CallExpression' && contentHelperOf(statement.expression)) {
        const contentArg = statement.expression.arguments.find(isContentArg);
        if (!contentArg) {
          recordBail('内容助手的参数不是构造参数（骨架只支持把内容交给调用方）', statement);
          continue;
        }
        ops.push({ kind: 'content', param: contentArg.name });
        hasContent = true;
        continue;
      }
      const { calls, head } = flattenChain(statement.expression);
      if (paramName === null && calls.length === 0 && statement.expression.callee?.name) {
        recordBail(
          `构造体里的裸调用 ${statement.expression.callee.name}（骨架只支持节点链式调用与内容位置）`,
          statement
        );
        continue;
      }
      const fromNode =
        paramName === null
          ? head?.type === 'ThisExpression' // 形态 C 的构造体：`this` 就是节点
          : head?.type === 'Identifier' && head.name === paramName;
      if (!fromNode) {
        recordBail('调用链不是从 setup 参数出发', statement);
        continue;
      }
      const before = ops.length;
      for (const call of calls) {
        classifyCall(call, ops);
      }
      // 形态 C 的骨架只吃静态值：动态值 / 事件都要引用实例状态（`this._x`），生成代码里没有 this
      const produced = ops.slice(before);
      if (
        staticOnly &&
        produced.some(
          (op) =>
            op.kind !== 'staticAttr' &&
            op.kind !== 'staticClass' &&
            op.kind !== 'staticStyle' &&
            op.kind !== 'content'
        )
      ) {
        recordBail('构造体里的动态值 / 事件（骨架只支持静态值与内容位置）', statement);
        ops.length = before;
      }
    }

    return ops;
  }

  /**
   * 元素工厂的参数：数量不定、严格按出现顺序，类型分派与运行期 `applySetupValue` 同一张表
   * （`Factory(options, setup)` / 变参 / 多个回调都能认）。认不出来就 bail —— 编译期不猜。
   */
  function analyzeElementArguments(args, factoryName, call) {
    const elementOps = [];
    let hasSetup = false;

    for (const argument of args) {
      if (argument.type === 'ArrowFunctionExpression' || argument.type === 'FunctionExpression') {
        if (hasSetup) {
          recordBail(`子工厂 ${factoryName} 有多个 setup 回调`, call);
          return null;
        }
        const param = argument.params[0]?.name;
        if (!param) {
          recordBail(`子工厂 ${factoryName} 的 setup 没有参数`, call);
          return null;
        }
        hasSetup = true;
        elementOps.push(...analyzeSetup(argument, param));
        continue;
      }

      const literal = staticOf(argument);
      if (literal.literal) {
        elementOps.push({
          kind: 'staticText',
          text: literal.value === null ? '' : String(literal.value)
        });
        continue;
      }

      // 文本位置：`String(x)` 位置写、`vText(x)` 活值绑定（与 child() 分支同一套判定）
      if (argument.type === 'CallExpression' && argument.callee?.name === 'String') {
        elementOps.push({ kind: 'slotText', expression: slice(argument) });
        continue;
      }
      if (argument.type === 'CallExpression' && argument.callee?.name === 'vText') {
        if (argument.arguments.length !== 1) {
          recordBail('vText() 参数数量 != 1', call);
          return null;
        }
        elementOps.push({ kind: 'bindText', expression: slice(argument.arguments[0]) });
        continue;
      }

      if (
        argument.type === 'ObjectExpression' &&
        analyzeOptionsObject(argument, elementOps, call)
      ) {
        continue;
      }

      recordBail(`子工厂 ${factoryName} 的参数无法静态判定`, call);
      return null;
    }

    return elementOps;
  }

  /**
   * options 对象：与运行期同一张规则表 —— `attrs` / `style` / `class|className` / `children`
   * 各自归位，其余键按**属性**写（子工厂不参与分派）；值必须是字面量，否则 bail。
   */
  function analyzeOptionsObject(objectNode, elementOps, call) {
    for (const property of objectNode.properties) {
      if (property.type !== 'ObjectProperty' || property.computed) {
        recordBail('options 里有非静态键', call);
        return false;
      }

      const key = property.key.name ?? property.key.value;
      const kind = optionKindOf(key);

      if (kind === 'attrs' && property.value.type === 'ObjectExpression') {
        for (const attr of property.value.properties) {
          const name = attr.key.name ?? attr.key.value;
          if (typeof name !== 'string') {
            recordBail('attrs 里有非字面量键', call);
            return false;
          }
          const attrValue = staticOf(attr.value);
          if (attrValue.literal) {
            elementOps.push({ kind: 'staticAttr', name, value: attrValue.value });
          } else {
            // 动态属性：值表达式交给运行期 setAttr（与手写 `attr(name, expr)` 同一条 op）
            elementOps.push({ kind: 'dynamicAttr', name, expression: slice(attr.value) });
          }
        }
        continue;
      } else if (kind === 'style' && property.value.type === 'ObjectExpression') {
        for (const style of property.value.properties) {
          const name = style.key.name ?? style.key.value;
          if (typeof name !== 'string') {
            recordBail('style 里有非字面量键', call);
            return false;
          }
          const styleValue = staticOf(style.value);
          if (styleValue.literal) {
            elementOps.push({ kind: 'staticStyle', name, value: styleValue.value });
          } else {
            // 动态样式值：与手写 `style(name, expr)` 同一条 op（节点模式编成活值写）
            elementOps.push({ kind: 'dynamicStyle', name, expression: slice(style.value) });
          }
        }
        continue;
      }

      const value = staticOf(property.value);

      // 整体类名要能分类：动态类名没法编译（类名顺序 / 去重都是语义），状态类有专门写法
      if (kind === 'class' && !value.literal) {
        recordBail(
          '整体类名不能由数据计算：状态类用 toggleClass(name, 值)，静态类名写成字面量',
          call
        );
        return false;
      }

      if (kind === 'children' && !value.literal) {
        recordBail('options 的 children 值不是字面量', call);
        return false;
      }

      if (kind === 'class') {
        elementOps.push({
          kind: 'staticClass',
          names: String(value.value).split(/\s+/).filter(Boolean)
        });
      } else if (kind === 'children') {
        elementOps.push({
          kind: 'staticText',
          text: value.value === null ? '' : String(value.value)
        });
      } else if (kind === 'attribute' && typeof key === 'string' && !NODE_API.has(key)) {
        // 子工厂不参与 options 分派 → 按属性写（`{ slot: 't-head' }`）；动态值走 setAttr
        if (value.literal) {
          elementOps.push({ kind: 'staticAttr', name: key, value: value.value });
        } else {
          elementOps.push({ kind: 'dynamicAttr', name: key, expression: slice(property.value) });
        }
      } else {
        recordBail(`options 的键 ${String(key)} 需要动态分派`, call);
        return false;
      }
    }

    return true;
  }

  /**
   * 形态 C 的"骨架可编"：构造体 = `super('<字面量标签>', …)` + 从 `this` 出发的直线调用。
   *
   * 与 setup 回调走同一张分派表 —— `this` 就是那个节点参数；构造参数出现在 `child(参数)` /
   * `applyComponentSetup(this, 参数)` 的位置时记为**内容位置**（链接时调用方带内容就走运行期回落）。
   * 字段声明、非直线语句、动态值 / 事件一律 bail（不逆向任意 JS，红线不变）。
   */
  function analyzeClassBuilder(klass) {
    const constructor = klass.body.body.find((member) => member.kind === 'constructor');
    if (!constructor) {
      recordBail('组件类没有显式构造函数（骨架只在构造体里读）', klass);
      return null;
    }
    if (
      klass.body.body.some(
        (member) => member.type === 'PropertyDefinition' || member.type === 'ClassPrivateProperty'
      )
    ) {
      recordBail('组件类有字段声明（骨架只支持构造体里的直线调用）', klass);
      return null;
    }

    const [first, ...rest] = constructor.body.body;
    const superCall =
      first?.type === 'ExpressionStatement' &&
      first.expression.type === 'CallExpression' &&
      first.expression.callee.type === 'Super'
        ? first.expression
        : null;
    const tag = superCall?.arguments[0];
    if (!superCall || tag?.type !== 'StringLiteral') {
      recordBail('构造体起手不是 super("<标签>", …)', constructor);
      return null;
    }

    for (const param of constructor.params) {
      const name = param.type === 'Identifier' ? param.name : param.left?.name;
      if (!name) {
        recordBail('构造体参数不是简单形参', constructor);
        return null;
      }
      contentParams.add(name);
    }

    const ops = analyzeSetup(
      { body: { type: 'BlockStatement', body: rest, start: constructor.body.start } },
      null,
      { staticOnly: true }
    );

    return {
      factory: tag.value,
      builderParam: constructor.params[0]?.name ?? 'row',
      setupParam: null,
      ops
    };
  }

  function analyzeBuilder(fn) {
    // 票 12 / C1：构建函数的形参必须是**单个标识符**。形参解构、默认值、rest、多参都会让正文里
    // 的 `data` / `api` 之类被当成自由标识符收进 scope——产物于是忽略自己的实参、运行期读到
    // undefined。这个形状整体 bail，绝不静默编错。
    //
    // 例外：组件编译单元（`kind: 'component'`）的形参由调用点的 `bind(root, values)` 逐个解构，
    // 所以允许多个标识符形参（夹具里的 `(props, children)`）；非标识符形参两种单元都不支持。
    const params = fn.params;
    const unnamedParam = params.find((param) => param.type !== 'Identifier');
    const tooManyParams = kind !== 'component' && params.length !== 1;
    if (params.length === 0 || unnamedParam || tooManyParams) {
      recordBail(
        '目标函数的形参必须是单个标识符（解构 / 默认值 / rest / 多参不支持）',
        unnamedParam ?? params[0] ?? fn
      );
      return null;
    }

    const statements = fn.body.type === 'BlockStatement' ? fn.body.body : [];
    const returned =
      fn.body.type === 'BlockStatement'
        ? statements.find((statement) => statement.type === 'ReturnStatement')?.argument
        : fn.body;

    if (!returned || returned.type !== 'CallExpression' || returned.callee.type !== 'Identifier') {
      recordBail('函数体不是单个 return 工厂调用', fn);
      return null;
    }
    // 入口工厂与子工厂共用同一张参数分派表：`Factory(setup)` / `Factory(options, setup)` / 变参都认
    const ops = analyzeElementArguments(returned.arguments, returned.callee.name, returned);
    if (!ops) {
      return null;
    }
    const setupArg = returned.arguments.find(
      (argument) =>
        argument.type === 'ArrowFunctionExpression' || argument.type === 'FunctionExpression'
    );
    const setupParam = setupArg?.params[0]?.name ?? null;
    // 构建函数的形参（行数据，如 `row`）与 setup 形参（行根节点，如 `line`）都要绑定：
    // 前者出现在值表达式里，后者是调用链的起点。
    const builderParam = fn.params[0]?.name ?? 'row';
    return {
      factory: returned.callee.name,
      builderParam,
      setupParam,
      ops
    };
  }

  // 形态 C：编译单元是**类构造体**（工厂只是把参数转发给类，见 registry.js 的解析）
  if (className) {
    const klass = findClassDeclaration(ast, className);
    if (!klass) {
      return { entry: null, bails: [{ reason: `找不到组件类 ${className}`, at: null }] };
    }
    const classEntry = analyzeClassBuilder(klass);
    if (!classEntry) {
      return { entry: null, bails };
    }
    if (!whitelist.has(classEntry.factory)) {
      recordBail(`构造体起手不是白名单内的元素工厂：${classEntry.factory}`, klass);
      return { entry: null, bails };
    }

    classEntry.path = [];
    classEntry.hasContent = hasContent;
    assignPaths(classEntry.ops, []);
    return { entry: classEntry, bails };
  }

  const builderFn = findBuilderFunction(ast, fnName);
  if (!builderFn) {
    return { entry: null, bails: [{ reason: `找不到目标函数 ${fnName}`, at: null }] };
  }

  const entry = analyzeBuilder(builderFn);
  if (!entry) {
    return { entry: null, bails };
  }
  if (!whitelist.has(entry.factory)) {
    recordBail(`入口工厂不是元素：${entry.factory}`, builderFn);
    return { entry: null, bails };
  }

  entry.path = []; // 片段根就是行根
  assignPaths(entry.ops, []);
  return { entry, bails };
}

/** 按 document 顺序给每个子节点分配「父元素 childNodes 下标」路径。 */
function assignPaths(ops, basePath) {
  let index = 0;
  for (const op of ops) {
    if (op.kind === 'element') {
      op.path = [...basePath, index];
      assignPaths(op.ops, op.path);
      index += 1;
      continue;
    }
    if (
      op.kind === 'staticText' ||
      op.kind === 'slotText' ||
      op.kind === 'bindText' ||
      op.kind === 'component'
    ) {
      op.path = [...basePath, index];
      // 调用点内联的组件内容挂在组件根之下：路径从组件的元素位置接着往下算
      if (op.kind === 'component' && op.content) {
        assignPaths(op.content.ops, op.path);
      }
      index += 1;
    }
  }
}
