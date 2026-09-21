/**
 * 组件发现（编译路径的**唯一**入口规则）：yoya-ui 自己的组件边界。
 *
 * - 大驼峰（`Card` / `StatusPill`）＝组件；
 * - 小驼峰里也是工厂函数的（`vBadge` 这类薄工厂、快捷工厂）＝同样算；
 * - 返回的不是 UI 视图（助手、命令、数据处理）→ 不算。
 *
 * 数据在业务里长什么样、叫什么名字，编译器一概不认识：它只看「顶层函数 + 返回视图」这个形状。
 * 通道（`element` / `node`）也按**用法**推断：进了 `keyed` 列表的组件走 `element`（最快），
 * 只被 `child(...)` 当组件调用的走 `node`（ViewNode 在 `child` 与 `keyed` 里都成立）。
 */
import { resolve } from 'node:path';
import { parse } from '@babel/parser';
import { elementWhitelistOf } from './compile.js';
const PACKAGE_CORE = '@yoyaflow/yoya-ui/core';
/** 统一的路径比较口径（打包器给的 id 可能是 Windows 分隔符）。 */
export const normalizePath = (path) => resolve(path).replace(/\\/g, '/');

/** 这个导入来源算不算「库的 core」：包路径、或仓库内的 yoya.core.js。 */
function isCoreSpecifier(specifier) {
  return (
    typeof specifier === 'string' &&
    (specifier === PACKAGE_CORE ||
      specifier.endsWith('/yoya-ui/core') ||
      specifier.endsWith('yoya.core.js'))
  );
}

/** 收集模块里「从 core 导入的元素工厂 / `vNode`」等名字：判定「返回的是不是视图」用。 */
function coreBindingsOf(ast, whitelist) {
  const bindings = new Map();
  ast.program.body.forEach((statement) => {
    if (statement.type !== 'ImportDeclaration' || !isCoreSpecifier(statement.source.value)) {
      return;
    }
    statement.specifiers.forEach((specifier) => {
      if (specifier.type !== 'ImportSpecifier') {
        return;
      }
      const imported = specifier.imported.name ?? specifier.imported.value;
      const local = specifier.local.name;
      if (whitelist.has(imported)) {
        bindings.set(local, 'element');
      } else if (imported === 'vNode') {
        bindings.set(local, 'vNode');
      } else if (imported === 'keyed') {
        bindings.set(local, 'keyed');
      } else if (imported === 'vText') {
        bindings.set(local, 'text');
      }
    });
  });
  return bindings;
}

/** 顶层函数声明（含 `export function`），返回 `{ node, statement, name }`。 */
export function topLevelFunctions(ast) {
  const found = [];
  ast.program.body.forEach((statement) => {
    const exported = statement.type === 'ExportNamedDeclaration';
    const inner = exported ? statement.declaration : statement;
    if (inner?.type === 'FunctionDeclaration' && inner.id?.name) {
      found.push({ exported, name: inner.id.name, node: inner, start: statement.start });
    }
  });
  return found;
}

/**
 * 函数体是不是「return 视图」：返回视图表达式本身或 null。
 *
 * 允许 return 之前有**声明 / 表达式语句**——组件体里先把组件实例存进变量（
 * `const liveDemo = demo.component()`）再在 render 里当子节点用，是文档页那批的主流形状；
 * 视图本身仍要求是**单一条 return 的工厂调用**（多语句 / 分支的结构留给通用路径）。
 * 控制流 / 嵌套函数声明一概不认：它们能让"那条 return 是不是唯一出口"变成运行期问题。
 */
function returnedView(fn) {
  if (fn.body.type !== 'BlockStatement') {
    return fn.body;
  }
  const statements = fn.body.body;
  const last = statements[statements.length - 1];
  if (last?.type !== 'ReturnStatement') {
    return null;
  }
  const plainLeading = statements
    .slice(0, -1)
    .every(
      (statement) =>
        statement.type === 'VariableDeclaration' || statement.type === 'ExpressionStatement'
    );
  return plainLeading ? last.argument : null;
}

/**
 * 这个表达式是不是一个 UI 视图（元素工厂调用 / vNode / 带 render() 的对象）。
 * 判定口径与编译器本体一致：**元素白名单**（core 注册的工厂名）就够，不强制模块里有 core import——
 * CLI / 覆盖率扫描的语料常常直接写 `tr(...)`，编译器的分析也是按白名单认的。
 */
function isViewExpression(expression, bindings, whitelist) {
  if (!expression) {
    return false;
  }
  if (expression.type === 'ObjectExpression') {
    return expression.properties.some(
      (property) =>
        property.type === 'ObjectMethod' && (property.key.name ?? property.key.value) === 'render'
    );
  }
  if (expression.type !== 'CallExpression') {
    return false;
  }
  if (expression.callee.type === 'Identifier') {
    const name = expression.callee.name;
    const kind = bindings.get(name);
    return (
      kind === 'element' ||
      kind === 'vNode' ||
      name === 'vNode' ||
      (kind === undefined && whitelist.has(name))
    );
  }
  // 组件之间的薄工厂：`Card(options)` 直接转调另一个（已发现的）工厂
  return expression.callee.type === 'Identifier';
}

/**
 * 收集模块里「接收者是核心元素工厂产出的节点」的标识符：`node.tbody((body) => …)` 的 `body`、
 * `const table = table(…)` 这类。用于判定 `.keyed(...)` 是不是核心 DSL 上的调用。
 */
function coreNodeNames(ast, bindings, whitelist) {
  const names = new Set();
  const collectParams = (call) => {
    call.arguments.forEach((argument) => {
      if (
        (argument.type === 'ArrowFunctionExpression' || argument.type === 'FunctionExpression') &&
        argument.params[0]?.type === 'Identifier'
      ) {
        names.add(argument.params[0].name);
      }
    });
  };

  /** 这次遍历里有没有新名字：链式 DSL（`node.tbody((body) => …)`）要迭代到不动点。 */
  const walk = (node) => {
    let added = false;
    if (!node || typeof node !== 'object') {
      return false;
    }
    if (Array.isArray(node)) {
      node.forEach((child) => {
        added = walk(child) || added;
      });
      return added;
    }
    if (node.type === 'CallExpression') {
      const callee = node.callee;
      // 核心元素工厂：`table((node) => …)`
      if (callee.type === 'Identifier' && bindings.get(callee.name) === 'element') {
        const before = names.size;
        collectParams(node);
        added = added || names.size > before;
      }
      // 链式子工厂：`body.tbody((tbody) => …)` / `node.td((cell) => …)`
      if (
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.object.type === 'Identifier' &&
        names.has(callee.object.name) &&
        whitelist.has(callee.property.name ?? callee.property.value)
      ) {
        const before = names.size;
        collectParams(node);
        added = added || names.size > before;
      }
    }
    if (
      node.type === 'VariableDeclarator' &&
      node.init?.type === 'Identifier' &&
      node.id?.type === 'Identifier'
    ) {
      if (names.has(node.init.name) && !names.has(node.id.name)) {
        names.add(node.id.name);
        added = true;
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') {
        continue;
      }
      if (node[key] && typeof node[key] === 'object') {
        added = walk(node[key]) || added;
      }
    }
    return added;
  };
  for (let pass = 0; pass < 8; pass += 1) {
    if (!walk(ast.program)) {
      break;
    }
  }
  return names;
}

/**
 * 模块里每个顶层组件的**用法**：`keyed(rows, Card)` 的行工厂槽位，以及其它位置的引用。
 *
 * 通道靠它推断：**只有"进了 keyed 列表、别处没引用"的组件才走 element**。element 行的产物是
 * `{ el, destroy }`——同一个组件只要还被当值用（`const chip = Card(…)` / `child(Card(…))` /
 * 传给别的函数），element 产物就不再是 `ViewNode`，通用路径会抛错而编译路径必须同口径。
 * 数引用时**只排除声明名本身、对象键与成员属性名**；多余计数只会让它更保守地走 node，不会漏。
 */
function componentUsages(ast, bindings, nodeNames, names) {
  const counts = new Map(names.map((name) => [name, 0]));
  const keyedSlots = new Map(names.map((name) => [name, 0]));

  const isKeyedCall = (callee) => {
    const direct = callee.type === 'Identifier' && bindings.get(callee.name) === 'keyed';
    const member =
      callee.type === 'MemberExpression' &&
      !callee.computed &&
      (callee.property.name ?? callee.property.value) === 'keyed' &&
      callee.object.type === 'Identifier' &&
      nodeNames.has(callee.object.name);
    return direct || member;
  };

  const walk = (node) => {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    switch (node.type) {
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ClassDeclaration':
      case 'ClassExpression':
        if (node.id?.name && counts.has(node.id.name)) {
          // 声明名本身不是引用；函数体照旧走
          node.params.forEach(walk);
          walk(node.body);
          return;
        }
        break;
      case 'ObjectProperty':
        // 非计算键是属性名，不是引用
        if (!node.computed) {
          walk(node.value);
          return;
        }
        break;
      case 'MemberExpression':
        walk(node.object);
        if (node.computed) {
          walk(node.property);
        }
        return;
      case 'CallExpression': {
        if (isKeyedCall(node.callee)) {
          [node.arguments[1], node.arguments[2]].forEach((argument) => {
            if (argument?.type === 'Identifier' && keyedSlots.has(argument.name)) {
              keyedSlots.set(argument.name, keyedSlots.get(argument.name) + 1);
            }
          });
        }
        break;
      }
      case 'Identifier':
        if (counts.has(node.name)) {
          counts.set(node.name, counts.get(node.name) + 1);
        }
        return;
      default:
        break;
    }
    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') {
        continue;
      }
      if (node[key] && typeof node[key] === 'object') {
        walk(node[key]);
      }
    }
  };

  walk(ast.program);
  return { counts, keyedSlots };
}

/**
 * 默认发现规则：模块顶层的**视图工厂**（大驼峰组件 / 小驼峰薄工厂）都是编译单元，
 * 通道按用法推断（进了 `keyed` 列表的组件 → element，其余 → node）。
 */
export function componentUnits(
  source,
  { core, mode = null, thin = false, templatesOnly = false, file }
) {
  let ast;
  try {
    ast = parse(source, { sourceType: 'module' });
  } catch {
    return [];
  }
  const whitelist = elementWhitelistOf(core);
  const bindings = coreBindingsOf(ast, whitelist);
  const nodeNames = coreNodeNames(ast, bindings, whitelist);
  const units = [];
  const functions = topLevelFunctions(ast);
  const usages = componentUsages(
    ast,
    bindings,
    nodeNames,
    functions.map((declaration) => declaration.name)
  );

  functions.forEach((declaration) => {
    if (!isViewExpression(returnedView(declaration.node), bindings, whitelist)) {
      return;
    }
    const { counts, keyedSlots } = usages;
    const references = counts.get(declaration.name);
    const slots = keyedSlots.get(declaration.name);
    // 只有"引用全在 keyed 的行工厂槽位上"才走 element：别处引用过（当值用）就必须是 ViewNode
    const listOnly = slots > 0 && references === slots;
    const channel = mode ?? (listOnly ? 'element' : 'node');
    units.push({ component: declaration.name, file, mode: channel, thin, templatesOnly });
  });
  return units;
}
