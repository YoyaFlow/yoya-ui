import { ElementNode, registerChildFactories } from './node.js';

/**
 * vStateNode 返回带状态的对象组件：state 保存状态，render 构建初始视图，
 * update 在状态变化后做局部更新；未提供 update 时回退为全量重建。
 */
export function vStateNode(config = {}) {
  if (typeof config.render !== 'function') {
    throw new TypeError('vStateNode requires a render function');
  }

  const state = typeof config.state === 'function' ? config.state() : { ...(config.state || {}) };
  const listeners = new Set();
  let destroyed = false;
  let root = null;

  const api = {
    destroy() {
      if (destroyed) {
        return api;
      }

      destroyed = true;
      listeners.clear();

      if (root) {
        root.destroy();
      }

      return api;
    },
    getState() {
      return api.state();
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
        return api;
      }

      const nextPatch = typeof patch === 'function' ? patch({ ...state }) : patch;

      if (!nextPatch || typeof nextPatch !== 'object') {
        return api;
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

        listeners.forEach((listener) => listener(state, api));
      }

      return api;
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

  return api;

  function rebuild() {
    const nextView = config.render(state, api);
    root.clearChildren().child(nextView).commit();
  }

  function applyStateChange(changed) {
    if (typeof config.update === 'function') {
      if (config.update(state, api, changed) === true) {
        rebuild();
      }
      return;
    }

    rebuild();
  }
}

registerChildFactories(ElementNode, { vStateNode });
