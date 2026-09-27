import { computedTarget } from '../protocol/computed.js';
import { BIND_KEY, FROM_KEY } from '../protocol/constants.js';
import { ERROR_CODES, GenUIError } from '../protocol/errors.js';
import {
  isBindExpr,
  isPathPrefix,
  isPlainObject,
  normalizePath,
  readPath
} from '../protocol/values.js';

function stateName(path) {
  const normalized = normalizePath(path);
  const withoutUi = normalized.startsWith('/ui/')
    ? normalized.slice('/ui/'.length)
    : normalized.slice(1);

  return withoutUi || 'root';
}

function pickValue(value, path) {
  if (path === undefined || path === '' || path === '/') {
    return value;
  }

  return readPath(value, path);
}

function readDependency(value, data) {
  if (isBindExpr(value)) {
    return data.read(value[BIND_KEY]);
  }

  if (Array.isArray(value)) {
    return value.map((item) => readDependency(item, data));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, readDependency(item, data)])
    );
  }

  return value;
}

function visitDependencies(value, visit) {
  if (isBindExpr(value)) {
    if (value[FROM_KEY] === undefined) {
      visit(normalizePath(value[BIND_KEY]));
    }

    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => visitDependencies(item, visit));
    return;
  }

  if (isPlainObject(value)) {
    Object.values(value).forEach((item) => visitDependencies(item, visit));
  }
}

function withQuery(url, params) {
  const query = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  });

  const text = query.toString();
  if (text === '') {
    return url;
  }

  return `${url}${url.includes('?') ? '&' : '?'}${text}`;
}

async function parseResponse(response) {
  if (typeof response?.json === 'function') {
    return response.json();
  }

  return response;
}

/**
 * send / source 共用的 @actions 调用运行时。
 *
 * 安全边界：action 描述符只能由宿主 custodians.actions 提供；JSON 不传任意 URL。
 * 竞态边界：source 依赖再变即 abort + token 失效，last-write-wins。
 */
export function createChannelRuntime({ data, custodians, functions = {}, fetchImpl, applyOps }) {
  const doFetch = fetchImpl ?? globalThis.fetch;
  let disposed = false;
  const pendingSends = new Set();
  const sendControllers = new Map();
  const sourceControllers = new Map();
  const sourceTimers = new Map();
  const sourceTokens = new Map();

  /** 卸载后的迟到回调一律静默（销毁后不再写 /ui 状态，也不再回流数据）。 */
  function writeState(path, value) {
    if (!disposed) {
      data.write(path, value);
    }
  }

  async function request(action, { params = null, body = null, signal = null }) {
    // fetch 是「真正要发请求时」才要求的能力：只声明 send/sources 的页面在无 fetch
    // 环境（SSR / 老 node）里照常渲染，不因为运行时缺能力而整页构建失败。
    if (typeof doFetch !== 'function') {
      throw new GenUIError('send/source 需要 fetch（浏览器全局或 options.fetch 注入）', {
        code: ERROR_CODES.action
      });
    }

    if (action.type !== 'http') {
      throw new GenUIError(`不支持的 @actions 类型 "${action.type}"`, {
        code: ERROR_CODES.action
      });
    }

    const method = (action.method ?? 'GET').toUpperCase();
    const url = method === 'GET' ? withQuery(action.url, params) : action.url;
    const options = { headers: { ...action.headers }, method, signal };

    if (method !== 'GET') {
      options.headers['content-type'] = 'application/json';
      options.body = JSON.stringify(body ?? params ?? {});
    }

    const response = await doFetch(url, options);
    return parseResponse(response);
  }

  function pipeline(value, descriptor = {}, override = {}) {
    const picked = pickValue(value, override.pick ?? descriptor.pick);
    const transformName = override.transform ?? descriptor.transform;

    if (transformName === undefined) {
      return picked;
    }

    const transform = functions[transformName];
    if (typeof transform !== 'function') {
      throw new GenUIError(`未注册的响应 transform "${transformName}"`, {
        code: ERROR_CODES.action
      });
    }

    return transform(picked);
  }

  function materializeOps(value) {
    const ops = Array.isArray(value) ? value : isPlainObject(value?.ops) ? value.ops : null;

    if (ops === null) {
      return;
    }

    ops.forEach((op) => applyOps?.(op));
  }

  async function send(event) {
    const action = event.params?.action;
    const path = action?.path;
    const name = stateName(path);

    if (disposed || pendingSends.has(name)) {
      return undefined;
    }

    pendingSends.add(name);
    const controller = new AbortController();
    sendControllers.set(name, controller);
    writeState(`/ui/pending/${name}`, true);
    writeState(`/ui/errors/${name}`, null);

    try {
      const response = await request(action, {
        body: event.params?.data,
        signal: controller.signal
      });
      const value = pipeline(response, action, event.params);
      materializeOps(value);
      writeState(`/ui/errors/${name}`, null);
      return value;
    } catch (error) {
      if (!disposed) {
        writeState(`/ui/errors/${name}`, error instanceof Error ? error.message : String(error));
      }

      throw error;
    } finally {
      pendingSends.delete(name);
      sendControllers.delete(name);
      writeState(`/ui/pending/${name}`, false);
    }
  }

  function runSource(target, declaration) {
    const name = stateName(target);
    const previousController = sourceControllers.get(target);
    previousController?.abort();

    const controller = new AbortController();
    sourceControllers.set(target, controller);
    const token = (sourceTokens.get(target) ?? 0) + 1;
    sourceTokens.set(target, token);

    const action = custodians.read('actions', declaration.action[BIND_KEY]);
    const params = readDependency(declaration.params ?? {}, data);
    writeState(`/ui/pending/${name}`, true);
    writeState(`/ui/errors/${name}`, null);

    request(action, { params, signal: controller.signal })
      .then((response) => {
        if (sourceTokens.get(target) !== token) {
          return;
        }

        const value = pipeline(response, action, declaration);
        writeState(target, value);
        writeState(`/ui/errors/${name}`, null);
      })
      .catch((error) => {
        if (sourceTokens.get(target) !== token || error?.name === 'AbortError') {
          return;
        }

        writeState(`/ui/errors/${name}`, error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (sourceTokens.get(target) === token) {
          sourceControllers.delete(target);
          writeState(`/ui/pending/${name}`, false);
        }
      });
  }

  function scheduleSource(target, declaration) {
    const debounce = declaration.debounce ?? 0;
    clearTimeout(sourceTimers.get(target));
    const start = () => {
      if (disposed) {
        return;
      }

      if (declaration.when !== undefined && !data.read(declaration.when[BIND_KEY])) {
        return;
      }

      runSource(target, declaration);
    };

    if (debounce === 0) {
      start();
      return;
    }

    sourceTimers.set(
      target,
      setTimeout(() => {
        sourceTimers.delete(target);
        start();
      }, debounce)
    );
  }

  function installSources(sources) {
    const entries = new Map();

    Object.entries(sources ?? {}).forEach(([key, declaration]) => {
      const target = computedTarget(key);

      if (target === null) {
        throw new GenUIError(`source 目标必须是数据域绝对引用，得到 ${JSON.stringify(key)}`, {
          code: ERROR_CODES.schema
        });
      }

      entries.set(target, declaration);
      scheduleSource(target, declaration);
    });

    const dependencies = new Map();
    entries.forEach((declaration, target) => {
      const paths = new Set();
      visitDependencies(declaration.params, (path) => paths.add(path));
      visitDependencies(declaration.when, (path) => paths.add(path));
      dependencies.set(target, paths);
    });

    const unsubscribe = data.subscribe((change) => {
      entries.forEach((declaration, target) => {
        const affected = [...dependencies.get(target)].some(
          (path) => isPathPrefix(path, change.path) || isPathPrefix(change.path, path)
        );

        if (affected) {
          scheduleSource(target, declaration);
        }
      });
    });

    return () => {
      unsubscribe();
      sourceControllers.forEach((controller) => controller.abort());
      sourceTimers.forEach((timer) => clearTimeout(timer));
      entries.forEach((_declaration, target) =>
        sourceTokens.set(target, (sourceTokens.get(target) ?? 0) + 1)
      );
    };
  }

  /** surface 销毁：中止在途 send/source，之后的迟到回调不再写 /ui 状态。 */
  function dispose() {
    disposed = true;
    sendControllers.forEach((controller) => controller.abort());
    sendControllers.clear();
    sourceControllers.forEach((controller) => controller.abort());
    sourceControllers.clear();
    sourceTimers.forEach((timer) => clearTimeout(timer));
    sourceTimers.clear();
    sourceTokens.forEach((_token, target) =>
      sourceTokens.set(target, (sourceTokens.get(target) ?? 0) + 1)
    );
  }

  return { dispose, installSources, send };
}
