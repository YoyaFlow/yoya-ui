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

/** AST 遍历时跳过的非语义键。 */
const AST_SKIP_KEYS = new Set([
  'type',
  'loc',
  'start',
  'end',
  'extra',
  'leadingComments',
  'trailingComments',
  'innerComments'
]);

/** 自带作用域的节点：形参 / 方法名 / 体内声明都只在它们内部可见。 */
const FUNCTION_NODE_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'ObjectMethod',
  'ClassMethod',
  'ClassPrivateMethod'
]);

/**
 * 收集表达式里引用的**自由标识符**（生成代码要它们出现在 scope 里）。
 *
 * 只有"在这里读到的名字在当前词法作用域里找不到绑定"才算自由。踩过的坑（同一个族）：
 * 属性名（含可选链 `a?.b`）、对象键（`{ x: 1 }`）、解构 / 默认值形参、嵌套回调里的局部量、
 * catch 形参、嵌套函数名——它们都曾被当成自由标识符收进 scope，产物在**替换点**求值
 * （`createRowFactory({ closest, x })`）时这些名字并不存在，组件一调用就 ReferenceError。
 *
 * 判定保守：函数体里**任何**声明（含嵌套块）都算该函数的绑定名，宁可少收也不误收。
 */
export function freeIdentifiers(expressionSource, bound = new Set(['row', 'node', 'event'])) {
  const names = new Set();

  /** 形参模式里的**表达式**（默认值 / 计算键）在该函数作用域里求值。 */
  const visitPatternExpressions = (pattern, scope) => {
    if (!pattern || typeof pattern !== 'object') {
      return;
    }
    switch (pattern.type) {
      case 'AssignmentPattern':
        visit(pattern.right, scope);
        visitPatternExpressions(pattern.left, scope);
        return;
      case 'ObjectPattern':
        pattern.properties.forEach((property) => {
          if (property.type === 'RestElement') {
            visitPatternExpressions(property.argument, scope);
            return;
          }
          if (property.computed) {
            visit(property.key, scope);
          }
          visitPatternExpressions(property.value, scope);
        });
        return;
      case 'ArrayPattern':
        pattern.elements.forEach((element) => visitPatternExpressions(element, scope));
        return;
      case 'RestElement':
        visitPatternExpressions(pattern.argument, scope);
        return;
      case 'TSParameterProperty':
        visitPatternExpressions(pattern.parameter, scope);
        return;
      default:
        return;
    }
  };

  /**
   * 一个函数体里声明的所有名字（含嵌套块 / catch），**不深入**嵌套函数自己的作用域。
   * 保守：名字一旦在函数里声明过，函数内的同名读取就不是作用域依赖。
   */
  const collectDeclaredNames = (node, out) => {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((child) => collectDeclaredNames(child, out));
      return;
    }
    if (FUNCTION_NODE_TYPES.has(node.type)) {
      // 嵌套函数自己的局部量不外泄；它的名字（函数声明）由下面 FunctionDeclaration 分支收
      if (node.type === 'FunctionDeclaration' && node.id?.name) {
        out.add(node.id.name);
      }
      return;
    }
    if (node.type === 'ClassDeclaration') {
      if (node.id?.name) {
        out.add(node.id.name);
      }
      return;
    }
    if (node.type === 'VariableDeclarator') {
      collectPatternNamesInto(node.id, out);
      collectDeclaredNames(node.init, out);
      return;
    }
    if (node.type === 'CatchClause') {
      collectPatternNamesInto(node.param, out);
      collectDeclaredNames(node.body, out);
      return;
    }
    for (const key of Object.keys(node)) {
      if (AST_SKIP_KEYS.has(key)) {
        continue;
      }
      const value = node[key];
      if (value && typeof value === 'object') {
        collectDeclaredNames(value, out);
      }
    }
  };

  /** 函数 / 方法：形参（含解构、默认值、rest）+ 体内声明构成新作用域。 */
  const visitFunction = (node, scope) => {
    const inner = new Set(scope);
    (node.params ?? []).forEach((param) => collectPatternNamesInto(param, inner));
    if (node.id?.name) {
      inner.add(node.id.name);
    }
    collectDeclaredNames(node.body, inner);
    (node.params ?? []).forEach((param) => visitPatternExpressions(param, inner));
    visit(node.body, inner);
  };

  /** 类表达式：类名在类体里可见，继承表达式在外层作用域求值，方法走函数作用域。 */
  const visitClass = (node, scope) => {
    if (node.superClass) {
      visit(node.superClass, scope);
    }
    const inner = new Set(scope);
    if (node.id?.name) {
      inner.add(node.id.name);
    }
    (node.body?.body ?? []).forEach((member) => {
      if (member.computed) {
        visit(member.key, inner);
      }
      if (member.type === 'StaticBlock') {
        visit(member.body, inner);
        return;
      }
      if (FUNCTION_NODE_TYPES.has(member.type)) {
        visitFunction(member, inner);
        return;
      }
      if (member.value && typeof member.value === 'object') {
        visit(member.value, inner);
      }
    });
  };

  const visit = (node, scope) => {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((child) => visit(child, scope));
      return;
    }

    switch (node.type) {
      case 'Identifier':
        if (!scope.has(node.name) && !GLOBALS.has(node.name)) {
          names.add(node.name);
        }
        return;
      case 'MetaProperty':
        // `new.target` / `import.meta`：不是自由标识符（调用点另有守卫）
        return;
      case 'MemberExpression':
      case 'OptionalMemberExpression':
        visit(node.object, scope);
        if (node.computed) {
          visit(node.property, scope);
        }
        return;
      case 'OptionalCallExpression':
      case 'CallExpression':
        visit(node.callee, scope);
        node.arguments.forEach((argument) => visit(argument, scope));
        return;
      case 'ObjectProperty':
        if (node.computed) {
          visit(node.key, scope);
        }
        visit(node.value, scope);
        return;
      case 'ClassProperty':
      case 'ClassPrivateProperty':
        if (node.computed) {
          visit(node.key, scope);
        }
        visit(node.value, scope);
        return;
      case 'ClassDeclaration':
      case 'ClassExpression':
        visitClass(node, scope);
        return;
      default:
        break;
    }

    if (FUNCTION_NODE_TYPES.has(node.type)) {
      visitFunction(node, scope);
      return;
    }

    for (const key of Object.keys(node)) {
      if (AST_SKIP_KEYS.has(key)) {
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
 * 形参的绑定名与「要在产物里求值的表达式」（票 21）。
 *
 * - 绑定名：解构（对象 / 数组 / 嵌套）、默认值左侧、rest 全部展开——它们**不是**自由标识符，
 *   永远不进 scope（票 12 的 C1 就是这里漏了）；
 * - 表达式：默认值右侧与计算键——它们在产物里照旧求值，里面的自由标识符要进 scope。
 *
 * @param {object} pattern 形参 AST 节点
 * @param {Set<string>} bound 输出：绑定名
 * @param {string[]} expressions 输出：表达式源码
 * @param {(node: object) => string} slice 源码切片
 */
function collectParamBindings(pattern, bound, expressions, slice) {
  if (!pattern || typeof pattern !== 'object') {
    return;
  }
  switch (pattern.type) {
    case 'Identifier':
      bound.add(pattern.name);
      return;
    case 'ObjectPattern':
      pattern.properties.forEach((property) => {
        if (property.type === 'RestElement') {
          collectParamBindings(property.argument, bound, expressions, slice);
          return;
        }
        // 计算键（`{ [field]: value }`）里的名字是自由的：它要在产物里求值
        if (property.computed && expressions) {
          expressions.push(slice(property.key));
        }
        collectParamBindings(property.value, bound, expressions, slice);
      });
      return;
    case 'ArrayPattern':
      pattern.elements.forEach((element) =>
        collectParamBindings(element, bound, expressions, slice)
      );
      return;
    case 'AssignmentPattern':
      if (expressions) {
        expressions.push(slice(pattern.right));
      }
      collectParamBindings(pattern.left, bound, expressions, slice);
      return;
    case 'RestElement':
      collectParamBindings(pattern.argument, bound, expressions, slice);
      return;
    default:
      // 认不出的形参形状：整段当表达式收名字，宁可多进 scope 也不静默漏
      if (expressions) {
        expressions.push(slice(pattern));
      }
  }
}

/** 形参列表绑定的全部名字（注册表的「入参当子内容」判定要按它们看，票 21）。 */
export function paramBoundNames(params) {
  const bound = new Set();
  params.forEach((param) => collectParamBindings(param, bound, null, null));
  return bound;
}

/**
 * "同层"的边界：这些节点一出现就说明进了**另一层函数作用域**——里面的赋值要等那段函数被调用
 * 才生效（甚至永远不生效），不能拿来当"运行期真正生效的那一块"。
 */
const NESTED_FUNCTION_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'ObjectMethod',
  'ClassMethod',
  'ClassPrivateMethod',
  'ClassDeclaration',
  'ClassExpression'
]);

/**
 * 找出这个单元产出的**那段基础元素组合块** `<工厂调用>(…)`（票 21）。
 *
 * **位置无关**：那段块可以直接产出、可以先存进变量再产出、也可以是被赋进去的——对编译来说
 * 只有"那段块"这一件事，变量名与它被赋了几次都是运行期的事。
 *
 * - 同一个变量被赋了多次 → 取**源码最后那一处**（运行期真正生效的那段块）；前面那些赋值
 *   原样留在源码里照旧执行、被最后一份覆盖（死代码消除是后续优化，不是能不能编的前提）；
 * - `null` / `undefined` 这种占位不算一块；
 * - 候选只在**同层**：`outer` 里嵌套函数体（闭包 / 对象方法）中的赋值不算候选——那段代码运行期
 *   未必执行、也未必是交出去的那一份（`render(){ …; return view }` 却让另一个方法改 `view`）；
 * - **位置无关**：在函数体 / `vNode` 的 setup / 组件对象的 `render()` 里都走同一条定位规则，
 *   `outer` 就是"名字声明在外面那一层"的语句（`const view = …` 写在组件体、`render()` 只交出它）；
 * - **被读不构成拒绝理由**：`view.attr(…)` 是运行期操作，编译只负责把那段块换成等价产物，
 *   并由调用方按 `needsNodeProduct` 选通道（被读过 → 产物必须是节点，元素通道的 `{ el, … }` 撑不起）。
 */
export function resolveElementBlock(expression, statements, { outer = [] } = {}) {
  if (expression === null || expression === undefined) {
    return null;
  }
  if (expression.type !== 'Identifier') {
    return expression;
  }

  const name = expression.name;
  const searchStatements = [...statements, ...outer];
  const declarators = searchStatements
    .filter((statement) => statement.type === 'VariableDeclaration' && statement.kind !== 'var')
    .flatMap((statement) => statement.declarations)
    .filter((declarator) => declarator.id.type === 'Identifier' && declarator.id.name === name);
  if (declarators.length !== 1) {
    return null;
  }
  const declarator = declarators[0];

  // 候选：非空初始化器 + 同层对同一名字的赋值（`view = …`）
  const assignments = [];
  const collectAssignments = (node) => {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(collectAssignments);
      return;
    }
    if (
      node.type === 'AssignmentExpression' &&
      node.operator === '=' &&
      node.left.type === 'Identifier' &&
      node.left.name === name
    ) {
      assignments.push(node);
      return;
    }
    if (NESTED_FUNCTION_TYPES.has(node.type)) {
      return; // 嵌套函数体不在"同层"里：里面的赋值运行期未必执行，不能当"那一块"
    }
    Object.keys(node).forEach((key) => {
      if (key === 'loc' || key === 'start' || key === 'end' || key === 'type') {
        return;
      }
      collectAssignments(node[key]);
    });
  };
  searchStatements.forEach(collectAssignments);

  const hasRealInit =
    declarator.init !== null &&
    declarator.init !== undefined &&
    declarator.init.type !== 'NullLiteral' &&
    !(declarator.init.type === 'Identifier' && declarator.init.name === 'undefined');
  const candidates = [
    ...(hasRealInit ? [declarator.init] : []),
    ...assignments.map((assignment) => assignment.right)
  ];
  if (candidates.length === 0) {
    return null;
  }
  // 取源码顺序最后的候选（最后一次赋值就是运行期真正生效的那份）
  return candidates.reduce((latest, candidate) =>
    candidate.start > latest.start ? candidate : latest
  );
}

/**
 * 这个名字在整棵函数里**有没有被读过**（声明名与赋值左值都不算"读"）。
 *
 * 用于决定产物形态：被读过 → 原文会对它做运行期操作（`view.attr(…)` / `view._el` / 当子节点传出去），
 * 产物就必须是**节点**（节点通道）；没人动它 → 可以走元素通道的轻量产物 `{ el, … }`。
 * 这不是"能不能编"的判据，只影响通道选择。
 */
export function aliasReadElsewhere(name, fn, ignoredNode = null) {
  if (typeof name !== 'string' || name.length === 0) {
    return false;
  }
  let reads = 0;
  const visit = (node) => {
    if (!node || typeof node !== 'object' || reads > 0) {
      return;
    }
    if (node === ignoredNode) {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    switch (node.type) {
      case 'Identifier':
        if (node.name === name) {
          reads += 1;
        }
        return;
      case 'VariableDeclarator':
        visit(node.init);
        return;
      case 'AssignmentExpression':
        // 左值是对这个变量的简单赋值 = 写，不算读；其余左值（`view.attr = …`）算读
        if (!(node.left.type === 'Identifier' && node.left.name === name)) {
          visit(node.left);
        }
        visit(node.right);
        return;
      case 'MemberExpression':
        visit(node.object);
        if (node.computed) {
          visit(node.property);
        }
        return;
      case 'ObjectProperty':
        if (node.computed) {
          visit(node.key);
        }
        visit(node.value);
        return;
      default:
        Object.keys(node).forEach((key) => {
          if (key === 'loc' || key === 'start' || key === 'end' || key === 'type') {
            return;
          }
          visit(node[key]);
        });
    }
  };
  visit(fn);
  return reads > 0;
}

/**
 * 这个名字能不能作为绑定名：`arguments` / `eval`（严格模式）与关键字都不行，
 * `new.target` / `import.meta` 这类元属性被拆出来的名字也在其中。
 *
 * 产物把自由标识符收进 `scope` 后再解构出来，所以非绑定名会让产物**语法错误**
 * （`const { arguments } = scope;`）；而且 `arguments` / `new.target` 的语义依赖调用形态，
 * 逐字复刻不了——两种都只能整形状回落（票 21 的边界）。
 */
export function isBindableName(name) {
  if (typeof name !== 'string' || name.length === 0) {
    return false;
  }
  try {
    parse(`let ${name} = 0;`, { sourceType: 'module' });
    return true;
  } catch {
    return false;
  }
}

/** 解构 / 默认值 / rest → 绑定名（声明与形参共用）。 */
function collectPatternNamesInto(pattern, out) {
  if (!pattern || typeof pattern !== 'object') {
    return;
  }
  switch (pattern.type) {
    case 'Identifier':
      out.add(pattern.name);
      return;
    case 'ObjectPattern':
      pattern.properties.forEach((property) =>
        collectPatternNamesInto(
          property.type === 'RestElement' ? property.argument : property.value,
          out
        )
      );
      return;
    case 'ArrayPattern':
      pattern.elements.forEach((element) => collectPatternNamesInto(element, out));
      return;
    case 'AssignmentPattern':
      collectPatternNamesInto(pattern.left, out);
      return;
    case 'RestElement':
      collectPatternNamesInto(pattern.argument, out);
  }
}

/** 模式里有没有默认值（`{ a = F }` / `[a = F]`）——默认值要在产物里求值，逻辑帧本轮不收。 */
function hasDefaultInPattern(pattern) {
  if (!pattern || typeof pattern !== 'object') {
    return false;
  }
  switch (pattern.type) {
    case 'Identifier':
      return false;
    case 'AssignmentPattern':
      return true;
    case 'ObjectPattern':
      return pattern.properties.some((property) =>
        hasDefaultInPattern(property.type === 'RestElement' ? property.argument : property.value)
      );
    case 'ArrayPattern':
      return pattern.elements.some(hasDefaultInPattern);
    case 'RestElement':
      return hasDefaultInPattern(pattern.argument);
    default:
      return true;
  }
}

/** 简单模式：标识符，或只有标识符 / rest 的解构（计算键、嵌套默认值都不算）。 */
function isPlainPattern(pattern) {
  if (!pattern || typeof pattern !== 'object') {
    return false;
  }
  switch (pattern.type) {
    case 'Identifier':
      return true;
    case 'ObjectPattern':
      return pattern.properties.every((property) => {
        if (property.computed) {
          return false;
        }
        return property.type === 'RestElement'
          ? property.argument.type === 'Identifier'
          : isPlainPattern(property.value);
      });
    case 'ArrayPattern':
      return pattern.elements.every((element) => element === null || isPlainPattern(element));
    case 'RestElement':
      return pattern.argument.type === 'Identifier';
    default:
      return false;
  }
}

/** 每处声明的计数（同名声明出现两次 → 逻辑帧提升会改语义）。 */
function declarationCountMap(fn) {
  const counts = new Map();
  const bump = (name) => counts.set(name, (counts.get(name) ?? 0) + 1);
  const visit = (node) => {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (node.type === 'VariableDeclarator') {
      const names = new Set();
      collectPatternNamesInto(node.id, names);
      names.forEach(bump);
      visit(node.init);
      return;
    }
    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression'
    ) {
      node.params?.forEach((param) => {
        const names = new Set();
        collectPatternNamesInto(param, names);
        names.forEach(bump);
      });
    }
    if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
      if (node.id?.name) {
        bump(node.id.name);
      }
      return;
    }
    Object.keys(node).forEach((key) => {
      if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') {
        return;
      }
      const value = node[key];
      if (value && typeof value === 'object') {
        visit(value);
      }
    });
  };
  visit(fn.body);
  return counts;
}

/**
 * 这个 import 来源算不算"库的入口"。
 *
 * 除了 core 子入口，也要认**包根 / 仓库内入口**（`@yoyaflow/yoya-ui`、`../index.js`、
 * `yoya.ui.js` 这类）——仓库里的示例与业务就是这么导入元素工厂的；只有"别处模块的同名导入"
 * （裸包名、或 `./my-utils.js` 这种非入口相对路径）才算遮蔽。
 *
 * 仓库内**核心子系统**（`../core/v-node.js` / `../../core/signals/handle.js` 这类）也算核心口径：
 * 库源码自己就是这么导入 `vNode` / `keyed` 的；不认它会把这些名字误判成"别处模块的同名导入"，
 * 于是整条分析走错分支（实测 `VTable` 的 bail 会从"真实的 vTableScroll 未链接"变成
 * "调用链不是从 setup 参数出发"这类假象）。
 */
/**
 * 模块里的**快捷名索引**（票 15 §Q4）：`const vXxx = createComponentShortcut(VXxx)`
 * （含 `export const`）→ `{ vXxx: 'VXxx' }`。
 *
 * 组件库里"定义名 = 身份、快捷名 = 调用面"，编译器按定义名登记单元；调用点却几乎都写快捷名。
 * 这份索引把两者对上：注册表按它补别名条目，调用点按它找到定义单元。
 * 认不出（别名链 / 变量改名 / 别处模块的工厂）就不登记——照旧回落。
 */
export function shortcutDefinitionsOf(ast) {
  const shortcuts = new Map();
  ast.program.body.forEach((statement) => {
    const inner = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
    if (inner?.type !== 'VariableDeclaration') {
      return;
    }
    inner.declarations.forEach((declarator) => {
      const init = declarator.init;
      if (
        declarator.id.type !== 'Identifier' ||
        init?.type !== 'CallExpression' ||
        init.callee.type !== 'Identifier' ||
        init.callee.name !== 'createComponentShortcut' ||
        init.arguments[0]?.type !== 'Identifier'
      ) {
        return;
      }
      shortcuts.set(declarator.id.name, init.arguments[0].name);
    });
  });
  return shortcuts;
}

export function isCoreLikeSpecifier(specifier) {
  if (typeof specifier !== 'string' || specifier.length === 0) {
    return false;
  }
  if (specifier === '@yoyaflow/yoya-ui' || specifier.startsWith('@yoyaflow/yoya-ui/')) {
    return true;
  }
  if (/(^|\/)core\/[\w.-]+\.js$/.test(specifier)) {
    return true;
  }
  return /(^|\/)(index|yoya\.[\w.-]+)\.js$/.test(specifier);
}

/**
 * 目标函数子树里的**局部声明名**（不含形参）：`const/let/var`、嵌套回调里的声明。
 *
 * 产物里不执行组件的函数体，所以这些名字**不能**被当成"运行期作用域依赖"——
 * 也就是说它们既不能进 `scope`（会读出 undefined），也不能被当成自由标识符。
 * 谁在值位置引用了它们，就整形状回落（见 emit 的 addExpression）。
 */
export function collectLocalDeclarations(fn) {
  const names = new Set();
  const visit = (node) => {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (node.type === 'VariableDeclarator') {
      collectPatternNamesInto(node.id, names);
      visit(node.init);
      return;
    }
    if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
      if (node.id?.name) {
        names.add(node.id.name);
      }
      return;
    }
    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') {
        continue;
      }
      const value = node[key];
      if (value && typeof value === 'object') {
        visit(value);
      }
    }
  };
  visit(fn.body);
  return names;
}

/**
 * 文件 + 目标函数里"这个名字已经被本地绑定"的集合（用于**元素工厂身份确认**）。
 *
 * 规则与 R15 的 `keyed` 同源：名字命中白名单还不够，还得确认这个名字指向的是库的 core 工厂——
 * 本地函数 / 变量 / 形参 / 非 core 模块的同名导入一律不算（否则 `function span(...)` 会被编成 `<span>`）。
 */
export function collectShadowedNames(ast, fn, imports) {
  const shadowed = new Set();

  ast.program.body.forEach((statement) => {
    const inner = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
    if (inner?.type === 'VariableDeclaration') {
      inner.declarations.forEach((declaration) =>
        collectPatternNamesInto(declaration.id, shadowed)
      );
      return;
    }
    if (inner?.type === 'FunctionDeclaration' && inner.id) {
      shadowed.add(inner.id.name);
      return;
    }
    if (inner?.type === 'ClassDeclaration' && inner.id) {
      shadowed.add(inner.id.name);
    }
  });

  imports.forEach((record, local) => {
    if (!isCoreLikeSpecifier(record.specifier)) {
      shadowed.add(local);
    }
  });

  fn.params.forEach((param) => collectPatternNamesInto(param, shadowed));
  collectLocalDeclarations(fn).forEach((name) => shadowed.add(name));
  // 嵌套回调的形参也算（`child(span => …)` 这类遮蔽）
  const visitParams = (node) => {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visitParams);
      return;
    }
    if (
      node.type === 'ArrowFunctionExpression' ||
      node.type === 'FunctionExpression' ||
      node.type === 'FunctionDeclaration'
    ) {
      node.params?.forEach((param) => collectPatternNamesInto(param, shadowed));
    }
    Object.keys(node).forEach((key) => {
      if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') {
        return;
      }
      const value = node[key];
      if (value && typeof value === 'object') {
        visitParams(value);
      }
    });
  };
  visitParams(fn.body);

  return shadowed;
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
  // `options.kind`（row / component）只影响产物形态，不再影响形参口径：两种单元的形参形状
  // 都由「复刻源码参数表 + 绑定名集合」同一条规则处理（票 21）。
  const whitelist = options.whitelist ?? new Set();
  const resolveComponent = options.resolveComponent ?? null;
  // 产物通道影响位置表：元素通道里 `child(<变量>)` 占一个文本位置，节点通道里它是运行期子节点
  const mode = options.mode ?? 'element';
  const bails = [];
  // `keyed(...)` 里的行工厂：作为**子单元**编译（合成源码由调用方落成模块）
  const rows = [];

  let ast;
  try {
    ast = parse(source, { sourceType: 'module' });
  } catch (error) {
    return { entry: null, bails: [{ reason: `源码解析失败：${error.message}`, at: null }] };
  }

  const slice = (node) => source.slice(node.start, node.end);
  const recordBail = (reason, node, code = null) => {
    bails.push({ reason, at: node ? slice(node).slice(0, 80) : null, ...(code ? { code } : {}) });
  };
  const imports = collectImports(ast);
  /** 模块级绑定的名字（import + 顶层 function / const）："洞"里的表达式要在产物里按名字拿到它们。 */
  const moduleLevelNames = new Set(Object.keys(imports));
  ast.program.body.forEach((statement) => {
    const inner = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
    if (inner?.type === 'FunctionDeclaration' && inner.id) {
      moduleLevelNames.add(inner.id.name);
      return;
    }
    if (inner?.type === 'VariableDeclaration') {
      inner.declarations.forEach((declarator) =>
        collectPatternNamesInto(declarator.id, moduleLevelNames)
      );
    }
  });
  // 「这个名字已经被本地绑定」集合：元素工厂身份确认靠它（本地函数 / 非 core 同名导入都不算工厂）
  const shadowed = new Set();
  /**
   * 工厂的**规范名**：本地名字 → 白名单里的名字。
   *
   * 本地名直接在白名单里就是它自己；别名导入（`import { div as box } from '<core 口径>'`）按
   * **导入名**归一 —— 于是产物里仍然用规范标签（`div`），不因为作者起了别名就编不出来或编错标签。
   * 认不出返回 null（第三方工厂要走"解析绑定 + 基础元素工厂标识"那条路，见票 21 §2.1.1，本轮未接）。
   */
  const canonicalFactoryNameOf = (name) => {
    if (shadowed.has(name)) {
      return null;
    }
    const record = imports.get(name);
    // 导入绑定优先：`import { div as text }` 这种"本地名撞上别的标签名"要以**导入名**为准，
    // 否则会把别名误当成同名标签（反过来 `import { text as t }` 也一样）。
    if (record && isCoreLikeSpecifier(record.specifier) && typeof record.imported === 'string') {
      return whitelist.has(record.imported) ? record.imported : null;
    }
    return whitelist.has(name) ? name : null;
  };
  const isFactory = (name) => canonicalFactoryNameOf(name) !== null;
  /**
   * 本地名 → **核心导出名**（只对 core 口径的导入生效；非导入名原样返回）。
   *
   * 与 `canonicalFactoryNameOf` 同一思路：作者的别名（`import { vNode as vnd }`）不该改变
   * 编译器认不认得出这段是核心契约——认的是**来源与导出名**，不是本地拼写。
   */
  const coreNameOf = (name) => {
    const record = imports.get(name);
    return record && isCoreLikeSpecifier(record.specifier) && typeof record.imported === 'string'
      ? record.imported
      : name;
  };
  // 静态值折叠：字面量之外，模块级字面量常量与库内主题助手也算「构建期就知道的值」
  const staticContext = createStaticContext(ast, imports);
  const staticOf = (node) => staticValueOf(node, staticContext);
  // 形态 C 的骨架：构造体里出现这些参数名的地方就是"调用方内容"（链接时走运行期回落）
  const contentParams = new Set();
  let hasContent = false;
  /**
   * 逻辑帧（票 04 的第一刀）：**根 setup** 里的局部声明提升到产物里按源码顺序执行。
   *
   * 只有根 builder 能提升：嵌套 setup 回调在产物里没有对应的闭包作用域（元素通道的嵌套写是
   * 就地展开的），提升过去会静默改变作用域。名字进 `frameNames` 后：值位置引用它们不再当作
   * 「局部变量」回落，同时算作已绑定名（**不进 scope**——产物自己声明了它们）。
   */
  const frameNames = new Set();
  /**
   * 嵌套 setup 回调的形参名（`root.span((cell) => …)` 里的 `cell`）：**节点对象**，不是值。
   * 值位置引用它们就整形状回落——产物里没有这些对象（元素通道里嵌套 setup 是就地展开的）。
   */
  const nestedParams = new Set();
  /**
   * 节点变量（别名）名字：`const body = root.div(…)` 里的 `body`。DSL 里链式调用返回**父节点**，
   * 所以别名指向的就是"当前节点"——它出现在链头时按当前节点分析，出现在值位置（`foo(body)`）时
   * 是"把节点对象当值用"，产物承载不了 → 回落。
   */
  const nodeAliases = new Set();
  /**
   * 结构锚点（票 04 第一刀）：`if` / `for…of` 里的**结构语句**提升成子单元，父片段里什么都不留，
   * 运行期按"片段里它后面的那个兄弟"当边界插回去。语句本身原样搬进产物，所以逻辑与位置写天然
   * 按源码顺序交织。
   */
  const controls = [];
  /** 逻辑帧判定用：被重新赋值的名字、同名声明计数（形参名由每层 setup 自带）。 */
  let declarationCounts = new Map();
  /**
   * 视图变量**被读过**（`view.attr(…)` 这类运行期操作）→ 产物必须是节点（节点通道）。
   * 这不是"能不能编"的判据，只影响通道选择（元素通道的产物是 `{ el, … }`）。
   */
  let needsNodeProduct = false;

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
      // 内容读不懂（返回 null）**或**内容自己的分析过程中记了 bail（例如回调里用了链式库内组件
      // `card.vCardBody(…)`）→ 都只是"不内联"：把 bail 撤回到进这一支之前，交给运行期回落。
      if (!ops || bails.length !== outerBails) {
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
  /**
   * **组件调用的摊平**（票 21 §2.1.6）：`card.vCardBody(args…)` / `child(vThing(args…))` 这类调用，
   * 只要被调用的是一段**薄工厂**（注册表条目 `product === 'element'`：函数体就是一段基础元素块、
   * 没有命令 / 状态 / 钩子），就把它摊成**当前节点下的一棵子结构**：
   * 定义自己的块先落位，调用方实参按 setup 分派就地编成那个元素上的 ops（回调 / 文本 / 元素工厂走
   * `contentArgumentOps`，对象字面量走 options 分派）。多个薄工厂拼的界面因此合成一棵树、一份片段。
   *
   * 认不出（实参是变量 / 条件表达式…、或条目不是薄工厂）返回 null —— 调用方照旧回落，不猜。
   */
  function flattenComponentCall(linked, args, call) {
    if (!linked || linked.product !== 'element' || !Array.isArray(linked.ops)) {
      return null;
    }
    const ops = [...linked.ops];
    for (const argument of args) {
      const optionsOps = [];
      if (
        argument.type === 'ObjectExpression' &&
        analyzeOptionsObject(argument, optionsOps, call)
      ) {
        ops.push(...optionsOps);
        continue;
      }
      const argOps = contentArgumentOps(argument);
      if (!argOps) {
        return null;
      }
      ops.push(...argOps);
    }
    return ops;
  }

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
      isFactory(argument.callee.name)
    ) {
      const elementOps = analyzeElementArguments(
        argument.arguments,
        argument.callee.name,
        argument
      );
      if (!elementOps) {
        return null;
      }
      return [
        {
          kind: 'element',
          factory: canonicalFactoryNameOf(argument.callee.name) ?? argument.callee.name,
          ops: elementOps
        }
      ];
    }

    return null;
  }

  /** 分析一条节点调用 → op（不认识就 bail 并跳过）。 */
  function classifyCall(call, ops, chain = { index: 0, length: 1 }) {
    const method = call.callee.property.name;
    const args = call.arguments;

    if (args.some((argument) => argument.type === 'SpreadElement')) {
      recordBail(`spread 参数（${method}）`, call);
      return;
    }

    // 核心节点能力 = **操作**（不是元素工厂）：`mountable` 只切换"在场 / 离场"，
    // 元素本身仍在片段里，所以按 op 发射（元素通道走 mountableAt，节点通道调用节点自己的方法）。
    if (method === 'mountable') {
      if (args.length !== 1) {
        recordBail(`mountable() 参数数量 ${args.length}`, call);
        return;
      }
      ops.push({ kind: 'liveMountable', expression: slice(args[0]) });
      return;
    }

    // `keyed(source, keyOf, rowFactory)` 也是操作：行工厂作为**子单元**编译（行结构走同一套行编译），
    // 运行期由列表对账接管（复用 / 原位重建 / 离场销毁 / 最小搬动 + 行的条件挂载）。
    if (method === 'keyed') {
      // 三参 `(source, keyOf, rowFactory)` 与两参 `(source, rowFactory)` 都认。
      // 两参的**键口径由核心决定**（`keyed(source, build)`）：keySet 源用容器自己的
      // `keyOf(item.data)`，信号源按行身份（对象键，因此不写 `data-row-key`）——
      // 运行期钩子照这条规则补出 keyFn，编译器不另立一套。
      if (args.length !== 3 && args.length !== 2) {
        recordBail(
          `keyed() 只支持 (source, keyOf, rowFactory) / (source, rowFactory)（收到 ${args.length} 个）`,
          call
        );
        return;
      }
      const twoArg = args.length === 2;
      const sourceArg = args[0];
      const keyArg = twoArg ? null : args[1];
      const rowArg = twoArg ? args[1] : args[2];
      const rowParams = rowArg?.params ?? [];
      const rowParam = rowParams[0];
      if (
        (rowArg?.type !== 'ArrowFunctionExpression' && rowArg?.type !== 'FunctionExpression') ||
        rowParam?.type !== 'Identifier' ||
        rowParams.length !== 1
      ) {
        recordBail('keyed() 的行工厂只支持单个标识符形参（index 等其它形参走通用路径）', call);
        return;
      }
      // 行工厂体只能是「一条 return」：块里还有别的语句时，合成源码会把它们丢掉——
      // 那是静默的语义变化（局部量变成产物读不到的游离标识符），所以整形状回落。
      let rowReturned = rowArg.body;
      if (rowArg.body.type === 'BlockStatement') {
        const body = rowArg.body.body;
        const onlyReturn = body.length === 1 && body[0].type === 'ReturnStatement' ? body[0] : null;
        if (!onlyReturn) {
          recordBail('keyed() 的行工厂体只能是一条 return（有其它语句走通用路径）', call);
          return;
        }
        rowReturned = onlyReturn.argument;
      }
      if (
        !rowReturned ||
        rowReturned.type !== 'CallExpression' ||
        rowReturned.callee.type !== 'Identifier'
      ) {
        recordBail('keyed() 的行工厂体不是单一 return 工厂调用', call);
        return;
      }
      const rowIndex = rows.length;
      const rowName = `__yoyaRow${rowIndex}`;
      // 合成一份"行构建函数"源码：带上模块级 import 与顶层 const（静态值折叠要用它们）
      const carried = ast.program.body
        .filter(
          (statement) =>
            statement.type === 'ImportDeclaration' ||
            (statement.type === 'VariableDeclaration' && statement.kind === 'const')
        )
        .map((statement) => source.slice(statement.start, statement.end));
      rows.push({
        index: rowIndex,
        fn: rowName,
        paramsSource: rowParam.name,
        source:
          `${carried.join('\n')}\n` +
          `export function ${rowName}(${rowParam.name}) {\n  return ${slice(rowReturned)};\n}\n`
      });
      ops.push({
        kind: 'keyedRows',
        source: slice(sourceArg),
        keyOf: keyArg ? slice(keyArg) : null,
        rowIndex
      });
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
      // 链式子工厂按**方法名**认（接收者是核心节点，与方法名是否被本地绑定无关）
      if (!whitelist.has(method)) {
        // **组件当父方法**（`card.vCardBody(…)` / `root.vCardHeader('标题')`，票 21 §2.1.6）：
        // 被调用的是薄工厂（一段块、无命令/状态）就**摊平**到当前节点下，实参按 setup 分派就地编成
        // 那个元素上的 ops —— 多个薄工厂拼的界面因此合成一棵树、一份片段。
        const linkedByMethod = resolveComponent?.(method, imports.get(method), call);
        // 只有"形参为空"的薄工厂才能按 setup 分派摊平：有形参时实参归形参帧（在函数体里被读），
        // 摊平会把 `props.x` 这类读法弄错 → 交给下面的回落。
        const flattenable =
          linkedByMethod &&
          typeof linkedByMethod.params === 'string' &&
          linkedByMethod.params.trim() === '';
        const flattened = flattenable ? flattenComponentCall(linkedByMethod, args, call) : null;
        if (flattened) {
          ops.push({ kind: 'element', factory: linkedByMethod.factory, ops: flattened });
          return;
        }
        // **认不出的父方法调用当"洞"**（`form.hstack(…)` / `row.vTd(…)`，票 21 §2.1.7）：
        // 方法名不认识没关系 —— 父方法就是通用路径那个注册过的快捷方法，**调它就是调通用路径本身**。
        // 产物里原样跑这条调用（接收者 = 当前节点），跑完把新加的子节点按边界摆位。
        // 唯一前提：这条调用是链的**最后一步**（后面还有 `.attr(…)` 之类落在返回节点上的步骤就回落）。
        // 组件级协议钩子（`whenMount` / `whenDestroy` / `whenFailed`）不算父方法：写在节点上是**用错位置**，
        // 通用路径会直接抛错——这种就照旧整体回落（拿构建期的明确报错，而不是把必然的类型错误推迟到运行期）。
        const isProtocolHook =
          method === 'whenMount' || method === 'whenDestroy' || method === 'whenFailed';
        const isLastStep = chain.index + 1 === chain.length;
        if (isLastStep && !isProtocolHook) {
          needsNodeProduct = true; // 洞里的值是节点 / 组件 → 产物必须是节点
          ops.push({
            kind: 'holeCall',
            method,
            args: args.map(slice),
            // 实参里的回调体也在这条调用里原样执行：里面**直接写**的名字同样要在发射期核一遍
            writes: writeTargetsOf(call)
          });
          return;
        }
        recordBail(`不是元素工厂（组件或未知 API）：${method}`, call);
        return;
      }
      const elementOps = analyzeElementArguments(args, method, call);
      if (elementOps) {
        ops.push({
          kind: 'element',
          factory: canonicalFactoryNameOf(method) ?? method,
          ops: elementOps
        });
      }
      return;
    }

    if (method === 'child') {
      if (args.length === 0) {
        recordBail('child() 参数数量 0', call);
        return;
      }
      // **多参**：`child(a, b)` 与"按顺序两条 `child(单个)`"同义（票 21 §2.1.9）——
      // 合成"单参 child"逐个走同一条分析，顺序与源码一致；任一个认不出就整体回落。
      if (args.length > 1) {
        for (const single of args) {
          classifyCall({ ...call, arguments: [single] }, ops, chain);
          if (bails.length > 0) {
            return;
          }
        }
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
          !isFactory(callee) && callee !== 'String' && coreNameOf(callee) !== 'vText';
        if (isComponentCallee) {
          // 注册表命中 → 链接（片段就地嵌入 + 运行期实例化）；未命中 → 今天的通用路径
          const linked = resolveComponent?.(callee, imports.get(callee), argument);
          // 产物是**组件节点**（vNode / 形态 B）：命令、钩子、身份都挂在包装上，摊平成裸元素
          // 就是静默丢语义（票 15）→ 调用点按"运行期子节点"处理：表达式原样进产物，组件符号走
          // scope（它自己的视图表达式已被就地替换，结构照旧吃编译产物）。
          if (linked?.product === 'node') {
            ops.push({ kind: 'childValue', expression: slice(argument) });
            return;
          }
          if (linked) {
            // 薄工厂（产物是元素、**定义没有形参**）+ 调用方实参：实参是"对这个元素的 setup 值"，
            // 按 setup 分派就地摊平（票 21 §2.1.6）；形参非空时实参归形参帧，走下面的链接路径。
            if (
              linked.product === 'element' &&
              typeof linked.params === 'string' &&
              linked.params.trim() === ''
            ) {
              const flattened = flattenComponentCall(linked, argument.arguments, call);
              if (flattened) {
                ops.push({ kind: 'element', factory: linked.factory, ops: flattened });
                return;
              }
            }
            // 形态 C 的骨架带内容位置：调用方内容能**构建期内联**就内联（片段 + 位置写），
            // 内联不了（动态值 / 认不出的写法 / 内容里用了链式库内组件）就留给运行期——
            // 产物里的**内容守卫**会让 `bind` 返回 null，调用方用原组件重建（DOM 仍逐字节一致，
            // 见 class-skeleton.test.js 的回落计数）。
            const content = inlineComponentContent(linked, argument.arguments);
            ops.push({
              kind: 'component',
              key: linked.key,
              hash: linked.hash,
              // 只有裸结构（`element`）能在发射期被摊平；`node` 是守卫用的第二道保险
              product: linked.product ?? null,
              entryFactory: linked.factory,
              entryOps: linked.ops,
              args: argument.arguments.map(slice),
              // 内联链接（插件路径）要按子组件的形参帧绑定实参：形参表原文 + 绑定名集合
              params: linked.params ?? null,
              paramNames: linked.paramNames ?? null,
              ...(content ? { content } : {})
            });
            return;
          }
          // `code` 给构建期插件看：这是「注册表里还没有这个组件」——定点编译时值得再等一轮。
          // **不**在这里当洞：这条 bail 是调用点链接的不动点信号（插件据此先编被引用组件再重试），
          // 换成"运行期子节点"会让链接永远等不到那一轮（票 07 的契约）。
          recordBail(`child() 里是组件调用（未编译）：${callee}`, call, 'unlinked-component');
          return;
        }

        // 白名单内的元素工厂当 child 参数（`cell.child(span({…}, (s) => …))`）：与前缀写法
        // `cell.span(…)` **同义**，所以走**同一套参数分析**（options 对象 / 回调 / 文本 / 动态实参），
        // 编成子元素——当成文本写就是静默误编。原先只认"第一个参数就是回调"，于是带 options 的
        // 写法（`span({ vn: 'X' }, (box) => …)`，库内到处都是）会被误判成不认识。
        if (isFactory(callee)) {
          const elementOps = analyzeElementArguments(argument.arguments, callee, argument);
          if (!elementOps) {
            return;
          }
          ops.push({
            kind: 'element',
            factory: canonicalFactoryNameOf(callee) ?? callee,
            ops: elementOps
          });
          return;
        }
      }
      if (argument.type === 'CallExpression' && argument.callee?.name === 'String') {
        ops.push({ kind: 'slotText', expression: slice(argument) });
        return;
      }
      if (argument.type === 'CallExpression' && coreNameOf(argument.callee?.name) === 'vText') {
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
      // 对象字面量：通用路径里 `child({…})` 直接抛 TypeError（只接受节点 / 字符串 / 数字 /
      // 句柄 / 组件），编成位置写就是静默误编 → 认出来就回落，让错误照旧冒出来
      if (argument.type === 'ObjectExpression') {
        recordBail('child() 收到对象：文本位置只接受字符串 / 数字 / 值句柄', argument);
        return;
      }
      // 其余表达式：字符串 / 数字 / 句柄 / 节点 / 组件 / 数组构建期都认不出来 → **运行期子节点**
      // （票 09：节点通道把值交给核心 `child()` 同一份分派，再按片段边界摆位；元素通道按
      //   "位置 = 一段文本"落地，收到节点时响亮报错）。
      ops.push({ kind: 'childValue', expression: slice(argument) });
      return;
    }

    if (method === 'attr') {
      // 对象形式（`attr({ 'aria-hidden': 'true', fill: 'none' })`）：与核心同一条口径——
      // 逐项走 `attr(名字, 值)`，顺序就是对象字面量的书写顺序。
      if (args.length === 1 && args[0].type === 'ObjectExpression') {
        for (const property of args[0].properties) {
          if (property.type !== 'ObjectProperty' || property.computed) {
            recordBail('attr() 对象形式里只有非计算键', call);
            return;
          }
          const key = property.key.name ?? property.key.value;
          if (typeof key !== 'string') {
            recordBail('attr() 对象形式的键不是字符串字面量', call);
            return;
          }
          const entryValue = staticOf(property.value);
          if (entryValue.literal) {
            ops.push({ kind: 'staticAttr', name: key, value: entryValue.value });
          } else {
            ops.push({ kind: 'dynamicAttr', name: key, expression: slice(property.value) });
          }
        }
        return;
      }
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
      // 参数按顺序摊成 op：字面量进片段，动态值走运行期**保序去重**的类名写
      // （节点通道 `node.className(expr)`、元素通道 `addClassText`，都与核心同一口径）。
      const names = [];
      const flushStatic = () => {
        if (names.length > 0) {
          ops.push({ kind: 'staticClass', names: [...names] });
          names.length = 0;
        }
      };
      for (const argument of args) {
        const literal = staticOf(argument);
        if (literal.literal) {
          if (typeof literal.value === 'string') {
            names.push(literal.value);
            continue;
          }
          recordBail('className() 字面量参数不是字符串', call);
          return;
        }
        flushStatic();
        ops.push({ kind: 'dynamicClass', expression: slice(argument) });
      }
      flushStatic();
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
      // 对象形式（`style({ height: '24px' })`）：核心里等价于 `styles(对象)` → 逐项 `style(名, 值)`
      if (args.length === 1 && args[0].type === 'ObjectExpression') {
        return classifyStylesObject(args[0], ops, call);
      }
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
      classifyStylesObject(args[0], ops, call);
      return;
    }

    recordBail(`未知节点方法 ${method}`, call);
  }

  /**
   * 逻辑帧：`const a = <表达式>;` / `let { a, b } = <表达式>;` 提升到产物里按源码顺序执行。
   *
   * 认不准就回落（绝不把不知道的东西搬进产物）：`var`、没有初始化、带默认值的解构、被重新赋值、
   * 初始化表达式里出现节点对象（setup 形参）或元素工厂（那是结构，不是值）、同名声明不止一处、
   * 嵌套 setup 里的声明——一律 bail。
   */
  function analyzeFrame(statement, ops, allowed, paramName) {
    /** 表达式里有没有"结构"：引用 setup 形参，或调用元素工厂（那都要走通用路径）。 */
    const structureRefIn = (expressionSource, setupParam) => {
      let expression;
      try {
        expression = parseExpression(expressionSource);
      } catch {
        return true; // 解析不了就不搬
      }
      let found = false;
      const visit = (node) => {
        if (found || !node || typeof node !== 'object') {
          return;
        }
        if (Array.isArray(node)) {
          node.forEach(visit);
          return;
        }
        if (
          node.type === 'Identifier' &&
          (node.name === setupParam || nodeAliases.has(node.name) || isFactory(node.name))
        ) {
          found = true;
          return;
        }
        Object.keys(node).forEach((key) => {
          if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') {
            return;
          }
          const value = node[key];
          if (value && typeof value === 'object') {
            visit(value);
          }
        });
      };
      visit(expression);
      return found;
    };

    if (!allowed) {
      recordBail('嵌套 setup 里的局部声明（本轮不提升，走通用路径）', statement);
      return;
    }
    if (statement.kind === 'var') {
      recordBail('var 声明（提升语义与产物内的块级声明不同）', statement);
      return;
    }

    const declared = new Set();
    const expressions = [];
    for (const declarator of statement.declarations) {
      const hasDefault = hasDefaultInPattern(declarator.id);
      if (hasDefault) {
        recordBail('解构默认值（默认值要在产物里求值，本轮不提升）', statement);
        return;
      }
      if (declarator.id.type !== 'Identifier' && !isPlainPattern(declarator.id)) {
        recordBail('局部声明的模式不是简单标识符 / 解构', statement);
        return;
      }
      if (!declarator.init) {
        recordBail('局部声明没有初始化表达式', statement);
        return;
      }
      collectPatternNamesInto(declarator.id, declared);
      expressions.push(slice(declarator.init));
    }

    // 初始化表达式里出现节点对象（setup 形参）/ 元素工厂调用 = 那是结构（或对节点的操作），不是一段值。
    // 注意只认**调用**：`label` / `span` 这类名字本身就是 HTML 标签名，光出现同名标识符不算结构
    // （`const text = \`${label}\`` 里的 `label` 是上一行的局部量）。
    if (expressions.some((source) => structureRefIn(source, paramName))) {
      recordBail('局部声明的初始化表达式里出现节点对象 / 元素工厂', statement);
      return;
    }
    // 同名声明不止一处：提升了就分不清读的是哪一份
    if ([...declared].some((name) => declarationCounts.get(name) !== 1)) {
      recordBail('局部名有不止一处声明（提升会改语义）', statement);
      return;
    }
    declared.forEach((name) => frameNames.add(name));
    ops.push({ kind: 'logic', source: slice(statement), declared: [...declared], expressions });
  }

  /**
   * `style({ … })` / `styles({ … })` 的对象形式：与核心同一条口径——逐项走 `style(名, 值)`，
   * 顺序就是对象字面量的书写顺序；键必须是字符串字面量，值静态就进片段、否则是动态样式。
   */
  function classifyStylesObject(objectExpression, ops, call) {
    for (const property of objectExpression.properties) {
      if (property.type !== 'ObjectProperty' || property.computed) {
        recordBail('style() / styles() 里只有非计算键', call);
        return;
      }
      const name = property.key.name ?? property.key.value;
      if (typeof name !== 'string') {
        recordBail('style() / styles() 里有非字面量键', call);
        return;
      }
      const value = staticOf(property.value);
      if (value.literal) {
        ops.push({ kind: 'staticStyle', name, value: value.value });
      } else {
        ops.push({ kind: 'dynamicStyle', name, expression: slice(property.value) });
      }
    }
  }

  /**
   * 逻辑语句（不是从节点出发的链）：声明 / 赋值 / 累加 / 普通调用 —— 原样搬进产物。
   * 认不准就回落：引用节点对象（setup 形参）或元素工厂调用都是"结构"，不能当值搬。
   */
  function isLogicStatement(expression, setupParam) {
    const check = expression.type === 'AssignmentExpression' ? expression.right : expression;
    let found = false;
    const visit = (node) => {
      if (found || !node || typeof node !== 'object') {
        return;
      }
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      // 节点对象（本层 setup 形参 / 任意嵌套 setup 形参）与元素工厂都算"结构"，不是一段值
      if (
        node.type === 'Identifier' &&
        (node.name === setupParam ||
          nestedParams.has(node.name) ||
          nodeAliases.has(node.name) ||
          isFactory(node.name))
      ) {
        found = true;
        return;
      }
      Object.keys(node).forEach((key) => {
        if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') {
          return;
        }
        const value = node[key];
        if (value && typeof value === 'object') {
          visit(value);
        }
      });
    };
    visit(check);
    return !found;
  }

  /**
   * 一条语句是不是"从当前节点加结构"：返回描述（元素工厂 / 组件调用），否则 null。
   *
   * 组件形态 `node.child(<组件>(args))`：组件命中注册表时也能当锚点里的结构——运行期按注册表
   * 实例化（片段克隆 + 位置写 / 节点渲染），父片段里同样什么都不留。
   *
   * `node.child(<认不出的值>)`（字符串 / 值 / 句柄 / 节点 / 组件对象…）：**当洞**——语句在产物节点上
   * 原样跑（核心 `child()` 自己的分派），跑完把新加的子节点按边界摆回片段位置（票 21 §2.1.14）。
   */
  function structureStatementOf(item, paramName) {
    if (item.type !== 'ExpressionStatement') {
      return null;
    }
    const { calls, head } = flattenChain(item.expression);
    if (head?.type !== 'Identifier' || head.name !== paramName || calls.length !== 1) {
      return null;
    }
    const call = calls[0];
    const method = call.callee.property?.name;
    if (typeof method === 'string' && isFactory(method)) {
      return { kind: 'factory', method, call };
    }
    // `child(…)`：只有"单个实参 + 注册表命中的组件调用"能原地实例化；其余一律当洞（见上）。
    // 零参 `child()` 通用路径本身就是空操作 / 报错，不在这儿编。
    if (method === 'child' && call.arguments.length > 0) {
      const argument = call.arguments.length === 1 ? call.arguments[0] : null;
      if (
        argument?.type === 'CallExpression' &&
        argument.callee?.type === 'Identifier' &&
        resolveComponent
      ) {
        const linked = resolveComponent(
          argument.callee.name,
          imports.get(argument.callee.name),
          argument
        );
        // 只有**文件注册表条目**才能在锚点里实例化：它带 `plan.html` + `hash`，运行期注册表模块
        // 对应地提供 `bind`（克隆片段 + 位置写）。插件内存里的同模块条目只有编译期数据、没有运行期
        // 入口 → 不认，改当洞（交回运行期，与通用路径同源）。
        if (linked && linked.plan?.html && typeof linked.hash === 'string' && linked.hash) {
          return { kind: 'component', linked, call: argument };
        }
      }
      return { kind: 'hole', method: 'child', call };
    }
    return null;
  }

  /**
   * `array.forEach((item, index) => { … })`：与控制流同一套（语句原样、结构提升成子单元、
   * 按项插回锚点）。只认**块体**回调，且回调里必须有从当前节点出发的结构语句。
   */
  function isForEachStatement(statement, paramName) {
    const expression = statement.expression;
    if (
      statement.type !== 'ExpressionStatement' ||
      expression?.type !== 'CallExpression' ||
      expression.callee?.type !== 'MemberExpression' ||
      expression.callee.computed ||
      expression.callee.property?.name !== 'forEach' ||
      expression.arguments.length !== 1
    ) {
      return false;
    }
    const callback = expression.arguments[0];
    if (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression') {
      return false;
    }
    // 回调体：块体（一串语句）或表达式体（`(item) => root.li(…)`）都认——后者会被包成块
    const statements =
      callback.body.type === 'BlockStatement'
        ? callback.body.body
        : [{ type: 'ExpressionStatement', expression: callback.body }];
    // 回调里至少有一条"从当前节点加结构"的语句，否则这只是一次普通遍历
    return statements.some((item) => structureStatementOf(item, paramName) !== null);
  }

  /**
   * 控制流语句（`if` / `for…of`）：语句**原样**搬进产物，里面的结构语句提升成子单元，
   * 在锚点位置插回去。
   *
   * 第一刀的边界（认不准整形状回落）：
   * - 只认根 builder 里的 `if` / `for…of`，块里不能再嵌控制流；
   * - 块里的链式语句必须**只往当前节点加一个子元素**（`body.div(…)`），其余链式语句
   *   （`body.className(…)` 这类条件写）本轮不编；
   * - 非链式语句（声明 / 赋值 / 调用）留在源码里当逻辑帧。
   */
  function analyzeControl(statement, ops, paramName, allowed) {
    if (!allowed) {
      recordBail('嵌套 setup 里的控制流语句（本轮不编）', statement);
      return;
    }

    const edits = [];
    // 这一层的节点句柄名（setup 形参 + 别名）：控制流语句整句搬进产物，里面的句柄名要一起换成
    // 产物句柄 `node`（与 §2.1.8 同一条规则），否则产物里是个没绑定的名字。
    const layerHandles = new Set(
      [paramName, ...nodeAliases].filter((name) => typeof name === 'string' && name.length > 0)
    );
    /** 表达体回调要包成块（`(item) => <结构>` → `(item) => { <实例化> }`），偏移相对语句起点。 */
    let bodyWrap = null;
    // 这段语句自己声明的名字（for-of 的循环变量 / 块里的声明）：它们在产物里是**局部量**，
    // 既是子单元帧的来源，也不是本产物的作用域依赖。
    const locals = new Set();
    const collectLocals = (item) => {
      if (item.type === 'VariableDeclaration') {
        item.declarations.forEach((declarator) => collectPatternNamesInto(declarator.id, locals));
        return;
      }
      if (item.type === 'ForOfStatement' || item.type === 'ForInStatement') {
        if (item.left.type === 'VariableDeclaration') {
          item.left.declarations.forEach((declarator) =>
            collectPatternNamesInto(declarator.id, locals)
          );
        } else if (item.left.type === 'Identifier') {
          locals.add(item.left.name);
        }
      }
    };
    let ok = true;
    const carried = ast.program.body
      .filter(
        (entry) =>
          entry.type === 'ImportDeclaration' ||
          (entry.type === 'VariableDeclaration' && entry.kind === 'const')
      )
      .map((entry) => source.slice(entry.start, entry.end));

    const analyzeStatements = (body) => {
      body.forEach((item) => {
        collectLocals(item);
        if (!ok) {
          return;
        }
        if (item.type !== 'ExpressionStatement') {
          // 非链式语句 = 逻辑帧，留在源码里；但里面**不能**再有结构（`root.div(…)` 在产物里
          // 没有 `root` 这个对象）——认出来就整形状回落
          if (!isLogicStatement(item, paramName)) {
            recordBail('条件 / 循环里的语句含结构（本轮不编）', item);
            ok = false;
          }
          return;
        }
        const { calls, head } = flattenChain(item.expression);
        const fromNode = head?.type === 'Identifier' && head.name === paramName;
        if (!fromNode) {
          if (!isLogicStatement(item.expression, paramName)) {
            recordBail('条件 / 循环里的语句含结构（本轮不编）', item);
            ok = false;
          }
          return; // 逻辑语句（赋值 / 非节点调用）：留在源码里
        }
        const structure = structureStatementOf(item, paramName);
        if (!structure) {
          const method = calls[0]?.callee.property?.name;
          recordBail(
            calls.length !== 1
              ? '条件 / 循环里的链式语句不止一步（只认"加一个子元素"）'
              : `条件 / 循环里只支持加结构（收到 ${String(method)}）`,
            item
          );
          ok = false;
          return;
        }
        const edit = {
          start: item.start - statement.start,
          end: item.end - statement.start
        };
        if (structure.kind === 'hole') {
          // 条件 / 循环里的 `child(<认不出的值>)`：语句在产物节点上原样跑（核心 `child()` 自己的
          // 分派），跑完按边界摆位。元素通道没有节点对象 → 这个单元必须有节点产物（票 21 §2.1.14）。
          needsNodeProduct = true;
          edit.hole = { method: structure.method, args: structure.call.arguments.map(slice) };
          edits.push(edit);
          return;
        }
        if (structure.kind === 'component') {
          // 组件调用当结构：父片段里什么都不留，运行期按注册表实例化（片段克隆 + 位置写）
          edit.component = {
            key: structure.linked.key,
            hash: structure.linked.hash ?? null,
            args: structure.call.arguments.map(slice)
          };
          edits.push(edit);
          return;
        }
        // 子单元 = 这一段结构本身：去掉父节点引用，换成独立工厂调用（`body.div(…)` → `div(…)`）
        const unitText = source.slice(structure.call.callee.property.start, structure.call.end);
        // 子单元是**另一个模块**：它里面要是还引用这一层的节点句柄（`body.div((d) => d.child(body))`），
        // 产物里没有这个对象 → 整形状回落（绝不产出引用未绑定名字的产物）。
        if (
          nodeHandleRanges(structure.call, layerHandles).some(
            ([start]) => start >= structure.call.callee.property.start && start < structure.call.end
          )
        ) {
          recordBail('条件 / 循环里的子结构引用了外层节点句柄（子单元是另一个模块）', item);
          ok = false;
          return;
        }
        const unitIndex = controls.length;
        const fn = `__yoyaCtl${unitIndex}`;
        controls.push({
          index: unitIndex,
          fn,
          factory: canonicalFactoryNameOf(structure.method) ?? structure.method,
          source:
            `${carried.join('\n')}\n` +
            `export function ${fn}(__frame) {\n` +
            `  return ${unitText};\n` +
            `}\n`
        });
        edit.unit = unitIndex;
        edits.push(edit);
      });
    };
    /** 块 / 单语句 → 语句列表（`if` 的分支可能是单语句）。 */
    const analyzeBlock = (block) => {
      if (!ok || !block) {
        return;
      }
      analyzeStatements(block.type === 'BlockStatement' ? block.body : [block]);
    };

    if (statement.type === 'IfStatement') {
      analyzeBlock(statement.consequent);
      analyzeBlock(statement.alternate);
    } else if (statement.type === 'ForOfStatement') {
      // 循环变量属于循环语句本身（不在 body 块里）
      collectLocals(statement);
      analyzeBlock(statement.body);
    } else {
      // `array.forEach((item) => { <结构> })` / `(item) => <结构>`：与控制流同一套——
      // 语句原样，结构按项实例化。表达式体要把回调体**包成块**（替换进去的是语句）。
      const callback = statement.expression.arguments[0];
      callback.params.forEach((param) => collectPatternNamesInto(param, locals));
      if (callback.body.type === 'BlockStatement') {
        analyzeBlock(callback.body);
      } else {
        // 偏移与 `edits` 同一条约定：相对**语句起点**（`source` 是整条语句的切片）
        bodyWrap = {
          start: callback.body.start - statement.start,
          end: callback.body.end - statement.start
        };
        analyzeStatements([
          {
            type: 'ExpressionStatement',
            expression: callback.body,
            // 合成语句要带上原范围：edits 的偏移全靠它算
            start: callback.body.start,
            end: callback.body.end
          }
        ]);
      }
    }
    if (!ok) {
      return;
    }
    // 控制语句里的局部量：与逻辑帧的声明同一口径（已绑定、不进 scope）
    locals.forEach((name) => frameNames.add(name));
    // 句柄名改名：并进 `edits` 一起应用（落到结构替换区间里的"链头"不用换——那段文本整个被换掉了）
    if (layerHandles.size > 0) {
      nodeHandleRanges(statement, layerHandles)
        .filter(
          ([start, end]) =>
            !edits.some(
              (edit) => start - statement.start >= edit.start && end - statement.start <= edit.end
            )
        )
        .forEach(([start, end]) =>
          edits.push({
            start: start - statement.start,
            end: end - statement.start,
            rename: HARNESS_NODE_PARAM
          })
        );
    }
    ops.push({
      kind: 'control',
      source: slice(statement),
      edits,
      bodyWrap,
      // 这一层的节点句柄名：发射期算自由标识符时要按它们做边界（产物里已经换成 `node` 了）
      handles: [...layerHandles],
      // 语句里**本层声明的名字**（循环变量 / 块内声明）：发射期按它们做边界，算自由标识符时不算外层的
      locals: [...locals],
      // 语句**头部**的表达式（`if (test)` / `for…of (right)` / `forEach(...)` 的调用）：里面的自由标识符
      // （`definitions.forEach(…)` 里的模块级常量这类）要进 scope。表达式体（函数体）里的名字由各自的
      // 逻辑帧 / 结构语句自己登记，不在这里重复。
      expressions: [
        statement.type === 'IfStatement'
          ? slice(statement.test)
          : statement.type === 'ForOfStatement'
            ? slice(statement.right)
            : slice(statement.expression)
      ],
      // 语句里**直接写**的名字：与逻辑帧同一条规矩（scope 里的是值，写不回去 → 发射期回落）
      writes: writeTargetsOf(statement)
    });
  }

  /**
   * 节点变量（别名）声明：`const body = root.div((d) => …)` / `const x = root.attr('a', 'b')`。
   *
   * **DSL 口径**：链式子工厂返回的是**父节点**（`registerChildFactories`：`this.child(factory(…))`），
   * 节点自身的写也返回 `this`——所以别名永远等于"**当前节点**"，不是新建出来的那个子元素。
   * 于是别名声明按普通链式语句处理（结构 / 写都留在原位），只是把名字登记进 `aliases`，
   * 之后 `body.*` 的链照常分析（宿主就是当前节点）。
   *
   * 取回值的那几种调用（`className()` / `style('x')` / `attr('x')`）返回的不是节点 → 不当别名，
   * 交给普通声明路径（值位置引用节点对象会回落）。
   */
  function analyzeAlias(statement, paramName, ops, aliases) {
    if (statement.type !== 'VariableDeclaration' || statement.kind === 'var') {
      return false;
    }
    if (statement.declarations.length !== 1) {
      return false;
    }
    const declarator = statement.declarations[0];
    if (declarator.id.type !== 'Identifier' || !declarator.init) {
      return false;
    }
    if (declarator.init.type !== 'CallExpression') {
      return false;
    }
    const { calls, head } = flattenChain(declarator.init);
    if (
      head?.type !== 'Identifier' ||
      (head.name !== paramName && !nodeAliases.has(head.name)) ||
      calls.length === 0
    ) {
      return false;
    }

    // 最后一跳必须"返回节点"：取回值的形式（`className()` / `style('x')` / `attr('x')`）不是别名
    const last = calls[calls.length - 1];
    const lastMethod = last.callee.property?.name;
    const argCount = last.arguments.length;
    const returnsNode =
      isFactory(lastMethod) ||
      lastMethod === 'styles' ||
      lastMethod === 'toggleClass' ||
      lastMethod === 'on' ||
      lastMethod === 'mountable' ||
      lastMethod === 'child' ||
      lastMethod === 'keyed' ||
      ((lastMethod === 'attr' || lastMethod === 'style') &&
        (argCount === 2 || last.arguments[0]?.type === 'ObjectExpression')) ||
      ((lastMethod === 'className' || lastMethod === 'class') && argCount > 0);
    if (!returnsNode) {
      return false;
    }

    let bad = false;
    calls.forEach((call) => {
      const method = call.callee.property?.name;
      if (typeof method !== 'string' || (!isFactory(method) && !NODE_API.has(method))) {
        recordBail(`节点变量声明里有不认识的调用：${String(method)}`, statement);
        bad = true;
        return;
      }
      classifyCall(call, ops);
    });
    if (bad) {
      return true;
    }
    aliases.add(declarator.id.name);
    return true;
  }

  /** 分析一个 setup 回调：block 体或表达式体（链式调用）都支持。 */
  /** 产物里节点句柄的固定名字：节点模式的每个节点构建闭包都是 `(node) => …`（见 emit.js）。 */
  const HARNESS_NODE_PARAM = 'node';

  /** 一条语句里出现过的标识符名字（判断"有没有引用当前节点"）。 */
  /**
   * 一条语句里**被写**的名字（`x = …` / `x += …` / `x++` / 解构赋值里的目标名）。
   *
   * 成员写（`state.root = node`）不算：`state` 是同一个对象引用，写进去就生效。只关心**直接写变量**
   * 的情况——那种写在产物里会落到 `scope` 解构出来的 `const` 上（抛错 / 写不回外层）。
   */
  function writeTargetsOf(node) {
    const found = new Set();
    const visit = (current) => {
      if (!current || typeof current !== 'object') {
        return;
      }
      if (Array.isArray(current)) {
        current.forEach(visit);
        return;
      }
      if (current.type === 'AssignmentExpression') {
        collectPatternNamesInto(current.left, found);
      } else if (current.type === 'UpdateExpression') {
        collectPatternNamesInto(current.argument, found);
      }
      Object.keys(current).forEach((key) => {
        if (key === 'loc' || key === 'start' || key === 'end' || key === 'type') {
          return;
        }
        visit(current[key]);
      });
    };
    visit(node);
    return [...found];
  }

  function statementNamesOf(node) {
    const names = [];
    const visit = (current) => {
      if (!current || typeof current !== 'object') {
        return;
      }
      if (Array.isArray(current)) {
        current.forEach(visit);
        return;
      }
      if (current.type === 'Identifier') {
        names.push(current.name);
        return;
      }
      Object.keys(current).forEach((key) => {
        if (key === 'loc' || key === 'start' || key === 'end' || key === 'type') {
          return;
        }
        visit(current[key]);
      });
    };
    visit(node);
    return names;
  }

  /**
   * 把语句里的**节点句柄名**换成产物里的句柄（`node`）：`rootNode = root;` → `rootNode = node;`、
   * `writeLink(element);` → `writeLink(node);`。只换"读"的位置（对象键 / 成员属性名不动，
   * 声明名不动）；其余文本原样搬（源码是唯一真源）。
   */
  function rewriteNodeHandles(statement, nodeNames, harness = HARNESS_NODE_PARAM) {
    const ranges = nodeHandleRanges(statement, nodeNames);
    let text = slice(statement);
    const base = statement.start;
    ranges
      .sort((left, right) => right[0] - left[0])
      .forEach(([start, end]) => {
        text = text.slice(0, start - base) + harness + text.slice(end - base);
      });
    return text;
  }

  /** 上面那套"只换读位置"的规则，返回**绝对区间**（供控制流把改名并进 edits 一起应用）。 */
  function nodeHandleRanges(statement, nodeNames) {
    const ranges = [];
    const visit = (current) => {
      if (!current || typeof current !== 'object') {
        return;
      }
      if (Array.isArray(current)) {
        current.forEach(visit);
        return;
      }
      switch (current.type) {
        case 'Identifier':
          if (nodeNames.has(current.name)) {
            ranges.push([current.start, current.end]);
          }
          return;
        case 'MemberExpression':
          visit(current.object);
          if (current.computed) {
            visit(current.property);
          }
          return;
        case 'ObjectProperty':
          if (current.computed) {
            visit(current.key);
          }
          visit(current.value);
          return;
        case 'VariableDeclarator':
          visit(current.init);
          return;
        default:
          Object.keys(current).forEach((key) => {
            if (key === 'loc' || key === 'start' || key === 'end' || key === 'type') {
              return;
            }
            visit(current[key]);
          });
      }
    };
    visit(statement);
    return ranges;
  }

  function analyzeSetup(fn, paramName, { staticOnly = false, frames = false } = {}) {
    const ops = [];
    const statements =
      fn.body.type === 'BlockStatement'
        ? fn.body.body
        : [{ type: 'ExpressionStatement', expression: fn.body }];

    for (const statement of statements) {
      if (!staticOnly && analyzeAlias(statement, paramName, ops, nodeAliases)) {
        continue;
      }
      if (statement.type === 'VariableDeclaration') {
        analyzeFrame(statement, ops, staticOnly ? false : frames, paramName);
        continue;
      }
      if (statement.type === 'IfStatement' || statement.type === 'ForOfStatement') {
        analyzeControl(statement, ops, paramName, staticOnly ? false : frames);
        continue;
      }
      if (
        !staticOnly &&
        frames &&
        statement.type === 'ExpressionStatement' &&
        isForEachStatement(statement, paramName)
      ) {
        analyzeControl(statement, ops, paramName, true);
        continue;
      }
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
          : head?.type === 'Identifier' &&
            // 别名（`const body = root.div(…)`）指向的就是当前节点——DSL 里链式调用返回父节点
            (head.name === paramName || nodeAliases.has(head.name));
      if (!fromNode) {
        // 语句级逻辑帧（赋值 / 累加 / 非节点的调用）：原样搬进产物、按源码顺序执行
        if (frames && !staticOnly && isLogicStatement(statement.expression, paramName)) {
          ops.push({
            kind: 'logic',
            source: slice(statement),
            declared: [],
            expressions: [slice(statement.expression)],
            // 这句话**直接写**了哪些名字：产物里这些名字是 `scope` 解构出来的 `const`
            // （组件体局部量 / 模块级名字），赋值要么抛错、要么写不回外层 → 发射期整形状回落。
            writes: writeTargetsOf(statement.expression)
          });
          continue;
        }
        // 引用了节点对象、但起点不是当前节点（`rootNode = root;` / `state.root = element;` /
        // `writeLink(element)` / `applyComponentSetup(root, value)`，票 21 §2.1.8）：
        // **当洞**——这句话原样留到运行期执行（它只是存句柄 / 写 state / 交给助手改节点，
        // 不改变当前这棵树的结构，位置无需补），只把**节点参数名换成产物里的句柄 `node`**。
        // 产物因此必须是节点（`needsNodeProduct`）；真加子节点的情况由 `mountRuntimeChildrenFrom` 补位。
        if (
          frames &&
          !staticOnly &&
          statementNamesOf(statement.expression).some(
            (name) => name === paramName || nodeAliases.has(name)
          )
        ) {
          needsNodeProduct = true;
          const expression = rewriteNodeHandles(
            statement.expression,
            new Set([paramName, ...nodeAliases]),
            HARNESS_NODE_PARAM
          );
          ops.push({
            kind: 'logic',
            source: `${expression};`,
            declared: [],
            expressions: [expression],
            writes: writeTargetsOf(statement.expression)
          });
          continue;
        }
        recordBail('调用链不是从 setup 参数出发', statement);
        continue;
      }
      const before = ops.length;
      for (let index = 0; index < calls.length; index += 1) {
        classifyCall(calls[index], ops, { index, length: calls.length });
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
  function analyzeElementArguments(args, factoryName, call, options = {}) {
    const elementOps = [];
    let hasSetup = false;
    // 根 setup 之外的 setup 回调都是**嵌套**的：它的形参是节点对象，值位置引用即回落
    const nested = options.frames !== true;

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
        if (nested) {
          nestedParams.add(param);
        }
        // 嵌套 setup 里同样允许逻辑帧（声明 / 控制流）——它们**就在那个嵌套结构里**执行
        elementOps.push(...analyzeSetup(argument, param, { frames: true }));
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
      if (argument.type === 'CallExpression' && coreNameOf(argument.callee?.name) === 'vText') {
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

      // **动态实参**：认不出运行期类型（字符串 / 句柄 / 数组 / options / 回调……）。
      // 只有它**是最后一个参数**时才收：先出现的静态子节点已经进片段，运行期追加在它们后面，
      // 顺序与源码一致；若后面还有参数就会插错位 → 整形状回落。节点通道用核心的参数分派落地；
      // 元素通道没有节点对象、认不出类型 → 由发射器明确回落。
      if (args.indexOf(argument) !== args.length - 1) {
        recordBail(`子工厂 ${factoryName} 的动态实参后面还有参数（顺序无法保证）`, call);
        return null;
      }
      elementOps.push({ kind: 'dynamicArg', expression: slice(argument) });
    }

    return elementOps;
  }

  /**
   * options 对象：与运行期同一张规则表 —— `attrs` / `style` / `class|className` / `children`
   * 各自归位，其余键按**属性**写（子工厂不参与分派）；值必须是字面量，否则 bail。
   *
   * 例外是 `...rest`（票 18）：字面量里出现 spread 时，整段 options 交给运行期那张**同一张**分类表
   * （元素通道 `applyRuntimeOptions` / 节点通道 `node.setup`），构建期**不 bake 任何键**——
   * 因为 `rest` 的键要到运行期才知道，且 `attrs` / `style` 是整包覆盖（对象字面量语义），
   * 构建期"静态与 rest 拼一份 JSON"必错。守卫见 `acceptRuntimeOptionsSpread`。
   */
  function analyzeOptionsObject(objectNode, elementOps, call) {
    const spreads = objectNode.properties.filter((property) => property.type === 'SpreadElement');
    if (spreads.length > 0) {
      if (!acceptRuntimeOptionsSpread(objectNode, spreads, call)) {
        return false;
      }
      elementOps.push({ kind: 'dynamicOptions', expression: slice(objectNode) });
      return true;
    }

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
   * `...rest` 的形状守卫（票 18 §3）：
   * - 非 spread 的键必须是静态键（计算键 / 方法 / getter 回落）；
   * - spread 源必须是标识符（`...rest`）或能进产物作用域的绑定名 —— 整段对象交给运行期，
   *   所以这里**不**拆键、**不**判断 rest 里有什么（`children` 也照通用路径的次序落位）。
   *
   * 口径说明（票 18 §2.2 修订）：`children` 从 props 解构出来、由结构落位是**写法建议**，
   * 不是编译器的硬守卫——否则 `{ caption, vThead: headSetup, ...rest }` 这种"不收 children 的组件"
   * 反而编不了。运行期合并两条通道都按"内容在结构之前"落位，等价性用例守着。
   */
  function acceptRuntimeOptionsSpread(objectNode, spreads, call) {
    for (const property of objectNode.properties) {
      if (property.type === 'SpreadElement') {
        continue;
      }
      if (property.type !== 'ObjectProperty' || property.computed) {
        recordBail('options 里有非静态键', call);
        return false;
      }
    }

    for (const spread of spreads) {
      if (spread.argument.type !== 'Identifier') {
        recordBail('options 的 spread 只认绑定名（`...rest`），认不出就整体回落', call);
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
    // 函数级绑定并入"已被本地绑定"集合：形参、函数体声明、嵌套回调形参。
    // 元素工厂身份确认据此拒绝"同名本地函数"，局部名也不会被当成运行期作用域依赖。
    collectShadowedNames(ast, fn, imports).forEach((name) => shadowed.add(name));
    const localNames = collectLocalDeclarations(fn);
    // 票 21：形参形状不再限制，产物**逐字复刻源码的参数表**。调用口径没变（行工厂 / 组件按
    // 一个实参调用），所以解构 / 默认值 / rest / 多参的语义与通用路径一致。
    //
    // 票 12 的 C1（`function buildRow({ data, api })` 把 data / api 收进 scope、运行期 undefined）
    // 由**绑定名集合**根治：形参里出现的名字都是已绑定名，永远不进 scope；只有默认值 / 计算键里的
    // 自由标识符才进（它们要在产物里求值）。
    const params = fn.params;
    const boundParams = new Set();
    const paramExpressions = [];
    params.forEach((param) => collectParamBindings(param, boundParams, paramExpressions, slice));

    // 逻辑帧（票 04 第一刀）的判定素材：形参名 / 被重新赋值的名字 / 每处声明的计数
    declarationCounts = declarationCountMap(fn);

    const statements = fn.body.type === 'BlockStatement' ? fn.body.body : [];
    let returned = fn.body;
    // 结构表达式的源码区间 + 形状：插件按它**就地替换**视图（组件体 / 命令 / 状态一行不动）
    let structure = null;
    if (fn.body.type === 'BlockStatement') {
      // 组件体允许"声明 / 表达式语句 + 末尾一条 return 视图"（票 10：实例变量那类前置语句）。
      // 与发现规则（discover.js 的 `returnedView`）同一条口径：控制流 / 多条 return 都不认，
      // 早退会让"那条 return 的视图"变成运行期才知道的事。
      const last = statements[statements.length - 1];
      const plainLeading = statements
        .slice(0, -1)
        .every(
          (statement) =>
            statement.type === 'VariableDeclaration' || statement.type === 'ExpressionStatement'
        );
      if (last?.type !== 'ReturnStatement' || !plainLeading) {
        recordBail('组件体只支持「声明 / 表达式语句 + 末尾一条 return 视图」', fn);
        return null;
      }
      // `const view = …; return view;`（票 21 §2.1 第 3 条）：按"唯一声明的初始化表达式"定位视图
      returned = resolveElementBlock(last.argument, statements);
      if (last.argument?.type === 'Identifier' && returned) {
        needsNodeProduct = aliasReadElsewhere(last.argument.name, fn, last.argument);
        // 视图句柄在函数体里**还被用过**（`view.attr(…)` 这类运行期操作）：产物必须在这条函数体里
        // **就地替换**那段块——包装路径（把源函数改名成 `XxxSource` 再转调产物）会把视图之外的语句
        // 一起丢掉，DOM 就与通用路径不一致了（票 21 §2.1.13）。
        if (needsNodeProduct) {
          structure = { shape: 'inline', start: returned.start, end: returned.end };
        }
      }
    }

    // 形态 B：`return { render() { return <工厂>(…) }, …命令 / 状态 }`
    // 其余成员原样留在源码里（`this` 语义因此不变），不再要求"只有 render 一个成员"。
    if (returned?.type === 'ObjectExpression') {
      const members = returned.properties ?? [];
      const render = members.find((member) => (member.key?.name ?? member.key?.value) === 'render');
      const renderBody = render?.type === 'ObjectMethod' ? render.body : render?.value?.body;
      const renderReturn =
        renderBody?.type === 'BlockStatement'
          ? resolveElementBlock(
              renderBody.body.find((item) => item.type === 'ReturnStatement')?.argument,
              renderBody.body,
              // 票 21 §2.1.10：`render(){ …; return view }` 里的名字可能声明在组件体里
              // （`const view = …` 写在 render 之外），所以把外层语句一并纳入定位范围。
              { outer: statements }
            )
          : renderBody;
      if (!renderReturn) {
        recordBail('组件对象的 render() 不是单一 return 视图', fn);
        return null;
      }
      structure = { shape: 'render', start: renderReturn.start, end: renderReturn.end };
      const renderReturnArgument =
        renderBody?.type === 'BlockStatement'
          ? renderBody.body.find((item) => item.type === 'ReturnStatement')?.argument
          : null;
      if (renderReturnArgument?.type === 'Identifier') {
        needsNodeProduct = aliasReadElsewhere(renderReturnArgument.name, fn, renderReturnArgument);
      }
      returned = renderReturn;
    }

    // vNode：`return vNode((api) => { …命令…; return <工厂>(…) })`
    // setup 里的命令赋值原样留在源码里（组件节点仍由 `vNode` 建），只替换视图表达式。
    else if (
      returned?.type === 'CallExpression' &&
      returned.callee.type === 'Identifier' &&
      coreNameOf(returned.callee.name) === 'vNode' &&
      !shadowed.has(returned.callee.name)
    ) {
      const setup = returned.arguments[0];
      const setupBody = setup?.body;
      const setupReturn =
        setupBody?.type === 'BlockStatement'
          ? resolveElementBlock(
              setupBody.body.find((item) => item.type === 'ReturnStatement')?.argument,
              setupBody.body
            )
          : setupBody;
      if (!setupReturn) {
        recordBail('vNode 组件的 setup 不是单一 return 视图', fn);
        return null;
      }
      structure = { shape: 'vNode', start: setupReturn.start, end: setupReturn.end };
      const setupReturnArgument =
        setupBody?.type === 'BlockStatement'
          ? setupBody.body.find((item) => item.type === 'ReturnStatement')?.argument
          : null;
      if (setupReturnArgument?.type === 'Identifier') {
        needsNodeProduct = aliasReadElsewhere(setupReturnArgument.name, fn, setupReturnArgument);
      }
      returned = setupReturn;
    }

    if (!returned || returned.type !== 'CallExpression' || returned.callee.type !== 'Identifier') {
      recordBail('函数体不是单个 return 工厂调用', fn);
      return null;
    }
    structure = structure ?? { shape: 'row', start: returned.start, end: returned.end };
    // 入口工厂与子工厂共用同一张参数分派表：`Factory(setup)` / `Factory(options, setup)` / 变参都认
    // 根 setup 的局部声明可以提升到产物（`frames: true`）；嵌套 setup 里不行（见 analyzeFrame）
    const ops = analyzeElementArguments(returned.arguments, returned.callee.name, returned, {
      frames: true
    });
    if (!ops) {
      return null;
    }
    // 提升到产物的名字：值位置引用它们不再算"引用局部变量"，也**不进 scope**（产物自己声明）
    // 歧义守卫：这个名字如果在模块级也有绑定（import / 模块级 const），产物里就分不清读的是哪一份
    // ——保守回落，绝不猜。
    const moduleBindings = new Set(Object.keys(imports));
    ast.program.body.forEach((statement) => {
      if (statement.type === 'VariableDeclaration') {
        statement.declarations.forEach((declarator) =>
          collectPatternNamesInto(declarator.id, moduleBindings)
        );
      }
    });
    frameNames.forEach((name) => {
      if (moduleBindings.has(name)) {
        recordBail(`局部名 ${name} 与模块级绑定同名（提升会分不清读哪一份）`, fn);
        return;
      }
      localNames.delete(name);
      boundParams.add(name);
    });
    if (bails.length > 0) {
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
      factory: canonicalFactoryNameOf(returned.callee.name) ?? returned.callee.name,
      builderParam,
      // 参数表原文（产物按它复刻签名）与形参绑定名（决定哪些名字不是作用域依赖）
      builderParams: params.map(slice).join(', '),
      boundParams,
      paramExpressions,
      localNames,
      structure,
      rows,
      controls,
      nestedParams,
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
    if (!isFactory(classEntry.factory)) {
      recordBail(`构造体起手不是白名单内的元素工厂：${classEntry.factory}`, klass);
      return { entry: null, bails };
    }

    classEntry.path = [];
    classEntry.hasContent = hasContent;
    assignPaths(classEntry.ops, [], mode);
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
  if (!isFactory(entry.factory)) {
    // **根是组件调用**（`return vstack(…)` / `return vCard(…)`）或未知 API：这一类**保持运行期**
    // （用户 2026-09-23 决定，见票 21 §6）。理由：没有"基础元素块"可摊平——要摊平就得把那个组件的块
    // 搬进来（前提是它自己是单一块薄工厂），而它自己的命令 / 状态又会跟着牵动，收益为零或为负。
    recordBail(`入口工厂不是元素：${entry.factory}（根是组件调用 → 保持运行期）`, builderFn);
    return { entry: null, bails };
  }

  entry.path = []; // 片段根就是行根
  assignPaths(entry.ops, [], mode);
  // `needsNodeProduct`：视图变量被读过 → 产物必须是节点（调用方据此换通道；见 aliasReadElsewhere）
  return { entry, bails, needsNodeProduct };
}

/** 按 document 顺序给每个子节点分配「父元素 childNodes 下标」路径。 */
function assignPaths(ops, basePath, mode = 'element') {
  let index = 0;
  for (const op of ops) {
    if (op.kind === 'element') {
      op.path = [...basePath, index];
      assignPaths(op.ops, op.path, mode);
      index += 1;
      continue;
    }
    if (
      op.kind === 'staticText' ||
      op.kind === 'slotText' ||
      op.kind === 'bindText' ||
      // `child(<变量>)`：元素通道里它是"一段文本"位置（片段里有占位），节点通道里是运行期子节点
      // （片段里什么都不留）→ 位置表按通道算
      (op.kind === 'childValue' && mode === 'element') ||
      op.kind === 'component'
    ) {
      op.path = [...basePath, index];
      // 调用点内联的组件内容挂在组件根之下：路径从组件的元素位置接着往下算
      if (op.kind === 'component' && op.content) {
        assignPaths(op.content.ops, op.path, mode);
      }
      index += 1;
    }
  }
}
