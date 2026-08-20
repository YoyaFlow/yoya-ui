import { ElementNode, registerChildFactories, vText } from './core/index.js';

const moduleCache = new Map();

const defaultViews = {
  error: (error) => `加载失败：${error.message}`,
  loaded: () => '',
  loading: () => '加载中…',
  pending: () => '等待加载'
};

export function vDynamicLoader(setup = {}) {
  const options = normalizeOptions(setup);
  const node = new ElementNode('div');
  let status = 'pending';
  let moduleValue = null;
  let loadError = null;
  let generation = 0;

  node.className('yoya-vdynamic-loader');
  node.attr({ 'aria-live': 'polite', 'data-loader-state': status });
  node.status = () => status;
  node.state = () => status;
  node.module = () => moduleValue;
  node.value = () => moduleValue;
  node.loadError = () => loadError;
  node.error = () => loadError;
  node.load = () => {
    if (node._deleted) return Promise.resolve(moduleValue);
    const request = ++generation;
    transition('loading');

    return Promise.resolve()
      .then(() => loadDynamicModule(options.cacheKey, options.loader))
      .then(
        (value) => {
          if (request !== generation || node._deleted) return value;
          moduleValue = value;
          loadError = null;
          transition('loaded', value);
          return value;
        },
        (error) => {
          if (request !== generation || node._deleted) throw error;
          loadError = error;
          transition('error', error);
          throw error;
        }
      );
  };
  node.retry = () => node.load();
  node.preload = () =>
    node._deleted
      ? Promise.resolve(moduleValue)
      : loadDynamicModule(options.cacheKey, options.loader);
  node.clearCache = () => {
    clearDynamicModuleCache(options.cacheKey);
    return node;
  };

  const destroy = node.destroy.bind(node);
  node.destroy = () => {
    generation += 1;
    return destroy();
  };

  function transition(nextStatus, payload) {
    status = nextStatus;
    node.attr('data-loader-state', status);
    renderState(node, options.views, status, payload);
    options.onStateChange?.(status, payload, node);
  }

  renderState(node, options.views, status);
  if (options.auto) {
    queueMicrotask(() => {
      if (!node._deleted) node.load().catch(() => {});
    });
  }
  return node;
}

function normalizeOptions(setup) {
  const options = typeof setup === 'function' ? { loader: setup } : { ...setup };
  if (typeof options.loader !== 'function') {
    throw new TypeError('vDynamicLoader requires a loader function');
  }
  return {
    auto: options.auto !== false,
    cacheKey: options.cacheKey ?? null,
    loader: options.loader,
    onStateChange: options.onStateChange,
    views: { ...defaultViews, ...(options.views || {}) }
  };
}

export function preloadDynamicModule(cacheKey, loader) {
  if (cacheKey === null || cacheKey === undefined || cacheKey === '') {
    throw new TypeError('preloadDynamicModule requires a cache key');
  }
  if (typeof loader !== 'function') {
    throw new TypeError('preloadDynamicModule requires a loader function');
  }
  return loadDynamicModule(cacheKey, loader);
}

export function clearDynamicModuleCache(cacheKey) {
  if (cacheKey === undefined) moduleCache.clear();
  else moduleCache.delete(cacheKey);
}

function loadDynamicModule(cacheKey, loader) {
  if (cacheKey === null || cacheKey === undefined || cacheKey === '') {
    return Promise.resolve().then(loader);
  }
  if (moduleCache.has(cacheKey)) return moduleCache.get(cacheKey);

  const promise = Promise.resolve().then(loader);
  moduleCache.set(cacheKey, promise);
  promise.catch(() => {
    if (moduleCache.get(cacheKey) === promise) moduleCache.delete(cacheKey);
  });
  return promise;
}

function renderState(node, views, status, payload) {
  node.children().forEach((child) => child.destroy());
  node._children = [];
  if (node._el) node._el.replaceChildren();

  const source = views[status];
  const view = typeof source === 'function' ? source(payload, node) : source;
  node.child(view ?? vText(''));
}

registerChildFactories(ElementNode, { vDynamicLoader });
