import { VMessageContainer, vMessageContainer } from './message.js';
import { ViewNode } from '../core/index.js';
import { applyComponentArguments, normalizeComponentArguments } from '../components/shared.js';

/**
 * Owns one explicitly bound message container and its complete lifecycle.
 */
export class VMessageManager extends ViewNode {
  constructor(setup = null) {
    super();

    if (setup instanceof VMessageContainer) {
      this._container = setup;
    } else if (setup && typeof setup === 'object' && setup.container instanceof VMessageContainer) {
      this._container = setup.container;
    } else {
      this._container = vMessageContainer(setup);
    }

    this._destroyed = false;
  }

  container() {
    return this._container;
  }

  bindTo(target) {
    if (!this._destroyed) {
      this._container.bindTo(target);
    }

    return this;
  }

  renderDom() {
    return this._destroyed ? null : this._container.renderDom();
  }

  toHTML() {
    return this._destroyed ? '' : this._container.toHTML();
  }

  show(content, options = {}) {
    return this._destroyed ? null : this._container.show(content, options);
  }

  success(content, options = {}) {
    return this._showType('success', content, options);
  }

  error(content, options = {}) {
    return this._showType('error', content, options);
  }

  warning(content, options = {}) {
    return this._showType('warning', content, options);
  }

  info(content, options = {}) {
    return this._showType('info', content, options);
  }

  close(id) {
    if (!this._destroyed) {
      this._container.close(id);
    }

    return this;
  }

  clear() {
    if (!this._destroyed) {
      this._container.clear();
    }

    return this;
  }

  destroy() {
    if (!this._destroyed) {
      this._destroyed = true;
      this._container.destroy();
      super.destroy();
    }

    return this;
  }

  _showType(type, content, options) {
    return this._destroyed ? null : this._container[type](content, options);
  }
}

export function vMessageManager(first = null, second = null, third = null) {
  const args = normalizeComponentArguments(first, second, third);
  const manager =
    args.first instanceof VMessageManager ? args.first : new VMessageManager(args.first);
  return applyComponentArguments(manager, args.options, args.callback);
}
