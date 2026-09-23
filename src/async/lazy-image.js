import { HtmlElementNode } from '../html/index.js';
import { ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import {
  createComponentShortcut,
  delegateNodeCommands,
  isPlainObject
} from '../components/shared.js';

/** 懒加载图片的节点类型（不导出到包入口）；公开组件 `vLazyImage` 是 vNode 外壳。 */
export class LazyImageNode extends HtmlElementNode {
  constructor(setup = null) {
    super('div', { vn: 'VLazyImage' });
    this._src = null;
    this._alt = '';
    this._defer = false;
    // 内部状态用 ref 持有（票 01 约定）；loadState() 是对外只读入口
    this._state = ref('loading');
    this._observer = null;

    this._img = new HtmlElementNode('img', { vn: 'VLazyImageImg' }).attr({ loading: 'lazy' });
    this._placeholder = new HtmlElementNode('span', { vn: 'VLazyImagePlaceholder' });
    this._retryButton = new HtmlElementNode('button', { vn: 'VLazyImageRetry' })
      .attr({ type: 'button' })
      .child('加载失败，点击重试')
      .on('click', () => this.retry());

    // 静态样式在 `yoya.ui.css` 的 `[vn~='VLazyImage*']` 规则里（R5）
    this.attr({ 'data-state': 'loading', role: 'img' });
    this.child(this._placeholder, this._img, this._retryButton);

    this._setupLazyImage(setup);
    this._syncState();
  }

  src(value) {
    if (value === undefined) {
      return this._src;
    }

    this._src = value === null || value === undefined ? null : String(value);
    if (this._src && !this._defer) {
      this._img.attr('src', this._src);
    } else {
      this._img.attr('src', null);
    }
    return this;
  }

  alt(value) {
    if (value === undefined) {
      return this._alt;
    }

    this._alt = String(value ?? '');
    this._img.attr('alt', this._alt || null);
    this.attr('aria-label', this._alt || null);
    return this;
  }

  defer(value) {
    if (value === undefined) {
      return this._defer;
    }

    this._defer = Boolean(value);
    if (this._defer) {
      this._img.attr('src', null);
    } else if (this._src) {
      this._img.attr('src', this._src);
    }
    return this;
  }

  /** 当前加载状态：loading / loaded / error。 */
  loadState() {
    return this._state.value;
  }

  retry() {
    if (!this._src) {
      return this;
    }

    this._setState('loading');
    this._img.attr('src', this._src);
    return this;
  }

  renderDom() {
    const element = super.renderDom();

    this._img.on('load', () => this._setState('loaded'));
    this._img.on('error', () => this._setState('error'));
    this._observe();
    return element;
  }

  destroy() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    return super.destroy();
  }

  _observe() {
    if (!this._defer || !this._src) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      this._img.attr('src', this._src);
      return;
    }

    this._observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        this._img.attr('src', this._src);
        if (this._observer) {
          this._observer.disconnect();
          this._observer = null;
        }
      });
    });

    if (this._el) {
      this._observer.observe(this._el);
    }
  }

  _setState(state) {
    this._state.value = state;
    this._syncState();
  }

  _syncState() {
    // 状态只落一个属性：图片透明度 / 占位与重试按钮的显隐都由 CSS 的 `[data-state]` 规则给（R5）
    this.attr('data-state', this._state.value);
  }

  _setupLazyImage(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { alt, defer, src, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (alt !== undefined) {
        this.alt(alt);
      }
      if (defer !== undefined) {
        this.defer(defer);
      }
      if (src !== undefined) {
        this.src(src);
      }
    }
  }
}

/**
 * 懒加载图片（形态 B）：视图根是节点类型扩展 `LazyImageNode`（IntersectionObserver / 加载 / 失败重试
 * 都归它），外层 `vNode` 用 `delegateNodeCommands` 补齐命令面（`src` / `alt` / `defer` / `loadState` /
 * `retry`）与元素 DSL；三块部件（占位 / 图片 / 重试）常驻，显隐与透明度由 `[data-state]` 规则给。
 */
export function VLazyImage(props = {}) {
  return vNode((api) => {
    const node = new LazyImageNode(props);
    delegateNodeCommands(api, node);
    return node;
  });
}

export const vLazyImage = createComponentShortcut(VLazyImage, { props: true });
