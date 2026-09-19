/**
 * 构建期结构分析：把一份 setupFunction DSL 源码读成「按执行顺序的节点调用」（ops）。
 *
 * 只读源码、不执行它——「源码是唯一真源」是这条路径的前提（没有 eval、没有 new Function）。
 * 认不出的构造一律记进 `bails`：调用方据此让**整个形状**回落通用路径，绝不猜、不丢节点。
 */
import { parse, parseExpression } from '@babel/parser';

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

/** 顶层找目标函数：函数声明或 `const fn = (…) => …` / `const fn = function () {}`。 */
export function findBuilderFunction(ast, name) {
  for (const statement of ast.program.body) {
    // `export function buildRow(…)` / `export const buildRow = …`
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
  const fnName = options.fn ?? 'buildRow';
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

  /** 分析一条节点调用 → op（不认识就 bail 并跳过）。 */
  function classifyCall(call, ops) {
    const method = call.callee.property.name;
    const args = call.arguments;

    if (args.some((argument) => argument.type === 'SpreadElement')) {
      recordBail(`spread 参数（${method}）`, call);
      return;
    }

    if (!NODE_API.has(method)) {
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
      const literal = literalOf(argument);
      if (literal.literal) {
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
            ops.push({
              kind: 'component',
              key: linked.key,
              hash: linked.hash,
              entryFactory: linked.factory,
              entryOps: linked.ops,
              args: argument.arguments.map(slice)
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
        // vText(x) 的「值」是 x：句柄 → 绑定，零参 reader → 派生，普通值 → 写一次
        ops.push({ kind: 'bindText', expression: slice(argument.arguments[0]) });
        return;
      }
      if (argument.type === 'ArrowFunctionExpression') {
        recordBail('child(() => …) 组件槽', call);
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
      const name = literalOf(args[0]);
      if (!name.literal || typeof name.value !== 'string') {
        recordBail('attr() 属性名不是字符串字面量', call);
        return;
      }
      const value = literalOf(args[1]);
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
        const literal = literalOf(argument);
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
      const name = literalOf(args[0]);
      if (!name.literal || typeof name.value !== 'string') {
        recordBail('toggleClass() 类名不是字符串字面量', call);
        return;
      }
      const value = literalOf(args[1]);
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
      const name = literalOf(args[0]);
      const value = literalOf(args[1]);
      if (args.length !== 2 || !name.literal || !value.literal) {
        recordBail('style() 只用「名字 + 字面量值」形式', call);
        return;
      }
      ops.push({
        kind: 'staticStyle',
        name: String(name.value),
        value: value.value
      });
      return;
    }

    recordBail(`未知节点方法 ${method}`, call);
  }

  /** 分析一个 setup 回调：block 体或表达式体（链式调用）都支持。 */
  function analyzeSetup(fn, paramName) {
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
      const { calls, head } = flattenChain(statement.expression);
      if (head?.type !== 'Identifier' || head.name !== paramName) {
        recordBail('调用链不是从 setup 参数出发', statement);
        continue;
      }
      for (const call of calls) {
        classifyCall(call, ops);
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

      const literal = literalOf(argument);
      if (literal.literal) {
        elementOps.push({
          kind: 'staticText',
          text: literal.value === null ? '' : String(literal.value)
        });
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

      if (key === 'attrs' && property.value.type === 'ObjectExpression') {
        for (const attr of property.value.properties) {
          const name = attr.key.name ?? attr.key.value;
          const attrValue = literalOf(attr.value);
          if (typeof name !== 'string' || !attrValue.literal) {
            recordBail('attrs 里有非字面量键值', call);
            return false;
          }
          elementOps.push({ kind: 'staticAttr', name, value: attrValue.value });
        }
        continue;
      } else if (key === 'style' && property.value.type === 'ObjectExpression') {
        for (const style of property.value.properties) {
          const name = style.key.name ?? style.key.value;
          const styleValue = literalOf(style.value);
          if (typeof name !== 'string' || !styleValue.literal) {
            recordBail('style 里有非字面量键值', call);
            return false;
          }
          elementOps.push({ kind: 'staticStyle', name, value: styleValue.value });
        }
        continue;
      }

      const value = literalOf(property.value);
      if (!value.literal) {
        recordBail(`options 的 ${String(key)} 值不是字面量`, call);
        return false;
      }

      if (key === 'class' || key === 'className') {
        elementOps.push({
          kind: 'staticClass',
          names: String(value.value).split(/\s+/).filter(Boolean)
        });
      } else if (key === 'children') {
        elementOps.push({
          kind: 'staticText',
          text: value.value === null ? '' : String(value.value)
        });
      } else if (typeof key === 'string' && !NODE_API.has(key)) {
        // 子工厂不参与 options 分派 → 按属性写（`{ slot: 't-head' }` / `{ title: 't' }`）
        elementOps.push({ kind: 'staticAttr', name: key, value: value.value });
      } else {
        recordBail(`options 的键 ${String(key)} 需要动态分派`, call);
        return false;
      }
    }

    return true;
  }

  function analyzeBuilder(fn) {
    const statements = fn.body.type === 'BlockStatement' ? fn.body.body : [];
    const returned =
      fn.body.type === 'BlockStatement'
        ? statements.find((statement) => statement.type === 'ReturnStatement')?.argument
        : fn.body;

    if (!returned || returned.type !== 'CallExpression' || returned.callee.type !== 'Identifier') {
      recordBail('函数体不是单个 return 工厂调用', fn);
      return null;
    }
    const setup = returned.arguments[0];
    if (
      !setup ||
      (setup.type !== 'ArrowFunctionExpression' && setup.type !== 'FunctionExpression')
    ) {
      recordBail('入口工厂不是 setup 回调形式', returned);
      return null;
    }
    const setupParam = setup.params[0]?.name;
    if (!setupParam) {
      recordBail('入口 setup 没有参数', setup);
      return null;
    }
    // 构建函数的形参（行数据，如 `row`）与 setup 形参（行根节点，如 `line`）都要绑定：
    // 前者出现在值表达式里，后者是调用链的起点。
    const builderParam = fn.params[0]?.name ?? 'row';
    return {
      factory: returned.callee.name,
      builderParam,
      setupParam,
      ops: analyzeSetup(setup, setupParam)
    };
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
      index += 1;
    }
  }
}
