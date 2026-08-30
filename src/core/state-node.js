import { ElementNode, registerChildFactories } from './node.js';

const lifecycleKeys = new Set(['state', 'render', 'update']);
const builtinKeys = new Set(['destroy', 'getState', 'setState', 'subscribe']);

/**
 * vStateNode 返回带状态的对象组件：state 保存状态，render 构建初始视图，
 * update 在状态变化后做局部更新；未提供 update 时回退为全量重建。
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
  let root = null;

  const component = {
    destroy() {
      if (destroyed) {
        return component;
      }

      destroyed = true;
      listeners.clear();

      if (root) {
        root.destroy();
      }

      return component;
    },
    getState() {
      return component.state();
    },
    render() {
      if (destroyed) {
        return root;
      }

      if (!root) {
        root = new ElementNode('div');
        const destroyRoot = root.destroy.bind(root);
        root.destroy = () => {
          listeners.clear();
          return destroyRoot();
        };
        rebuild();
      }

      return root;
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

      Object.entries(nextPatch).forEach(([key, value]) => {
        if (state[key] !== value) {
          state[key] = value;
          changed.add(key);
        }
      });

      if (changed.size > 0) {
        if (root) {
          applyStateChange(changed);
        }

        listeners.forEach((listener) => listener(state, component));
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
    const nextView = config.render.call(component, state, component);
    root.clearChildren().child(nextView);

    if (root._el) {
      root.commit();
    }
  }

  function applyStateChange(changed) {
    if (typeof config.update === 'function') {
      if (config.update.call(component, state, component, changed) === true) {
        rebuild();
      }
      return;
    }

    rebuild();
  }
}

registerChildFactories(ElementNode, { vStateNode });
