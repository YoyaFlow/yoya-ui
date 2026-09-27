import { computedTarget } from './computed.js';
import { BIND_KEY, FROM_KEY } from './constants.js';
import { isBindExpr, isPathPrefix, isPlainObject, normalizePath } from './values.js';

function actionPath(value) {
  return isBindExpr(value) && value[FROM_KEY] === 'actions' ? normalizePath(value[BIND_KEY]) : null;
}

function readAction(custodians, path) {
  if (!custodians?.has?.('actions')) {
    throw new Error(`未注册的 @actions 目标：${path}`);
  }

  try {
    const action = custodians.read('actions', path);

    if (!isPlainObject(action)) {
      throw new Error(`未注册的 @actions 目标：${path}`);
    }

    return action;
  } catch {
    throw new Error(`未注册的 @actions 目标：${path}`);
  }
}

function visitDependencyValues(value, visit) {
  if (isBindExpr(value)) {
    visit(value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => visitDependencyValues(item, visit));
    return;
  }

  if (isPlainObject(value)) {
    Object.values(value).forEach((item) => visitDependencyValues(item, visit));
  }
}

function collectDependencies(declaration) {
  const paths = new Set();

  visitDependencyValues(declaration.params, (value) => {
    if (value[FROM_KEY] === undefined) {
      paths.add(normalizePath(value[BIND_KEY]));
    }
  });
  visitDependencyValues(declaration.when, (value) => {
    if (value[FROM_KEY] === undefined) {
      paths.add(normalizePath(value[BIND_KEY]));
    }
  });

  return paths;
}

/** 校证 send 动作与 sources 声明：调用目标只能来自宿主 @actions 注册表。 */
export function validateChannels(schema, custodians) {
  validateSendActions(schema, custodians);
  validateSources(schema, custodians);
}

function validateSendActions(schema, custodians) {
  const visit = (node) => {
    if (!isPlainObject(node)) {
      return;
    }

    Object.values(node.on ?? {}).forEach((expr) => {
      if (!isPlainObject(expr) || expr[BIND_KEY] !== undefined) {
        return;
      }

      const name = expr.$action;
      if (name !== 'send') {
        return;
      }

      const path = actionPath(expr.params?.action);
      if (path === null) {
        throw new Error('send 需要 params.action = "@actions:/<注册键>"');
      }

      readAction(custodians, path);
    });

    (node.children ?? []).forEach(visit);
    if (isPlainObject(node.template)) {
      visit(node.template);
    }
  };

  visit(schema.root);
  (schema.components ?? []).forEach(visit);
}

function validateSources(schema, custodians) {
  Object.entries(schema.sources ?? {}).forEach(([key, declaration]) => {
    const target = computedTarget(key);

    if (target === null) {
      throw new Error(`source 目标必须是数据域绝对引用，得到 ${JSON.stringify(key)}`);
    }

    const allowed = new Set(['action', 'params', 'debounce', 'when', 'pick', 'transform']);
    if (Object.keys(declaration).some((key) => !allowed.has(key))) {
      throw new Error(`source 声明只允许 action/params/debounce/when/pick/transform：${key}`);
    }

    const path = actionPath(declaration.action);
    if (path === null) {
      throw new Error(`source.${key}.action 必须是 "@actions:/<注册键>"`);
    }

    readAction(custodians, path);

    if (declaration.params !== undefined && !isPlainObject(declaration.params)) {
      throw new Error(`source.${key}.params 必须是对象`);
    }

    if (declaration.debounce !== undefined && typeof declaration.debounce !== 'number') {
      throw new Error(`source.${key}.debounce 必须是毫秒数`);
    }

    if (declaration.when !== undefined && !isBindExpr(declaration.when)) {
      throw new Error(`source.${key}.when 必须是数据引用`);
    }

    if (declaration.pick !== undefined && typeof declaration.pick !== 'string') {
      throw new Error(`source.${key}.pick 必须是响应信封路径字符串`);
    }

    if (declaration.transform !== undefined && typeof declaration.transform !== 'string') {
      throw new Error(`source.${key}.transform 必须是宿主函数名`);
    }

    for (const dependency of collectDependencies(declaration)) {
      if (isPathPrefix(dependency, target) || isPathPrefix(target, dependency)) {
        throw new Error(`source 目标不能依赖自身：${target} ↔ ${dependency}`);
      }
    }
  });
}
