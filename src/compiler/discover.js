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

/** 函数体是不是「单个 return 视图」：返回视图表达式本身或 null。 */
function returnedView(fn) {
  if (fn.body.type !== 'BlockStatement') {
    return fn.body;
  }
  const returns = fn.body.body.filter((statement) => statement.type === 'ReturnStatement');
  return returns.length === 1 && fn.body.body.length === 1 ? returns[0].argument : null;
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

/** 该组件在模块里被列表使用（交给了核心 `keyed`）→ 决定要不要走 element 通道。 */
function usedInKeyedList(ast, name, bindings, nodeNames) {
  const isRowFactoryArg = (call) => {
    const candidates = [call.arguments[1], call.arguments[2]];
    return candidates.some((argument) => argument?.type === 'Identifier' && argument.name === name);
  };

  let found = false;
  const walk = (node) => {
    if (found || !node || typeof node !== 'object') {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node.type === 'CallExpression') {
      const callee = node.callee;
      const direct = callee.type === 'Identifier' && bindings.get(callee.name) === 'keyed';
      const member =
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        (callee.property.name ?? callee.property.value) === 'keyed' &&
        callee.object.type === 'Identifier' &&
        nodeNames.has(callee.object.name);
      if ((direct || member) && isRowFactoryArg(node)) {
        found = true;
        return;
      }
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
  return found;
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

  topLevelFunctions(ast).forEach((declaration) => {
    if (!isViewExpression(returnedView(declaration.node), bindings, whitelist)) {
      return;
    }
    const channel =
      mode ?? (usedInKeyedList(ast, declaration.name, bindings, nodeNames) ? 'element' : 'node');
    units.push({ component: declaration.name, file, mode: channel, thin, templatesOnly });
  });
  return units;
}
