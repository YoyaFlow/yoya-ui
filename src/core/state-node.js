import { ElementNode, ViewNode, registerChildFactories, withBindingScope } from './node.js';
import { emitDevtools, isDevtoolsEnabled } from './devtools.js';

const lifecycleKeys = new Set(['state', 'render', 'update']);
const builtinKeys = new Set(['_attachHost', 'destroy', 'getState', 'setState', 'subscribe']);

/**
 * vStateNode 返回带状态的对象组件：不产生自己的 DOM 元素，
 * render 返回的视图根直接成为父节点落实的子节点；state 保存状态，
 * update 在状态变化后做局部更新；未提供 update 时，render 中登记的函数值
 * 绑定（vText/attr/style）会在 setState 后统一求值写回，没有绑定时回退为全量重建。
 * config 上除 state/render/update 外的自定义函数会挂到返回对象上，
 * 外部可以直接调用；render 与 update 是内部生命周期函数，不对外暴露。
 */
export function vStateNode(config = {}) {
  if (typeof config.render !== 'function') {
    throw new TypeError('vStateNode requires a render function');
  }

  const state = typeof config.state === 'function' ? config.state() : { ...(config.state || {}) };
  const listeners = new Set();
  let destroyed = false;
  let roots = null;
  let host = null;
  let bindings = [];

  const component = {
    _attachHost(hostNode) {
      host = hostNode;
      return component;
    },
    destroy() {
      if (destroyed) {
        return component;
      }

      destroyed = true;
      bindings = [];
      listeners.clear();
      host = null;

      if (roots) {
        const currentRoots = roots;
        roots = null;
        currentRoots.forEach((root) => root.destroy());
      }

      return component;
    },
    getState() {
      return component.state();
    },
    render() {
      if (destroyed) {
        return renderOutput();
      }

      if (!roots) {
        rebuild();
      }

      return renderOutput();
    },
    setState(patch) {
      if (destroyed || patch === null || patch === undefined) {
        return component;
      }

      const nextPatch = typeof patch === 'function' ? patch({ ...state }) : patch;

      if (!nextPatch || typeof nextPatch !== 'object') {
        return component;
      }

      const changed = new Set();
      const changedDetails = isDevtoolsEnabled() ? {} : null;

      Object.entries(nextPatch).forEach(([key, value]) => {
        if (state[key] !== value) {
          if (changedDetails) {
            changedDetails[key] = { from: state[key], to: value };
          }
          state[key] = value;
          changed.add(key);
        }
      });

      let handling = 'none';
      if (changed.size > 0) {
        if (roots) {
          handling = applyStateChange(changed);
        }

        listeners.forEach((listener) => listener(state, component));

        if (isDevtoolsEnabled() && changedDetails) {
          emitDevtools({
            type: 'state',
            node: host || undefined,
            changed: changedDetails,
            state: { ...state },
            handling
          });
        }
      }

      return component;
    },
    state() {
      return { ...state };
    },
    subscribe(listener) {
      if (typeof listener !== 'function') {
        throw new TypeError('vStateNode subscriber must be a function');
      }

      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };

  for (const key of Object.keys(config)) {
    if (lifecycleKeys.has(key) || typeof config[key] !== 'function') {
      continue;
    }

    if (builtinKeys.has(key)) {
      throw new TypeError(`vStateNode config key "${key}" conflicts with the built-in API`);
    }

    component[key] = config[key];
  }

  return component;

  function rebuild() {
    const previousRoots = roots || [];
    bindings = [];
    const scope = {
      bindings,
      getState: () => state
    };
    const nextResult = withBindingScope(scope, () =>
      config.render.call(component, state, component)
    );
    const nextRoots = Array.isArray(nextResult) ? nextResult.slice() : [nextResult];
    nextRoots.forEach((root) => {
      if (!(root instanceof ViewNode)) {
        throw new TypeError('vStateNode render must return a ViewNode or an array of ViewNodes');
      }
    });

    roots = nextRoots;
    flushBindings();

    if (host) {
      host._replaceResolved(renderOutput());
      return;
    }

    if (previousRoots.length > 0) {
      const previousSingle = previousRoots.length === 1 ? previousRoots[0] : null;
      if (
        previousSingle &&
        previousSingle._el &&
        previousSingle._el.parentNode &&
        nextRoots.length === 1
      ) {
        const element = nextRoots[0].renderDom();
        if (element) {
          previousSingle._el.parentNode.replaceChild(element, previousSingle._el);
        }
      }
      previousRoots.forEach((root) => root.destroy());
    }
  }

  function renderOutput() {
    if (!roots) {
      return null;
    }

    return roots.length === 1 ? roots[0] : roots;
  }

  function flushBindings() {
    bindings.forEach((binding) => {
      const next = binding.evaluate();
      if (!binding.committed || !Object.is(next, binding.last)) {
        binding.committed = true;
        binding.last = next;
        binding.commit(next);
      }
    });
  }

  function applyStateChange(changed) {
    if (typeof config.update === 'function') {
      if (config.update.call(component, state, component, changed) === true) {
        rebuild();
        return 'rebuild';
      } else if (bindings.length > 0) {
        flushBindings();
        return 'bindings';
      }
      return 'update';
    }

    if (bindings.length > 0) {
      flushBindings();
      return 'bindings';
    }

    rebuild();
    return 'rebuild';
  }
}

registerChildFactories(ElementNode, { vStateNode });
