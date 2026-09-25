/**
 * 形态 B（返回 `{ render(), … }` 的对象组件）退场门禁（票 03 阶段 1）。
 *
 * 计数口径：AST 判定"某个 export function 最终交出去的是带 `render` 成员的对象字面量"
 * （直接返回、或返回一个被赋成它的标识符、或转调这样一个本地 helper）。**只减不增**：
 * 迁移期间不允许再长出新的形态 B；数量降下来时把下面的基线一并调低。
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from '@babel/parser';
import { describe, expect, it } from 'vitest';

/**
 * 当前基线（2026-09-25，票 07）：**0** —— 对象组件（形态 B）已从运行期退场，
 * `src/examples/**` 全部迁成形态 A（薄工厂）或 B（`vNode`）。基线保持 0：
 * 再长出对象组件直接红（这条门禁从"只减不增"变成"必须为空"）。
 */
const BASELINE_FACTORIES = 0;
const BASELINE_FILES = 0;

const examplesDir = resolve(process.cwd(), 'src/examples');

const walk = (node, visit) => {
  if (!node || typeof node !== 'object') {
    return;
  }
  visit(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') {
      continue;
    }
    const value = node[key];
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, visit));
    } else if (value && typeof value.type === 'string') {
      walk(value, visit);
    }
  }
};

const hasRenderMember = (objectExpression) =>
  (objectExpression.properties ?? []).some(
    (property) => (property.key?.name ?? property.key?.value) === 'render'
  );

const returnsOf = (fn) => {
  const found = [];
  walk(fn.body, (node) => {
    if (node.type === 'ReturnStatement' && node.argument) {
      found.push(node.argument);
    }
  });
  return found;
};

const assignedObjects = (fn) => {
  const map = new Map();
  walk(fn.body, (node) => {
    if (node.type === 'VariableDeclarator' && node.id?.type === 'Identifier') {
      map.set(node.id.name, node.init);
    }
  });
  return map;
};

/** 一个模块里"交出去的是带 render 的对象"的函数名集合（含转调本地 helper 的一跳）。 */
const shapeBFunctionNames = (ast) => {
  const declarations = [];
  walk(ast.program, (node) => {
    if (node.type === 'FunctionDeclaration' && node.id?.name) {
      declarations.push(node);
    }
  });

  const verdict = new Map();
  const direct = (fn) => {
    const assigned = assignedObjects(fn);
    return returnsOf(fn).some((argument) => {
      if (argument.type === 'ObjectExpression') {
        return hasRenderMember(argument);
      }
      if (argument.type === 'Identifier') {
        const object = assigned.get(argument.name);
        return Boolean(object?.type === 'ObjectExpression' && hasRenderMember(object));
      }
      return false;
    });
  };

  declarations.forEach((fn) => verdict.set(fn.id.name, direct(fn)));
  for (let round = 0; round < 5; round += 1) {
    declarations.forEach((fn) => {
      if (verdict.get(fn.id.name)) {
        return;
      }
      const viaHelper = returnsOf(fn).some(
        (argument) =>
          argument.type === 'CallExpression' &&
          argument.callee.type === 'Identifier' &&
          verdict.get(argument.callee.name) === true
      );
      if (viaHelper) {
        verdict.set(fn.id.name, true);
      }
    });
  }

  // 只算**导出**的组件工厂：本地 helper 不是"组件写法"，不进这条计数口径
  const exported = new Set(
    ast.program.body
      .filter((statement) => statement.type === 'ExportNamedDeclaration')
      .map((statement) => statement.declaration)
      .filter((declaration) => declaration?.type === 'FunctionDeclaration')
      .map((declaration) => declaration.id.name)
  );
  return declarations
    .filter((fn) => exported.has(fn.id.name) && verdict.get(fn.id.name))
    .map((fn) => fn.id.name);
};

function collectFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(full);
    }
    return entry.name.endsWith('.js') && !entry.name.endsWith('.test.js') ? [full] : [];
  });
}

describe('shape B retirement gate', () => {
  it('示例里的形态 B 只减不增', () => {
    let factories = 0;
    const filesWithShapeB = [];

    collectFiles(examplesDir).forEach((file) => {
      const source = readFileSync(file, 'utf8');
      const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
      const names = shapeBFunctionNames(ast);
      if (names.length === 0) {
        return;
      }
      factories += names.length;
      filesWithShapeB.push(file.slice(process.cwd().length + 1).replace(/\\/g, '/'));
    });

    expect(
      factories,
      `形态 B 工厂数 ${factories} 超过基线 ${BASELINE_FACTORIES}（新写组件请用 vNode 或直接返回 ViewNode）；` +
        `迁移把数量降下来后，请同步调低 shape-b-baseline.test.js 里的基线。当前分布：\n${filesWithShapeB.join('\n')}`
    ).toBeLessThanOrEqual(BASELINE_FACTORIES);
    expect(filesWithShapeB.length).toBeLessThanOrEqual(BASELINE_FILES);
  });
});
